import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import { TiffinPlan } from '../models/tiffinPlan.model.js';
import { ensureSubscriptionDeliveriesForDate } from '../scripts/tiffinScheduler.js';
import {
    isRazorpayConfigured,
    fetchRazorpayOrderPayments,
    captureRazorpayPayment
} from '../../orders/helpers/razorpay.helper.js';
import { notifyTiffinPurchaseOnWhatsapp } from './tiffinWhatsapp.helper.js';
import { getIO, rooms } from '../../../../config/socket.js';

// Pending subscriptions older than this are treated as abandoned checkouts.
// Long enough to catch payments stuck for weeks before this safety net existed.
const LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

let isReconciling = false;

const startOfDay = (value = new Date()) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Returns a captured Razorpay payment for the subscription's order, capturing an
 * authorised one if needed. Null when the customer never actually paid.
 */
async function findPaidRazorpayPayment(sub) {
    const result = await fetchRazorpayOrderPayments(sub.razorpayOrderId);
    const payments = Array.isArray(result?.items) ? result.items : [];
    const expectedPaise = Math.round(Number(sub.amountPaid || 0) * 100);
    const coversAmount = (p) => Number(p.amount || 0) >= expectedPaise;

    const captured = payments.find((p) => p.status === 'captured' && coversAmount(p));
    if (captured) return captured;

    const authorized = payments.find((p) => p.status === 'authorized' && coversAmount(p));
    if (authorized) {
        const capture = await captureRazorpayPayment(authorized.id, authorized.amount, authorized.currency || 'INR');
        if (capture.success) return capture.payment || authorized;
    }

    return null;
}

/**
 * Activates a pending subscription whose payment was confirmed late. The
 * customer was not served while it sat pending, so a start date already in the
 * past is moved to today and the end date with it, keeping the paid duration.
 */
async function activateLatePaidSubscription(sub, razorpayPaymentId) {
    const today = startOfDay();
    const update = { paymentStatus: 'paid', status: 'active', razorpayPaymentId };

    const shiftMs = today.getTime() - startOfDay(sub.startDate).getTime();
    if (shiftMs > 0) {
        update.startDate = new Date(new Date(sub.startDate).getTime() + shiftMs);
        update.endDate = new Date(new Date(sub.endDate).getTime() + shiftMs);
    }

    // Conditional update so verify / webhook / reconcile racing each other
    // activate the subscription (and fire side-effects) only once.
    const activated = await TiffinSubscription.findOneAndUpdate(
        { _id: sub._id, status: 'pending', paymentStatus: { $ne: 'paid' } },
        { $set: update },
        { new: true }
    );
    if (!activated) return null;

    let createdDeliveries = 0;
    try {
        const plan = await TiffinPlan.findById(activated.planId);
        if (plan && startOfDay(activated.startDate) <= today) {
            createdDeliveries = await ensureSubscriptionDeliveriesForDate(activated, today, plan);
        }
    } catch (err) {
        console.error(`[Tiffin Reconcile] Delivery generation failed for ${activated._id}:`, err?.message);
    }

    try {
        const io = getIO();
        if (io) {
            const restaurantRoom = rooms.restaurant(activated.restaurantId);
            const timestamp = new Date().toISOString();
            io.to(restaurantRoom).emit('new-tiffin-subscription', {
                subscription: activated,
                createdDeliveries,
                restaurantId: String(activated.restaurantId),
                timestamp
            });
            io.to(restaurantRoom).emit('tiffin_dispatch_updated', {
                restaurantId: String(activated.restaurantId),
                subscriptionId: String(activated._id),
                createdDeliveries,
                reason: 'subscription_created',
                timestamp
            });
        }
    } catch (err) {
        console.error(`[Tiffin Reconcile] Socket emit failed for ${activated._id}:`, err?.message);
    }

    notifyTiffinPurchaseOnWhatsapp(activated._id);
    return activated;
}

/**
 * Server-side safety net for Razorpay tiffin purchases. The subscription is
 * created as 'pending' before checkout and only activated by the client's
 * verify call or the webhook; if the app is closed during a UPI payment and the
 * webhook is missed, the customer is charged but never sees the plan. This
 * checks Razorpay directly for such subscriptions and activates them.
 *
 * @param {{ userId?: string }} [options] limit to one customer's subscriptions
 * @returns {Promise<number>} number of subscriptions activated
 */
export const reconcilePendingTiffinPayments = async ({ userId } = {}) => {
    if (!isRazorpayConfigured()) return 0;
    // A per-user call is small and must not be skipped by a running global pass.
    if (!userId) {
        if (isReconciling) return 0;
        isReconciling = true;
    }

    try {
        const query = {
            status: 'pending',
            paymentMethod: 'online',
            paymentStatus: { $ne: 'paid' },
            razorpayOrderId: { $nin: ['', null] },
            createdAt: { $gte: new Date(Date.now() - LOOKBACK_DAYS * DAY_MS) }
        };
        if (userId) query.userId = userId;

        const pendingSubs = await TiffinSubscription.find(query).sort({ createdAt: -1 }).limit(50);

        let activatedCount = 0;
        for (const sub of pendingSubs) {
            try {
                const payment = await findPaidRazorpayPayment(sub);
                if (!payment) continue;
                const activated = await activateLatePaidSubscription(sub, payment.id);
                if (activated) {
                    activatedCount += 1;
                    console.log(`[Tiffin Reconcile] Activated subscription ${sub._id} (order ${sub.razorpayOrderId}, payment ${payment.id}).`);
                }
            } catch (err) {
                console.error(`[Tiffin Reconcile] Failed for order ${sub.razorpayOrderId}:`, err?.error?.description || err?.message);
            }
        }
        return activatedCount;
    } finally {
        if (!userId) isReconciling = false;
    }
};
