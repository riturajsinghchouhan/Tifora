import mongoose from 'mongoose';

const tiffinDeliverySchema = new mongoose.Schema(
    {
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TiffinSubscription',
            required: true,
            index: true
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true
        },
        deliveryAddress: {
            // Flattened for easy geospatial querying by delivery boy
            location: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number], default: [75.8577, 22.7196] }
            },
            fullAddress: { type: String, default: '' },
            street: { type: String, default: '' },
            additionalDetails: { type: String, default: '' },
            phone: { type: String, default: '' },
            name: { type: String, default: '' },
            fullName: { type: String, default: '' },
            area: { type: String, default: '' },
            landmark: { type: String, default: '' },
            zone: { type: String, default: '' },
            zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', default: null },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            zipCode: { type: String, default: '' }
        },
        type: {
            type: String,
            enum: ['Morning', 'Evening'],
            required: true
        },
        date: {
            type: Date,
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['pending', 'assigned', 'out_for_delivery', 'delivered', 'delivered_unattended', 'failed', 'cancelled'],
            default: 'pending',
            index: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            default: null
        },
        assignedAt: {
            type: Date,
            default: null
        },
        verification: {
            otpRequired: { type: Boolean, default: true },
            otpExpected: { type: String, select: false },
            otpProvided: { type: String, select: false },
            isVerified: { type: Boolean, default: false },
            pictureUrl: { type: String, default: null } // Fallback if user is unavailable
        },
        deliveryEarning: {
            type: Number,
            default: 0
        },
        deliveredAt: {
            type: Date,
            default: null
        }
    },
    {
        collection: 'food_tiffin_deliveries',
        timestamps: true
    }
);

tiffinDeliverySchema.index({ 'deliveryAddress.location': '2dsphere' });
tiffinDeliverySchema.index({ restaurantId: 1, date: 1, status: 1 });
tiffinDeliverySchema.index({ assignedTo: 1, date: 1, status: 1 });

export const TiffinDelivery = mongoose.model('TiffinDelivery', tiffinDeliverySchema);
