import mongoose from 'mongoose';

const tiffinPlanSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        durationDays: {
            type: Number,
            required: true,
            enum: [7, 15, 30, 90]
        },
        mealType: {
            type: String,
            enum: ['Morning', 'Evening', 'Both'],
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        itemsDescription: {
            type: String,
            default: '',
            trim: true
        },
        image: {
            type: String,
            default: ''
        },
        items: [
            {
                name: { type: String, trim: true },
                quantity: { type: String, default: '' },
                image: { type: String, default: '' }
            }
        ],
        isVegetarian: {
            type: Boolean,
            default: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        collection: 'food_tiffin_plans',
        timestamps: true
    }
);

export const TiffinPlan = mongoose.model('TiffinPlan', tiffinPlanSchema);
