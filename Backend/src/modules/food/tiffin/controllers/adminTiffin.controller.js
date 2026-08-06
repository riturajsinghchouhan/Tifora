import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { ensureTodayDeliveriesSync } from '../scripts/tiffinScheduler.js';
import mongoose from 'mongoose';

/**
 * 1. Overview & Analytics for Admin
 */
export const getAdminTiffinOverview = async (req, res) => {
    try {
        await ensureTodayDeliveriesSync();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            totalSubs,
            activeSubs,
            pausedSubs,
            revenueAgg,
            totalPlans,
            todayDeliveriesAgg,
            allDeliveriesAgg,
            kitchensCount
        ] = await Promise.all([
            TiffinSubscription.countDocuments({}),
            TiffinSubscription.countDocuments({ status: 'active' }),
            TiffinSubscription.countDocuments({ status: 'paused' }),
            TiffinSubscription.aggregate([
                { $group: { _id: null, total: { $sum: '$amountPaid' } } }
            ]),
            TiffinPlan.countDocuments({}),
            TiffinDelivery.aggregate([
                {
                    $match: {
                        date: { $gte: today, $lt: tomorrow }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        morning: { $sum: { $cond: [{ $eq: ['$type', 'Morning'] }, 1, 0] } },
                        evening: { $sum: { $cond: [{ $eq: ['$type', 'Evening'] }, 1, 0] } },
                        delivered: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['delivered', 'delivered_unattended']] }, 1, 0]
                            }
                        },
                        pending: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['pending', 'assigned', 'out_for_delivery']] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            TiffinDelivery.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        morning: { $sum: { $cond: [{ $eq: ['$type', 'Morning'] }, 1, 0] } },
                        evening: { $sum: { $cond: [{ $eq: ['$type', 'Evening'] }, 1, 0] } },
                        delivered: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['delivered', 'delivered_unattended']] }, 1, 0]
                            }
                        },
                        pending: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['pending', 'assigned', 'out_for_delivery']] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            FoodRestaurant.countDocuments({})
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        // If no deliveries found for today specifically, fallback to overall active deliveries for live tracking
        const todayStats = todayDeliveriesAgg[0] || allDeliveriesAgg[0] || {
            total: 0,
            morning: 0,
            evening: 0,
            delivered: 0,
            pending: 0
        };

        res.status(200).json({
            success: true,
            data: {
                totalSubscriptions: totalSubs,
                activeSubscriptions: activeSubs,
                pausedSubscriptions: pausedSubs,
                totalRevenue,
                totalPlans,
                activeKitchens: kitchensCount || 1,
                todayDeliveries: todayStats
            }
        });
    } catch (error) {
        console.error('Error fetching admin tiffin overview:', error);
        res.status(500).json({ success: false, message: 'Server error fetching overview' });
    }
};

/**
 * 2. Get All Subscriptions with optional status filter & search
 */
export const getAllSubscriptions = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        const subscriptions = await TiffinSubscription.find(query)
            .populate('userId', 'name phone email')
            .populate('restaurantId', 'restaurantName name address phone logo')
            .populate('planId', 'name durationDays mealType price isVegetarian image')
            .sort({ createdAt: -1 });

        // Optional in-memory search filtering for customer name / phone
        let filtered = subscriptions;
        if (search) {
            const s = search.toLowerCase();
            filtered = subscriptions.filter(sub => 
                sub.userId?.name?.toLowerCase().includes(s) ||
                sub.userId?.phone?.includes(s) ||
                sub._id.toString().includes(s) ||
                (sub.restaurantId?.restaurantName || sub.restaurantId?.name || '').toLowerCase().includes(s)
            );
        }

        res.status(200).json({ success: true, data: filtered });
    } catch (error) {
        console.error('Error fetching all subscriptions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * 3. Get All Plans across all kitchens
 */
export const getAllTiffinPlans = async (req, res) => {
    try {
        const plans = await TiffinPlan.find({})
            .populate('restaurantId', 'restaurantName name logo address')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        console.error('Error fetching all plans:', error);
        res.status(500).json({ success: false, message: 'Server error fetching plans' });
    }
};

/**
 * 4. Admin Create Plan
 */
export const adminCreatePlan = async (req, res) => {
    try {
        let {
            restaurantId,
            name,
            durationDays,
            mealType,
            price,
            itemsDescription,
            image,
            items,
            isVegetarian,
            isActive
        } = req.body;

        // If restaurantId not supplied, try to find the first restaurant or default
        if (!restaurantId) {
            const firstRest = await FoodRestaurant.findOne({});
            if (firstRest) {
                restaurantId = firstRest._id;
            } else {
                return res.status(400).json({ success: false, message: 'Please select a kitchen/restaurant for this plan.' });
            }
        }

        const newPlan = new TiffinPlan({
            restaurantId,
            name,
            durationDays: Number(durationDays) || 30,
            mealType: mealType || 'Both',
            price: Number(price) || 0,
            itemsDescription: itemsDescription || '',
            image: image || '/food/tiffin/tiffin_box_default.png',
            items: Array.isArray(items) ? items : [],
            isVegetarian: isVegetarian !== undefined ? isVegetarian : true,
            isActive: isActive !== undefined ? isActive : true
        });

        await newPlan.save();
        const populated = await TiffinPlan.findById(newPlan._id).populate('restaurantId', 'restaurantName name logo address');

        res.status(201).json({ success: true, data: populated, message: 'Tiffin plan created successfully' });
    } catch (error) {
        console.error('Error creating plan as admin:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error creating plan' });
    }
};

/**
 * 5. Admin Update Plan
 */
export const adminUpdatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const updates = req.body;

        const updated = await TiffinPlan.findByIdAndUpdate(
            planId,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('restaurantId', 'restaurantName name logo address');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({ success: true, data: updated, message: 'Plan updated successfully' });
    } catch (error) {
        console.error('Error updating plan as admin:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error updating plan' });
    }
};

/**
 * 6. Admin Delete Plan
 */
export const adminDeletePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const deleted = await TiffinPlan.findByIdAndDelete(planId);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting plan as admin:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error deleting plan' });
    }
};

/**
 * 7. Today's Deliveries / Dispatch Roster
 */
export const getTodayDeliveries = async (req, res) => {
    try {
        await ensureTodayDeliveriesSync();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const deliveries = await TiffinDelivery.find({
            date: { $gte: today, $lt: tomorrow }
        })
            .populate('userId', 'name phone')
            .populate('restaurantId', 'restaurantName name address phone')
            .populate('assignedTo', 'name phone')
            .sort({ type: 1, createdAt: -1 });

        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        console.error('Error fetching today deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error fetching deliveries' });
    }
};

/**
 * 8. Admin Toggle Subscription Status (Pause, Resume, Cancel)
 */
export const adminToggleSubscriptionStatus = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { status } = req.body; // 'active', 'paused', 'cancelled'

        if (!['active', 'paused', 'cancelled', 'expired'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided' });
        }

        const subscription = await TiffinSubscription.findByIdAndUpdate(
            subscriptionId,
            { $set: { status } },
            { new: true }
        )
            .populate('userId', 'name phone')
            .populate('restaurantId', 'name')
            .populate('planId', 'name durationDays');

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        res.status(200).json({ success: true, data: subscription, message: `Subscription marked as ${status}` });
    } catch (error) {
        console.error('Error updating subscription status:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

/**
 * 9. Kitchen Partners Summary
 */
export const getKitchenPartners = async (req, res) => {
    try {
        const kitchens = await FoodRestaurant.find({}).select('restaurantName name logo profileImage phone ownerPhone location address rating').lean();

        // Get plan count and subscriber count per kitchen
        const [planCounts, subCounts] = await Promise.all([
            TiffinPlan.aggregate([
                { $group: { _id: '$restaurantId', count: { $sum: 1 } } }
            ]),
            TiffinSubscription.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$restaurantId', count: { $sum: 1 } } }
            ])
        ]);

        const planCountMap = {};
        planCounts.forEach(p => { if (p._id) planCountMap[p._id.toString()] = p.count; });

        const subCountMap = {};
        subCounts.forEach(s => { if (s._id) subCountMap[s._id.toString()] = s.count; });

        const data = kitchens.map(k => {
            const formattedAddr = k.location?.formattedAddress || k.location?.address || (k.location?.area ? `${k.location?.area}, ${k.location?.city || 'Indore'}` : (typeof k.address === 'string' ? k.address : 'Indore, MP'));
            return {
                ...k,
                name: k.restaurantName || k.name || "Renuka's kitchen",
                address: formattedAddr,
                phone: k.phone || k.ownerPhone || '9876543210',
                tiffinPlansCount: planCountMap[k._id.toString()] || 0,
                activeSubscribersCount: subCountMap[k._id.toString()] || 0
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching kitchen partners:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * 10. Rider Delivery Payouts & Logs
 */
export const getDeliveryPayouts = async (req, res) => {
    try {
        const { startDate, endDate, partnerId } = req.query;
        
        let matchStage = {
            status: { $in: ['delivered', 'delivered_unattended'] }
        };

        if (startDate && endDate) {
            matchStage.date = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }

        if (partnerId) {
            matchStage.assignedTo = new mongoose.Types.ObjectId(partnerId);
        }

        const payouts = await TiffinDelivery.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$assignedTo',
                    totalDeliveries: { $sum: 1 },
                    totalEarnings: { $sum: { $ifNull: ['$deliveryEarning', 25] } } 
                }
            },
            {
                $lookup: {
                    from: 'food_delivery_partners',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'partnerDetails'
                }
            },
            { $unwind: '$partnerDetails' },
            {
                $project: {
                    partnerId: '$_id',
                    partnerName: '$partnerDetails.name',
                    partnerPhone: '$partnerDetails.phone',
                    totalDeliveries: 1,
                    totalEarnings: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ success: true, data: payouts });
    } catch (error) {
        console.error('Error calculating payouts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getDeliveryBoyPayoutLogs = getDeliveryPayouts;
