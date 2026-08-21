import crypto from 'crypto';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import { FoodRestaurantCommission } from '../../admin/models/restaurantCommission.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import mongoose from 'mongoose';

const RESTAURANT_COMMISSION_CACHE_MS = 60 * 1000;
let restaurantCommissionRulesCache = null;
let restaurantCommissionRulesLoadedAt = 0;

function toMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
}

function buildSnapshotHash(snapshot) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(snapshot))
        .digest('hex');
}

export function buildOrderSnapshot(order) {
    const items = Array.isArray(order?.items)
        ? order.items.map((item) => ({
            itemId: String(item?.itemId || ''),
            name: String(item?.name || ''),
            variantId: String(item?.variantId || ''),
            variantName: String(item?.variantName || ''),
            price: toMoney(item?.price),
            quantity: Number(item?.quantity || 0) || 0,
            notes: String(item?.notes || '')
        }))
        : [];

    return {
        orderDisplayId: String(order?.order_id || order?.orderId || order?._id || ''),
        userId: order?.userId?._id || order?.userId || null,
        restaurantId: order?.restaurantId?._id || order?.restaurantId || null,
        deliveryPartnerId:
            order?.dispatch?.deliveryPartnerId?._id ||
            order?.dispatch?.deliveryPartnerId ||
            order?.deliveryPartnerId ||
            null,
        items,
        deliveryAddress: {
            label: String(order?.deliveryAddress?.label || ''),
            name: String(order?.deliveryAddress?.name || ''),
            fullName: String(order?.deliveryAddress?.fullName || ''),
            street: String(order?.deliveryAddress?.street || ''),
            additionalDetails: String(order?.deliveryAddress?.additionalDetails || ''),
            city: String(order?.deliveryAddress?.city || ''),
            state: String(order?.deliveryAddress?.state || ''),
            zipCode: String(order?.deliveryAddress?.zipCode || ''),
            phone: String(order?.deliveryAddress?.phone || '')
        },
        pricing: {
            subtotal: toMoney(order?.pricing?.subtotal),
            tax: toMoney(order?.pricing?.tax),
            packagingFee: toMoney(order?.pricing?.packagingFee),
            deliveryFee: toMoney(order?.pricing?.deliveryFee),
            platformFee: toMoney(order?.pricing?.platformFee),
            restaurantCommission: toMoney(order?.pricing?.restaurantCommission),
            gstOnItem: toMoney(order?.pricing?.gstOnItem),
            gstOnCommission: toMoney(order?.pricing?.gstOnCommission),
            paymentGatewayFee: toMoney(order?.pricing?.paymentGatewayFee),
            tcs: toMoney(order?.pricing?.tcs),
            discount: toMoney(order?.pricing?.discount),
            total: toMoney(order?.pricing?.total),
            currency: String(order?.pricing?.currency || order?.currency || 'INR')
        },
        paymentMethod: String(order?.payment?.method || order?.paymentMethod || 'cash'),
        orderStatus: String(order?.orderStatus || ''),
        createdAt: order?.createdAt ? new Date(order.createdAt) : new Date()
    };
}

export function buildOrderPaymentMirror(transaction, existingPayment = {}) {
    return {
        ...existingPayment,
        method: String(transaction?.payment?.method || transaction?.paymentMethod || existingPayment?.method || 'cash'),
        status: String(transaction?.payment?.status || existingPayment?.status || 'cod_pending'),
        amountDue: toMoney(
            transaction?.payment?.amountDue ??
            transaction?.pricing?.total ??
            existingPayment?.amountDue ??
            0
        ),
        razorpay: {
            ...(existingPayment?.razorpay || {}),
            orderId: String(
                transaction?.payment?.razorpay?.orderId ||
                transaction?.gateway?.razorpayOrderId ||
                existingPayment?.razorpay?.orderId ||
                ''
            ),
            paymentId: String(
                transaction?.payment?.razorpay?.paymentId ||
                transaction?.gateway?.razorpayPaymentId ||
                existingPayment?.razorpay?.paymentId ||
                ''
            ),
            signature: String(
                transaction?.payment?.razorpay?.signature ||
                transaction?.gateway?.razorpaySignature ||
                existingPayment?.razorpay?.signature ||
                ''
            )
        },
        qr: {
            ...(existingPayment?.qr || {}),
            qrId: String(transaction?.payment?.qr?.qrId || existingPayment?.qr?.qrId || ''),
            imageUrl: String(transaction?.payment?.qr?.imageUrl || existingPayment?.qr?.imageUrl || ''),
            paymentLinkId: String(transaction?.payment?.qr?.paymentLinkId || existingPayment?.qr?.paymentLinkId || ''),
            shortUrl: String(transaction?.payment?.qr?.shortUrl || existingPayment?.qr?.shortUrl || ''),
            status: String(transaction?.payment?.qr?.status || existingPayment?.qr?.status || ''),
            expiresAt: transaction?.payment?.qr?.expiresAt || existingPayment?.qr?.expiresAt || null
        },
        refund: {
            ...(existingPayment?.refund || {}),
            status: String(transaction?.payment?.refund?.status || existingPayment?.refund?.status || 'none'),
            destination: String(
                transaction?.payment?.refund?.destination ||
                existingPayment?.refund?.destination ||
                'source'
            ),
            amount: toMoney(
                transaction?.payment?.refund?.amount ??
                existingPayment?.refund?.amount ??
                0
            ),
            refundId: String(
                transaction?.payment?.refund?.refundId ||
                existingPayment?.refund?.refundId ||
                ''
            ),
            processedAt:
                transaction?.payment?.refund?.processedAt ||
                existingPayment?.refund?.processedAt ||
                null
        }
    };
}

async function syncOrderPaymentMirror(orderId, transaction, session = null) {
    return null;
}

async function getActiveRestaurantCommissionRules() {
    const now = Date.now();
    if (
        restaurantCommissionRulesCache &&
        now - restaurantCommissionRulesLoadedAt < RESTAURANT_COMMISSION_CACHE_MS
    ) {
        return restaurantCommissionRulesCache;
    }

    const list = await FoodRestaurantCommission.find({
        status: { $ne: false },
    }).lean();
    restaurantCommissionRulesCache = list || [];
    restaurantCommissionRulesLoadedAt = now;
    return restaurantCommissionRulesCache;
}

export function computeRestaurantCommissionAmount(baseAmount, rule) {
    const safeBase = Math.max(0, Number(baseAmount) || 0);
    if (!Number.isFinite(safeBase) || safeBase < 0) return 0;

    const commissionType = rule?.defaultCommission?.type || 'percentage';
    const commissionValue = Math.max(
        0,
        Number(rule?.defaultCommission?.value ?? 0) || 0
    );

    let commissionAmount = 0;
    if (commissionType === 'percentage') {
        commissionAmount = safeBase * (commissionValue / 100);
    } else if (commissionType === 'amount') {
        commissionAmount = commissionValue;
    }

    // Round to 2 decimals and clamp to [0, base]
    commissionAmount = Math.round((commissionAmount || 0) * 100) / 100;
    commissionAmount = Math.max(0, Math.min(commissionAmount, safeBase));

    return { commissionAmount, commissionType, commissionValue, baseAmount: safeBase };
}

export async function getRestaurantCommissionSnapshot(orderDoc) {
    const baseAmount = Number(orderDoc?.pricing?.subtotal ?? 0) || 0;
    const restaurantIdRaw =
        orderDoc?.restaurantId?._id ?? orderDoc?.restaurantId ?? null;

    if (!restaurantIdRaw) {
        return {
            commissionAmount: 0,
            commissionType: 'percentage',
            commissionValue: 0,
            baseAmount,
            gstOnItem: 0,
            gstOnCommission: 0,
            paymentGatewayFee: 0,
            tcs: 0,
        };
    }

    const rules = await getActiveRestaurantCommissionRules();
    let rule =
        rules.find((r) => String(r.restaurantId) === String(restaurantIdRaw)) ||
        // Fallback: accept legacy docs where restaurantId may be stored under `restaurant` / `restaurant_id`
        rules.find((r) => String(r.restaurant || r.restaurant_id || '') === String(restaurantIdRaw)) ||
        null;

    if (!rule) {
        // If no specific rule, try to use global default
        const globalSettings = await FoodFeeSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean() || {};
        if (globalSettings.globalRestaurantCommission > 0) {
            rule = {
                defaultCommission: {
                    type: 'percentage',
                    value: globalSettings.globalRestaurantCommission
                }
            };
        }
    }

    const result = rule ? computeRestaurantCommissionAmount(baseAmount, rule) : {
        commissionAmount: 0,
        commissionType: 'percentage',
        commissionValue: 0,
        baseAmount,
    };

    const globalSettings = await FoodFeeSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean() || {};

    const applyTaxes = globalSettings.applyGlobalTaxes !== false;

    const gstOnItemRate = applyTaxes ? (Number(globalSettings.globalGstOnItem) || 0) : 0;
    const gstOnCommission = applyTaxes ? (Number(globalSettings.globalGstOnCommission) || 0) : 0;
    const pgFee = applyTaxes ? (Number(globalSettings.globalPaymentGatewayFee) || 0) : 0;
    const tcs = applyTaxes ? (Number(globalSettings.globalTcs) || 0) : 0;

    const totalPaid = Number(orderDoc?.pricing?.total) || 0;

    result.gstOnItem = Math.round(baseAmount * (gstOnItemRate / 100) * 100) / 100;
    result.gstOnCommission = Math.round(result.commissionAmount * (gstOnCommission / 100) * 100) / 100;
    result.paymentGatewayFee = Math.round(totalPaid * (pgFee / 100) * 100) / 100;
    result.tcs = Math.round(baseAmount * (tcs / 100) * 100) / 100;

    return result;
}

/**
 * Creates an initial 'pending' transaction when an order is created.
 */
export async function createInitialTransaction(order, options = {}) {
    const session = options?.session || null;
    const commissionSnapshot = await getRestaurantCommissionSnapshot(order);
    const orderSnapshot = buildOrderSnapshot(order);

    // Split logic
    const totalCustomerPaid = toMoney(order.pricing?.total);
    const riderShare = toMoney(order.riderEarning);

    const restaurantCommissionFromOrder = Number(order.pricing?.restaurantCommission);
    const restaurantCommission =
        Number.isFinite(restaurantCommissionFromOrder) && restaurantCommissionFromOrder > 0
            ? toMoney(restaurantCommissionFromOrder)
            : toMoney(commissionSnapshot.commissionAmount);

    const gstOnItemFromOrder = Number(order.pricing?.gstOnItem);
    const gstOnItem = Number.isFinite(gstOnItemFromOrder)
        ? toMoney(gstOnItemFromOrder)
        : toMoney(commissionSnapshot.gstOnItem);

    const gstOnCommission = toMoney(commissionSnapshot.gstOnCommission);
    const paymentGatewayFee = toMoney(commissionSnapshot.paymentGatewayFee);
    const tcs = toMoney(commissionSnapshot.tcs);

    const restaurantNet =
        toMoney(order.pricing?.subtotal) +
        toMoney(order.pricing?.packagingFee) -
        restaurantCommission -
        gstOnItem -
        gstOnCommission -
        paymentGatewayFee -
        tcs;

    const calculatedPlatformNetProfit =
        toMoney(order.pricing?.platformFee) +
        toMoney(order.pricing?.deliveryFee) +
        restaurantCommission +
        gstOnItem +
        paymentGatewayFee +
        tcs -
        riderShare;
    const platformNetProfit = order.platformProfit !== undefined
        ? toMoney(order.platformProfit)
        : Math.max(0, toMoney(calculatedPlatformNetProfit));

    const transaction = new FoodTransaction({
        orderId: order._id,

        userId: order.userId,
        restaurantId: order.restaurantId,
        deliveryPartnerId: order.dispatch?.deliveryPartnerId,
        paymentMethod: order.payment?.method || 'cash',
        status: order.payment?.status === 'paid' ? 'captured' : 'pending',
        payment: {
            method: String(order.payment?.method || 'cash'),
            status: String(order.payment?.status || 'cod_pending'),
            amountDue: toMoney(order.payment?.amountDue ?? order.pricing?.total ?? 0),
            razorpay: {
                orderId: String(order.payment?.razorpay?.orderId || ''),
                paymentId: String(order.payment?.razorpay?.paymentId || ''),
                signature: String(order.payment?.razorpay?.signature || ''),
            },
            qr: {
                qrId: String(order.payment?.qr?.qrId || ''),
                imageUrl: String(order.payment?.qr?.imageUrl || ''),
                paymentLinkId: String(order.payment?.qr?.paymentLinkId || ''),
                shortUrl: String(order.payment?.qr?.shortUrl || ''),
                status: String(order.payment?.qr?.status || ''),
                expiresAt: order.payment?.qr?.expiresAt || null,
            },
            refund: {
                status: String(order.payment?.refund?.status || 'none'),
                destination: String(order.payment?.refund?.destination || 'source'),
                amount: toMoney(order.payment?.refund?.amount),
                refundId: String(order.payment?.refund?.refundId || ''),
                processedAt: order.payment?.refund?.processedAt || null
            }
        },
        pricing: {
            subtotal: toMoney(order.pricing?.subtotal),
            tax: toMoney(order.pricing?.tax),
            packagingFee: toMoney(order.pricing?.packagingFee),
            deliveryFee: toMoney(order.pricing?.deliveryFee),
            platformFee: toMoney(order.pricing?.platformFee),
            restaurantCommission,
            discount: toMoney(order.pricing?.discount),
            total: toMoney(order.pricing?.total),
            currency: String(order.pricing?.currency || order.currency || 'INR'),
        },
        amounts: {
            totalCustomerPaid,
            restaurantShare: Math.max(0, restaurantNet),
            restaurantCommission,
            gstOnItem,
            gstOnCommission,
            paymentGatewayFee,
            tcs,
            riderShare,
            platformNetProfit,
            taxAmount: toMoney(order.pricing?.tax)
        },
        gateway: {
            razorpayOrderId: order.payment?.razorpay?.orderId,
            qrUrl: order.payment?.qr?.imageUrl
        },
        orderSnapshot,
        snapshotVersion: 1,
        snapshotHash: buildSnapshotHash(orderSnapshot),
        history: [{
            kind: 'created',
            amount: totalCustomerPaid,
            note: 'Initial transaction created with order'
        }]
    });

    await transaction.save({ session });

    // Link back to the order
    try {
        await mongoose.model('FoodOrder').updateOne(
            { _id: order._id },
            { $set: { transactionId: transaction._id } },
            session ? { session } : {}
        );
    } catch (err) {
        // Log but don't fail transaction if the backlink fails
    }

    return transaction;
}

/**
 * Updates transaction status (captured, settled, etc) and appends to history.
 */
export async function updateTransactionStatus(orderId, kind, details = {}) {
    const session = details?.session || null;
    const query = { orderId };
    const transaction = await FoodTransaction.findOne(query).session(session);
    if (!transaction) return null;

    if (details.status) transaction.status = details.status;
    if (details.razorpayPaymentId) transaction.gateway.razorpayPaymentId = details.razorpayPaymentId;
    if (details.razorpaySignature) transaction.gateway.razorpaySignature = details.razorpaySignature;
    if (details.razorpayOrderId) transaction.gateway.razorpayOrderId = details.razorpayOrderId;

    // Sync payment method if provided (e.g. switching from cash to QR)
    if (details.paymentMethod) {
        transaction.paymentMethod = details.paymentMethod;
        transaction.payment.method = details.paymentMethod;
    }

    if (details.razorpayOrderId) {
        transaction.payment.razorpay.orderId = details.razorpayOrderId;
    }
    if (details.razorpayPaymentId) {
        transaction.payment.razorpay.paymentId = details.razorpayPaymentId;
    }
    if (details.razorpaySignature) {
        transaction.payment.razorpay.signature = details.razorpaySignature;
    }

    if (details.paymentStatus) {
        transaction.payment.status = details.paymentStatus;
    } else if (details.status === 'captured') {
        transaction.payment.status = 'paid';
    } else if (details.status === 'refunded') {
        transaction.payment.status = 'refunded';
    } else if (details.status === 'failed') {
        transaction.payment.status = 'failed';
    }

    if (
        details.refundStatus ||
        details.refundDestination ||
        details.refundAmount !== undefined ||
        details.refundId ||
        details.refundProcessedAt
    ) {
        transaction.payment.refund = {
            ...((transaction.payment && transaction.payment.refund) || {}),
            status: details.refundStatus || transaction.payment?.refund?.status || 'none',
            destination:
                details.refundDestination ||
                transaction.payment?.refund?.destination ||
                'source',
            amount: details.refundAmount !== undefined
                ? toMoney(details.refundAmount)
                : toMoney(transaction.payment?.refund?.amount),
            refundId: details.refundId || transaction.payment?.refund?.refundId || '',
            processedAt:
                details.refundProcessedAt ||
                transaction.payment?.refund?.processedAt ||
                null
        };
    }

    transaction.history.push({
        kind,
        amount: transaction.amounts.totalCustomerPaid,
        at: new Date(),
        note: details.note || `Transaction updated: ${kind}`,
        recordedBy: { role: details.recordedByRole || 'SYSTEM', id: details.recordedById }
    });

    await transaction.save({ session });

    try {
        await syncOrderPaymentMirror(orderId, transaction, session);
    } catch (err) {
        console.error('Failed to sync transaction status to order:', err.message);
    }

    return transaction;
}

/**
 * Updates the rider in the transaction when an order is accepted.
 */
export async function updateTransactionRider(orderId, riderId) {
    const query = { orderId };
    return await FoodTransaction.findOneAndUpdate(
        query,
        {
            $set: {
                deliveryPartnerId: riderId,
                'orderSnapshot.deliveryPartnerId': riderId
            }
        },
        { new: true }
    );
}

export async function applyPaymentCapture({
    orderId,
    razorpayOrderId = '',
    razorpayPaymentId,
    razorpaySignature = '',
    session = null,
    note = 'Payment captured',
    recordedByRole = 'SYSTEM',
    recordedById = null
}) {
    const transaction = await FoodTransaction.findOne({ orderId }).session(session);
    if (!transaction) return null;

    if (
        transaction.status === 'captured' &&
        String(transaction.payment?.razorpay?.paymentId || '') === String(razorpayPaymentId || '')
    ) {
        await syncOrderPaymentMirror(orderId, transaction, session);
        return transaction;
    }

    transaction.status = 'captured';
    transaction.payment.status = 'paid';
    transaction.payment.method = transaction.payment.method || 'razorpay';
    transaction.payment.razorpay.orderId =
        razorpayOrderId || transaction.payment?.razorpay?.orderId || '';
    transaction.payment.razorpay.paymentId = razorpayPaymentId;
    transaction.payment.razorpay.signature =
        razorpaySignature || transaction.payment?.razorpay?.signature || '';
    transaction.gateway.razorpayOrderId =
        razorpayOrderId || transaction.gateway?.razorpayOrderId || '';
    transaction.gateway.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) {
        transaction.gateway.razorpaySignature = razorpaySignature;
    }

    transaction.history.push({
        kind: 'captured',
        amount: transaction.amounts.totalCustomerPaid,
        at: new Date(),
        note,
        recordedBy: { role: recordedByRole, id: recordedById }
    });

    await transaction.save({ session });
    await syncOrderPaymentMirror(orderId, transaction, session);
    return transaction;
}

export async function applyRefundUpdate({
    orderId,
    refundAmount,
    refundId = '',
    destination = 'source',
    refundStatus = 'processed',
    session = null,
    note = 'Refund processed',
    recordedByRole = 'SYSTEM',
    recordedById = null
}) {
    const transaction = await FoodTransaction.findOne({ orderId }).session(session);
    if (!transaction) return null;

    if (
        String(transaction.payment?.refund?.status || 'none') === 'processed' &&
        String(transaction.payment?.refund?.refundId || '') === String(refundId || '')
    ) {
        await syncOrderPaymentMirror(orderId, transaction, session);
        return transaction;
    }

    transaction.status = refundStatus === 'failed' ? transaction.status : 'refunded';
    transaction.payment.status = refundStatus === 'processed' ? 'refunded' : transaction.payment.status;
    transaction.payment.refund = {
        status: refundStatus,
        destination,
        amount: toMoney(refundAmount),
        refundId: String(refundId || ''),
        processedAt: refundStatus === 'processed' ? new Date() : null
    };

    transaction.history.push({
        kind: refundStatus === 'processed' ? 'refunded' : 'refund_failed',
        amount: toMoney(refundAmount),
        at: new Date(),
        note,
        recordedBy: { role: recordedByRole, id: recordedById }
    });

    await transaction.save({ session });
    await syncOrderPaymentMirror(orderId, transaction, session);
    return transaction;
}

/**
 * Marks restaurant as settled in the finance record.
 */
export async function settleRestaurant(orderId, adminId) {
    return await updateTransactionStatus(orderId, 'settled', {
        status: 'captured', // Ensure it's marked as captured if it was pending cash
        note: 'Restaurant payout settled by admin',
        recordedByRole: 'ADMIN',
        recordedById: adminId
    });
}
