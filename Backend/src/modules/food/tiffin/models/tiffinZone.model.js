import mongoose from 'mongoose';

const coordinateSchema = new mongoose.Schema(
    {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    { _id: false }
);

/**
 * Tiffin service zones. Deliberately a separate collection from `food_zones`
 * (restaurant delivery zones): a tiffin kitchen serves a different radius than
 * an on-demand restaurant, so the two polygon sets are maintained independently
 * from their own tab in admin > Zone Setup.
 */
const tiffinZoneSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        zoneName: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'India',
            index: true
        },
        /** Display label e.g. city/area; optional, can mirror name */
        serviceLocation: {
            type: String,
            trim: true
        },
        unit: {
            type: String,
            enum: ['kilometer', 'miles'],
            default: 'kilometer'
        },
        coordinates: {
            type: [coordinateSchema],
            required: true,
            validate: {
                validator(v) {
                    return Array.isArray(v) && v.length >= 3;
                },
                message: 'Tiffin zone must have at least 3 coordinates (polygon).'
            }
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        collection: 'food_tiffin_zones',
        timestamps: true
    }
);

tiffinZoneSchema.index({ isActive: 1, name: 1 });
tiffinZoneSchema.index({ country: 1, name: 1 });

export const TiffinZone = mongoose.model('TiffinZone', tiffinZoneSchema);
