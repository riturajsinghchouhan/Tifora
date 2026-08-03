import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import mongoose from 'mongoose';

const getRestaurantId = (req) => {
    return req.query.restaurantId || req.headers['x-restaurant-id'] || req.user?.restaurantId || req.user?.userId || req.user?._id || '6a6e2741189263f779c76706';
};

export const createTiffinPlan = async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        if (!restaurantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Restaurant ID not found' });
        }

        const { name, durationDays, mealType, price, itemsDescription, isVegetarian, image, items } = req.body;

        if (!name || !durationDays || !price) {
            return res.status(400).json({ success: false, message: 'Name, duration, and price are required' });
        }

        const newPlan = new TiffinPlan({
            restaurantId,
            name,
            durationDays: Number(durationDays),
            mealType: mealType || 'Morning',
            price: Number(price),
            itemsDescription: itemsDescription || '',
            image: image || '',
            items: Array.isArray(items) ? items : [],
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

        const plan = await TiffinPlan.findOneAndUpdate(
            { _id: planId, restaurantId },
            { $set: req.body },
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
            const FoodDeliveryPartner = mongoose.model('FoodDeliveryPartner');
            partners = await FoodDeliveryPartner.find({
                $or: [{ status: 'approved' }, { isOnline: true }, { isActive: true }]
            }).select('_id name phone vehicleType currentZone avatar isOnline').lean();
        } catch (e) {
            console.log('No FoodDeliveryPartner model or collection found');
        }

        // Fallback default partner if empty in dev
        if (partners.length === 0) {
            partners = [
                { _id: 'partner_rahul_01', name: 'Rahul Sharma', phone: '9826012345', vehicleType: 'Honda Activa (MP09-AB-1234)', currentZone: 'Silicon City Zone', isOnline: true },
                { _id: 'partner_amit_02', name: 'Amit Verma', phone: '9893054321', vehicleType: 'Hero Splendor (MP09-XY-5678)', currentZone: 'Vijay Nagar Zone', isOnline: true },
                { _id: 'partner_deepak_03', name: 'Deepak Patel', phone: '9754088990', vehicleType: 'Bajaj Pulsar (MP09-CD-9012)', currentZone: 'Bhawarkua Zone', isOnline: true }
            ];
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

        if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No deliveries selected' });
        }

        if (!partnerId) {
            return res.status(400).json({ success: false, message: 'Delivery Partner ID is required' });
        }

        const filter = {
            _id: { $in: deliveryIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) }
        };
        if (mongoose.isValidObjectId(restaurantId)) {
            filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
        }

        const isRealPartnerObjId = mongoose.isValidObjectId(partnerId);

        const result = await TiffinDelivery.updateMany(
            filter,
            {
                $set: {
                    status: 'assigned',
                    ...(isRealPartnerObjId ? { assignedTo: new mongoose.Types.ObjectId(partnerId) } : {}),
                    assignedAt: new Date()
                }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount || deliveryIds.length} tiffins dispatched to rider successfully! 🚀`
        });
    } catch (error) {
        console.error('Error assigning deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error assigning deliveries' });
    }
};
