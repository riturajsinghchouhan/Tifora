import mongoose from 'mongoose';

const deliveryAddressSchema = new mongoose.Schema(
    {
        label: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
        name: { type: String, default: '', trim: true },
        fullName: { type: String, default: '', trim: true },
        street: { type: String, required: true, trim: true },
        area: { type: String, default: '', trim: true },
        landmark: { type: String, default: '', trim: true },
        zone: { type: String, default: '', trim: true },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', default: null },
        additionalDetails: { type: String, default: '', trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        zipCode: { type: String, default: '', trim: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [75.8577, 22.7196] }
        }
    },
    { _id: false }
);

const tiffinSubscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true,
            index: true
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TiffinPlan',
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        deliveryAddress: {
            type: deliveryAddressSchema,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'paused', 'cancelled', 'expired'],
            default: 'active',
            index: true
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodTransaction',
            default: null
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        amountPaid: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        collection: 'food_tiffin_subscriptions',
        timestamps: true
    }
);

tiffinSubscriptionSchema.index({ 'deliveryAddress.location': '2dsphere' });

export const TiffinSubscription = mongoose.model('TiffinSubscription', tiffinSubscriptionSchema);
