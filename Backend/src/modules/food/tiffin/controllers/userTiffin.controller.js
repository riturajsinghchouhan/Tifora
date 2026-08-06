import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { generateDailyDeliveries } from '../scripts/tiffinScheduler.js';
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

        // Auto-generate today's delivery immediately if active today
        generateDailyDeliveries(true).catch(e => console.error('Error generating deliveries on resume:', e));

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
        
        // Fetch user's subscription deliveries (past 60 days to upcoming)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const deliveries = await TiffinDelivery.find({ 
            userId,
            date: { $gte: sixtyDaysAgo }
        })
        .select('+verification.otpExpected')
        .populate('restaurantId', 'name address phone image logo location')
        .populate({
            path: 'subscriptionId',
            populate: { path: 'planId', select: 'name itemsDescription mealType' }
        })
        .populate('assignedTo', 'name phone profileImage location')
        .sort({ date: -1, type: 1 });

        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        console.error('Error fetching user tiffin deliveries:', error);
        res.status(500).json({ success: false, message: 'Server error fetching tiffin deliveries' });
    }
};

/**
 * Update Delivery Address for a Subscription
 */
export const updateSubscriptionAddress = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;
        const { street, area, landmark, zone, city, state, zipCode, phone, name, fullName, label } = req.body;

        if (!street || !city) {
            return res.status(400).json({ success: false, message: 'Street address and City are required' });
        }

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        subscription.deliveryAddress = {
            label: label || subscription.deliveryAddress?.label || 'Home',
            name: name || fullName || subscription.deliveryAddress?.name || '',
            fullName: fullName || name || subscription.deliveryAddress?.fullName || '',
            street: street.trim(),
            area: area ? area.trim() : subscription.deliveryAddress?.area || '',
            landmark: landmark ? landmark.trim() : subscription.deliveryAddress?.landmark || '',
            zone: zone ? zone.trim() : subscription.deliveryAddress?.zone || '',
            city: city.trim(),
            state: state ? state.trim() : (subscription.deliveryAddress?.state || 'Madhya Pradesh'),
            zipCode: zipCode ? zipCode.trim() : subscription.deliveryAddress?.zipCode || '',
            phone: phone ? phone.trim() : subscription.deliveryAddress?.phone || '',
            location: subscription.deliveryAddress?.location || { type: 'Point', coordinates: [75.8577, 22.7196] }
        };

        await subscription.save();

        // Also update any pending deliveries today for this subscription
        const { TiffinDelivery } = await import('../models/tiffinDelivery.model.js');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await TiffinDelivery.updateMany(
            {
                subscriptionId: subscription._id,
                date: { $gte: today },
                status: 'pending'
            },
            {
                $set: { deliveryAddress: subscription.deliveryAddress }
            }
        );

        res.status(200).json({ 
            success: true, 
            data: subscription, 
            message: 'Delivery address updated successfully! Future deliveries will use this address.' 
        });
    } catch (error) {
        console.error('Error updating subscription address:', error);
        res.status(500).json({ success: false, message: 'Server error updating address' });
    }
};

/**
 * Skip a Day (Mark Off Day & Auto-Extend End Date by +1 Day)
 */
export const skipSubscriptionDay = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;
        const { date, mealSlot, reason } = req.body; // date in 'YYYY-MM-DD' format

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date (YYYY-MM-DD) is required to skip' });
        }

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // Check if date is already in skipped list
        const alreadySkipped = subscription.skippedDates.some(sk => sk.date === date);
        if (alreadySkipped) {
            return res.status(400).json({ success: false, message: `Date ${date} is already marked as off/skipped` });
        }

        // Add to skipped dates
        subscription.skippedDates.push({
            date,
            mealSlot: mealSlot || 'Both',
            reason: reason || 'Customer requested off day',
            skippedAt: new Date()
        });

        // Automatically extend end date by 1 full day (+24 hours)
        const currentEndDate = new Date(subscription.endDate);
        currentEndDate.setDate(currentEndDate.getDate() + 1);
        subscription.endDate = currentEndDate;

        await subscription.save();

        // If skipping today or an active pending delivery date, remove/cancel today's pending deliveries
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextTargetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

        const { TiffinDelivery } = await import('../models/tiffinDelivery.model.js');
        await TiffinDelivery.deleteMany({
            subscriptionId: subscription._id,
            date: { $gte: targetDate, $lt: nextTargetDate },
            status: 'pending'
        });

        res.status(200).json({ 
            success: true, 
            data: subscription, 
            message: `Meal marked OFF for ${date}! Your subscription has been automatically extended by 1 day to ${currentEndDate.toLocaleDateString()}.` 
        });
    } catch (error) {
        console.error('Error skipping subscription day:', error);
        res.status(500).json({ success: false, message: 'Server error marking day off' });
    }
};

/**
 * Unskip a Day (Resume a previously skipped date and adjust end date)
 */
export const unskipSubscriptionDay = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;
        const { date } = req.body;

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const initialLength = subscription.skippedDates.length;
        subscription.skippedDates = subscription.skippedDates.filter(sk => sk.date !== date);

        if (subscription.skippedDates.length < initialLength) {
            // Adjust end date back by 1 day
            const currentEndDate = new Date(subscription.endDate);
            currentEndDate.setDate(currentEndDate.getDate() - 1);
            subscription.endDate = currentEndDate;
            await subscription.save();

            // Trigger sync if date is today
            generateDailyDeliveries(true).catch(() => null);

            return res.status(200).json({ 
                success: true, 
                data: subscription, 
                message: `Delivery re-activated for ${date}. End date adjusted to ${currentEndDate.toLocaleDateString()}.` 
            });
        } else {
            return res.status(400).json({ success: false, message: 'Date was not in the skipped list' });
        }
    } catch (error) {
        console.error('Error unskipping subscription day:', error);
        res.status(500).json({ success: false, message: 'Server error resuming day' });
    }
};

/**
 * Update Delivery Instructions & Custom Preferences
 */
export const updateSubscriptionPreferences = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { subscriptionId } = req.params;
        const { deliveryInstructions, spiceLevel, specialNotes } = req.body;

        const subscription = await TiffinSubscription.findOne({ _id: subscriptionId, userId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (deliveryInstructions !== undefined) subscription.deliveryInstructions = deliveryInstructions.trim();
        if (spiceLevel) subscription.customPreferences.spiceLevel = spiceLevel;
        if (specialNotes !== undefined) subscription.customPreferences.specialNotes = specialNotes.trim();

        await subscription.save();

        res.status(200).json({ 
            success: true, 
            data: subscription, 
            message: 'Meal preferences and delivery instructions saved successfully!' 
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: 'Server error updating preferences' });
    }
};
