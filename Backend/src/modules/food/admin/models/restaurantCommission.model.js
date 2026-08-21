import mongoose from 'mongoose';
import { PAYMENT_COLLECTIONS } from '../../../../core/payments/paymentCollections.js';

const restaurantCommissionSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            unique: true,
            index: true
        },
        defaultCommission: {
            type: {
                type: String,
                enum: ['percentage', 'amount'],
                default: 'percentage'
            },
            value: { type: Number, default: 0 }
        },
        notes: { type: String, trim: true, default: '' },
        status: { type: Boolean, default: true, index: true }
    },
    { collection: PAYMENT_COLLECTIONS.PAYMENT_RESTAURANT_COMMISSIONS, timestamps: true }
);


export const FoodRestaurantCommission = mongoose.model('FoodRestaurantCommission', restaurantCommissionSchema);

