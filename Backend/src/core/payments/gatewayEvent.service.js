import crypto from 'crypto';
import { ProcessedGatewayEvent } from './models/processedGatewayEvent.model.js';

function stableSerialize(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys
            .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
            .join(',')}}`;
    }

    return JSON.stringify(value);
}

export function buildGatewayPayloadHash(payload) {
    return crypto
        .createHash('sha256')
        .update(stableSerialize(payload))
        .digest('hex');
}

export async function registerGatewayEvent({
    provider,
    providerEventId,
    eventType,
    payload,
    providerOrderId = '',
    providerPaymentId = '',
    providerRefundId = '',
    metadata = undefined
}) {
    const payloadHash = buildGatewayPayloadHash(payload);

    try {
        const eventDoc = await ProcessedGatewayEvent.create({
            provider,
            providerEventId,
            eventType,
            providerOrderId,
            providerPaymentId,
            providerRefundId,
            payloadHash,
            status: 'processing',
            firstSeenAt: new Date(),
            metadata
        });

        return {
            eventDoc,
            isDuplicate: false,
            payloadMismatch: false
        };
    } catch (error) {
        if (error?.code !== 11000) throw error;

        const existing = await ProcessedGatewayEvent.findOne({
            provider,
            providerEventId
        });

        const payloadMismatch =
            !!existing?.payloadHash && existing.payloadHash !== payloadHash;

        return {
            eventDoc: existing,
            isDuplicate: true,
            payloadMismatch
        };
    }
}

export async function markGatewayEventProcessed(eventId, updates = {}) {
    return ProcessedGatewayEvent.findByIdAndUpdate(
        eventId,
        {
            $set: {
                status: 'processed',
                processedAt: new Date(),
                processingResult: updates.processingResult,
                orderId: updates.orderId || null,
                transactionId: updates.transactionId || null,
                paymentId: updates.paymentId || null
            }
        },
        { new: true }
    );
}

export async function markGatewayEventFailed(eventId, error, updates = {}) {
    return ProcessedGatewayEvent.findByIdAndUpdate(
        eventId,
        {
            $set: {
                status: 'failed',
                processedAt: new Date(),
                processingResult: {
                    error: error?.message || String(error),
                    ...updates.processingResult
                },
                orderId: updates.orderId || null,
                transactionId: updates.transactionId || null,
                paymentId: updates.paymentId || null
            }
        },
        { new: true }
    );
}
