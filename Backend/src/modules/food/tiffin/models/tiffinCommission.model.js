import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../../../../core/payments/paymentCollections.js';

const customKitchenCommissionSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true
        },
        commissionRate: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        isActive: {
            type: Boolean,
            default: true
        },
        notes: {
            type: String,
            default: ''
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const tiffinCommissionSchema = new mongoose.Schema(
    {
        globalCommissionPercentage: {
            type: Number,
            default: 10,
            min: 0,
            max: 100
        },
        gstOnCommission: {
            type: Number,
            default: 18,
            min: 0,
            max: 100
        },
        perDeliveryRate: {
            type: Number,
            default: 25,
            min: 0
        },
        customKitchenRates: {
            type: [customKitchenCommissionSchema],
            default: []
        },
        monthlyFixedSalaryDefault: {
            type: Number,
            default: 0
        },
        salaryCalculationMode: {
            type: String,
            enum: ['per_drop', 'monthly_fixed', 'hybrid'],
            default: 'per_drop'
        }
    },
    {
        collection: PAYMENT_COLLECTIONS.PAYMENT_TIFFIN_COMMISSION_SETTINGS,
        timestamps: true
    }
);

export const TiffinCommissionSetting = mongoose.model('TiffinCommissionSetting', tiffinCommissionSchema);
