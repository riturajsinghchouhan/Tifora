import * as tiffinZoneService from '../services/tiffinZone.service.js';
import { findTiffinZoneForPoint, getActiveTiffinZones, isTiffinZoningEnabled, toFiniteNumber } from '../helpers/tiffinZone.helper.js';

// ----- Admin -----

export async function getTiffinZones(req, res, next) {
    try {
        const data = await tiffinZoneService.getTiffinZones(req.query);
        res.status(200).json({
            success: true,
            message: 'Tiffin zones fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getTiffinZoneById(req, res, next) {
    try {
        const zone = await tiffinZoneService.getTiffinZoneById(req.params.id);
        if (!zone) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Tiffin zone fetched successfully',
            data: { zone }
        });
    } catch (error) {
        next(error);
    }
}

export async function createTiffinZone(req, res, next) {
    try {
        const result = await tiffinZoneService.createTiffinZone(req.body || {});
        if (result.error) {
            return res.status(400).json({ success: false, message: result.error });
        }
        res.status(201).json({
            success: true,
            message: 'Tiffin zone created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function updateTiffinZone(req, res, next) {
    try {
        const result = await tiffinZoneService.updateTiffinZone(req.params.id, req.body || {});
        if (!result) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Tiffin zone updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteTiffinZone(req, res, next) {
    try {
        const result = await tiffinZoneService.deleteTiffinZone(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Tiffin zone deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

// ----- Public -----

/** GET /food/tiffin/zones/detect?lat=..&lng=.. */
export async function detectTiffinZone(req, res, next) {
    try {
        const lat = toFiniteNumber(req.query.lat);
        const lng = toFiniteNumber(req.query.lng);
        if (lat === null || lng === null) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        // Not enforced only until an admin has ever created a tiffin zone. After
        // that, no matching active zone means out of service, even if every zone
        // was later deleted or deactivated.
        if (!(await isTiffinZoningEnabled())) {
            return res.status(200).json({
                success: true,
                message: 'Tiffin zoning not configured',
                data: { status: 'IN_SERVICE', zoneId: null, zone: null, enforced: false }
            });
        }

        const zone = await findTiffinZoneForPoint(lat, lng);
        if (zone) {
            return res.status(200).json({
                success: true,
                message: 'Tiffin zone detected',
                data: { status: 'IN_SERVICE', zoneId: zone._id, zone, enforced: true }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Tiffin service not available in this area',
            data: { status: 'OUT_OF_SERVICE', zoneId: null, zone: null, enforced: true }
        });
    } catch (error) {
        next(error);
    }
}

/** GET /food/tiffin/zones/public - active tiffin zones for maps/selects */
export async function listPublicTiffinZones(_req, res, next) {
    try {
        const zones = await getActiveTiffinZones();
        res.status(200).json({
            success: true,
            message: 'Tiffin zones fetched successfully',
            data: { zones }
        });
    } catch (error) {
        next(error);
    }
}

// ----- Admin: kitchens in a tiffin zone -----

export async function getTiffinZoneKitchens(req, res, next) {
    try {
        const result = await tiffinZoneService.getTiffinZoneKitchens(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Tiffin zone kitchens fetched successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function getAssignableKitchens(req, res, next) {
    try {
        const result = await tiffinZoneService.getAssignableKitchens(req.params.id, req.query);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Assignable kitchens fetched successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function addKitchensToTiffinZone(req, res, next) {
    try {
        const body = req.body || {};
        const restaurantIds = body.restaurantIds ?? body.restaurantId;
        const result = await tiffinZoneService.addKitchensToTiffinZone(req.params.id, restaurantIds);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Tiffin zone not found' });
        }
        if (result.error) {
            return res.status(400).json({ success: false, message: result.error });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurants added to tiffin zone successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function removeKitchenFromTiffinZone(req, res, next) {
    try {
        const result = await tiffinZoneService.removeKitchenFromTiffinZone(
            req.params.id,
            req.params.restaurantId
        );
        if (!result) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        if (result.error) {
            return res.status(400).json({ success: false, message: result.error });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant removed from tiffin zone successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}
