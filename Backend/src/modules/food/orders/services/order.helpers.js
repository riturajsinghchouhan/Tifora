import mongoose from 'mongoose';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import { logger } from '../../../../utils/logger.js';
import {
  sendNotificationToOwner,
  sendNotificationToOwners,
} from "../../../../core/notifications/firebase.service.js";
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';
import { addPaymentJob } from '../../../../queues/producers/payment.producer.js';

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function toOrderSnapshot(orderDoc) {
  if (!orderDoc) return {};

  const plain =
    orderDoc?.toObject && typeof orderDoc?.save === "function"
      ? orderDoc.toObject()
      : orderDoc?.toObject
        ? orderDoc.toObject()
        : { ...(orderDoc || {}) };

  const dynamicKeys = [
    "pricing",
    "payment",
    "amounts",
    "paymentMethod",
    "transactionId",
    "transactionStatus",
    "customerName",
    "customerPhone",
  ];

  for (const key of dynamicKeys) {
    if (orderDoc?.[key] != null && plain?.[key] == null) {
      plain[key] = orderDoc[key];
    }
  }

  return plain;
}

export function extractOrderPricingSnapshot(orderLike = {}, transactionLike = null) {
  const legacyPricing =
    orderLike?.pricing && typeof orderLike.pricing === "object"
      ? orderLike.pricing
      : {};
  const txPricing =
    transactionLike?.pricing && typeof transactionLike.pricing === "object"
      ? transactionLike.pricing
      : {};
  const source = Object.keys(txPricing).length > 0 ? txPricing : legacyPricing;

  if (Object.keys(source).length === 0 && Object.keys(legacyPricing).length === 0) {
    return {};
  }

  return {
    ...legacyPricing,
    ...source,
    subtotal: toMoney(source.subtotal ?? legacyPricing.subtotal),
    tax: toMoney(source.tax ?? legacyPricing.tax),
    packagingFee: toMoney(source.packagingFee ?? legacyPricing.packagingFee),
    deliveryFee: toMoney(source.deliveryFee ?? legacyPricing.deliveryFee),
    platformFee: toMoney(source.platformFee ?? legacyPricing.platformFee),
    restaurantCommission: toMoney(
      source.restaurantCommission ?? legacyPricing.restaurantCommission,
    ),
    gstOnItem: toMoney(source.gstOnItem ?? legacyPricing.gstOnItem),
    gstOnCommission: toMoney(
      source.gstOnCommission ?? legacyPricing.gstOnCommission,
    ),
    paymentGatewayFee: toMoney(
      source.paymentGatewayFee ?? legacyPricing.paymentGatewayFee,
    ),
    tcs: toMoney(source.tcs ?? legacyPricing.tcs),
    discount: toMoney(source.discount ?? legacyPricing.discount),
    total: toMoney(source.total ?? legacyPricing.total),
    currency: String(source.currency || legacyPricing.currency || "INR"),
    couponCode: source.couponCode || legacyPricing.couponCode || "",
    couponDiscount: toMoney(
      source.couponDiscount ?? legacyPricing.couponDiscount,
    ),
  };
}

export function mergeOrderPaymentSnapshot(orderLike = {}, transactionLike = null) {
  const existingPayment =
    orderLike?.payment && typeof orderLike.payment === "object"
      ? orderLike.payment
      : {};
  const txPayment =
    transactionLike?.payment && typeof transactionLike.payment === "object"
      ? transactionLike.payment
      : {};
  const pricing = extractOrderPricingSnapshot(orderLike, transactionLike);

  if (Object.keys(existingPayment).length === 0 && Object.keys(txPayment).length === 0) {
    return existingPayment;
  }

  return {
    ...existingPayment,
    ...txPayment,
    amountDue: toMoney(
      txPayment.amountDue ?? existingPayment.amountDue ?? pricing.total ?? 0,
    ),
    razorpay: {
      ...(existingPayment.razorpay || {}),
      ...(txPayment.razorpay || {}),
    },
    qr: {
      ...(existingPayment.qr || {}),
      ...(txPayment.qr || {}),
    },
    refund: {
      ...(existingPayment.refund || {}),
      ...(txPayment.refund || {}),
    },
  };
}

export async function attachFinancialSnapshotToOrder(orderDoc, transactionDoc = null) {
  if (!orderDoc) return orderDoc;

  const isMongooseDoc = typeof orderDoc?.save === "function";
  const order = isMongooseDoc
    ? orderDoc
    : orderDoc?.toObject
      ? orderDoc.toObject()
      : { ...(orderDoc || {}) };
  const orderId = order?._id || orderDoc?._id || null;
  let transaction = transactionDoc || null;

  if (!transaction && orderId && mongoose.isValidObjectId(orderId)) {
    transaction = await FoodTransaction.findOne({ orderId }).lean();
  }

  const pricing = extractOrderPricingSnapshot(order, transaction);
  if (Object.keys(pricing).length > 0) {
    order.pricing = pricing;
  }

  const mergedPayment = mergeOrderPaymentSnapshot(order, transaction);
  if (mergedPayment && Object.keys(mergedPayment || {}).length > 0) {
    order.payment = mergedPayment;
  }

  if (!order.amounts && transaction?.amounts) {
    order.amounts = transaction.amounts;
  }

  if (!order.transactionId && transaction?._id) {
    order.transactionId = transaction._id;
  }

  if (transaction?.status && !order.transactionStatus) {
    order.transactionStatus = transaction.status;
  }

  return order;
}

export async function attachFinancialSnapshotsToOrders(orderDocs = []) {
  if (!Array.isArray(orderDocs) || orderDocs.length === 0) return orderDocs;

  const plainOrders = orderDocs.map((doc) =>
    doc?.toObject ? doc.toObject() : { ...(doc || {}) },
  );
  const orderIds = plainOrders
    .map((order) => order?._id)
    .filter((id) => id && mongoose.isValidObjectId(id));

  if (orderIds.length === 0) return plainOrders;

  const transactions = await FoodTransaction.find({ orderId: { $in: orderIds } }).lean();
  const txMap = new Map(
    transactions.map((transaction) => [String(transaction.orderId), transaction]),
  );

  return Promise.all(plainOrders.map((order) =>
    attachFinancialSnapshotToOrder(
      order,
      txMap.get(String(order?._id || "")) || null,
    ),
  ));
}

function mapPaymentQueueAction(action, payload = {}) {
  if (action === 'delivery_completed') {
    return 'delivery_completed';
  }

  if (action === 'payment_verified') {
    return 'payment_verified';
  }

  if (action === 'order_cancelled_by_user') {
    return 'order_cancelled';
  }

  if (
    action === 'restaurant_order_status_updated' &&
    String(payload?.to || '').toLowerCase().includes('cancel')
  ) {
    return 'order_cancelled';
  }

  return null;
}

export function enqueueOrderEvent(action, payload = {}) {
  try {
    void addOrderJob({ action, ...payload }).catch((err) => {
      logger.warn(`BullMQ enqueue order event failed: ${action} - ${err?.message || err}`);
    });

    const paymentAction = mapPaymentQueueAction(action, payload);
    if (paymentAction) {
      void addPaymentJob(
        { action: paymentAction, sourceAction: action, ...payload },
        payload?.orderMongoId
          ? { jobId: `payment-${paymentAction}-${String(payload.orderMongoId)}` }
          : {}
      ).catch((err) => {
        logger.warn(`BullMQ enqueue payment event failed: ${paymentAction} - ${err?.message || err}`);
      });
    }
  } catch (err) {
    logger.warn(`BullMQ enqueue order event failed (sync): ${action} - ${err?.message || err}`);
  }
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) * 1.35; // Apply routing multiplier for road distance approximation
}

export function generateFourDigitDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function sanitizeOrderForExternal(orderDoc) {
  const o = toOrderSnapshot(orderDoc);
  const pricing = extractOrderPricingSnapshot(o);
  if (Object.keys(pricing).length > 0) {
    o.pricing = pricing;
  }
  const payment = mergeOrderPaymentSnapshot(o);
  if (payment && Object.keys(payment).length > 0) {
    o.payment = payment;
  }
  delete o.deliveryOtp;
  delete o.pickupOtp;
  const dv = o.deliveryVerification;
  if (dv) {
    const d = dv.dropOtp || {};
    const p = dv.pickupOtp || {};
    o.deliveryVerification = {
      ...dv,
      dropOtp: {
        required: Boolean(d.required),
        verified: Boolean(d.verified),
      },
      pickupOtp: {
        required: Boolean(p.required !== false),
        verified: Boolean(p.verified),
      }
    };
  }
  o.orderMongoId = (o._id || orderDoc?._id || "").toString();
  // Ensure orderId field for UI always contains the pretty ID
  o.orderId = o.order_id || o.orderMongoId; 
  return o;
}

export function emitDeliveryDropOtpToUser(order, plainOtp) {
  try {
    const io = getIO();
    if (!io || !plainOtp || !order?.userId) return;
    io.to(rooms.user(order.userId)).emit("delivery_drop_otp", {
      orderMongoId: order._id?.toString?.(),
      orderId: order.order_id || order._id?.toString?.(),
      otp: plainOtp,
      message:
        "Share this OTP with your delivery partner to hand over the order.",
    });
  } catch (e) {
    logger.warn(`emitDeliveryDropOtpToUser failed: ${e?.message || e}`);
  }
}

export async function notifyOwnersSafely(targets, payload) {
  try {
    await sendNotificationToOwners(targets, payload);
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

export async function notifyOwnerSafely(target, payload) {
  try {
    await sendNotificationToOwner({ ...target, payload });
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

export function buildOrderIdentityFilter(orderIdOrMongoId) {
  const raw = String(orderIdOrMongoId || "").trim();
  if (!raw) return null;
  if (mongoose.isValidObjectId(raw))
    return { _id: new mongoose.Types.ObjectId(raw) };
  
  // Search BOTH underscore and camelCase variants for robust lookup
  return { 
    $or: [
        { order_id: raw },
        { orderId: raw }
    ]
  };
}

export function toGeoPoint(lat, lng) {
  if (lat == null || lng == null) return undefined;
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return { type: "Point", coordinates: [b, a] };
}

export function pushStatusHistory(order, { byRole, byId, from, to, note = "" }) {
  order.statusHistory.push({
    at: new Date(),
    byRole,
    byId: byId || undefined,
    from,
    to,
    note,
  });
}

export function normalizeOrderForClient(orderDoc) {
  const order = toOrderSnapshot(orderDoc);
  const mongoId = (order._id || orderDoc?._id || "").toString();
  const displayId = order.order_id || mongoId;
  const pricing = extractOrderPricingSnapshot(order);
  const payment = mergeOrderPaymentSnapshot(order);
  return {
    ...order,
    pricing,
    payment,
    subtotal: pricing?.subtotal ?? 0,
    total: pricing?.total ?? order?.total ?? 0,
    deliveryFee: pricing?.deliveryFee ?? 0,
    platformFee: pricing?.platformFee ?? 0,
    tax: pricing?.tax ?? 0,
    discount: pricing?.discount ?? 0,
    orderMongoId: mongoId,
    orderId: displayId,
    status: order?.orderStatus || order?.status || "",
    deliveredAt:
      order?.deliveryState?.deliveredAt || order?.deliveredAt || null,
    deliveryPartnerId:
      order?.dispatch?.deliveryPartnerId || order?.deliveryPartnerId || null,
    rating: order?.ratings?.restaurant?.rating ?? order?.rating ?? null,
    restaurantNote: order?.restaurantNote || "",
    cancellationReason: (order?.orderStatus?.includes('cancel') || order?.status?.includes('cancel')) 
      ? (order.statusHistory?.findLast(h => h.to?.includes('cancel'))?.note || "")
      : null,
    deliveryState: {
      ...(order?.deliveryState || {}),
      currentLocation: order?.lastRiderLocation?.coordinates?.length >= 2 ? {
        lat: order.lastRiderLocation.coordinates[1],
        lng: order.lastRiderLocation.coordinates[0]
      } : (order?.deliveryState?.currentLocation || null)
    }
  };
}

export async function applyAggregateRating(model, entityId, newRating) {
  if (!entityId) return;
  const doc = await model.findById(entityId).select("rating totalRatings");
  if (!doc) return;

  const totalRatings = Number(doc.totalRatings || 0);
  const currentAverage = Number(doc.rating || 0);
  const nextTotal = totalRatings + 1;
  const nextAverage = Number(
    ((currentAverage * totalRatings + Number(newRating)) / nextTotal).toFixed(1),
  );

  doc.totalRatings = nextTotal;
  doc.rating = nextAverage;
  await doc.save();
}

export function buildDeliverySocketPayload(orderDoc, restaurantDoc = null) {
  const order = toOrderSnapshot(orderDoc);
  const pricing = extractOrderPricingSnapshot(order);
  const payment = mergeOrderPaymentSnapshot(order);
  const total =
    pricing?.total ??
    order?.amounts?.totalCustomerPaid ??
    payment?.amountDue ??
    order?.total ??
    0;
  const restaurant = restaurantDoc || order?.restaurantId || null;
  const restaurantLocation = restaurant?.location || {};
  const deliveryAddress = order?.deliveryAddress || {};
  const customerAddressParts = [
    deliveryAddress.street,
    deliveryAddress.additionalDetails,
    deliveryAddress.city,
    deliveryAddress.state,
    deliveryAddress.zipCode,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  const orderMongoId =
    orderDoc?._id?.toString?.() || order?._id?.toString?.() || order?._id;
  const displayOrderId = order?.order_id || orderMongoId;

  return {
    _id: orderMongoId,
    orderMongoId,
    orderId: displayOrderId,
    status: orderDoc?.orderStatus || order?.orderStatus,
    items: order?.items || [],
    pricing,
    total,
    orderAmount: total,
    payment,
    paymentMethod: payment?.method || order?.paymentMethod || "",
    restaurantId:
      order?.restaurantId?._id?.toString?.() ||
      order?.restaurantId?.toString?.() ||
      order?.restaurantId,
    restaurantName: restaurant?.restaurantName || order?.restaurantName,
    restaurantAddress:
      restaurantLocation?.address ||
      restaurantLocation?.formattedAddress ||
      restaurant?.addressLine1 ||
      "",
    restaurantPhone: restaurant?.phone || "",
    restaurantLocation: {
      latitude: restaurantLocation?.latitude,
      longitude: restaurantLocation?.longitude,
      address:
        restaurantLocation?.address ||
        restaurantLocation?.formattedAddress ||
        restaurant?.addressLine1 ||
        "",
      area: restaurantLocation?.area || restaurant?.area || "",
      city: restaurantLocation?.city || restaurant?.city || "",
      state: restaurantLocation?.state || restaurant?.state || "",
    },
    deliveryAddress: order?.deliveryAddress,
    customerAddress: customerAddressParts.length ? customerAddressParts.join(', ') : "",
    customerName: order?.customerName || order?.deliveryAddress?.fullName || order?.deliveryAddress?.name || order?.userId?.name || "",
    customerPhone: order?.customerPhone || order?.deliveryAddress?.phone || order?.userId?.phone || "",
    userName: order?.customerName || order?.deliveryAddress?.fullName || order?.deliveryAddress?.name || order?.userId?.name || "",
    userPhone: order?.customerPhone || order?.deliveryAddress?.phone || order?.userId?.phone || "",
    note: order?.note || "",
    riderEarning: order?.riderEarning || 0,
    deliveryBonusAmount: order?.deliveryBonusAmount || 0,
    earnings: order?.riderEarning || pricing?.deliveryFee || 0,
    deliveryFee: pricing?.deliveryFee || 0,
    deliveryFleet: order?.deliveryFleet,
    dispatch: order?.dispatch,
    createdAt: order?.createdAt,
    updatedAt: order?.updatedAt,
  };
}

export function canExposeOrderToRestaurant(orderLike) {
  const method = String(orderLike?.payment?.method || "").toLowerCase();
  const status = String(orderLike?.payment?.status || "").toLowerCase();
  if (["cash", "wallet"].includes(method)) return true;
  return ["paid", "authorized", "captured", "settled"].includes(status);
}

export async function notifyRestaurantNewOrder(orderDoc) {
  try {
    if (!orderDoc) return;
    const hydratedOrder = await attachFinancialSnapshotToOrder(orderDoc);
    if (!canExposeOrderToRestaurant(hydratedOrder)) return;

    const io = getIO();
    if (io) {
      const payload = sanitizeOrderForExternal(hydratedOrder);
      logger.info(
        `[RestaurantOrders] Emitting new_order to ${rooms.restaurant(hydratedOrder.restaurantId)} for order ${hydratedOrder._id?.toString?.() || ''}`,
      );
      io.to(rooms.restaurant(hydratedOrder.restaurantId)).emit("new_order", payload);
    }

    await notifyOwnersSafely(
      [{ ownerType: "RESTAURANT", ownerId: hydratedOrder.restaurantId }],
      {
        title: "New order received",
        body: `Order #${hydratedOrder.order_id || hydratedOrder._id} is waiting for review.`,
        data: {
          type: "new_order",
          orderId: hydratedOrder._id.toString(),
          orderMongoId: hydratedOrder._id?.toString?.() || "",
          link: `/restaurant/orders/${hydratedOrder._id?.toString?.() || ""}`,
        },
      },
    );
  } catch {
    // Do not block order/payment flow if notification fails.
  }
}

export const STATUS_PRIORITY = {
  created: 10,
  confirmed: 20,
  preparing: 30,
  ready_for_pickup: 40,
  reached_pickup: 50,
  picked_up: 60,
  reached_drop: 70,
  delivered: 80,
  cancelled_by_user: 100,
  cancelled_by_restaurant: 100,
  cancelled_by_admin: 100,
  dead: 100,
};

/**
 * Returns true if the next status is a valid forward progression from the current status.
 * Prevents "reversing" order status (e.g. from Preparing back to Created).
 */
export function isStatusAdvance(current, next) {
  // If current status is missing, it's effectively 'created' or start of flow
  if (!current) return true;
  
  const currentPrio = STATUS_PRIORITY[current] || 0;
  const nextPrio = STATUS_PRIORITY[next] || 0;

  // Terminal states (100) cannot transition to anything else
  if (currentPrio >= 100) return false;
  
  // Delivered (80) cannot transition to anything (except maybe cancellation if allowed, but here we say no)
  if (currentPrio === 80) return false;

  // Special case: Cancellation is almost always an advance unless already delivered
  if (nextPrio === 100 && currentPrio < 80) return true;

  return nextPrio > currentPrio;
}
