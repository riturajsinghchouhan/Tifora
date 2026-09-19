import * as multiOrderService from '../../orders/services/order-multi.service.js';

export const getGroupedPendingOrders = async (req, res, next) => {
    try {
        const data = await multiOrderService.listGroupedUnassignedOrders({
            restaurantId: req.query.restaurantId || undefined
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getActiveDeliveryBoys = async (req, res, next) => {
    try {
        const data = await multiOrderService.listAssignableDeliveryPartners({
            onlineOnly: String(req.query.onlineOnly || '') === 'true'
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const assignMultiOrders = async (req, res, next) => {
    try {
        const { orderIds, deliveryPartnerId } = req.body;
        const data = await multiOrderService.assignMultiOrderBatch({
            orderIds,
            deliveryPartnerId,
            adminId: req.user?.userId || null
        });
        res.status(200).json({
            success: true,
            message: `Batch created with ${data.assignedCount} order(s)`,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getActiveBatches = async (req, res, next) => {
    try {
        const data = await multiOrderService.listBatchesForAdmin();
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const releaseMultiOrders = async (req, res, next) => {
    try {
        const data = await multiOrderService.releaseMultiOrderBatch({
            batchId: req.body?.batchId,
            adminId: req.user?.userId || null
        });
        res.status(200).json({
            success: true,
            message: `Released ${data.releasedCount} order(s) back to delivery partners`
                + (data.keptCount ? ` (${data.keptCount} already picked up and kept)` : ''),
            data
        });
    } catch (error) {
        next(error);
    }
};
