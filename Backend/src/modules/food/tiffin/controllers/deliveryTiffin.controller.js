import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import mongoose from 'mongoose';

// Helper to extract partner ID from various auth header formats
const getPartnerId = (req) => {
    return req.user?.userId || req.user?._id || req.user?.partnerId || req.partner?._id || req.partner?.id || req.query?.partnerId || req.headers?.['x-partner-id'] || null;
};

// Haversine distance calculator in meters
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined || lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
        return null;
    }
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
};

export const getMyTiffinRoute = async (req, res) => {
    try {
        let partnerId = getPartnerId(req);
        const riderLat = Number(req.query.latitude || req.query.lat);
        const riderLng = Number(req.query.longitude || req.query.lng);
        const hasCoordinates = !isNaN(riderLat) && !isNaN(riderLng);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Build base query
        let query = {
            date: { $gte: today, $lt: tomorrow }
        };

        if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
            query.assignedTo = new mongoose.Types.ObjectId(partnerId);
        } else {
            // If no explicit partner, find any assigned deliveries for today or recent
            query.assignedTo = { $ne: null };
        }

        // Fetch all assigned deliveries for today (pending & completed)
        let allDeliveries = await TiffinDelivery.find(query)
            .populate({
                path: 'subscriptionId',
                select: 'planId status startDate endDate',
                populate: {
                    path: 'planId',
                    select: 'name mealType price items description'
                }
            })
            .populate('restaurantId', 'name address phone image logo location')
            .populate('userId', 'name phone email avatar')
            .lean();

        // If no deliveries found for today, fallback to any assigned recent deliveries for demonstration/testing
        if (!allDeliveries || allDeliveries.length === 0) {
            allDeliveries = await TiffinDelivery.find({ assignedTo: { $ne: null } })
                .populate({
                    path: 'subscriptionId',
                    select: 'planId status startDate endDate',
                    populate: {
                        path: 'planId',
                        select: 'name mealType price items description'
                    }
                })
                .populate('restaurantId', 'name address phone image logo location')
                .populate('userId', 'name phone email avatar')
                .limit(20)
                .lean();
        }

        // Enrich deliveries with calculated distance and formatted distanceText
        const enriched = (allDeliveries || []).map((d) => {
            let distMeters = null;
            let distKm = null;
            let distText = 'Nearby';

            const coords = d.deliveryAddress?.location?.coordinates;
            const destLat = coords ? coords[1] : (d.deliveryAddress?.latitude || d.deliveryAddress?.lat);
            const destLng = coords ? coords[0] : (d.deliveryAddress?.longitude || d.deliveryAddress?.lng);

            if (hasCoordinates && destLat && destLng) {
                distMeters = calculateDistanceInMeters(riderLat, riderLng, Number(destLat), Number(destLng));
                if (distMeters !== null) {
                    distKm = parseFloat((distMeters / 1000).toFixed(1));
                    if (distMeters < 1000) {
                        distText = `${distMeters}m away`;
                    } else {
                        distText = `${distKm}km away`;
                    }
                }
            }

            return {
                ...d,
                distanceMeters: distMeters,
                distanceKm: distKm,
                distanceText: distText
            };
        });

        // Separate into Pending (assigned / out_for_delivery) and Completed (delivered)
        let pending = enriched.filter(
            (d) => d.status === 'assigned' || d.status === 'out_for_delivery' || d.status === 'pending'
        );

        let completed = enriched.filter(
            (d) => d.status === 'delivered' || d.status === 'delivered_unattended'
        );

        // Sort pending deliveries nearest-first if distance is available, else by assignedAt
        if (hasCoordinates) {
            pending.sort((a, b) => {
                if (a.distanceMeters !== null && b.distanceMeters !== null) {
                    return a.distanceMeters - b.distanceMeters;
                }
                return 0;
            });
        } else {
            pending.sort((a, b) => new Date(a.assignedAt || a.createdAt) - new Date(b.assignedAt || b.createdAt));
        }

        // Sort completed deliveries by newest delivered first
        completed.sort((a, b) => new Date(b.deliveredAt || b.updatedAt) - new Date(a.deliveredAt || a.updatedAt));

        const totalAssigned = pending.length + completed.length;
        const completedCount = completed.length;
        const pendingCount = pending.length;
        const progressPercent = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalAssigned,
                    completedCount,
                    pendingCount,
                    progressPercent,
                    activeSlot: pending[0]?.type || completed[0]?.type || 'Morning'
                },
                pending,
                completed
            }
        });
    } catch (error) {
        console.error('Error fetching Tiffin route:', error);
        res.status(500).json({ success: false, message: 'Server error fetching tiffin route' });
    }
};

export const sendTiffinHandoverOtp = async (req, res) => {
    try {
        const { deliveryId } = req.params;

        // Fetch delivery including verification config
        const delivery = await TiffinDelivery.findById(deliveryId).select('+verification.otpExpected');
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Tiffin delivery record not found' });
        }

        // Generate 4 digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Save to model
        if (!delivery.verification) {
            delivery.verification = {};
        }
        delivery.verification.otpExpected = otp;
        await delivery.save();

        // Emit to tracking room
        const room = `tracking:${delivery.orderId}`;
        const io = req.app.get('io');
        if (io) {
            io.to(room).emit('tiffin_handover_otp', {
                deliveryId: delivery._id,
                otp: otp
            });
            console.log(`[Tiffin] Emitted OTP ${otp} to room ${room}`);
        }

        res.status(200).json({ success: true, message: 'OTP sent to customer successfully' });
    } catch (error) {
        console.error('Error sending Tiffin OTP:', error);
        res.status(500).json({ success: false, message: 'Server error sending OTP' });
    }
};

export const updateDeliveryStatus = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { status, otp, pictureUrl } = req.body;

        const delivery = await TiffinDelivery.findById(deliveryId).select('+verification.otpExpected');
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Tiffin delivery record not found' });
        }

        if (status === 'delivered') {
            if (delivery.verification?.otpRequired) {
                if (!otp || String(otp).trim().length < 4) {
                    return res.status(400).json({ success: false, message: 'Please enter a valid 4-digit OTP' });
                }
                
                // If otpExpected exists (new flow), validate it. Otherwise fallback to accepting any 4 digits (legacy flow)
                if (delivery.verification.otpExpected) {
                    if (String(otp).trim() !== delivery.verification.otpExpected) {
                        return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
                    }
                }

                delivery.verification.isVerified = true;
                delivery.verification.otpProvided = String(otp);
            }
            delivery.deliveredAt = new Date();
            delivery.status = 'delivered';
        } else if (status === 'delivered_unattended') {
            if (!pictureUrl) {
                return res.status(400).json({ success: false, message: 'Photo proof is required for unattended drop' });
            }
            delivery.verification.pictureUrl = pictureUrl;
            delivery.verification.isVerified = true;
            delivery.deliveredAt = new Date();
            delivery.status = 'delivered_unattended';
        } else if (status === 'out_for_delivery') {
            delivery.status = 'out_for_delivery';
        } else {
            delivery.status = status;
        }

        await delivery.save();

        res.status(200).json({
            success: true,
            data: delivery,
            message: `Tiffin delivery status updated to ${delivery.status} successfully!`
        });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ success: false, message: 'Server error updating delivery status' });
    }
};

export const getDeliveryDetails = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const delivery = await TiffinDelivery.findById(deliveryId)
            .populate('subscriptionId')
            .populate('restaurantId', 'name address phone image logo')
            .populate('userId', 'name phone email');

        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Tiffin delivery record not found' });
        }

        res.status(200).json({
            success: true,
            data: delivery
        });
    } catch (error) {
        console.error('Error fetching delivery details:', error);
        res.status(500).json({ success: false, message: 'Server error fetching delivery details' });
    }
};

export const getMyTiffinDeliveries = getMyTiffinRoute;
export const completeTiffinDropoff = updateDeliveryStatus;
