import mongoose from 'mongoose';
import { FoodOrder } from '../../modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../../modules/food/orders/models/foodTransaction.model.js';
import { Payment } from './models/payment.model.js';
import { Refund } from './models/refund.model.js';

function toMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
}

function normalizePaymentMethod(order, transaction) {
    return String(
        transaction?.payment?.method ||
        transaction?.paymentMethod ||
        transaction?.orderSnapshot?.paymentMethod ||
        'cash'
    ).toLowerCase();
}

function normalizePaymentSnapshotStatus(order, transaction) {
    return String(
        transaction?.payment?.status ||
        (normalizePaymentMethod(order, transaction) === 'cash' ? 'cod_pending' : 'created') ||
        'created'
    ).toLowerCase();
}

function mapCorePaymentStatus(order, transaction) {
    const snapshotStatus = normalizePaymentSnapshotStatus(order, transaction);

    if (['refunded'].includes(snapshotStatus)) return 'refunded';
    if (['paid', 'captured', 'authorized', 'settled'].includes(snapshotStatus)) {
        return 'success';
    }
    if (['failed', 'expired', 'cancelled', 'canceled'].includes(snapshotStatus)) {
        return 'failed';
    }

    const method = normalizePaymentMethod(order, transaction);
    if (method === 'cash' && snapshotStatus === 'cod_pending') return 'pending';
    if (method === 'razorpay_qr' && snapshotStatus === 'pending_qr') return 'pending';
    return 'created';
}

function mapGateway(method) {
    return ['razorpay', 'razorpay_qr'].includes(String(method || '').toLowerCase())
        ? 'razorpay'
        : 'none';
}

async function loadOrderFinance(orderId, session = null) {
    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const [order, transaction] = await Promise.all([
        FoodOrder.findById(orderObjectId).session(session),
        FoodTransaction.findOne({ orderId: orderObjectId }).session(session)
    ]);
    return { order, transaction };
}

function buildPaymentMetadata(order, transaction, source, existing = undefined) {
    return {
        ...(existing || {}),
        source,
        paymentSnapshotStatus: normalizePaymentSnapshotStatus(order, transaction),
        transactionStatus: transaction?.status || null,
        transactionId: transaction?._id || null
    };
}

export async function syncOrderPaymentRecord({
    orderId,
    orderDoc = null,
    transactionDoc = null,
    source = 'system',
    rawResponse = undefined,
    session = null
}) {
    const finance =
        orderDoc && transactionDoc
            ? { order: orderDoc, transaction: transactionDoc }
            : await loadOrderFinance(orderId, session);

    const order = finance.order;
    const transaction = finance.transaction;
    if (!order) return null;

    const method = normalizePaymentMethod(order, transaction);
    const gateway = mapGateway(method);
    const status = mapCorePaymentStatus(order, transaction);
    const amount = toMoney(
        transaction?.payment?.amountDue ??
        transaction?.pricing?.total ??
        transaction?.amounts?.totalCustomerPaid
    );
    const currency = String(
        transaction?.pricing?.currency ||
        'INR'
    );
    const gatewayOrderId = String(
        transaction?.payment?.razorpay?.orderId ||
        transaction?.gateway?.razorpayOrderId ||
        ''
    );
    const gatewayPaymentId = String(
        transaction?.payment?.razorpay?.paymentId ||
        transaction?.gateway?.razorpayPaymentId ||
        ''
    );

    let payment = await Payment.findOne({ orderId: order._id })
        .sort({ createdAt: -1 })
        .session(session);

    if (!payment) {
        payment = new Payment({
            orderId: order._id,
            userId: order.userId,
            amount,
            currency,
            method,
            gateway,
            gatewayOrderId,
            gatewayPaymentId,
            status,
            module: 'food',
            rawResponse,
            metadata: buildPaymentMetadata(order, transaction, source)
        });
    } else {
        payment.userId = order.userId;
        payment.amount = amount;
        payment.currency = currency;
        payment.method = method;
        payment.gateway = gateway;
        payment.gatewayOrderId = gatewayOrderId;
        payment.gatewayPaymentId = gatewayPaymentId;
        payment.status = status;
        payment.module = 'food';
        payment.metadata = buildPaymentMetadata(
            order,
            transaction,
            source,
            payment.metadata
        );
        if (rawResponse !== undefined) {
            payment.rawResponse = rawResponse;
        }
    }

    await payment.save({ session });
    return payment;
}

export async function syncOrderRefundRecord({
    orderId,
    orderDoc = null,
    transactionDoc = null,
    source = 'system',
    reason = '',
    session = null
}) {
    const finance =
        orderDoc && transactionDoc
            ? { order: orderDoc, transaction: transactionDoc }
            : await loadOrderFinance(orderId, session);

    const order = finance.order;
    const transaction = finance.transaction;
    if (!order) return null;

    const refundSnapshot =
        transaction?.payment?.refund || null;

    const refundStatus = String(refundSnapshot?.status || 'none').toLowerCase();
    if (!refundSnapshot || refundStatus === 'none') return null;

    const payment = await syncOrderPaymentRecord({
        orderId: order._id,
        orderDoc: order,
        transactionDoc: transaction,
        source,
        session
    });
    if (!payment) return null;

    const amount = toMoney(
        refundSnapshot?.amount ??
        transaction?.payment?.amountDue ??
        transaction?.pricing?.total ??
        transaction?.amounts?.totalCustomerPaid
    );
    const refundTo =
        String(refundSnapshot?.destination || 'source').toLowerCase() === 'wallet'
            ? 'wallet'
            : 'gateway';

    let refund = await Refund.findOne({
        paymentId: payment._id,
        orderId: order._id
    })
        .sort({ createdAt: -1 })
        .session(session);

    if (!refund) {
        refund = new Refund({
            paymentId: payment._id,
            orderId: order._id,
            userId: order.userId,
            amount,
            currency: payment.currency || 'INR',
            reason: reason || `Refund for order ${order.order_id || order._id}`,
            status: refundStatus === 'processed' ? 'processed' : refundStatus === 'failed' ? 'failed' : 'pending',
            refundTo,
            gatewayRefundId: String(refundSnapshot?.refundId || ''),
            processedAt: refundStatus === 'processed' ? refundSnapshot?.processedAt || new Date() : null,
            metadata: { source, transactionId: transaction?._id || null }
        });
    } else {
        refund.userId = order.userId;
        refund.amount = amount;
        refund.currency = payment.currency || 'INR';
        refund.reason = refund.reason || reason || `Refund for order ${order.order_id || order._id}`;
        refund.status = refundStatus === 'processed' ? 'processed' : refundStatus === 'failed' ? 'failed' : 'pending';
        refund.refundTo = refundTo;
        refund.gatewayRefundId = String(refundSnapshot?.refundId || '');
        refund.processedAt =
            refund.status === 'processed'
                ? refundSnapshot?.processedAt || refund.processedAt || new Date()
                : null;
        refund.metadata = {
            ...(refund.metadata || {}),
            source,
            transactionId: transaction?._id || null
        };
    }

    await refund.save({ session });

    if (payment.status !== 'refunded' && refund.status === 'processed') {
        payment.status = 'refunded';
        await payment.save({ session });
    }

    return refund;
}

export async function syncOrderFinanceDocuments({
    orderId,
    orderDoc = null,
    transactionDoc = null,
    source = 'system',
    rawResponse = undefined,
    refundReason = '',
    session = null
}) {
    const payment = await syncOrderPaymentRecord({
        orderId,
        orderDoc,
        transactionDoc,
        source,
        rawResponse,
        session
    });

    const refund = await syncOrderRefundRecord({
        orderId,
        orderDoc,
        transactionDoc,
        source,
        reason: refundReason,
        session
    });

    return { payment, refund };
}
