import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../../../../core/payments/paymentCollections.js';

const foodTransactionSchema = new mongoose.Schema({
    // Identifiers
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', required: true, index: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', index: true },

    // Core Payment Info
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'razorpay', 'razorpay_qr', 'wallet'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'], 
        default: 'pending',
        index: true 
    },
    currency: { type: String, default: 'INR' },

    // Snapshot of order pricing at the time transaction was created
    pricing: {
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        packagingFee: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        restaurantCommission: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, default: 'INR', trim: true },
    },

    // Snapshot of payment state at the time of transaction (source of truth for UI)
    payment: {
        method: { type: String, default: 'cash', trim: true },
        status: { type: String, default: 'cod_pending', trim: true },
        amountDue: { type: Number, default: 0 },
        razorpay: {
            orderId: { type: String, default: '' },
            paymentId: { type: String, default: '' },
            signature: { type: String, default: '' }
        },
        qr: {
            qrId: { type: String, default: '' },
            imageUrl: { type: String, default: '' },
            paymentLinkId: { type: String, default: '' },
            shortUrl: { type: String, default: '' },
            status: { type: String, default: '' },
            expiresAt: { type: Date, default: null }
        },
        refund: {
            status: {
                type: String,
                enum: ['none', 'initiated', 'pending', 'processed', 'failed'],
                default: 'none'
            },
            destination: {
                type: String,
                enum: ['source', 'wallet'],
                default: 'source'
            },
            amount: { type: Number, default: 0 },
            refundId: { type: String, default: '' },
            processedAt: { type: Date, default: null }
        }
    },

    // Financial Breakdown (The Split)
    amounts: {
        totalCustomerPaid: { type: Number, required: true },
        restaurantShare: { type: Number, required: true },
        restaurantCommission: { type: Number, required: true },
        gstOnItem: { type: Number, default: 0 },
        gstOnCommission: { type: Number, default: 0 },
        paymentGatewayFee: { type: Number, default: 0 },
        tcs: { type: Number, default: 0 },
        riderShare: { type: Number, required: true },
        platformNetProfit: { type: Number, required: true },
        taxAmount: { type: Number, default: 0 }
    },

    // Gateway / Provider Metadata
    gateway: {
        provider: { type: String, default: 'razorpay' },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        qrUrl: String,
        qrExpiresAt: Date
    },

    // Settlement Tracking
    settlement: {
        isRestaurantSettled: { type: Boolean, default: false },
        restaurantSettledAt: Date,
        isRiderSettled: { type: Boolean, default: false },
        riderSettledAt: Date,
        isPlatformSettled: { type: Boolean, default: false },
        platformSettledAt: Date
    },

    // Immutable finance-time snapshot for audit and reconciliation.
    orderSnapshot: {
        orderDisplayId: { type: String, default: '', trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', default: null },
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', default: null },
        deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', default: null },
        items: [{
            itemId: { type: String, default: '', trim: true },
            name: { type: String, default: '', trim: true },
            variantId: { type: String, default: '', trim: true },
            variantName: { type: String, default: '', trim: true },
            price: { type: Number, default: 0 },
            quantity: { type: Number, default: 0 },
            notes: { type: String, default: '', trim: true }
        }],
        deliveryAddress: {
            label: { type: String, default: '', trim: true },
            name: { type: String, default: '', trim: true },
            fullName: { type: String, default: '', trim: true },
            street: { type: String, default: '', trim: true },
            additionalDetails: { type: String, default: '', trim: true },
            city: { type: String, default: '', trim: true },
            state: { type: String, default: '', trim: true },
            zipCode: { type: String, default: '', trim: true },
            phone: { type: String, default: '', trim: true }
        },
        pricing: {
            subtotal: { type: Number, default: 0 },
            tax: { type: Number, default: 0 },
            packagingFee: { type: Number, default: 0 },
            deliveryFee: { type: Number, default: 0 },
            platformFee: { type: Number, default: 0 },
            restaurantCommission: { type: Number, default: 0 },
            gstOnItem: { type: Number, default: 0 },
            gstOnCommission: { type: Number, default: 0 },
            paymentGatewayFee: { type: Number, default: 0 },
            tcs: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            currency: { type: String, default: 'INR', trim: true }
        },
        paymentMethod: { type: String, default: 'cash', trim: true },
        orderStatus: { type: String, default: '', trim: true },
        createdAt: { type: Date, default: Date.now }
    },
    snapshotVersion: { type: Number, default: 1 },
    snapshotHash: { type: String, default: '', trim: true },

    // Audit History (Replacing FoodOrderPayment ledger)
    history: [{
        kind: { type: String, required: true }, // 'created', 'authorized', 'captured', 'refunded', 'settled'
        amount: Number,
        at: { type: Date, default: Date.now },
        note: String,
        recordedBy: { 
            role: { type: String }, 
            id: { type: mongoose.Schema.Types.ObjectId }
        }
    }]
}, { 
    collection: PAYMENT_COLLECTIONS.PAYMENT_FOOD_TRANSACTIONS,
    timestamps: true,
    autoCreate: false
});

// Powerful indexes for Finance & Analytics
foodTransactionSchema.index({ createdAt: -1 });
foodTransactionSchema.index({ 'settlement.isRestaurantSettled': 1, restaurantId: 1 });
foodTransactionSchema.index({ 'status': 1, paymentMethod: 1 });

export const FoodTransaction = mongoose.model('FoodTransaction', foodTransactionSchema);
