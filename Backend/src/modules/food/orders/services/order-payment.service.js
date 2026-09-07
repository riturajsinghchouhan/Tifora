import mongoose from 'mongoose';
import { FoodOrder } from '../models/order.model.js';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import {
  createRazorpayQrCode,
  fetchRazorpayQrCode,
  fetchRazorpayQrCodePayments,
  isRazorpayConfigured,
} from '../helpers/razorpay.helper.js';
import * as foodTransactionService from './foodTransaction.service.js';
import {
  buildOrderIdentityFilter,
  enqueueOrderEvent,
} from './order.helpers.js';

async function syncRazorpayQrPayment(orderDoc) {
  const tx = await FoodTransaction.findOne({ orderId: orderDoc?._id }).lean();
  const payment = tx?.payment || null;
  if (!payment) return null;
  if (!isRazorpayConfigured()) return payment;

  const qrId = String(payment?.qr?.qrId || payment?.qr?.paymentLinkId || '').trim();
  if (!qrId) return payment;

  const currentStatus = String(payment?.status || '').toLowerCase();
  if (currentStatus === 'paid' || currentStatus === 'refunded') {
    return payment;
  }

  const expectedAmountMajor = Number(
    payment?.amountDue ?? tx?.pricing?.total ?? tx?.amounts?.totalCustomerPaid ?? 0,
  ) || 0;
  const expectedAmountPaise = Math.max(0, Math.round(expectedAmountMajor * 100));

  let qrInfo = null;
  try {
    qrInfo = await fetchRazorpayQrCode(qrId);
  } catch (error) {
    logger.warn(
      `Razorpay QR fetch failed for ${qrId}: ${error?.message || error}`,
    );
  }

  let paymentsList = [];
  try {
    const qrPayments = await fetchRazorpayQrCodePayments(qrId);
    paymentsList = normalizeQrPaymentList(qrPayments);
  } catch (error) {
    logger.warn(
      `Razorpay QR payments fetch failed for ${qrId}: ${error?.message || error}`,
    );
  }

  const capturedPayments = paymentsList.filter((entry) =>
    ['captured'].includes(String(entry?.status || '').toLowerCase()),
  );
  const capturedAmountPaise = capturedPayments.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry?.amount || 0)),
    0,
  );
  const qrStatus = normalizeQrStatus(qrInfo?.status || payment?.qr?.status);
  const expiresAt =
    qrInfo?.close_by
      ? new Date(Number(qrInfo.close_by) * 1000)
      : payment?.qr?.expiresAt || null;

  if (capturedAmountPaise >= expectedAmountPaise && expectedAmountPaise > 0) {
    const latestPayment = capturedPayments[capturedPayments.length - 1] || {};
    const rzPaymentId = String(latestPayment?.id || latestPayment?.payment_id || payment?.razorpay?.paymentId || '');

    try {
      await foodTransactionService.applyPaymentCapture({
        orderId: orderDoc._id,
        razorpayOrderId: String(latestPayment?.order_id || qrId || ''),
        razorpayPaymentId: rzPaymentId,
        note: 'Razorpay QR Payment verified server-side',
        recordedByRole: 'SYSTEM'
      });
    } catch (err) {
      logger.warn(`Failed calling applyPaymentCapture for QR ${qrId}: ${err?.message || err}`);
    }

    await FoodTransaction.updateOne(
      { orderId: orderDoc?._id },
      {
        $set: {
          status: 'captured',
          paymentMethod: 'razorpay_qr',
          'payment.method': 'razorpay_qr',
          'payment.status': 'paid',
          'payment.amountDue': expectedAmountMajor,
          'payment.razorpay.orderId':
            String(latestPayment?.order_id || qrId || payment?.razorpay?.orderId || ''),
          'payment.razorpay.paymentId': rzPaymentId,
          'payment.razorpay.signature':
            String(latestPayment?.signature || payment?.razorpay?.signature || ''),
          'payment.qr.qrId': qrId,
          'payment.qr.paymentLinkId': qrId,
          'payment.qr.imageUrl': String(qrInfo?.image_url || payment?.qr?.imageUrl || ''),
          'payment.qr.status': 'paid',
          'payment.qr.amount': expectedAmountMajor,
          'payment.qr.expiresAt': expiresAt,
          'gateway.provider': 'razorpay',
          'gateway.razorpayPaymentId': rzPaymentId,
          'gateway.qrUrl': String(qrInfo?.image_url || payment?.qr?.imageUrl || ''),
          'gateway.qrExpiresAt': expiresAt,
        },
      },
    );

    const updatedTx = await FoodTransaction.findOne({ orderId: orderDoc?._id }).lean();
    return updatedTx?.payment || payment;
  }

  if (qrStatus && ['expired', 'closed', 'cancelled', 'canceled', 'failed'].includes(qrStatus)) {
    await FoodTransaction.updateOne(
      { orderId: orderDoc?._id },
      {
        $set: {
          'payment.qr.status': qrStatus,
          'payment.status': 'failed',
          'gateway.qrExpiresAt': expiresAt,
        },
      },
    );
    const updatedTx = await FoodTransaction.findOne({ orderId: orderDoc?._id }).lean();
    return updatedTx?.payment || payment;
  }

  if (qrStatus) {
    await FoodTransaction.updateOne(
      { orderId: orderDoc?._id },
      {
        $set: {
          'payment.qr.status': qrStatus,
          'gateway.qrExpiresAt': expiresAt,
        },
      },
    );
  }

  const updatedTx = await FoodTransaction.findOne({ orderId: orderDoc?._id }).lean();
  return updatedTx?.payment || payment;
}

function normalizeQrStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeQrPaymentList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.entity)) return payload.entity;
  if (Array.isArray(payload?.payments)) return payload.payments;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.collection)) return payload.collection;
  return [];
}

function isActiveQrRecord(qrRecord = {}) {
  const qrStatus = normalizeQrStatus(qrRecord?.status);
  if (!qrRecord?.qrId) return false;
  if (['paid', 'failed', 'expired', 'closed', 'cancelled', 'canceled'].includes(qrStatus)) {
    return false;
  }

  const expiresAt = qrRecord?.expiresAt ? new Date(qrRecord.expiresAt) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
    return false;
  }

  return true;
}

function buildCollectQrNotes(order, deliveryPartnerId, customerInfo, amountDue) {
  const userId = order?.userId?._id || order?.userId || '';
  const notes = {
    order_id: String(order?._id || ''),
    order_mongo_id: String(order?._id || ''),
    order_display_id: String(order?.order_id || order?.orderId || order?._id || ''),
    customer_id: String(userId || ''),
    user_id: String(userId || ''),
    amount: String(amountDue || 0),
    purpose: 'cod_order_collection',
  };

  if (deliveryPartnerId) {
    notes.delivery_partner_id = String(deliveryPartnerId);
  }
  if (customerInfo?.name) notes.customer_name = String(customerInfo.name);
  if (customerInfo?.email) notes.customer_email = String(customerInfo.email);
  if (customerInfo?.phone) notes.customer_phone = String(customerInfo.phone);

  return notes;
}

function buildQrResponse(payment) {
  const qr = payment?.qr || {};
  return {
    qr: {
      qrId: String(qr.qrId || ''),
      imageUrl: String(qr.imageUrl || ''),
      image_url: String(qr.imageUrl || ''),
      paymentLinkId: String(qr.paymentLinkId || qr.qrId || ''),
      status: String(qr.status || ''),
      amount: Number(qr.amount || 0),
      expiresAt: qr.expiresAt || null,
    },
    payment: payment || {},
  };
}

export async function createCollectQr(
  orderId,
  actorId,
  customerInfo = {},
  role = 'DELIVERY_PARTNER'
) {
  const query = mongoose.Types.ObjectId.isValid(orderId)
    ? { _id: orderId }
    : { orderId };

  const order = await FoodOrder.findOne(query)
    .populate('userId', 'name email phone')
    .lean();

  if (!order) throw new NotFoundError('Order not found');

  if (role === 'DELIVERY_PARTNER' && actorId) {
    if (
      order.dispatch?.deliveryPartnerId &&
      order.dispatch.deliveryPartnerId.toString() !== actorId.toString()
    ) {
      throw new ForbiddenError('Not your order');
    }
  } else if (role === 'USER' && actorId) {
    if (
      order.userId?._id?.toString() !== actorId.toString() &&
      order.userId?.toString() !== actorId.toString()
    ) {
      throw new ForbiddenError('Not your order');
    }
  }

  const tx = await FoodTransaction.findOne({ orderId: order._id }).lean();
  const payment = tx?.payment || order?.payment || {};
  const syncedPayment = await syncRazorpayQrPayment(order);
  const latestPayment = syncedPayment || payment;
  const latestStatus = String(latestPayment?.status || '').toLowerCase();
  if (['paid', 'captured', 'authorized'].includes(latestStatus)) {
    throw new ValidationError('Order already paid');
  }

  const amountDue =
    Number(latestPayment?.amountDue ?? tx?.pricing?.total ?? tx?.amounts?.totalCustomerPaid ?? order?.pricing?.total ?? 0) || 0;
  if (amountDue < 1) throw new ValidationError('No amount due');
  if (!isRazorpayConfigured()) {
    throw new ValidationError('QR payment not configured');
  }

  const existingQr = latestPayment?.qr || {};
  if (isActiveQrRecord(existingQr)) {
    return buildQrResponse(latestPayment);
  }

  const amountPaise = Math.round(amountDue * 100);
  const closeBy = Math.floor(Date.now() / 1000) + 30 * 60;
  const qr = await createRazorpayQrCode({
    type: 'upi_qr',
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: amountPaise,
    close_by: closeBy,
    description: `Order ${order.order_id || order._id.toString()} COD collection`,
    notes: buildCollectQrNotes(order, actorId, customerInfo, amountDue),
  });

  const qrId = String(qr?.id || qr?.qr_code_id || qr?.qrId || '').trim();
  const imageUrl = String(qr?.image_url || qr?.imageUrl || qr?.image || '').trim();
  const qrStatus = normalizeQrStatus(qr?.status || 'created');
  const expiresAt = qr?.close_by ? new Date(Number(qr.close_by) * 1000) : new Date(closeBy * 1000);
  const qrPayload = {
    qrId,
    imageUrl,
    paymentLinkId: qrId,
    shortUrl: String(qr?.short_url || qr?.shortUrl || ''),
    status: qrStatus || 'created',
    amount: amountDue,
    expiresAt,
    closeBy: expiresAt,
    notes: buildCollectQrNotes(order, actorId, customerInfo, amountDue),
    purpose: 'cod_order_collection',
  };

  await FoodTransaction.updateOne(
    { orderId: order._id },
    {
      $set: {
        paymentMethod: 'razorpay_qr',
        status: 'pending',
        'payment.method': 'razorpay_qr',
        'payment.status': 'pending_qr',
        'payment.amountDue': amountDue,
        'payment.qr': qrPayload,
        'gateway.provider': 'razorpay',
        'gateway.qrUrl': imageUrl,
        'gateway.qrExpiresAt': expiresAt,
      },
    },
  );

  const updatedTx = await FoodTransaction.findOne({ orderId: order._id }).lean();

  if (updatedTx) {
    await foodTransactionService.updateTransactionStatus(
      order._id,
      'cod_collect_qr_created',
      {
        recordedByRole: role,
        recordedById: actorId,
        note: 'COD collection QR created',
      },
    );
  }

  enqueueOrderEvent('collect_qr_created', {
    orderMongoId: String(order._id),
    orderId: order?.orderId || null,
    deliveryPartnerId: actorId,
    qrId,
    imageUrl,
    amountDue,
  });

  const refreshedTx = await FoodTransaction.findOne({ orderId: order._id }).lean();
  return buildQrResponse(refreshedTx?.payment || qrPayload);
}

export async function getPaymentStatus(orderId, actorId, role = 'DELIVERY_PARTNER') {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError('Order id required');

  const order = await FoodOrder.findOne(identity).select(
    'dispatch userId riderEarning platformProfit payment pricing amounts',
  );
  if (!order) throw new NotFoundError('Order not found');

  if (role === 'DELIVERY_PARTNER' && actorId) {
    if (
      order.dispatch?.deliveryPartnerId &&
      order.dispatch.deliveryPartnerId.toString() !== actorId.toString()
    ) {
      throw new ForbiddenError('Not your order');
    }
  } else if (role === 'USER' && actorId) {
    if (order.userId?.toString() !== actorId.toString()) {
      throw new ForbiddenError('Not your order');
    }
  }

  const transaction = await FoodTransaction.findOne({ orderId: order._id }).lean();
  if (transaction?.payment?.qr?.qrId) {
    await syncRazorpayQrPayment(order);
  }

  const refreshedTx = await FoodTransaction.findOne({ orderId: order._id }).lean();
  const payment = refreshedTx?.payment || {};
  const latestHistory =
    (refreshedTx?.history || []).sort((a, b) => (b.at || 0) - (a.at || 0))[0] ||
    null;
  const amountDue = Number(
    payment?.amountDue ?? refreshedTx?.pricing?.total ?? refreshedTx?.amounts?.totalCustomerPaid ?? order?.pricing?.total ?? 0,
  ) || 0;
  const paymentStatus = String(payment?.status || '').toLowerCase();
  const qrStatus = normalizeQrStatus(payment?.qr?.status);
  const expiresAt = payment?.qr?.expiresAt || null;

  return {
    payment,
    qr: payment?.qr || {},
    latestPaymentSnapshot: latestHistory,
    riderEarning: order.riderEarning ?? 0,
    platformProfit: order.platformProfit ?? 0,
    pricingTotal: refreshedTx?.pricing?.total ?? 0,
    transactionStatus: refreshedTx?.status ?? null,
    amountDue,
    isPaid: ['paid', 'captured', 'authorized'].includes(paymentStatus),
    qrStatus,
    expiresAt,
    shouldPoll: !['paid', 'captured', 'authorized', 'failed', 'expired', 'closed', 'cancelled', 'canceled'].includes(paymentStatus) && !['failed', 'expired', 'closed', 'cancelled', 'canceled', 'paid'].includes(qrStatus),
  };
}
