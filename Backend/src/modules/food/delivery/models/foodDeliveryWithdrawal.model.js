import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../../../../core/payments/paymentCollections.js';

const foodDeliveryWithdrawalSchema = new mongoose.Schema({
    deliveryPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryPartner',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: [1, 'Minimum withdrawal amount is ₹1']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    paymentMethod: {
        type: String,
        default: 'bank_transfer'
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountHolderName: String
    },
    upiId: String,
    upiQrCode: String,
    adminNote: String,
    rejectionReason: String,
    transactionId: String, // Final bank transaction reference from admin
    processedAt: Date
}, { 
    collection: PAYMENT_COLLECTIONS.PAYMENT_DELIVERY_WITHDRAWALS,
    timestamps: true 
});

foodDeliveryWithdrawalSchema.index({ createdAt: -1 });

export const FoodDeliveryWithdrawal = mongoose.model('FoodDeliveryWithdrawal', foodDeliveryWithdrawalSchema);
