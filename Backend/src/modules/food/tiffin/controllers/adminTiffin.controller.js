import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinPayout } from '../models/tiffinPayout.model.js';
import { TiffinCommissionSetting } from '../models/tiffinCommission.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { ensureTodayDeliveriesSync } from '../scripts/tiffinScheduler.js';
import { uploadImageBuffer } from '../../../../services/upload.service.js';
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
        const todayStats = todayDeliveriesAgg[0] || {
            total: 0,
            morning: 0,
            evening: 0,
            delivered: 0,
            pending: 0
        };

        res.status(200).json({
            success: true,
            data: {
                totalSubscriptions: totalSubs || 0,
                activeSubscriptions: activeSubs || 0,
                pausedSubscriptions: pausedSubs || 0,
                totalRevenue,
                totalPlans: totalPlans || 0,
                activeKitchens: kitchensCount || 0,
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
            durationDays: Number(durationDays) || 30,
            mealType: mealType || 'Both',
            price: Number(price) || 0,
            itemsDescription: itemsDescription || '',
            image: image || '/food/tiffin/tiffin_box_default.png',
            items: parsedItems,
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
        let updates = req.body;

        // Parse items if sent as string
        if (typeof updates.items === 'string') {
            try {
                updates.items = JSON.parse(updates.items);
            } catch (e) {
                updates.items = [];
            }
        }

        // Process files
        if (req.files && Array.isArray(req.files)) {
            const mainImageFile = req.files.find(f => f.fieldname === 'imageFile');
            if (mainImageFile) {
                updates.image = await uploadImageBuffer(mainImageFile.buffer, 'food/tiffin/plans');
            }

            if (Array.isArray(updates.items)) {
                for (let i = 0; i < updates.items.length; i++) {
                    const itemImageFile = req.files.find(f => f.fieldname === `items[${i}][imageFile]`);
                    if (itemImageFile) {
                        updates.items[i].image = await uploadImageBuffer(itemImageFile.buffer, 'food/tiffin/items');
                    }
                }
            }
        }

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

/**
 * =========================================================================
 * 11. TIFFIN RESTAURANT PAYOUT REQUESTS
 * =========================================================================
 */
export const getTiffinRestaurantPayouts = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { type: 'restaurant_payout' };

        if (status && status.toLowerCase() !== 'all') {
            query.status = status.toLowerCase();
        }

        let payouts = await TiffinPayout.find(query)
            .populate('restaurantId', 'restaurantName name logo address phone ownerPhone bankDetails')
            .sort({ createdAt: -1 })
            .lean();

        // Search filtering if requested
        if (search) {
            const s = search.toLowerCase();
            payouts = payouts.filter(p => 
                (p.restaurantId?.restaurantName || p.restaurantId?.name || '').toLowerCase().includes(s) ||
                (p.bankDetails?.accountHolder || '').toLowerCase().includes(s) ||
                (p.bankDetails?.accountNumber || '').includes(s) ||
                (p.transactionReference || '').toLowerCase().includes(s) ||
                String(p.amount).includes(s)
            );
        }

        // Summary Aggregates
        const allPayouts = await TiffinPayout.find({ type: 'restaurant_payout' }).lean();
        const stats = {
            totalRequested: allPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
            pendingCount: allPayouts.filter(p => p.status === 'pending').length,
            pendingAmount: allPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
            approvedCount: allPayouts.filter(p => p.status === 'approved').length,
            approvedAmount: allPayouts.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0),
            rejectedCount: allPayouts.filter(p => p.status === 'rejected').length
        };

        res.status(200).json({
            success: true,
            data: payouts,
            stats
        });
    } catch (error) {
        console.error('Error fetching tiffin restaurant payouts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching payouts' });
    }
};

export const updateTiffinRestaurantPayoutStatus = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { status, transactionReference, rejectionReason, adminNote } = req.body;

        if (!['approved', 'rejected', 'processing', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const updateData = {
            status,
            processedAt: ['approved', 'rejected'].includes(status) ? new Date() : null,
            processedBy: req.user?.name || req.user?.email || 'Admin'
        };

        if (transactionReference) updateData.transactionReference = transactionReference;
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        if (adminNote) updateData.adminNote = adminNote;

        const updated = await TiffinPayout.findByIdAndUpdate(payoutId, { $set: updateData }, { new: true })
            .populate('restaurantId', 'restaurantName name phone');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Payout request not found' });
        }

        res.status(200).json({
            success: true,
            message: `Payout request marked as ${status}`,
            data: updated
        });
    } catch (error) {
        console.error('Error updating payout status:', error);
        res.status(500).json({ success: false, message: 'Server error updating payout status' });
    }
};

export const createTiffinRestaurantPayoutRequest = async (req, res) => {
    try {
        const { restaurantId, amount, paymentMethod, bankDetails, adminNote } = req.body;

        if (!restaurantId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Restaurant ID and valid amount required' });
        }

        const newPayout = await TiffinPayout.create({
            type: 'restaurant_payout',
            restaurantId,
            amount: Number(amount),
            paymentMethod: paymentMethod || 'Bank Transfer',
            bankDetails: bankDetails || {},
            adminNote: adminNote || '',
            status: 'pending',
            requestedAt: new Date()
        });

        const populated = await TiffinPayout.findById(newPayout._id)
            .populate('restaurantId', 'restaurantName name phone address');

        res.status(201).json({
            success: true,
            message: 'Payout request created successfully',
            data: populated
        });
    } catch (error) {
        console.error('Error creating tiffin payout request:', error);
        res.status(500).json({ success: false, message: 'Server error creating payout request' });
    }
};

/**
 * =========================================================================
 * 12. TIFFIN RESTAURANT COMMISSION MANAGEMENT
 * =========================================================================
 */
export const getTiffinCommissionSettings = async (req, res) => {
    try {
        let settings = await TiffinCommissionSetting.findOne({}).lean();
        if (!settings) {
            settings = await TiffinCommissionSetting.create({
                globalCommissionPercentage: 10,
                gstOnCommission: 18,
                perDeliveryRate: 25,
                customKitchenRates: [],
                salaryCalculationMode: 'per_drop'
            });
            settings = settings.toObject();
        }

        const kitchens = await FoodRestaurant.find({})
            .select('restaurantName name logo address phone ownerPhone rating isActive')
            .lean();

        // Get active subscription counts & revenue per kitchen
        const subAgg = await TiffinSubscription.aggregate([
            {
                $group: {
                    _id: '$restaurantId',
                    totalSubscriptions: { $sum: 1 },
                    activeSubscriptions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    totalRevenue: { $sum: '$amountPaid' }
                }
            }
        ]);

        const subMap = {};
        subAgg.forEach(item => {
            if (item._id) subMap[item._id.toString()] = item;
        });

        const customRateMap = {};
        (settings.customKitchenRates || []).forEach(r => {
            if (r.restaurantId) customRateMap[r.restaurantId.toString()] = r;
        });

        const kitchensWithCommission = kitchens.map(k => {
            const kId = k._id.toString();
            const subData = subMap[kId] || { totalSubscriptions: 0, activeSubscriptions: 0, totalRevenue: 0 };
            const custom = customRateMap[kId];
            const commissionRate = custom && custom.isActive ? custom.commissionRate : settings.globalCommissionPercentage;
            const estimatedCommission = Math.round((subData.totalRevenue * commissionRate) / 100);
            const gstAmount = Math.round((estimatedCommission * (settings.gstOnCommission || 18)) / 100);

            return {
                _id: k._id,
                name: k.restaurantName || k.name || "Renuka's Kitchen",
                address: k.address || 'Indore, MP',
                phone: k.phone || k.ownerPhone || '9876543210',
                logo: k.logo,
                hasCustomRate: Boolean(custom && custom.isActive),
                commissionRate,
                customRateActive: custom ? custom.isActive : false,
                notes: custom ? custom.notes : '',
                totalSubscriptions: subData.totalSubscriptions,
                activeSubscriptions: subData.activeSubscriptions,
                totalRevenue: subData.totalRevenue,
                estimatedCommission,
                gstAmount
            };
        });

        // Global commission analytics
        const totalRevenue = kitchensWithCommission.reduce((sum, k) => sum + k.totalRevenue, 0);
        const totalCommission = kitchensWithCommission.reduce((sum, k) => sum + k.estimatedCommission, 0);
        const totalGst = kitchensWithCommission.reduce((sum, k) => sum + k.gstAmount, 0);

        res.status(200).json({
            success: true,
            data: {
                settings,
                kitchens: kitchensWithCommission,
                stats: {
                    globalCommissionPercentage: settings.globalCommissionPercentage,
                    gstOnCommission: settings.gstOnCommission,
                    totalKitchens: kitchens.length,
                    customRateKitchensCount: (settings.customKitchenRates || []).filter(r => r.isActive).length,
                    totalRevenue,
                    totalCommission,
                    totalGst,
                    netAdminEarnings: totalCommission + totalGst
                }
            }
        });
    } catch (error) {
        console.error('Error fetching tiffin commission settings:', error);
        res.status(500).json({ success: false, message: 'Server error fetching commission settings' });
    }
};

export const updateTiffinCommissionSettings = async (req, res) => {
    try {
        const { globalCommissionPercentage, gstOnCommission, perDeliveryRate, customKitchenRates } = req.body;

        let settings = await TiffinCommissionSetting.findOne({});
        if (!settings) {
            settings = new TiffinCommissionSetting();
        }

        if (globalCommissionPercentage !== undefined) settings.globalCommissionPercentage = Number(globalCommissionPercentage);
        if (gstOnCommission !== undefined) settings.gstOnCommission = Number(gstOnCommission);
        if (perDeliveryRate !== undefined) settings.perDeliveryRate = Number(perDeliveryRate);
        if (Array.isArray(customKitchenRates)) settings.customKitchenRates = customKitchenRates;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Tiffin commission settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error updating tiffin commission settings:', error);
        res.status(500).json({ success: false, message: 'Server error updating commission settings' });
    }
};

export const setKitchenCustomCommissionRate = async (req, res) => {
    try {
        const { restaurantId, commissionRate, isActive = true, notes = '' } = req.body;

        if (!restaurantId || commissionRate === undefined) {
            return res.status(400).json({ success: false, message: 'Restaurant ID and commission rate required' });
        }

        let settings = await TiffinCommissionSetting.findOne({});
        if (!settings) {
            settings = await TiffinCommissionSetting.create({
                globalCommissionPercentage: 10,
                gstOnCommission: 18,
                perDeliveryRate: 25,
                customKitchenRates: []
            });
        }

        const existingIdx = settings.customKitchenRates.findIndex(r => r.restaurantId.toString() === restaurantId.toString());
        if (existingIdx >= 0) {
            settings.customKitchenRates[existingIdx].commissionRate = Number(commissionRate);
            settings.customKitchenRates[existingIdx].isActive = Boolean(isActive);
            settings.customKitchenRates[existingIdx].notes = notes;
            settings.customKitchenRates[existingIdx].updatedAt = new Date();
        } else {
            settings.customKitchenRates.push({
                restaurantId,
                commissionRate: Number(commissionRate),
                isActive: Boolean(isActive),
                notes,
                updatedAt: new Date()
            });
        }

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Kitchen custom commission rate updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error setting kitchen custom commission:', error);
        res.status(500).json({ success: false, message: 'Server error setting custom rate' });
    }
};

/**
 * =========================================================================
 * 13. TIFFIN DELIVERY BOY SALARY & PAYOUT MANAGEMENT
 * =========================================================================
 */
export const getTiffinDeliverySalaries = async (req, res) => {
    try {
        // Fetch commission & delivery rate config
        let commissionConfig = await TiffinCommissionSetting.findOne({}).lean();
        const baseDropRate = commissionConfig?.perDeliveryRate || 25;

        // Fetch all delivery partners
        const partners = await FoodDeliveryPartner.find({})
            .select('name phone email profileImage status vehicleType active isOnline walletBalance bankAccountHolderName bankAccountNumber bankIfscCode bankName upiId upiQrCode panNumber aadharNumber vehicleNumber')
            .lean();

        // Aggregate completed tiffin drops by delivery partner
        const dropsAgg = await TiffinDelivery.aggregate([
            {
                $match: {
                    status: { $in: ['delivered', 'delivered_unattended'] }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    totalDeliveries: { $sum: 1 },
                    morningDeliveries: { $sum: { $cond: [{ $eq: ['$type', 'Morning'] }, 1, 0] } },
                    eveningDeliveries: { $sum: { $cond: [{ $eq: ['$type', 'Evening'] }, 1, 0] } },
                    totalCalculatedEarning: { $sum: { $ifNull: ['$deliveryEarning', baseDropRate] } },
                    lastDeliveredDate: { $max: '$deliveredAt' }
                }
            }
        ]);

        const dropsMap = {};
        dropsAgg.forEach(d => {
            if (d._id) dropsMap[d._id.toString()] = d;
        });

        // Aggregate salary disbursals made to delivery partners
        const disbursements = await TiffinPayout.find({ type: 'delivery_salary' })
            .populate('deliveryPartnerId', 'name phone')
            .sort({ createdAt: -1 })
            .lean();

        const paidMap = {};
        disbursements.forEach(p => {
            if (p.deliveryPartnerId?._id) {
                const partnerId = p.deliveryPartnerId._id.toString();
                paidMap[partnerId] = (paidMap[partnerId] || 0) + (p.amount || 0);
            }
        });

        // Merge roster
        const riderSalaries = partners.map(p => {
            const pId = p._id.toString();
            const dropData = dropsMap[pId] || {
                totalDeliveries: 0,
                morningDeliveries: 0,
                eveningDeliveries: 0,
                totalCalculatedEarning: 0,
                lastDeliveredDate: null
            };

            const totalEarned = dropData.totalCalculatedEarning > 0 
                ? dropData.totalCalculatedEarning 
                : dropData.totalDeliveries * baseDropRate;

            const paidAmount = paidMap[pId] || 0;
            const pendingSalary = Math.max(0, totalEarned - paidAmount);

            return {
                _id: p._id,
                name: p.name || 'Delivery Partner',
                phone: p.phone || '',
                email: p.email || '',
                profileImage: p.profileImage,
                status: p.status || 'approved',
                vehicleType: p.vehicleType || 'Bike',
                vehicleNumber: p.vehicleNumber || '',
                bankAccountHolderName: p.bankAccountHolderName || '',
                bankAccountNumber: p.bankAccountNumber || '',
                bankIfscCode: p.bankIfscCode || '',
                bankName: p.bankName || '',
                upiId: p.upiId || '',
                upiQrCode: p.upiQrCode || '',
                panNumber: p.panNumber || '',
                aadharNumber: p.aadharNumber || '',
                ratePerDrop: baseDropRate,
                totalDeliveries: dropData.totalDeliveries,
                morningDeliveries: dropData.morningDeliveries,
                eveningDeliveries: dropData.eveningDeliveries,
                totalEarned,
                paidAmount,
                pendingSalary,
                lastDeliveredDate: dropData.lastDeliveredDate,
                payoutStatus: pendingSalary === 0 && totalEarned > 0 ? 'Settled' : (pendingSalary > 0 ? 'Pending' : 'No Activity')
            };
        });

        // Summary Stats
        const stats = {
            activeRidersCount: riderSalaries.filter(r => r.totalDeliveries > 0 || r.status === 'approved').length,
            totalMealsDelivered: riderSalaries.reduce((sum, r) => sum + r.totalDeliveries, 0),
            totalMorningMeals: riderSalaries.reduce((sum, r) => sum + r.morningDeliveries, 0),
            totalEveningMeals: riderSalaries.reduce((sum, r) => sum + r.eveningDeliveries, 0),
            totalSalaryEarned: riderSalaries.reduce((sum, r) => sum + r.totalEarned, 0),
            totalSalaryDisbursed: disbursements.reduce((sum, p) => sum + (p.amount || 0), 0),
            totalPendingSalary: riderSalaries.reduce((sum, r) => sum + r.pendingSalary, 0),
            baseDropRate
        };

        res.status(200).json({
            success: true,
            data: {
                roster: riderSalaries,
                disbursements,
                stats
            }
        });
    } catch (error) {
        console.error('Error calculating delivery boy salaries:', error);
        res.status(500).json({ success: false, message: 'Server error calculating salaries' });
    }
};

export const disburseTiffinDeliverySalary = async (req, res) => {
    try {
        const {
            deliveryPartnerId,
            amount,
            paymentMethod = 'UPI',
            transactionReference = '',
            deliveriesCount = 0,
            periodStart,
            periodEnd,
            adminNote = ''
        } = req.body;

        if (!deliveryPartnerId || !amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid delivery partner and amount required' });
        }

        const partner = await FoodDeliveryPartner.findById(deliveryPartnerId);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Delivery partner not found' });
        }

        const payout = await TiffinPayout.create({
            type: 'delivery_salary',
            deliveryPartnerId,
            amount: Number(amount),
            paymentMethod,
            transactionReference: transactionReference || `SAL-${Date.now()}`,
            deliveriesCount: Number(deliveriesCount),
            periodStart: periodStart ? new Date(periodStart) : null,
            periodEnd: periodEnd ? new Date(periodEnd) : null,
            status: 'approved',
            adminNote,
            requestedAt: new Date(),
            processedAt: new Date(),
            processedBy: req.user?.name || req.user?.email || 'Admin'
        });

        const populated = await TiffinPayout.findById(payout._id)
            .populate('deliveryPartnerId', 'name phone email');

        res.status(201).json({
            success: true,
            message: `Salary payout of ₹${amount} successfully recorded for ${partner.name}`,
            data: populated
        });
    } catch (error) {
        console.error('Error disbursing delivery salary:', error);
        res.status(500).json({ success: false, message: 'Server error disbursing salary' });
    }
};

export const updateTiffinDeliveryPaySettings = async (req, res) => {
    try {
        const { perDeliveryRate, monthlyFixedSalaryDefault, salaryCalculationMode } = req.body;

        let settings = await TiffinCommissionSetting.findOne({});
        if (!settings) {
            settings = new TiffinCommissionSetting();
        }

        if (perDeliveryRate !== undefined) settings.perDeliveryRate = Number(perDeliveryRate);
        if (monthlyFixedSalaryDefault !== undefined) settings.monthlyFixedSalaryDefault = Number(monthlyFixedSalaryDefault);
        if (salaryCalculationMode) settings.salaryCalculationMode = salaryCalculationMode;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Tiffin delivery salary pay settings updated',
            data: settings
        });
    } catch (error) {
        console.error('Error updating delivery pay settings:', error);
        res.status(500).json({ success: false, message: 'Server error updating pay settings' });
    }
};
