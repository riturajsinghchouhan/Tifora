import * as multiOrderService from '../../orders/services/order-multi.service.js';

export const getAssignedMultiOrders = async (req, res, next) => {
    try {
        const data = await multiOrderService.listAssignedBatches(req.user?.userId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const requestMultiOrderPickupOtp = async (req, res, next) => {
    try {
        const data = await multiOrderService.requestBatchPickupOtp(
            req.body?.batchId,
            req.user?.userId
        );
        res.status(200).json({
            success: true,
            message: 'Pickup OTP sent to the restaurant',
            data
        });
    } catch (error) {
        next(error);
    }
};

export const verifyMultiOrderPickup = async (req, res, next) => {
    try {
        const data = await multiOrderService.verifyBatchPickup({
            batchId: req.body?.batchId,
            deliveryPartnerId: req.user?.userId,
            otp: req.body?.otp
        });
        res.status(200).json({
            success: true,
            message: data.alreadyPickedUp
                ? 'This batch was already picked up'
                : `Picked up ${data.pickedUpCount} order(s)`,
            data
        });
    } catch (error) {
        next(error);
    }
};
