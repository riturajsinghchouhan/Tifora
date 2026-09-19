import mongoose from 'mongoose';
import { FoodOrder } from '../models/order.model.js';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { getIO, rooms } from '../../../../config/socket.js';
import * as foodTransactionService from './foodTransaction.service.js';
import { clearDeliveryOffersForOrder } from './order-dispatch.firebase.js';
import * as dispatchService from './order-dispatch.service.js';
import { emitOrderUpdate } from './order-delivery.service.js';
import {
  enqueueOrderEvent,
  generateFourDigitDeliveryOtp,
  notifyOwnerSafely,
  pushStatusHistory,
  sanitizeOrderForExternal,
} from './order.helpers.js';

/** Orders the restaurant has taken on, but that are not yet on a rider's bike. */
const BATCHABLE_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'reached_pickup',
];

/** Everything a rider still has to act on, pickup and drop phases included. */
const ACTIVE_BATCH_ORDER_STATUSES = [
  ...BATCHABLE_ORDER_STATUSES,
  'picked_up',
  'reached_drop',
];

/**
 * Batch screens also list finished orders, so "2 of 3 delivered" can be shown.
 * Acting on a batch (OTP request / pickup) still uses ACTIVE_BATCH_ORDER_STATUSES.
 */
const BATCH_VIEW_ORDER_STATUSES = [...ACTIVE_BATCH_ORDER_STATUSES, 'delivered'];

const PICKED_UP_STATUSES = ['picked_up', 'reached_drop', 'delivered'];

function normalizeOtpValue(value) {
  return String(value ?? '').replace(/\D/g, '').trim();
}

function isOtpMatch(expectedOtp, enteredOtp) {
  const expected = normalizeOtpValue(expectedOtp);
  const entered = normalizeOtpValue(enteredOtp);
  if (!expected || !entered) return false;
  if (entered === expected) return true;
  if (expected.length === 4 && entered.length > 4) {
    return entered.slice(-4) === expected;
  }
  return false;
}

function toObjectId(value, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(value || ''))) {
    throw new ValidationError(`Invalid ${label}: ${value}`);
  }
  return new mongoose.Types.ObjectId(String(value));
}

function prettyOrderId(order) {
  return order?.order_id || order?.orderId || order?._id?.toString?.() || '';
}

function buildBatchId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const salt = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BATCH-${stamp}-${salt}`;
}

/** Merge the authoritative money figures from FoodTransaction onto plain order objects. */
async function hydrateTransactions(orders = []) {
  const ids = orders.map((o) => o?._id).filter(Boolean);
  if (ids.length === 0) return orders;

  const rows = await FoodTransaction.find({ orderId: { $in: ids } }).lean();
  const byOrderId = new Map(rows.map((t) => [String(t.orderId), t]));

  return orders.map((order) => {
    const tx = byOrderId.get(String(order?._id));
    if (!tx) return order;
    return {
      ...order,
      paymentMethod: tx.payment?.method || tx.paymentMethod || order.paymentMethod,
      payment: tx.payment || order.payment,
      pricing: tx.pricing || order.pricing,
      amounts: tx.amounts || order.amounts,
      transactionStatus: tx.status || order.transactionStatus,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/**
 * Orders the restaurant accepted that no rider ever picked up - the queue the
 * admin works from. Orders already sitting in a batch are excluded.
 */
export async function listGroupedUnassignedOrders({ restaurantId } = {}) {
  const filter = {
    orderStatus: { $in: BATCHABLE_ORDER_STATUSES },
    'dispatch.status': { $in: ['unassigned', 'assigned', 'rejected'] },
    $or: [{ batchId: null }, { batchId: { $exists: false } }],
  };

  if (restaurantId) {
    filter.restaurantId = toObjectId(restaurantId, 'restaurantId');
  }

  const orders = await FoodOrder.find(filter)
    .sort({ createdAt: 1 })
    .populate(
      'restaurantId',
      'restaurantName name location addressLine1 area city state phone ownerPhone',
    )
    .populate('userId', 'name phone')
    .lean();

  const hydrated = await hydrateTransactions(orders);

  const grouped = new Map();
  for (const order of hydrated) {
    // Guard against orders whose restaurant document was removed.
    const restaurant = order.restaurantId;
    const key = String(restaurant?._id || order.restaurantId || 'unknown');
    if (!grouped.has(key)) {
      grouped.set(key, {
        restaurant:
          restaurant && restaurant._id
            ? restaurant
            : { _id: key, restaurantName: 'Unknown restaurant' },
        orders: [],
      });
    }
    grouped.get(key).orders.push({
      ...order,
      waitingSinceMinutes: Math.max(
        0,
        Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000),
      ),
    });
  }

  return [...grouped.values()];
}

/** Riders the admin can hand a batch to. Online riders first, offline last. */
export async function listAssignableDeliveryPartners({ onlineOnly = false } = {}) {
  const filter = { status: 'approved' };
  if (onlineOnly) filter.availabilityStatus = 'online';

  const partners = await FoodDeliveryPartner.find(filter)
    .select(
      '_id name phone zoneId profilePicture availabilityStatus lastLat lastLng lastLocationAt',
    )
    .lean();

  const partnerIds = partners.map((p) => p._id);
  const activeCounts = partnerIds.length
    ? await FoodOrder.aggregate([
        {
          $match: {
            'dispatch.deliveryPartnerId': { $in: partnerIds },
            orderStatus: { $in: ACTIVE_BATCH_ORDER_STATUSES },
          },
        },
        { $group: { _id: '$dispatch.deliveryPartnerId', count: { $sum: 1 } } },
      ])
    : [];
  const countByPartner = new Map(activeCounts.map((row) => [String(row._id), row.count]));

  return partners
    .map((partner) => ({
      ...partner,
      isOnline: partner.availabilityStatus === 'online',
      activeOrderCount: countByPartner.get(String(partner._id)) || 0,
    }))
    .sort(
      (a, b) =>
        Number(b.isOnline) - Number(a.isOnline) || a.activeOrderCount - b.activeOrderCount,
    );
}

/** Undo a partially built batch so a failed assign does not strand orders. */
async function rollbackBatch(batchId, orders) {
  try {
    await FoodOrder.updateMany(
      { _id: { $in: orders.map((o) => o._id) }, batchId },
      {
        $set: {
          batchId: null,
          'dispatch.status': 'unassigned',
          'dispatch.deliveryPartnerId': null,
        },
        $unset: { 'dispatch.acceptedAt': '' },
      },
    );
  } catch (error) {
    logger.error(
      `[MultiOrder] Rollback of batch ${batchId} failed: ${error?.message || error}`,
    );
  }
}

/**
 * Hand a set of same-restaurant orders to one rider as a single batch.
 *
 * The batch is marked `dispatch.status: 'accepted'` rather than 'assigned' on
 * purpose: an admin assignment is final, and the auto-dispatch sweeper
 * (processDispatchTimeout / tryAutoAssign) resets any 'assigned' order that has
 * no acceptedAt back to 'unassigned' after ~60s, which would silently undo it.
 */
export async function assignMultiOrderBatch({ orderIds, deliveryPartnerId, adminId = null }) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new ValidationError('Select at least one order to assign');
  }
  if (!deliveryPartnerId) {
    throw new ValidationError('deliveryPartnerId is required');
  }

  const uniqueOrderIds = [...new Set(orderIds.map((id) => String(id)))];
  const objectIds = uniqueOrderIds.map((id) => toObjectId(id, 'orderId'));
  const partnerObjectId = toObjectId(deliveryPartnerId, 'deliveryPartnerId');

  const partner = await FoodDeliveryPartner.findById(partnerObjectId)
    .select('_id name phone status availabilityStatus')
    .lean();
  if (!partner) throw new NotFoundError('Delivery partner not found');
  if (partner.status !== 'approved') {
    throw new ValidationError('This delivery partner is not approved yet');
  }

  const orders = await FoodOrder.find({ _id: { $in: objectIds } })
    .select('+pickupOtp')
    .lean();

  if (orders.length !== objectIds.length) {
    throw new NotFoundError('One or more of the selected orders no longer exist');
  }

  // A single restaurant OTP only makes sense for a single restaurant.
  const restaurantIds = new Set(orders.map((o) => String(o.restaurantId)));
  if (restaurantIds.size > 1) {
    throw new ValidationError(
      'All orders in a batch must belong to the same restaurant (the rider collects them with one pickup OTP)',
    );
  }

  for (const order of orders) {
    const label = `#${prettyOrderId(order)}`;
    if (!BATCHABLE_ORDER_STATUSES.includes(order.orderStatus)) {
      throw new ValidationError(
        `Order ${label} is '${order.orderStatus}' and can no longer be batched`,
      );
    }
    if (order.batchId) {
      throw new ValidationError(`Order ${label} is already part of batch ${order.batchId}`);
    }
    const assignedTo = String(order.dispatch?.deliveryPartnerId || '');
    if (
      order.dispatch?.status === 'accepted' &&
      assignedTo &&
      assignedTo !== String(partnerObjectId)
    ) {
      throw new ValidationError(`Order ${label} was already accepted by another rider`);
    }
  }

  const batchId = buildBatchId();
  const pickupOtp = generateFourDigitDeliveryOtp();
  const now = new Date();
  const restaurantId = orders[0].restaurantId;

  const assignedOrders = [];
  for (const snapshot of orders) {
    const updated = await FoodOrder.findOneAndUpdate(
      {
        _id: snapshot._id,
        orderStatus: { $in: BATCHABLE_ORDER_STATUSES },
        $and: [
          { $or: [{ batchId: null }, { batchId: { $exists: false } }] },
          // Re-check ownership at write time: a rider may have accepted this
          // order between the validation read above and this update.
          {
            $or: [
              { 'dispatch.status': { $ne: 'accepted' } },
              { 'dispatch.deliveryPartnerId': partnerObjectId },
            ],
          },
        ],
      },
      {
        $set: {
          batchId,
          pickupOtp,
          'dispatch.status': 'accepted',
          'dispatch.deliveryPartnerId': partnerObjectId,
          'dispatch.assignedAt': now,
          'dispatch.acceptedAt': now,
          'deliveryVerification.pickupOtp.required': true,
          'deliveryVerification.pickupOtp.verified': false,
          'deliveryVerification.pickupOtp.requestedAt': null,
        },
        $unset: { 'dispatch.dispatchingAt': '' },
        $push: {
          statusHistory: {
            at: now,
            byRole: 'ADMIN',
            byId: adminId || undefined,
            from: snapshot.dispatch?.status || 'unassigned',
            to: 'accepted',
            note: `Assigned to multi-order batch ${batchId}`,
          },
        },
      },
      { new: true },
    ).populate('restaurantId userId');

    if (!updated) {
      // Lost a race with the dispatcher or another admin; surface it instead of
      // leaving a half-built batch behind.
      if (assignedOrders.length > 0) {
        await rollbackBatch(batchId, assignedOrders);
      }
      throw new ValidationError(
        `Order #${prettyOrderId(snapshot)} changed while assigning. Refresh and try again.`,
      );
    }
    assignedOrders.push(updated);
  }

  // Side effects mirror acceptOrderDelivery so the rest of the system stays in sync.
  void (async () => {
    for (const order of assignedOrders) {
      try {
        await foodTransactionService.updateTransactionRider(order._id, partnerObjectId);
      } catch (error) {
        logger.error(
          `[MultiOrder] Failed linking rider to transaction for ${order._id}: ${
            error?.message || error
          }`,
        );
      }

      try {
        await clearDeliveryOffersForOrder(order, { includeAssignedPartner: true });
      } catch (error) {
        logger.warn(
          `[MultiOrder] Failed clearing offers for ${order._id}: ${error?.message}`,
        );
      }

      try {
        const io = getIO();
        if (io) {
          const claimedPayload = {
            orderId: prettyOrderId(order),
            orderMongoId: order._id.toString(),
            claimedBy: String(partnerObjectId),
          };
          // Dismiss the accept/reject popup everywhere else.
          for (const offer of order.dispatch?.offeredTo || []) {
            if (offer?.partnerId) {
              io.to(rooms.delivery(offer.partnerId)).emit('order_claimed', claimedPayload);
            }
          }
          io.to('all_delivery').emit('order_claimed', claimedPayload);
        }

        emitOrderUpdate(order, partnerObjectId, { sendMilestonePush: false });

        await notifyOwnerSafely(
          { ownerType: 'USER', ownerId: order.userId?._id || order.userId },
          {
            title: 'Delivery partner assigned',
            body: `A delivery partner has been assigned to Order #${prettyOrderId(order)}.`,
            data: {
              type: 'delivery_accepted',
              orderId: order._id.toString(),
              orderMongoId: order._id.toString(),
              link: '/food/user/orders',
            },
          },
        );
      } catch (error) {
        logger.error(
          `[MultiOrder] Notification fan-out failed for ${order._id}: ${
            error?.message || error
          }`,
        );
      }

      enqueueOrderEvent('delivery_accepted', {
        orderMongoId: order._id.toString(),
        orderId: order._id.toString(),
        deliveryPartnerId: String(partnerObjectId),
        dispatchStatus: 'accepted',
        orderStatus: order.orderStatus,
        batchId,
      });
    }

    try {
      const io = getIO();
      if (io) {
        io.to(rooms.delivery(partnerObjectId)).emit('multi_order_assigned', {
          batchId,
          orderCount: assignedOrders.length,
          orders: assignedOrders.map((o) => sanitizeOrderForExternal(o)),
        });
        io.to(rooms.restaurant(restaurantId)).emit('multi_order_batch_assigned', {
          batchId,
          orderCount: assignedOrders.length,
          orderIds: assignedOrders.map((o) => prettyOrderId(o)),
          partnerName: partner.name || '',
        });
      }

      await notifyOwnerSafely(
        { ownerType: 'DELIVERY_PARTNER', ownerId: partnerObjectId },
        {
          title: 'New multi-order batch assigned',
          body: `You have ${assignedOrders.length} orders to collect from ${
            assignedOrders[0]?.restaurantId?.restaurantName || 'the restaurant'
          } with one pickup OTP.`,
          data: { type: 'multi_order', batchId, link: '/food/delivery/multi-orders' },
        },
      );

      await notifyOwnerSafely(
        { ownerType: 'RESTAURANT', ownerId: restaurantId },
        {
          title: 'Rider assigned to multiple orders',
          body: `${
            partner.name || 'A rider'
          } will collect ${assignedOrders.length} orders together. One pickup OTP covers all of them.`,
          data: { type: 'multi_order_batch', batchId, link: '/food/restaurant/orders' },
        },
      );
    } catch (error) {
      logger.error(
        `[MultiOrder] Batch notification failed for ${batchId}: ${error?.message || error}`,
      );
    }
  })();

  return {
    batchId,
    assignedCount: assignedOrders.length,
    deliveryPartner: { _id: partner._id, name: partner.name, phone: partner.phone },
    orders: assignedOrders.map((o) => sanitizeOrderForExternal(o)),
  };
}

/**
 * Hand a batch back to normal dispatch.
 *
 * An assigned batch marks its rider 'accepted', which makes them "busy" and so
 * invisible to auto-dispatch until every order is delivered. Without a way out,
 * a mis-assigned batch (or a rider who went offline) strands both the orders and
 * the rider indefinitely. Orders already collected from the restaurant are left
 * alone - the rider physically has that food.
 */
export async function releaseMultiOrderBatch({ batchId, adminId = null }) {
  if (!batchId) throw new ValidationError('batchId is required');

  const orders = await FoodOrder.find({
    batchId: String(batchId),
    orderStatus: { $in: ACTIVE_BATCH_ORDER_STATUSES },
  }).lean();

  if (orders.length === 0) throw new NotFoundError('No active orders found for this batch');

  const releasable = orders.filter((o) => BATCHABLE_ORDER_STATUSES.includes(o.orderStatus));
  const collected = orders.filter((o) => !BATCHABLE_ORDER_STATUSES.includes(o.orderStatus));

  if (releasable.length === 0) {
    throw new ValidationError(
      'Every order in this batch has already been picked up from the restaurant and cannot be released',
    );
  }

  const partnerId = releasable[0].dispatch?.deliveryPartnerId || null;
  const now = new Date();

  await FoodOrder.updateMany(
    { _id: { $in: releasable.map((o) => o._id) } },
    {
      $set: {
        batchId: null,
        pickupOtp: '',
        'dispatch.status': 'unassigned',
        'dispatch.deliveryPartnerId': null,
        'deliveryVerification.pickupOtp.verified': false,
        'deliveryVerification.pickupOtp.requestedAt': null,
      },
      $unset: { 'dispatch.acceptedAt': '', 'dispatch.dispatchingAt': '' },
      $push: {
        statusHistory: {
          at: now,
          byRole: 'ADMIN',
          byId: adminId || undefined,
          from: 'accepted',
          to: 'unassigned',
          note: `Released from multi-order batch ${batchId}`,
        },
      },
    },
  );

  // Put them back in front of riders.
  for (const order of releasable) {
    try {
      await dispatchService.tryAutoAssign(order._id, { attempt: 1 });
    } catch (error) {
      logger.error(
        `[MultiOrder] Re-dispatch after release failed for ${order._id}: ${error?.message || error}`,
      );
    }
  }

  try {
    const io = getIO();
    if (io && partnerId) {
      io.to(rooms.delivery(partnerId)).emit('multi_order_released', {
        batchId: String(batchId),
        releasedCount: releasable.length,
      });
    }
    if (partnerId) {
      await notifyOwnerSafely(
        { ownerType: 'DELIVERY_PARTNER', ownerId: partnerId },
        {
          title: 'Batch withdrawn',
          body: `${releasable.length} order(s) were taken off your batch by admin.`,
          data: { type: 'multi_order_released', batchId: String(batchId) },
        },
      );
    }
  } catch (error) {
    logger.error(`[MultiOrder] Release notification failed: ${error?.message || error}`);
  }

  return {
    batchId: String(batchId),
    releasedCount: releasable.length,
    keptCount: collected.length,
  };
}

/* ------------------------------------------------------------------ */
/* Delivery partner                                                    */
/* ------------------------------------------------------------------ */

function groupOrdersByBatch(orders = []) {
  const grouped = new Map();
  for (const order of orders) {
    const key = order.batchId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        batchId: key,
        restaurant: order.restaurantId,
        deliveryPartner: order.dispatch?.deliveryPartnerId || null,
        orders: [],
      });
    }
    grouped.get(key).orders.push(order);
  }

  return [...grouped.values()].map((batch) => {
    const pickedUp = batch.orders.filter((o) => PICKED_UP_STATUSES.includes(o.orderStatus));
    const delivered = batch.orders.filter((o) => o.orderStatus === 'delivered');
    const total = batch.orders.length;

    // Still-to-deliver orders first, finished ones at the bottom.
    const orders = [...batch.orders].sort(
      (a, b) =>
        Number(a.orderStatus === 'delivered') - Number(b.orderStatus === 'delivered'),
    );

    return {
      ...batch,
      orders,
      totalOrders: total,
      pickedUpCount: pickedUp.length,
      deliveredCount: delivered.length,
      remainingCount: total - delivered.length,
      progressPercent: total ? Math.round((delivered.length / total) * 100) : 0,
      // The batch counts as collected once every order has left the restaurant.
      pickupVerified: batch.orders.every(
        (o) =>
          PICKED_UP_STATUSES.includes(o.orderStatus) ||
          o.deliveryVerification?.pickupOtp?.verified === true,
      ),
      pickupOtpRequestedAt:
        batch.orders.find((o) => o.deliveryVerification?.pickupOtp?.requestedAt)
          ?.deliveryVerification?.pickupOtp?.requestedAt || null,
    };
  });
}

export async function listAssignedBatches(deliveryPartnerId) {
  if (!deliveryPartnerId) throw new ValidationError('Delivery partner ID required');
  const partnerId = toObjectId(deliveryPartnerId, 'deliveryPartnerId');

  const orders = await FoodOrder.find({
    'dispatch.deliveryPartnerId': partnerId,
    batchId: { $ne: null },
    orderStatus: { $in: BATCH_VIEW_ORDER_STATUSES },
  })
    .populate(
      'restaurantId',
      'restaurantName name location addressLine1 area city state phone ownerPhone profileImage',
    )
    .populate('userId', 'name phone')
    .sort({ createdAt: 1 })
    .lean();

  const hydrated = await hydrateTransactions(orders);
  const safe = hydrated.map((order) => sanitizeOrderForExternal(order));

  // A batch with nothing left to deliver is done - drop it off the rider's list.
  return groupOrdersByBatch(safe).filter((batch) => batch.remainingCount > 0);
}

/** Admin view of every batch currently in flight. */
export async function listBatchesForAdmin() {
  const orders = await FoodOrder.find({
    batchId: { $ne: null },
    orderStatus: { $in: BATCH_VIEW_ORDER_STATUSES },
  })
    .populate('restaurantId', 'restaurantName name location')
    .populate('dispatch.deliveryPartnerId', 'name phone availabilityStatus')
    .sort({ createdAt: -1 })
    .lean();

  return groupOrdersByBatch(orders);
}

async function loadBatchForPartner(batchId, deliveryPartnerId, { withOtp = false } = {}) {
  if (!batchId) throw new ValidationError('batchId is required');
  const partnerId = toObjectId(deliveryPartnerId, 'deliveryPartnerId');

  let query = FoodOrder.find({
    batchId: String(batchId),
    orderStatus: { $in: ACTIVE_BATCH_ORDER_STATUSES },
  });
  if (withOtp) query = query.select('+pickupOtp');

  const orders = await query;
  if (orders.length === 0) {
    throw new NotFoundError('No active orders found for this batch');
  }

  const foreign = orders.find(
    (o) => String(o.dispatch?.deliveryPartnerId || '') !== String(partnerId),
  );
  if (foreign) throw new ForbiddenError('This batch is not assigned to you');

  return orders;
}

/**
 * Rider asks the restaurant for the one OTP that releases the whole batch.
 * Reuses the per-order `pickup_otp_reveal` event so the existing restaurant UI
 * shows it without any change there.
 */
export async function requestBatchPickupOtp(batchId, deliveryPartnerId) {
  const orders = await loadBatchForPartner(batchId, deliveryPartnerId, { withOtp: true });

  const pending = orders.filter((o) => !PICKED_UP_STATUSES.includes(o.orderStatus));
  if (pending.length === 0) {
    throw new ValidationError('This batch has already been picked up');
  }

  const otp = normalizeOtpValue(pending[0].pickupOtp);
  if (!otp) {
    throw new ValidationError(
      'Pickup OTP is missing for this batch. Ask admin to re-assign it.',
    );
  }

  const now = new Date();
  await FoodOrder.updateMany(
    { _id: { $in: pending.map((o) => o._id) } },
    { $set: { 'deliveryVerification.pickupOtp.requestedAt': now } },
  );

  const restaurantId = pending[0].restaurantId;
  const orderLabels = pending.map((o) => `#${prettyOrderId(o)}`);

  try {
    const io = getIO();
    if (io) {
      for (const order of pending) {
        io.to(rooms.restaurant(order.restaurantId)).emit('pickup_otp_reveal', {
          orderMongoId: order._id.toString(),
          orderId: prettyOrderId(order),
          otp,
          batchId: String(batchId),
          message: `Batch pickup: share this single code for all ${
            pending.length
          } orders (${orderLabels.join(', ')}).`,
        });
      }
      io.to(rooms.restaurant(restaurantId)).emit('batch_pickup_otp_reveal', {
        batchId: String(batchId),
        otp,
        orderIds: orderLabels,
        message: `One OTP releases all ${pending.length} orders in this batch.`,
      });
    }

    await notifyOwnerSafely(
      { ownerType: 'RESTAURANT', ownerId: restaurantId },
      {
        title: 'Batch pickup OTP requested',
        body: `The rider is collecting ${pending.length} orders (${orderLabels.join(
          ', ',
        )}). Share this single OTP: ${otp}`,
        data: {
          type: 'pickup_otp_request',
          batchId: String(batchId),
          otp: String(otp),
          link: '/food/restaurant/orders',
        },
      },
    );
  } catch (error) {
    logger.error(
      `[MultiOrder] Failed revealing batch OTP for ${batchId}: ${error?.message || error}`,
    );
  }

  return { batchId: String(batchId), orderCount: pending.length, requestedAt: now };
}

/**
 * One OTP moves every pending order in the batch to `picked_up`. Each order is
 * saved individually so status history, sockets and the event queue behave
 * exactly like a normal single-order pickup.
 */
export async function verifyBatchPickup({ batchId, deliveryPartnerId, otp }) {
  const entered = normalizeOtpValue(otp);
  if (!entered) throw new ValidationError('OTP is required');

  const orders = await loadBatchForPartner(batchId, deliveryPartnerId, { withOtp: true });
  const pending = orders.filter((o) => !PICKED_UP_STATUSES.includes(o.orderStatus));

  if (pending.length === 0) {
    return { batchId: String(batchId), pickedUpCount: 0, alreadyPickedUp: true };
  }

  const expected = pending[0].pickupOtp;
  if (!isOtpMatch(expected, entered)) {
    throw new ValidationError(
      'Invalid restaurant OTP. Ask the restaurant for the batch code.',
    );
  }

  const now = new Date();
  const pickedUp = [];

  for (const order of pending) {
    const from = order.orderStatus;
    order.orderStatus = 'picked_up';
    order.deliveryState = {
      ...(order.deliveryState?.toObject?.() || order.deliveryState || {}),
      currentPhase: 'en_route_to_delivery',
      status: 'picked_up',
      pickedUpAt: order.deliveryState?.pickedUpAt || now,
    };
    if (!order.deliveryVerification) order.deliveryVerification = {};
    if (!order.deliveryVerification.pickupOtp) order.deliveryVerification.pickupOtp = {};
    order.deliveryVerification.pickupOtp.required = true;
    order.deliveryVerification.pickupOtp.verified = true;
    order.markModified('deliveryVerification');

    pushStatusHistory(order, {
      byRole: 'DELIVERY_PARTNER',
      byId: deliveryPartnerId,
      from,
      to: 'picked_up',
      note: `Picked up with batch OTP (${batchId})`,
    });

    await order.save();
    pickedUp.push(order);

    emitOrderUpdate(order, deliveryPartnerId);
    enqueueOrderEvent('picked_up', {
      orderMongoId: order._id.toString(),
      orderId: order._id.toString(),
      deliveryPartnerId: String(deliveryPartnerId),
      batchId: String(batchId),
    });
  }

  return {
    batchId: String(batchId),
    pickedUpCount: pickedUp.length,
    alreadyPickedUp: false,
    orders: pickedUp.map((o) => sanitizeOrderForExternal(o)),
  };
}
