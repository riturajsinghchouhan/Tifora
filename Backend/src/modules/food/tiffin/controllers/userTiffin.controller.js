import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import mongoose from 'mongoose';

const getUserId = (req) => {
    return req.user?.userId || req.user?._id;
};

export const getAvailablePlans = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const filter = restaurantId ? { restaurantId, isActive: true } : { isActive: true };
        const plans = await TiffinPlan.find(filter)
            .populate('restaurantId', 'name address location image logo')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        console.error('Error fetching available Tiffin Plans:', error);
        res.status(500).json({ success: false, message: 'Server error fetching Tiffin Plans' });
    }
};

export const getPlanById = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await TiffinPlan.findById(planId)
            .populate('restaurantId', 'name address location image logo');
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Tiffin Plan not found' });
        }
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        console.error('Error fetching Tiffin Plan by ID:', error);
        res.status(500).json({ success: false, message: 'Server error fetching Tiffin Plan' });
    }
};

export const purchaseSubscription = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
        }

        const { restaurantId, planId, startDate, deliveryAddress, paymentId, amountPaid } = req.body;

        const plan = await TiffinPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive Tiffin Plan' });
        }

        const start = new Date(startDate || Date.now());
        const end = new Date(start);
        end.setDate(end.getDate() + plan.durationDays);

        const newSubscription = new TiffinSubscription({
            userId,
            restaurantId: restaurantId || plan.restaurantId,
            planId,
            startDate: start,
            endDate: end,
            deliveryAddress,
            paymentId: paymentId || `OFFLINE_${Date.now()}`,
            paymentStatus: 'paid',
            amountPaid: amountPaid || plan.price
        });

        await newSubscription.save();
        res.status(201).json({ success: true, data: newSubscription, message: 'Subscription purchased successfully' });
    } catch (error) {
        console.error('Error purchasing subscription:', error);
        res.status(500).json({ success: false, message: 'Server error purchasing subscription' });
    }
};

export const getMySubscriptions = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
        }

        const subscriptions = await TiffinSubscription.find({ userId })
            .populate('restaurantId', 'name address phone image logo')
            .populate('planId', 'name mealType durationDays price itemsDescription isVegetarian')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ success: false, message: 'Server error fetching subscriptions' });
    }
};

export const pauseSubscription = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (subscription.status !== 'active') {
            return res.status(400).json({ success: false, message: `Cannot pause a ${subscription.status} subscription` });
        }

        subscription.status = 'paused';
        await subscription.save();

        res.status(200).json({ success: true, data: subscription, message: 'Subscription paused successfully' });
    } catch (error) {
        console.error('Error pausing subscription:', error);
        res.status(500).json({ success: false, message: 'Server error pausing subscription' });
    }
};

export const resumeSubscription = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (subscription.status !== 'paused') {
            return res.status(400).json({ success: false, message: `Cannot resume a ${subscription.status} subscription` });
        }

        subscription.status = 'active';
        await subscription.save();

        res.status(200).json({ success: true, data: subscription, message: 'Subscription resumed successfully' });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({ success: false, message: 'Server error resuming subscription' });
    }
};
