import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { generateDailyDeliveries } from '../scripts/tiffinScheduler.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { uploadImageBuffer } from '../../../../services/upload.service.js';
import mongoose from 'mongoose';

const getRestaurantId = (req) => {
    const authenticatedRestaurantId = req.user?.restaurantId || req.user?.userId || req.user?._id;
    if (authenticatedRestaurantId) {
        return authenticatedRestaurantId;
    }

    if (process.env.NODE_ENV !== 'production') {
        return req.query.restaurantId || req.headers['x-restaurant-id'] || '6a6e2741189263f779c76706';
    }

    return null;
};

export const createTiffinPlan = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        if (!restaurantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Restaurant ID not found' });
        }

        let { name, durationDays, mealType, price, itemsDescription, isVegetarian, image, items } = req.body;

        if (!name || !durationDays || !price) {
            return res.status(400).json({ success: false, message: 'Name, duration, and price are required' });
        }

        // Parse items if it's sent as a string (from FormData)
        let parsedItems = [];
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                parsedItems = [];
            }
        } else if (Array.isArray(items)) {
            parsedItems = items;
        }

        // Process files
        if (req.files && Array.isArray(req.files)) {
            // Main plan image
            const mainImageFile = req.files.find(f => f.fieldname === 'imageFile');
            if (mainImageFile) {
                image = await uploadImageBuffer(mainImageFile.buffer, 'food/tiffin/plans');
            }

            // Process dynamic item images
            for (let i = 0; i < parsedItems.length; i++) {
                const itemImageFile = req.files.find(f => f.fieldname === `items[${i}][imageFile]`);
                if (itemImageFile) {
                    parsedItems[i].image = await uploadImageBuffer(itemImageFile.buffer, 'food/tiffin/items');
                }
            }
        }

        const newPlan = new TiffinPlan({
            restaurantId,
            name,
            durationDays: Number(durationDays),
            mealType: mealType || 'Morning',
            price: Number(price),
            itemsDescription: itemsDescription || '',
            image: image || '',
            items: parsedItems,
            isVegetarian: isVegetarian !== undefined ? Boolean(isVegetarian) : true,
            isActive: true
        });

        await newPlan.save();
        res.status(201).json({ success: true, data: newPlan, message: 'Tiffin Plan created successfully' });
    } catch (error) {
        console.error('Error creating Tiffin Plan:', error);
        res.status(500).json({ success: false, message: 'Server error creating Tiffin Plan' });
    }
};

export const getRestaurantTiffinPlans = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const plans = await TiffinPlan.find({ restaurantId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        console.error('Error fetching Tiffin Plans:', error);
        res.status(500).json({ success: false, message: 'Server error fetching Tiffin Plans' });
    }
};

export const updateTiffinPlan = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { planId } = req.params;

        let updateData = { ...req.body };

        // Parse items if sent as string
        if (typeof updateData.items === 'string') {
            try {
                updateData.items = JSON.parse(updateData.items);
            } catch (e) {
                updateData.items = [];
            }
        }

        // Process files
        if (req.files && Array.isArray(req.files)) {
            const mainImageFile = req.files.find(f => f.fieldname === 'imageFile');
            if (mainImageFile) {
                updateData.image = await uploadImageBuffer(mainImageFile.buffer, 'food/tiffin/plans');
            }

            if (Array.isArray(updateData.items)) {
                for (let i = 0; i < updateData.items.length; i++) {
                    const itemImageFile = req.files.find(f => f.fieldname === `items[${i}][imageFile]`);
                    if (itemImageFile) {
                        updateData.items[i].image = await uploadImageBuffer(itemImageFile.buffer, 'food/tiffin/items');
                    }
                }
            }
        }

        const plan = await TiffinPlan.findOneAndUpdate(
            { _id: planId, restaurantId },
            { $set: updateData },
            { new: true }
        );

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Tiffin Plan not found' });
        }

        res.status(200).json({ success: true, data: plan, message: 'Tiffin Plan updated successfully' });
    } catch (error) {
        console.error('Error updating Tiffin Plan:', error);
        res.status(500).json({ success: false, message: 'Server error updating Tiffin Plan' });
    }
};

export const deleteTiffinPlan = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { planId } = req.params;

        const plan = await TiffinPlan.findOneAndDelete({ _id: planId, restaurantId });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Tiffin Plan not found' });
        }

        res.status(200).json({ success: true, message: 'Tiffin Plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting Tiffin Plan:', error);
        res.status(500).json({ success: false, message: 'Server error deleting Tiffin Plan' });
    }
};

export const getDailyPrepDashboard = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        console.log('[getDailyPrepDashboard] Fetching for restaurantId:', restaurantId);
        
        await generateDailyDeliveries();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const deliveries = await TiffinDelivery.aggregate([
            {
                $match: {
                    restaurantId: new mongoose.Types.ObjectId(restaurantId),
                    date: { $gte: today, $lt: tomorrow },
                    status: { $nin: ['cancelled', 'failed'] }
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const prepCounts = { Morning: 0, Evening: 0 };
        deliveries.forEach(d => {
            if (d._id === 'Morning') prepCounts.Morning = d.count;
            if (d._id === 'Evening') prepCounts.Evening = d.count;
        });

        const activeSubscriptionsCount = await TiffinSubscription.countDocuments({
            restaurantId,
            status: 'active'
        });

        // Revenue from active subscriptions
        const revenueAgg = await TiffinSubscription.aggregate([
            {
                $match: {
                    restaurantId: new mongoose.Types.ObjectId(restaurantId),
                    status: 'active',
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amountPaid' }
                }
            }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        // Recent 5 subscriptions for activity feed
        const recentActivity = await TiffinSubscription.find({ restaurantId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name phone profileImage avatar')
            .populate('planId', 'name mealType durationDays');

        res.status(200).json({ 
            success: true, 
            data: {
                ...prepCounts,
                activeSubscriptions: activeSubscriptionsCount,
                totalRevenue,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching Prep Dashboard:', error);
        res.status(500).json({ success: false, message: 'Server error fetching Prep Dashboard' });
    }
};

export const getUnassignedDeliveries = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        
        await generateDailyDeliveries();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find pending or unassigned deliveries
        const deliveries = await TiffinDelivery.find({
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['pending', 'unassigned'] }
        })
        .populate('userId', 'name phone profileImage avatar')
        .populate({
            path: 'subscriptionId',
            populate: { path: 'planId', select: 'name itemsDescription mealType isVegetarian price' }
        })
        .lean();

        // Also fetch active delivery partners in the restaurant's zone if available
        let partners = [];
        try {
            partners = await FoodDeliveryPartner.find({
                status: 'approved',
                availabilityStatus: 'online'
            }).select('_id name phone vehicleType vehicleName vehicleNumber availabilityStatus').lean();
        } catch (e) {
            console.log('Error loading FoodDeliveryPartner records:', e.message);
        }

        // Compute zones summary and ensure each delivery has resolved zone information
        const zonesMap = {};
        const enrichedDeliveries = deliveries.map(d => {
            const addr = d.deliveryAddress || {};
            // Resolve micro-zone name from zone, area, landmark, or fullAddress
            let resolvedZone = addr.zone || addr.area || '';
            const rawAddr = `${addr.fullAddress || ''} ${addr.street || ''} ${addr.landmark || ''} ${addr.area || ''}`.toLowerCase();
            
            if (!resolvedZone || resolvedZone === 'Indore' || resolvedZone === 'General') {
                if (rawAddr.includes('silicon') || rawAddr.includes('gamle') || rawAddr.includes('puliya')) {
                    resolvedZone = 'Silicon City - Gamle Wali Puliya';
                } else if (rawAddr.includes('vijay nagar') || rawAddr.includes('scheme 54') || rawAddr.includes('meghdoot')) {
                    resolvedZone = 'Vijay Nagar - Scheme 54';
                } else if (rawAddr.includes('bhawarkua') || rawAddr.includes('it park') || rawAddr.includes('holkar')) {
                    resolvedZone = 'Bhawarkua - IT Park';
                } else if (rawAddr.includes('palasia') || rawAddr.includes('saket') || rawAddr.includes('old palasia')) {
                    resolvedZone = 'Palasia - Saket Club';
                } else if (rawAddr.includes('annapurna') || rawAddr.includes('dravid nagar') || rawAddr.includes('sudama')) {
                    resolvedZone = 'Annapurna - Dravid Nagar';
                } else if (rawAddr.includes('rau') || rawAddr.includes('bypass') || rawAddr.includes('cat')) {
                    resolvedZone = 'Rau - Bypass Road';
                } else {
                    resolvedZone = 'Silicon City - Gamle Wali Puliya'; // Default primary local cluster
                }
            }

            // Aggregate counts per zone
            if (!zonesMap[resolvedZone]) {
                zonesMap[resolvedZone] = {
                    zoneName: resolvedZone,
                    total: 0,
                    morning: 0,
                    evening: 0
                };
            }
            zonesMap[resolvedZone].total += 1;
            if (d.type === 'Morning') zonesMap[resolvedZone].morning += 1;
            if (d.type === 'Evening') zonesMap[resolvedZone].evening += 1;

            return {
                ...d,
                zone: resolvedZone,
                deliveryAddress: {
                    ...addr,
                    zone: resolvedZone,
                    area: addr.area || resolvedZone.split(' - ')[0] || 'Indore',
                    landmark: addr.landmark || (resolvedZone.includes(' - ') ? resolvedZone.split(' - ')[1] : '')
                }
            };
        });

        const zonesSummary = Object.values(zonesMap).sort((a, b) => b.total - a.total);

        res.status(200).json({
            success: true,
            data: {
                deliveries: enrichedDeliveries,
                zonesSummary,
                partners
            }
        });
    } catch (error) {
        console.error('Error fetching unassigned deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error fetching unassigned deliveries' });
    }
};

export const assignDeliveriesToPartner = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { deliveryIds, partnerId } = req.body;

        if (!restaurantId || !mongoose.isValidObjectId(restaurantId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized restaurant context' });
        }

        if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No deliveries selected' });
        }

        if (!partnerId || !mongoose.isValidObjectId(partnerId)) {
            return res.status(400).json({ success: false, message: 'A valid delivery partner is required' });
        }

        const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
        const normalizedDeliveryIds = [...new Set(deliveryIds)]
            .filter((id) => mongoose.isValidObjectId(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        if (normalizedDeliveryIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid deliveries selected' });
        }

        const partner = await FoodDeliveryPartner.findOne({
            _id: new mongoose.Types.ObjectId(partnerId),
            status: 'approved',
            availabilityStatus: 'online'
        }).select('_id name phone vehicleType vehicleName vehicleNumber');

        if (!partner) {
            return res.status(400).json({
                success: false,
                message: 'Selected rider is not available for dispatch right now'
            });
        }

        const filter = {
            _id: { $in: normalizedDeliveryIds },
            restaurantId: restaurantObjectId,
            status: { $in: ['pending', 'unassigned'] }
        };

        const deliveriesToAssign = await TiffinDelivery.find(filter).select('_id userId type date restaurantId subscriptionId');

        if (deliveriesToAssign.length !== normalizedDeliveryIds.length) {
            return res.status(409).json({
                success: false,
                message: 'Some selected tiffins are no longer pending or do not belong to your restaurant'
            });
        }

        const result = await TiffinDelivery.updateMany(
            filter,
            {
                $set: {
                    status: 'assigned',
                    assignedTo: partner._id,
                    assignedAt: new Date()
                }
            }
        );

        // Fetch updated deliveries to broadcast real-time notifications to users
        try {
            const { getIO, rooms } = await import('../../../../config/socket.js');
            const io = getIO();
            if (io) {
                const assignedDeliveries = await TiffinDelivery.find({ _id: { $in: deliveriesToAssign.map((delivery) => delivery._id) } })
                    .populate('restaurantId', 'name profileImage logo address')
                    .populate('assignedTo', 'name phone profileImage vehicleType')
                    .populate({
                        path: 'subscriptionId',
                        populate: { path: 'planId', select: 'name mealType' }
                    })
                    .lean();

                for (const del of assignedDeliveries) {
                    if (del.userId) {
                        const userRoom = rooms.user(del.userId.toString());
                        const payload = {
                            deliveryId: del._id,
                            _id: del._id,
                            status: 'assigned',
                            type: del.type,
                            date: del.date,
                            restaurant: del.restaurantId,
                            restaurantName: del.restaurantId?.name || 'Tiffin Kitchen',
                            assignedTo: del.assignedTo,
                            partnerName: del.assignedTo?.name || 'Delivery Partner',
                            subscription: del.subscriptionId,
                            title: 'Tiffin Dispatched! 🍱',
                            message: `Your ${del.type} tiffin has been assigned to ${del.assignedTo?.name || 'a delivery partner'}.`,
                            timestamp: new Date().toISOString()
                        };

                        io.to(userRoom).emit('tiffin_status_update', payload);
                        io.to(userRoom).emit('tiffin_delivery_assigned', payload);
                        console.log(`📡 [Socket] Emitted tiffin_delivery_assigned to user room: ${userRoom}`);
                    }
                }

                io.to(rooms.restaurant(restaurantId.toString())).emit('tiffin_dispatch_updated', {
                    restaurantId: restaurantId.toString(),
                    partnerId: partner._id.toString(),
                    partnerName: partner.name,
                    deliveryIds: deliveriesToAssign.map((delivery) => delivery._id.toString()),
                    reason: 'deliveries_assigned',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (socketErr) {
            console.warn('[assignDeliveriesToPartner] Socket broadcast error:', socketErr.message);
        }

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount || deliveryIds.length} tiffins dispatched to rider successfully! 🚀`
        });
    } catch (error) {
        console.error('Error assigning deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error assigning deliveries' });
    }
};
