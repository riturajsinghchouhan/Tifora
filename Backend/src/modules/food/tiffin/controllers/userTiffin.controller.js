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
            .populate('restaurantId', 'restaurantName name address location profileImage logo phone')
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
            .populate('restaurantId', 'restaurantName name address location profileImage logo phone');
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Tiffin Plan not found' });
        }
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        console.error('Error fetching Tiffin Plan by ID:', error);
        res.status(500).json({ success: false, message: 'Server error fetching Tiffin Plan' });
    }
};

import { createRazorpayOrder, verifyPaymentSignature } from '../../orders/helpers/razorpay.helper.js';
import { getIO, rooms } from '../../../../config/socket.js';

export const purchaseSubscription = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
        }

        const { restaurantId, planId, startDate, deliveryAddress, paymentId, amountPaid, paymentMethod } = req.body;

        const plan = await TiffinPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive Tiffin Plan' });
        }

        const start = new Date(startDate || Date.now());
        const end = new Date(start);
        end.setDate(end.getDate() + plan.durationDays);

        const amountToPay = amountPaid || plan.price;

        // If Razorpay, just create order and return to frontend
        if (paymentMethod === 'razorpay') {
            const amountPaise = Math.round(amountToPay * 100);
            const rzOrder = await createRazorpayOrder(amountPaise, 'INR', `tiffin_plan_${planId}`);
            
            return res.status(200).json({
                success: true,
                razorpay: {
                    orderId: rzOrder.id,
                    amount: amountPaise,
                    currency: 'INR'
                },
                subscriptionTemp: {
                    restaurantId: restaurantId || plan.restaurantId,
                    planId,
                    startDate: start,
                    endDate: end,
                    deliveryAddress,
                    amountPaid: amountToPay
                }
            });
        }

        // For non-razorpay (e.g. wallet/offline)
        const newSubscription = new TiffinSubscription({
            userId,
            restaurantId: restaurantId || plan.restaurantId,
            planId,
            startDate: start,
            endDate: end,
            deliveryAddress,
            paymentId: paymentId || `OFFLINE_${Date.now()}`,
            paymentStatus: 'paid',
            amountPaid: amountToPay
        });

        await newSubscription.save();
        await generateInitialDeliveries(newSubscription, plan, start);

        res.status(201).json({ success: true, data: newSubscription, message: 'Subscription purchased successfully' });
    } catch (error) {
        console.error('Error purchasing subscription:', error);
        res.status(500).json({ success: false, message: 'Server error purchasing subscription' });
    }
};

export const verifyTiffinPayment = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionTemp } = req.body;
        
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Missing Razorpay payload' });
        }

        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        const plan = await TiffinPlan.findById(subscriptionTemp.planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        const newSubscription = new TiffinSubscription({
            userId,
            restaurantId: subscriptionTemp.restaurantId,
            planId: subscriptionTemp.planId,
            startDate: subscriptionTemp.startDate,
            endDate: subscriptionTemp.endDate,
            deliveryAddress: subscriptionTemp.deliveryAddress,
            paymentId: null, // Could link to a transaction doc if needed
            paymentStatus: 'paid',
            amountPaid: subscriptionTemp.amountPaid,
            status: 'active'
        });

        await newSubscription.save();
        await generateInitialDeliveries(newSubscription, plan, new Date(subscriptionTemp.startDate));

        try {
            const io = getIO();
            const room = rooms.restaurant(subscriptionTemp.restaurantId);
            io.to(room).emit('new-tiffin-subscription', { subscription: newSubscription });
        } catch (err) {
            console.error('Failed to emit socket:', err);
        }

        res.status(200).json({ success: true, message: 'Payment verified and subscription activated', data: newSubscription });
    } catch (error) {
        console.error('Error verifying tiffin payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

async function generateInitialDeliveries(newSubscription, plan, start) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startCheck = new Date(start);
    startCheck.setHours(0, 0, 0, 0);

    if (startCheck.getTime() <= today.getTime()) {
        try {
            const { TiffinDelivery } = await import('../models/tiffinDelivery.model.js');
            const mealTypes = plan.mealType === 'Both' ? ['Morning', 'Evening'] : [plan.mealType];
            
            for (const type of mealTypes) {
                await TiffinDelivery.create({
                    subscriptionId: newSubscription._id,
                    restaurantId: newSubscription.restaurantId,
                    userId: newSubscription.userId,
                    deliveryAddress: newSubscription.deliveryAddress,
                    type,
                    date: today,
                    status: 'pending'
                });
            }
        } catch (err) {
            console.error('Failed to generate initial tiffin deliveries:', err);
        }
    }
}

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

export const getMyTiffinDeliveriesUser = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
        }
        
        const { TiffinDelivery } = await import('../models/tiffinDelivery.model.js');
        
        // Fetch today's deliveries or active deliveries for this user
        // We will fetch deliveries for the last 3 days to be safe and upcoming ones
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const deliveries = await TiffinDelivery.find({ 
            userId,
            date: { $gte: threeDaysAgo }
        })
        .select('+verification.otpExpected')
        .populate('restaurantId', 'name address phone image logo')
        .populate('subscriptionId', 'planId') // To get plan details if needed
        .populate('assignedTo', 'name phone profileImage location')
        .sort({ date: -1, type: 1 });

        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        console.error('Error fetching user tiffin deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error fetching tiffin deliveries' });
    }
};
