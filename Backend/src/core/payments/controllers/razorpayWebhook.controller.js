import crypto from 'crypto';
import mongoose from 'mongoose';
import { FoodOrder } from '../../../modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../../../modules/food/orders/models/foodTransaction.model.js';
import * as foodTransactionService from '../../../modules/food/orders/services/foodTransaction.service.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { syncOrderFinanceDocuments } from '../foodFinance.service.js';
import {
    registerGatewayEvent,
    markGatewayEventFailed,
    markGatewayEventProcessed
} from '../gatewayEvent.service.js';
import {
    notifyRestaurantNewOrder,
    notifyOwnersSafely,
    enqueueOrderEvent
} from '../../../modules/food/orders/services/order.helpers.js';
import { addOrderJob } from '../../../queues/producers/order.producer.js';
import { captureRazorpayPayment } from '../../../modules/food/orders/helpers/razorpay.helper.js';

function extractWebhookRefs(event, payload) {
    const paymentEntity = payload?.payment?.entity || null;
    const refundEntity = payload?.refund?.entity || null;

    return {
        providerOrderId: String(
            paymentEntity?.order_id ||
            refundEntity?.notes?.order_id ||
            ''
        ),
        providerPaymentId: String(
            paymentEntity?.id ||
            refundEntity?.payment_id ||
            ''
        ),
        providerRefundId: String(refundEntity?.id || ''),
        fallbackEventId: `${event}:${paymentEntity?.id || refundEntity?.id || paymentEntity?.order_id || Date.now()}`
    };
}

/**
 * Centralized Razorpay webhook handler.
 * Stores the event first, then applies business updates in a duplicate-safe path.
 */
export const handleRazorpayWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.razorpayWebhookSecret;

    if (!signature || !secret || !req.rawBody) {
        logger.warn('Razorpay Webhook: Missing signature or rawBody buffer.');
        return res.status(400).send('Invalid signature');
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    if (expected !== signature) {
        logger.warn('Razorpay Webhook: Signature verification failed.');
        return res.status(400).send('Invalid signature');
    }

    const { event, payload } = req.body;
    const refs = extractWebhookRefs(event, payload);
    const providerEventId = String(
        req.headers['x-razorpay-event-id'] || refs.fallbackEventId
    );

    logger.info(`Razorpay Webhook Received: ${event}`);

    const registeredEvent = await registerGatewayEvent({
        provider: 'razorpay',
        providerEventId,
        eventType: event,
        payload,
        providerOrderId: refs.providerOrderId,
        providerPaymentId: refs.providerPaymentId,
        providerRefundId: refs.providerRefundId,
        metadata: {
            signaturePresent: !!signature
        }
    });

    if (registeredEvent.isDuplicate) {
        if (registeredEvent.payloadMismatch) {
            logger.error(
                `Razorpay Webhook duplicate payload mismatch for event ${providerEventId}`
            );
        } else {
            logger.info(`Razorpay Webhook duplicate ignored: ${providerEventId}`);
        }

        return res.status(200).json({
            status: 'duplicate',
            eventId: providerEventId
        });
    }

    let orderId = null;
    let transactionId = null;

    try {
        // `payment.authorized` is handled alongside `payment.captured`. An authorised
        // payment means Razorpay is already holding the customer's money; if nothing
        // captures it, Razorpay voids the authorisation after a few days and the
        // order would meanwhile have been auto-cancelled as "never paid". So capture
        // it here, then apply exactly the same order/finance updates.
        if (event === 'payment.captured' || event === 'payment.authorized') {
            const paymentObj = payload?.payment?.entity || {};

            if (event === 'payment.authorized') {
                const captureResult = await captureRazorpayPayment(
                    paymentObj.id,
                    Number(paymentObj.amount || 0),
                    paymentObj.currency || 'INR'
                );

                if (!captureResult.success) {
                    // Do not mark the order paid against money we could not claim.
                    // Razorpay retries this webhook, and the watchdog reconciliation
                    // will retry the capture too.
                    logger.error(
                        `Webhook [payment.authorized]: capture failed for payment ${paymentObj.id} (${captureResult.error}). Order left unconfirmed; will retry via reconciliation.`
                    );
                    await markGatewayEventProcessed(registeredEvent.eventDoc._id, {
                        processingResult: { event, status: 'capture_failed', error: captureResult.error }
                    });
                    return res.status(200).json({ status: 'capture_failed' });
                }

                logger.info(`Webhook [payment.authorized]: captured payment ${paymentObj.id}.`);
            }

            const rzOrderId = String(paymentObj.order_id || '').trim();
            const rzPaymentId = String(paymentObj.id || '').trim();
            const qrCodeId = String(paymentObj.qr_code_id || '').trim();
            const noteOrderId = String(paymentObj.notes?.order_id || paymentObj.notes?.order_mongo_id || '').trim();
            const capturedAmountPaise = Number(paymentObj.amount || 0);
            // Track if this is a fresh capture (used to fire notifications after commit)
            let isNewCapture = false;
            let capturedOrder = null;

            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const orConditions = [];
                    if (rzOrderId) {
                        orConditions.push({ 'payment.razorpay.orderId': rzOrderId });
                        orConditions.push({ 'gateway.razorpayOrderId': rzOrderId });
                    }
                    if (qrCodeId) {
                        orConditions.push({ 'payment.qr.qrId': qrCodeId });
                        orConditions.push({ 'payment.qr.paymentLinkId': qrCodeId });
                        orConditions.push({ 'gateway.qrId': qrCodeId });
                    }
                    if (noteOrderId && mongoose.Types.ObjectId.isValid(noteOrderId)) {
                        orConditions.push({ orderId: new mongoose.Types.ObjectId(noteOrderId) });
                    }

                    if (orConditions.length === 0) return;

                    const existingTransaction = await FoodTransaction.findOne({
                        $or: orConditions
                    }).session(session);
                    if (!existingTransaction?.orderId) return;

                    // Track if this is a fresh capture (not already marked paid)
                    const priorPaymentStatus = String(existingTransaction?.payment?.status || '').toLowerCase();
                    if (priorPaymentStatus !== 'paid') {
                        isNewCapture = true;
                    }

                    const order = await FoodOrder.findById(existingTransaction.orderId).session(session);
                    if (!order) return;

                    // If the 15-minute watchdog (or a manual cancel) already
                    // flipped this order to cancelled before this webhook arrived, the payment
                    // still went through — restore the order instead of leaving it stuck as
                    // "cancelled" with a "paid" transaction underneath it.
                    const cancelledStatuses = ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin', 'dead'];
                    if (cancelledStatuses.includes(order.orderStatus)) {
                        const fromStatus = order.orderStatus;
                        order.orderStatus = 'created';
                        order.statusHistory.push({
                            at: new Date(),
                            byRole: 'SYSTEM',
                            from: fromStatus,
                            to: 'created',
                            note: 'Payment captured via Razorpay webhook after order was auto-cancelled; order restored'
                        });
                        await order.save({ session });
                        logger.warn(`Webhook [payment.captured]: Order ${order._id} was ${fromStatus} but payment was captured — restored to created.`);
                    }

                    const expectedAmountMajor = Number(
                        existingTransaction?.payment?.amountDue ??
                        existingTransaction?.pricing?.total ??
                        existingTransaction?.amounts?.totalCustomerPaid ??
                        order?.pricing?.total ?? 0
                    ) || 0;
                    const expectedAmountPaise = Math.round(expectedAmountMajor * 100);

                    if (capturedAmountPaise < expectedAmountPaise && expectedAmountPaise > 0) {
                        logger.warn(`Webhook [payment.captured]: Captured amount (${capturedAmountPaise} paise) is less than expected (${expectedAmountPaise} paise) for Order ${order._id}`);
                        return;
                    }

                    const transaction = await foodTransactionService.applyPaymentCapture({
                        orderId: order._id,
                        razorpayOrderId: rzOrderId || qrCodeId || existingTransaction.payment?.razorpay?.orderId || '',
                        razorpayPaymentId: rzPaymentId,
                        note: `Payment status synced via webhook ${event}`,
                        recordedByRole: 'SYSTEM',
                        session
                    });

                    // FIX: Only overwrite paymentMethod for QR payments.
                    // For standard Razorpay (card/UPI/netbanking), preserve existing paymentMethod.
                    // Previously this block ran for ALL payment types, corrupting refund routing.
                    if (qrCodeId) {
                        await FoodTransaction.updateOne(
                            { _id: existingTransaction._id },
                            {
                                $set: {
                                    'payment.qr.status': 'paid',
                                    'payment.status': 'paid',
                                    'payment.method': 'razorpay_qr',
                                    'paymentMethod': 'razorpay_qr',
                                }
                            },
                            { session }
                        );
                    }
                    // Only relabel the transaction as a QR collection when the payment
                    // actually came through a QR code. This used to be unconditional,
                    // which rewrote ordinary checkout orders as `razorpay_qr` and fed
                    // the wrong method into finance reporting and the COD flow.
                    const isQrPayment = Boolean(qrCodeId);
                    await FoodTransaction.updateOne(
                        { _id: existingTransaction._id },
                        {
                            $set: {
                                'payment.status': 'paid',
                                ...(isQrPayment
                                    ? {
                                        'payment.qr.status': 'paid',
                                        'payment.method': 'razorpay_qr',
                                        'paymentMethod': 'razorpay_qr',
                                    }
                                    : {}),
                            }
                        },
                        { session }
                    );

                    await syncOrderFinanceDocuments({
                        orderId: order._id,
                        orderDoc: order,
                        transactionDoc: transaction,
                        source: `razorpay_webhook_${String(event).replace('.', '_')}`,
                        rawResponse: paymentObj,
                        session
                    });

                    orderId = order._id;
                    transactionId = transaction?._id || null;
                    capturedOrder = order;
                });
            } finally {
                session.endSession();
            }

            if (orderId) {
                logger.info(`Webhook [payment.captured]: Synced order ${String(orderId)} (newCapture=${isNewCapture})`);

                // Fire downstream side-effects for fresh captures.
                // These are non-transactional — a failure here does NOT roll back the payment.
                // Mirrors what finalizeCapturedPayment does in the normal verifyPayment path.
                if (isNewCapture && capturedOrder) {
                    try {
                        await notifyRestaurantNewOrder(capturedOrder);
                    } catch (err) {
                        logger.warn(`Webhook [payment.captured]: Restaurant notify failed for ${String(orderId)}: ${err?.message}`);
                    }
                    try {
                        await notifyOwnersSafely(
                            [{ ownerType: 'USER', ownerId: capturedOrder.userId }],
                            {
                                title: 'Payment Successful! ✅',
                                body: `Aapka payment receive ho gaya! Order #${capturedOrder.order_id || capturedOrder._id.toString()} process ho raha hai.`,
                                image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                                data: {
                                    type: 'payment_success',
                                    orderId: String(capturedOrder.order_id || capturedOrder._id.toString()),
                                    orderMongoId: String(capturedOrder._id),
                                },
                            }
                        );
                    } catch (err) {
                        logger.warn(`Webhook [payment.captured]: Customer notify failed for ${String(orderId)}: ${err?.message}`);
                    }
                    try {
                        enqueueOrderEvent('payment_verified', {
                            orderMongoId: String(capturedOrder._id),
                            orderId: capturedOrder.order_id || capturedOrder._id.toString(),
                            userId: capturedOrder.userId?.toString?.(),
                            source: 'razorpay_webhook'
                        });
                        addOrderJob(
                            {
                                action: 'SYNC_PETPOOJA',
                                orderId: capturedOrder.order_id || capturedOrder._id.toString(),
                                orderMongoId: capturedOrder._id.toString()
                            },
                            { jobId: `petpooja-webhook-${capturedOrder._id.toString()}`, delay: 2000 }
                        );
                    } catch (err) {
                        logger.warn(`Webhook [payment.captured]: Event enqueue failed for ${String(orderId)}: ${err?.message}`);
                    }
                }
                logger.info(`Webhook [${event}]: Synced order ${String(orderId)} (Status=paid)`);
            } else {
                logger.warn(`Webhook [${event}]: Order not found or already paid for RZ-Order: ${rzOrderId || qrCodeId}`);
            }
        }

        if (event === 'refund.processed') {
            const refundObj = payload?.refund?.entity || {};
            const rzPaymentId = refundObj.payment_id;
            const rzRefundId = refundObj.id;
            const refundAmount = Number(refundObj.amount || 0) / 100;

            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const existingTransaction = await FoodTransaction.findOne({
                        $or: [
                            { 'payment.razorpay.paymentId': rzPaymentId },
                            { 'gateway.razorpayPaymentId': rzPaymentId }
                        ]
                    }).session(session);
                    if (!existingTransaction?.orderId) return;

                    const order = await FoodOrder.findById(existingTransaction.orderId).session(session);

                    if (!order) return;

                    const transaction = await foodTransactionService.applyRefundUpdate({
                        orderId: order._id,
                        refundAmount,
                        refundId: rzRefundId,
                        destination: existingTransaction.payment?.refund?.destination || 'source',
                        refundStatus: 'processed',
                        note: 'Refund status synced via webhook refund.processed',
                        recordedByRole: 'SYSTEM',
                        session
                    });

                    await syncOrderFinanceDocuments({
                        orderId: order._id,
                        orderDoc: order,
                        transactionDoc: transaction,
                        source: 'razorpay_webhook_refund_processed',
                        rawResponse: refundObj,
                        refundReason: 'Refund processed via Razorpay webhook',
                        session
                    });

                    orderId = order._id;
                    transactionId = transaction?._id || null;
                });
            } finally {
                session.endSession();
            }

            if (orderId) {
                logger.info(`Webhook [refund.processed]: Synced order ${String(orderId)} (Refunded)`);
            } else {
                logger.warn(`Webhook [refund.processed]: Order not found or already refunded for RZ-Payment: ${rzPaymentId}`);
            }
        }

        await markGatewayEventProcessed(registeredEvent.eventDoc._id, {
            orderId,
            transactionId,
            processingResult: {
                event,
                status: 'ok'
            }
        });

        return res.status(200).json({ status: 'ok' });
    } catch (err) {
        logger.error(`Razorpay Webhook Logic Error: ${err.message}`);
        await markGatewayEventFailed(registeredEvent.eventDoc._id, err, {
            orderId,
            transactionId,
            processingResult: {
                event
            }
        });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
