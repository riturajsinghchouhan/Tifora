import mongoose from 'mongoose';

/**
 * Singleton settings for tiffin zoning.
 *
 * `enforced` flips to true the first time an admin creates a tiffin zone and is
 * never flipped back by deleting zones. Without it, deleting the last zone would
 * silently drop the app back to "no zoning configured" and show every plan to
 * everyone, which is the opposite of what an admin removing zones expects.
 */
const tiffinZoneSettingsSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'default', unique: true },
        enforced: { type: Boolean, default: false }
    },
    { collection: 'food_tiffin_zone_settings', timestamps: true }
);

export const TiffinZoneSettings = mongoose.model('TiffinZoneSettings', tiffinZoneSettingsSchema);
