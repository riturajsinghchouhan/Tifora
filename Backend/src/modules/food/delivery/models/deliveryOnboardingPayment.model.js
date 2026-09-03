import mongoose from 'mongoose';

const deliveryOnboardingPaymentSchema = new mongoose.Schema(
    {
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            default: null,
            index: true
        },
        applicantName: {
            type: String,
            trim: true,
            default: ''
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            trim: true,
            default: ''
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed'],
            default: 'created',
            index: true
        },
        gateway: {
            type: String,
            enum: ['razorpay', 'dev'],
            default: 'razorpay'
        },
        razorpayOrderId: {
            type: String,
            trim: true,
            default: undefined,
            unique: true,
            sparse: true
        },
        razorpayPaymentId: {
            type: String,
            trim: true,
            default: undefined,
            unique: true,
            sparse: true
        },
        razorpaySignature: {
            type: String,
            trim: true,
            default: ''
        },
        paidAt: {
            type: Date,
            default: null
        },
        feeSnapshot: {
            enabled: { type: Boolean, default: false },
            amount: { type: Number, default: 0, min: 0 }
        },
        metadata: {
            vehicleNumber: { type: String, default: '' },
            panNumber: { type: String, default: '' },
            aadharNumber: { type: String, default: '' },
            drivingLicenseNumber: { type: String, default: '' }
        }
    },
    {
        collection: 'food_delivery_onboarding_payments',
        timestamps: true
    }
);

deliveryOnboardingPaymentSchema.index({ phone: 1, createdAt: -1 });

export const FoodDeliveryOnboardingPayment = mongoose.model(
    'FoodDeliveryOnboardingPayment',
    deliveryOnboardingPaymentSchema
);
