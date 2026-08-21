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
        if (event === 'payment.captured') {
            const paymentObj = payload?.payment?.entity || {};
            const rzOrderId = paymentObj.order_id;
            const rzPaymentId = paymentObj.id;

            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const existingTransaction = await FoodTransaction.findOne({
                        $or: [
                            { 'payment.razorpay.orderId': rzOrderId },
                            { 'gateway.razorpayOrderId': rzOrderId }
                        ]
                    }).session(session);
                    if (!existingTransaction?.orderId) return;

                    const order = await FoodOrder.findById(existingTransaction.orderId).session(session);

                    if (!order) return;

                    const transaction = await foodTransactionService.applyPaymentCapture({
                        orderId: order._id,
                        razorpayOrderId: rzOrderId,
                        razorpayPaymentId: rzPaymentId,
                        note: 'Payment status synced via webhook payment.captured',
                        recordedByRole: 'SYSTEM',
                        session
                    });

                    await syncOrderFinanceDocuments({
                        orderId: order._id,
                        orderDoc: order,
                        transactionDoc: transaction,
                        source: 'razorpay_webhook_payment_captured',
                        rawResponse: paymentObj,
                        session
                    });

                    orderId = order._id;
                    transactionId = transaction?._id || null;
                });
            } finally {
                session.endSession();
            }

            if (orderId) {
                logger.info(`Webhook [payment.captured]: Synced order ${String(orderId)} (Status=paid)`);
            } else {
                logger.warn(`Webhook [payment.captured]: Order not found or already paid for RZ-Order: ${rzOrderId}`);
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
