import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import mongoose from 'mongoose';

const getRestaurantId = (req) => {
    return req.user?.restaurantId || req.user?.userId || req.user?._id;
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
        if (!restaurantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Restaurant ID not found' });
        }

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
        const { name, durationDays, mealType, price, itemsDescription, isVegetarian, isActive, image, items } = req.body;

        const plan = await TiffinPlan.findOne({ _id: planId, restaurantId });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Tiffin Plan not found' });
        }

        if (name !== undefined) plan.name = name;
        if (durationDays !== undefined) plan.durationDays = Number(durationDays);
        if (mealType !== undefined) plan.mealType = mealType;
        if (price !== undefined) plan.price = Number(price);
        if (itemsDescription !== undefined) plan.itemsDescription = itemsDescription;
        if (image !== undefined) plan.image = image;
        if (items !== undefined && Array.isArray(items)) plan.items = items;
        if (isVegetarian !== undefined) plan.isVegetarian = Boolean(isVegetarian);
        if (isActive !== undefined) plan.isActive = Boolean(isActive);

        await plan.save();
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

        res.status(200).json({ success: true, data: prepCounts });
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

        const deliveries = await TiffinDelivery.find({
            restaurantId,
            date: { $gte: today, $lt: tomorrow },
            status: 'pending'
        }).populate('userId', 'name phone');

        // Also fetch active delivery partners in the restaurant's zone if available
        let partners = [];
        try {
            const FoodDeliveryPartner = mongoose.model('FoodDeliveryPartner');
            partners = await FoodDeliveryPartner.find({
                status: 'approved',
                isOnline: true
            }).select('_id name phone vehicleType');
        } catch (e) {
            console.log('No FoodDeliveryPartner model or collection found');
        }

        res.status(200).json({ success: true, data: { deliveries, partners } });
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

        const result = await TiffinDelivery.updateMany(
            {
                _id: { $in: deliveryIds },
                restaurantId: restaurantId,
                status: 'pending'
            },
            {
                $set: {
                    status: 'assigned',
                    assignedTo: partnerId,
                    assignedAt: new Date()
                }
            }
        );

        res.status(200).json({ success: true, message: `${result.modifiedCount} deliveries assigned successfully` });
    } catch (error) {
        console.error('Error assigning deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error assigning deliveries' });
    }
};
