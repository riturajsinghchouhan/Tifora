import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinDelivery } from '../models/tiffinDelivery.model.js';
import cron from 'node-cron';

// In-memory cache & concurrency lock
let lastSyncedDateStr = null;
let isSyncing = false;

/**
 * Returns YYYY-MM-DD string for comparison in local timezone
 */
const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Core Delivery Generator (Idempotent & Safe)
 * Generates today's missing deliveries for all active subscriptions.
 */
export const generateDailyDeliveries = async (force = false) => {
    const todayStr = getTodayDateStr();

    // Skip if already synchronized today and not forced
    if (!force && lastSyncedDateStr === todayStr && !isSyncing) {
        return 0;
    }

    // Mutex lock to prevent simultaneous execution from multiple requests
    if (isSyncing) {
        return 0;
    }

    isSyncing = true;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        // Find all active subscriptions where today falls between startDate and endDate
        const activeSubscriptions = await TiffinSubscription.find({
            status: 'active',
            startDate: { $lte: endOfToday },
            endDate: { $gte: today }
        }).populate('planId');

        let createdCount = 0;
        const nextDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        for (const sub of activeSubscriptions) {
            // Check existing delivery for today
            const existingDeliveries = await TiffinDelivery.find({
                subscriptionId: sub._id,
                date: { $gte: today, $lt: nextDay }
            });

            const existingTypes = new Set(existingDeliveries.map(d => d.type));

            const plan = sub.planId;
            const mealType = plan?.mealType || 'Morning'; // 'Morning', 'Evening', 'Both'

            // Check if customer marked off/skipped today
            const isMorningSkipped = sub.skippedDates?.some(sk => sk.date === todayStr && (sk.mealSlot === 'Morning' || sk.mealSlot === 'Both'));
            const isEveningSkipped = sub.skippedDates?.some(sk => sk.date === todayStr && (sk.mealSlot === 'Evening' || sk.mealSlot === 'Both'));

            const deliveriesToCreate = [];

            if ((mealType === 'Morning' || mealType === 'Both') && !existingTypes.has('Morning') && !isMorningSkipped) {
                deliveriesToCreate.push({
                    subscriptionId: sub._id,
                    restaurantId: sub.restaurantId,
                    userId: sub.userId,
                    deliveryAddress: sub.deliveryAddress,
                    type: 'Morning',
                    date: new Date(),
                    status: 'pending',
                    verification: { otpRequired: true, isVerified: false }
                });
            }

            if ((mealType === 'Evening' || mealType === 'Both') && !existingTypes.has('Evening') && !isEveningSkipped) {
                deliveriesToCreate.push({
                    subscriptionId: sub._id,
                    restaurantId: sub.restaurantId,
                    userId: sub.userId,
                    deliveryAddress: sub.deliveryAddress,
                    type: 'Evening',
                    date: new Date(),
                    status: 'pending',
                    verification: { otpRequired: true, isVerified: false }
                });
            }

            if (deliveriesToCreate.length > 0) {
                await TiffinDelivery.insertMany(deliveriesToCreate);
                createdCount += deliveriesToCreate.length;
            }
        }

        lastSyncedDateStr = todayStr;

        if (createdCount > 0) {
            console.log(`[Tiffin Sync Engine] Auto-generated ${createdCount} missing daily deliveries for ${todayStr}.`);
        }
        return createdCount;
    } catch (error) {
        console.error('[Tiffin Sync Engine] Error generating daily deliveries:', error);
        return 0;
    } finally {
        isSyncing = false;
    }
};

/**
 * Just-in-Time (JIT) sync trigger for controllers.
 * Non-blocking if already synced today.
 */
export const ensureTodayDeliveriesSync = async () => {
    const todayStr = getTodayDateStr();
    if (lastSyncedDateStr !== todayStr) {
        return await generateDailyDeliveries(true);
    }
    return 0;
};

/**
 * Multi-Tier Fail-Safe Scheduler Initialization:
 * 1. Immediate Startup Catch-Up on Server Boot
 * 2. Midnight Cron (00:00)
 * 3. 30-Minute Safety Heartbeat (handles timezones/crashes/sleeps)
 */
export const initTiffinScheduler = () => {
    console.log('[Tiffin Scheduler] Initializing Fail-Safe Sync Engine...');

    // Tier 1: Run immediate catchup on boot after MongoDB is ready
    setTimeout(() => {
        generateDailyDeliveries(true).catch(e => console.error('[Tiffin Scheduler] Boot sync error:', e));
    }, 2000);

    // Tier 2: Midnight cron
    cron.schedule('0 0 * * *', () => {
        console.log('[Tiffin Scheduler] Midnight Cron: Generating new day deliveries');
        generateDailyDeliveries(true);
    });

    // Tier 3: 30-Minute safety heartbeat
    setInterval(() => {
        const todayStr = getTodayDateStr();
        if (lastSyncedDateStr !== todayStr) {
            console.log('[Tiffin Scheduler] Heartbeat detected date shift, auto-syncing...');
            generateDailyDeliveries(true);
        }
    }, 30 * 60 * 1000);
};
