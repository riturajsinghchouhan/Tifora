import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../../../../core/payments/paymentCollections.js';

const tiffinPayoutSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['restaurant_payout', 'delivery_salary'],
            required: true,
            index: true
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            default: null,
            index: true
        },
        deliveryPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            default: null,
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: 1
        },
        paymentMethod: {
            type: String,
            enum: ['Bank Transfer', 'UPI', 'Cash', 'Wallet', 'Other'],
            default: 'Bank Transfer'
        },
        bankDetails: {
            bankName: { type: String, default: '' },
            accountNumber: { type: String, default: '' },
            ifsc: { type: String, default: '' },
            accountHolder: { type: String, default: '' },
            upiId: { type: String, default: '' }
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'processing'],
            default: 'pending',
            index: true
        },
        transactionReference: {
            type: String,
            default: ''
        },
        rejectionReason: {
            type: String,
            default: ''
        },
        adminNote: {
            type: String,
            default: ''
        },
        deliveriesCount: {
            type: Number,
            default: 0
        },
        ratePerDelivery: {
            type: Number,
            default: 25
        },
        periodStart: {
            type: Date,
            default: null
        },
        periodEnd: {
            type: Date,
            default: null
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        processedAt: {
            type: Date,
            default: null
        },
        processedBy: {
            type: String,
            default: 'Admin'
        }
    },
    {
        collection: PAYMENT_COLLECTIONS.PAYMENT_TIFFIN_PAYOUTS,
        timestamps: true
    }
);

tiffinPayoutSchema.index({ type: 1, status: 1, createdAt: -1 });

export const TiffinPayout = mongoose.model('TiffinPayout', tiffinPayoutSchema);
