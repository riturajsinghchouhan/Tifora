import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import { TiffinPlan } from '../models/tiffinPlan.model.js';
import mongoose from 'mongoose';

/**
 * Generates daily tiffin deliveries for all active subscriptions.
 * Intended to be run by a cron job at midnight.
 */
export const generateDailyDeliveries = async () => {
    console.log('--- Starting Daily Tiffin Delivery Generation ---');
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all active subscriptions where today is between start and end date
        const activeSubscriptions = await TiffinSubscription.find({
            status: 'active',
            startDate: { $lte: today },
            endDate: { $gte: today }
        }).populate('planId');

        let createdCount = 0;

        for (const sub of activeSubscriptions) {
            // Check if delivery already exists for today to prevent duplicates
            const existingDelivery = await TiffinDelivery.findOne({
                subscriptionId: sub._id,
                date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
            });

            if (existingDelivery) {
                continue; // Skip if already generated
            }

            const plan = sub.planId;
            const mealType = plan.mealType; // 'Morning', 'Evening', 'Both'

            const deliveriesToCreate = [];

            if (mealType === 'Morning' || mealType === 'Both') {
                deliveriesToCreate.push({
                    subscriptionId: sub._id,
                    restaurantId: sub.restaurantId,
                    userId: sub.userId,
                    deliveryAddress: sub.deliveryAddress,
                    type: 'Morning',
                    date: new Date(),
                    verification: { otpRequired: true }
                });
            }

            if (mealType === 'Evening' || mealType === 'Both') {
                deliveriesToCreate.push({
                    subscriptionId: sub._id,
                    restaurantId: sub.restaurantId,
                    userId: sub.userId,
                    deliveryAddress: sub.deliveryAddress,
                    type: 'Evening',
                    date: new Date(),
                    verification: { otpRequired: true }
                });
            }

            if (deliveriesToCreate.length > 0) {
                await TiffinDelivery.insertMany(deliveriesToCreate);
                createdCount += deliveriesToCreate.length;
            }
        }

        console.log(`--- Finished: Generated ${createdCount} new deliveries ---`);
    } catch (error) {
        console.error('Error generating daily deliveries:', error);
    }
};

import cron from 'node-cron';

export const initTiffinScheduler = () => {
    console.log('Initializing Tiffin Scheduler Cron Job...');
    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', () => {
        console.log('Cron triggered: Generating daily tiffin deliveries');
        generateDailyDeliveries();
    });
};
