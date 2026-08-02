import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import mongoose from 'mongoose';

const getPartnerId = (req) => {
    return req.user?.userId || req.user?._id;
};

export const getMyTiffinRoute = async (req, res) => {
    try {
        const partnerId = getPartnerId(req);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { latitude, longitude } = req.query;

        let query = {
            assignedTo: partnerId,
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['assigned', 'out_for_delivery'] }
        };

        let deliveries = [];

        // If coordinates provided, sort by proximity (requires 2dsphere index)
        if (latitude && longitude) {
            deliveries = await TiffinDelivery.find({
                ...query,
                'deliveryAddress.location': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(longitude), parseFloat(latitude)]
                        }
                    }
                }
            }).populate('restaurantId', 'name address phone');
        } else {
            // Default sort by assigned time
            deliveries = await TiffinDelivery.find(query)
                .populate('restaurantId', 'name address phone')
                .sort({ assignedAt: 1 });
        }

        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        console.error('Error fetching Tiffin route:', error);
        res.status(500).json({ success: false, message: 'Server error fetching route' });
    }
};

export const updateDeliveryStatus = async (req, res) => {
    try {
        const partnerId = getPartnerId(req);
        const { deliveryId } = req.params;
        const { status, otp, pictureUrl } = req.body;

        const delivery = await TiffinDelivery.findOne({ _id: deliveryId, assignedTo: partnerId });
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery not found or not assigned to you' });
        }

        if (status === 'delivered') {
            if (delivery.verification.otpRequired) {
                // In a real app, verify the OTP against the DB or an OTP service
                if (!otp || otp !== '1234') { // Dummy OTP check for now
                    return res.status(400).json({ success: false, message: 'Invalid OTP' });
                }
                delivery.verification.isVerified = true;
                delivery.verification.otpProvided = otp;
            }
            delivery.deliveredAt = new Date();
        } else if (status === 'delivered_unattended') {
            if (!pictureUrl) {
                return res.status(400).json({ success: false, message: 'Picture proof is required for unattended delivery' });
            }
            delivery.verification.pictureUrl = pictureUrl;
            delivery.deliveredAt = new Date();
        }

        delivery.status = status;
        await delivery.save();

        res.status(200).json({ success: true, data: delivery, message: `Status updated to ${status}` });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ success: false, message: 'Server error updating status' });
    }
};
