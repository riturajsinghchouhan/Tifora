import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../paymentCollections.js';

const processedGatewayEventSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        providerEventId: {
            type: String,
            required: true,
            trim: true
        },
        eventType: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        providerOrderId: { type: String, default: '', trim: true },
        providerPaymentId: { type: String, default: '', trim: true },
        providerRefundId: { type: String, default: '', trim: true },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            default: null,
            index: true
        },
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodTransaction',
            default: null
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            default: null
        },
        payloadHash: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['processing', 'processed', 'failed'],
            default: 'processing',
            index: true
        },
        firstSeenAt: {
            type: Date,
            default: Date.now
        },
        processedAt: {
            type: Date,
            default: null
        },
        processingResult: {
            type: mongoose.Schema.Types.Mixed,
            default: undefined
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: undefined
        }
    },
    {
        collection: PAYMENT_COLLECTIONS.PAYMENT_GATEWAY_EVENTS,
        timestamps: true,
        autoCreate: false
    }
);

processedGatewayEventSchema.index(
    { provider: 1, providerEventId: 1 },
    { unique: true, name: 'provider_event_unique' }
);

export const ProcessedGatewayEvent = mongoose.model(
    'ProcessedGatewayEvent',
    processedGatewayEventSchema
);
