import mongoose from 'mongoose';
import { TiffinZone } from '../models/tiffinZone.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';

/**
 * Admin CRUD for tiffin service zones. Mirrors admin.service.js zone CRUD but
 * writes to `food_tiffin_zones` so restaurant delivery zones stay untouched.
 */
export async function getTiffinZones(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const isActive = query.isActive;
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const filter = {};
    if (isActive !== undefined && isActive !== '') {
        filter.isActive = isActive === 'true' || isActive === '1';
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { zoneName: { $regex: search, $options: 'i' } },
            { serviceLocation: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } }
        ];
    }

    const [zones, total] = await Promise.all([
        TiffinZone.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        TiffinZone.countDocuments(filter)
    ]);

    // Attach how many restaurants each zone has. A zone with none serves no
    // tiffin plans at all, which the admin list surfaces as a warning.
    const zoneIds = zones.map((z) => z._id);
    const counts = zoneIds.length
        ? await FoodRestaurant.aggregate([
            { $match: { tiffinZoneIds: { $in: zoneIds } } },
            { $unwind: '$tiffinZoneIds' },
            { $match: { tiffinZoneIds: { $in: zoneIds } } },
            { $group: { _id: '$tiffinZoneIds', count: { $sum: 1 } } }
        ])
        : [];
    const countByZone = new Map(counts.map((c) => [String(c._id), c.count]));

    return {
        zones: zones.map((z) => ({ ...z, kitchenCount: countByZone.get(String(z._id)) || 0 })),
        total,
        page,
        limit
    };
}

export async function getTiffinZoneById(id) {
    return TiffinZone.findById(id).lean();
}

export async function createTiffinZone(body = {}) {
    const name = typeof body.name === 'string' ? body.name.trim() : (body.zoneName && body.zoneName.trim()) || '';
    if (!name) return { error: 'Tiffin zone name is required' };
    const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];
    if (coordinates.length < 3) return { error: 'At least 3 coordinates (polygon points) are required' };

    const normalized = coordinates.map((c) => ({
        latitude: Number(c.latitude) || 0,
        longitude: Number(c.longitude) || 0
    }));

    const zone = new TiffinZone({
        name,
        zoneName: body.zoneName && body.zoneName.trim() ? body.zoneName.trim() : name,
        country: (body.country && body.country.trim()) || 'India',
        serviceLocation: (body.serviceLocation && body.serviceLocation.trim()) || name,
        unit: body.unit === 'miles' ? 'miles' : 'kilometer',
        coordinates: normalized,
        isActive: body.isActive !== false
    });
    await zone.save();
    return { zone: zone.toObject() };
}

export async function updateTiffinZone(id, body = {}) {
    const zone = await TiffinZone.findById(id);
    if (!zone) return null;

    if (body.name !== undefined) zone.name = String(body.name).trim();
    if (body.zoneName !== undefined) zone.zoneName = String(body.zoneName).trim();
    if (body.country !== undefined) zone.country = String(body.country).trim();
    if (body.serviceLocation !== undefined) zone.serviceLocation = String(body.serviceLocation).trim();
    if (body.unit !== undefined) zone.unit = body.unit === 'miles' ? 'miles' : 'kilometer';
    if (body.isActive !== undefined) zone.isActive = body.isActive !== false;
    if (Array.isArray(body.coordinates) && body.coordinates.length >= 3) {
        zone.coordinates = body.coordinates.map((c) => ({
            latitude: Number(c.latitude) || 0,
            longitude: Number(c.longitude) || 0
        }));
    }
    if (zone.name) zone.serviceLocation = zone.serviceLocation || zone.name;

    await zone.save();
    return { zone: zone.toObject() };
}

export async function deleteTiffinZone(id) {
    const zone = await TiffinZone.findByIdAndDelete(id);
    return zone ? { id } : null;
}

// ----- Kitchen membership -----
// Which restaurants an admin has added to a tiffin zone. Membership lives on
// the restaurant (`tiffinZoneIds`) so a kitchen can serve several zones.

const KITCHEN_FIELDS = 'restaurantName name area city profileImage logo phone ownerPhone status location tiffinZoneIds';

/** Restaurants currently added to this tiffin zone. */
export async function getTiffinZoneKitchens(zoneId) {
    if (!mongoose.Types.ObjectId.isValid(String(zoneId))) return null;
    const zone = await TiffinZone.findById(zoneId).select('_id name zoneName').lean();
    if (!zone) return null;

    const kitchens = await FoodRestaurant.find({
        tiffinZoneIds: new mongoose.Types.ObjectId(String(zoneId))
    })
        .select(KITCHEN_FIELDS)
        .sort({ restaurantName: 1 })
        .lean();

    return { zone, kitchens };
}

/**
 * Restaurants an admin can still add to this zone, for the picker.
 * `search` filters by name; results exclude those already in the zone.
 */
export async function getAssignableKitchens(zoneId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(String(zoneId))) return null;
    const zone = await TiffinZone.findById(zoneId).select('_id').lean();
    if (!zone) return null;

    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const filter = { tiffinZoneIds: { $ne: new mongoose.Types.ObjectId(String(zoneId)) } };
    if (search) {
        filter.$or = [
            { restaurantName: { $regex: search, $options: 'i' } },
            { area: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
            { ownerPhone: { $regex: search, $options: 'i' } }
        ];
    }

    const kitchens = await FoodRestaurant.find(filter)
        .select(KITCHEN_FIELDS)
        .sort({ restaurantName: 1 })
        .limit(limit)
        .lean();

    return { kitchens };
}

/** Add restaurants to a tiffin zone. Idempotent via $addToSet. */
export async function addKitchensToTiffinZone(zoneId, restaurantIds) {
    if (!mongoose.Types.ObjectId.isValid(String(zoneId))) return { error: 'Invalid tiffin zone id' };
    const zone = await TiffinZone.findById(zoneId).select('_id').lean();
    if (!zone) return null;

    const ids = (Array.isArray(restaurantIds) ? restaurantIds : [restaurantIds])
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    if (ids.length === 0) return { error: 'At least one valid restaurant id is required' };

    const result = await FoodRestaurant.updateMany(
        { _id: { $in: ids } },
        { $addToSet: { tiffinZoneIds: new mongoose.Types.ObjectId(String(zoneId)) } }
    );

    return { matched: result.matchedCount ?? result.n ?? 0, modified: result.modifiedCount ?? result.nModified ?? 0 };
}

/** Remove a restaurant from a tiffin zone. Its plans and past orders are untouched. */
export async function removeKitchenFromTiffinZone(zoneId, restaurantId) {
    if (!mongoose.Types.ObjectId.isValid(String(zoneId))) return { error: 'Invalid tiffin zone id' };
    if (!mongoose.Types.ObjectId.isValid(String(restaurantId))) return { error: 'Invalid restaurant id' };

    const result = await FoodRestaurant.updateOne(
        { _id: new mongoose.Types.ObjectId(String(restaurantId)) },
        { $pull: { tiffinZoneIds: new mongoose.Types.ObjectId(String(zoneId)) } }
    );

    if ((result.matchedCount ?? result.n ?? 0) === 0) return null;
    return { id: String(restaurantId) };
}
