import mongoose from 'mongoose';
import { TiffinZone } from '../models/tiffinZone.model.js';
import { TiffinZoneSettings } from '../models/tiffinZoneSettings.model.js';

export const toFiniteNumber = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

/** Ray-casting point-in-polygon for lat/lng polygons. */
export const isPointInPolygon = (lat, lng, polygon) => {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;
        const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

/**
 * Whether tiffin zoning is live at all.
 *
 * Off only for a deployment where no admin has ever created a tiffin zone, so
 * existing plans keep working until the first zone is drawn. Once on it stays
 * on: deleting or deactivating every zone then means "tiffin is available
 * nowhere", not "zoning was never set up".
 */
export const isTiffinZoningEnabled = async () => {
    const settings = await TiffinZoneSettings.findOne({ key: 'default' }).select('enforced').lean();
    if (settings?.enforced) return true;

    // Deployments that created zones before this flag existed, or zones added
    // by a script: self-heal the flag the first time we see any zone.
    const anyZone = await TiffinZone.exists({});
    if (anyZone) {
        await markTiffinZoningEnforced();
        return true;
    }
    return false;
};

export const markTiffinZoningEnforced = () =>
    TiffinZoneSettings.updateOne(
        { key: 'default' },
        { $set: { enforced: true } },
        { upsert: true }
    );

export const getActiveTiffinZones = () =>
    TiffinZone.find({ isActive: true })
        .select('name zoneName serviceLocation country unit isActive coordinates createdAt')
        .lean();

/** First active tiffin zone containing the point, or null. */
export const findTiffinZoneForPoint = async (lat, lng) => {
    const latNum = toFiniteNumber(lat);
    const lngNum = toFiniteNumber(lng);
    if (latNum === null || lngNum === null) return null;

    const zones = await getActiveTiffinZones();
    for (const zone of zones) {
        if (isPointInPolygon(latNum, lngNum, zone.coordinates || [])) return zone;
    }
    return null;
};

/** Pull lat/lng out of the various address shapes used across tiffin. */
export const extractAddressCoords = (address) => {
    if (!address) return { lat: null, lng: null };
    const coords = address.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
        const lng = toFiniteNumber(coords[0]);
        const lat = toFiniteNumber(coords[1]);
        if (lat !== null && lng !== null) return { lat, lng };
    }
    return {
        lat: toFiniteNumber(address.latitude),
        lng: toFiniteNumber(address.longitude)
    };
};

/**
 * Resolve the tiffin zone a request is scoped to, from the X-Tiffin-Zone-Id
 * header / query param that the frontend injects, falling back to coordinates.
 */
export const resolveRequestTiffinZoneId = async (req) => {
    const raw = req.headers['x-tiffin-zone-id'] || req.query.tiffinZoneId;
    const id = raw && raw !== 'null' && raw !== 'undefined' ? String(raw).trim() : '';
    if (id && mongoose.Types.ObjectId.isValid(id)) {
        const zone = await TiffinZone.findOne({ _id: id, isActive: true }).select('_id').lean();
        if (zone) return String(zone._id);
    }

    // Fall back to coordinates: explicit query params first, then the
    // X-User-Lat/X-User-Lng headers the frontend axios client already injects.
    const lat = toFiniteNumber(req.query.lat) ?? toFiniteNumber(req.headers['x-user-lat']);
    const lng = toFiniteNumber(req.query.lng) ?? toFiniteNumber(req.headers['x-user-lng']);
    if (lat !== null && lng !== null) {
        const zone = await findTiffinZoneForPoint(lat, lng);
        if (zone) return String(zone._id);
    }

    return null;
};

/** Tiffin zone polygon as GeoJSON, for $geoWithin queries. */
export const tiffinZoneToPolygon = (zoneDoc) => {
    const coords = Array.isArray(zoneDoc?.coordinates) ? zoneDoc.coordinates : [];
    if (coords.length < 3) return null;
    const ring = coords
        .map((c) => [Number(c.longitude), Number(c.latitude)])
        .filter((pair) => pair.every((n) => Number.isFinite(n)));
    if (ring.length < 3) return null;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    return { type: 'Polygon', coordinates: [ring] };
};

/**
 * Kitchens serving a given tiffin zone.
 *
 * Membership is explicit only: a restaurant must have been added to the zone by
 * an admin (`tiffinZoneIds` contains the zone). Sitting inside the zone polygon
 * is deliberately NOT enough - admins decide which restaurants do tiffin, so a
 * restaurant inside the area can still be left out.
 */
export const getKitchenIdsForTiffinZone = async (zoneId) => {
    if (!zoneId || !mongoose.Types.ObjectId.isValid(String(zoneId))) return null;

    const zone = await TiffinZone.findOne({ _id: zoneId, isActive: true }).select('_id').lean();
    if (!zone) return null;

    const { FoodRestaurant } = await import('../../restaurant/models/restaurant.model.js');
    const kitchens = await FoodRestaurant.find({
        tiffinZoneIds: new mongoose.Types.ObjectId(String(zoneId))
    })
        .select('_id')
        .lean();
    return kitchens.map((k) => k._id);
};
