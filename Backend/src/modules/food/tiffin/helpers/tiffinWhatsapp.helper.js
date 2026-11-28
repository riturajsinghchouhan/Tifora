import { TiffinSubscription } from '../models/tiffinSubscription.model.js';
import {
    getAdminWhatsappNumbers,
    isWhatsappEnabled,
    sendWhatsappMessage,
    toWhatsappNumber
} from '../../../../core/notifications/whatsapp.service.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Tiffin WhatsApp notifications.
 *
 * Template names come from env so they can match whatever was approved in
 * Meta Business Manager. Body parameter order for each template:
 *
 * WHATSAPP_TEMPLATE_TIFFIN_PURCHASE (customer)
 *   {{1}} name, {{2}} plan, {{3}} kitchen, {{4}} meal type, {{5}} duration days,
 *   {{6}} start date, {{7}} end date, {{8}} amount, {{9}} payment, {{10}} subscription id
 *
 * WHATSAPP_TEMPLATE_TIFFIN_RENEWAL (customer)
 *   {{1}} name, {{2}} plan, {{3}} end date, {{4}} days left
 *
 * WHATSAPP_TEMPLATE_TIFFIN_ADMIN_PURCHASE (support/admin numbers)
 *   {{1}} customer name, {{2}} customer phone, {{3}} plan, {{4}} kitchen, {{5}} meal type,
 *   {{6}} duration days, {{7}} start date, {{8}} end date, {{9}} amount, {{10}} payment,
 *   {{11}} delivery address, {{12}} subscription id
 */

export const RENEWAL_REMINDER_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

const template = (key) => String(process.env[key] || '').trim();

const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

const formatAmount = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const formatPayment = (sub) => {
    const method = { cod: 'Cash on Delivery', wallet: 'Wallet', online: 'Online' }[sub.paymentMethod] || sub.paymentMethod;
    return `${method} (${sub.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'})`;
};

const formatAmountBreakdown = (sub) => {
    if (!sub.boxCharge) return formatAmount(sub.amountPaid);
    const box = sub.boxType === 'steel' ? 'steel box' : 'disposable box';
    return `${formatAmount(sub.amountPaid)} (plan ${formatAmount(sub.planPrice)} + ${box} ${formatAmount(sub.boxCharge)})`;
};

const formatAddress = (address = {}) =>
    [address.street, address.area, address.landmark, address.city, address.state, address.zipCode]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');

const shortId = (sub) => String(sub._id).slice(-8).toUpperCase();

const loadSubscription = (subscriptionId) =>
    TiffinSubscription.findById(subscriptionId)
        .populate('userId', 'name phone countryCode')
        .populate('planId', 'name durationDays mealType')
        .populate('restaurantId', 'restaurantName')
        .lean();

const customerOf = (sub) => ({
    name: sub.userId?.name || sub.deliveryAddress?.name || sub.deliveryAddress?.fullName || 'Customer',
    phone: sub.userId?.phone || sub.deliveryAddress?.phone || '',
    countryCode: sub.userId?.countryCode || '+91'
});

const sendPurchaseMessages = async (sub) => {
    const customer = customerOf(sub);
    const planName = sub.planId?.name || 'Tiffin plan';
    const kitchen = sub.restaurantId?.restaurantName || 'Kitchen';
    const mealType = sub.planId?.mealType || '-';
    const duration = `${sub.planId?.durationDays || '-'} days`;
    const start = formatDate(sub.startDate);
    const end = formatDate(sub.endDate);
    const amount = formatAmountBreakdown(sub);
    const payment = formatPayment(sub);
    const ref = shortId(sub);

    const customerText = [
        `Hi ${customer.name}, thank you for purchasing your tiffin plan!`,
        '',
        `Plan: ${planName}`,
        `Kitchen: ${kitchen}`,
        `Meal: ${mealType}`,
        `Duration: ${duration}`,
        `Start date: ${start}`,
        `End date: ${end}`,
        `Amount: ${amount}`,
        `Payment: ${payment}`,
        `Subscription ID: ${ref}`
    ].join('\n');

    const address = formatAddress(sub.deliveryAddress);
    const adminText = [
        'New tiffin plan purchase',
        '',
        `Customer: ${customer.name}`,
        `Phone: ${customer.phone || '-'}`,
        `Plan: ${planName}`,
        `Kitchen: ${kitchen}`,
        `Meal: ${mealType}`,
        `Duration: ${duration}`,
        `Start date: ${start}`,
        `End date: ${end}`,
        `Amount: ${amount}`,
        `Payment: ${payment}`,
        `Address: ${address || '-'}`,
        `Subscription ID: ${ref}`,
        ...(sub.assignedByAdmin ? ['Assigned by admin'] : [])
    ].join('\n');

    const tasks = [];
    if (customer.phone) {
        tasks.push(sendWhatsappMessage({
            to: toWhatsappNumber(customer.phone, customer.countryCode),
            template: template('WHATSAPP_TEMPLATE_TIFFIN_PURCHASE'),
            params: [customer.name, planName, kitchen, mealType, duration, start, end, amount, payment, ref],
            text: customerText
        }));
    }
    for (const adminNumber of getAdminWhatsappNumbers()) {
        tasks.push(sendWhatsappMessage({
            to: adminNumber,
            template: template('WHATSAPP_TEMPLATE_TIFFIN_ADMIN_PURCHASE'),
            params: [customer.name, customer.phone, planName, kitchen, mealType, duration, start, end, amount, payment, address, ref],
            text: adminText
        }));
    }
    await Promise.all(tasks);
};

/**
 * Purchase confirmation to the customer plus a full-detail alert to every
 * support/admin number. Safe to call from every purchase path: the first
 * caller claims the subscription and later calls do nothing. Never throws.
 */
export const notifyTiffinPurchaseOnWhatsapp = async (subscriptionId) => {
    try {
        if (!subscriptionId || !isWhatsappEnabled()) return;

        const claimed = await TiffinSubscription.findOneAndUpdate(
            { _id: subscriptionId, purchaseWhatsappSentAt: null },
            { $set: { purchaseWhatsappSentAt: new Date() } },
            { new: true, projection: { _id: 1 } }
        ).lean();
        if (!claimed) return;

        const sub = await loadSubscription(subscriptionId);
        if (sub) await sendPurchaseMessages(sub);
    } catch (error) {
        logger.warn(`Tiffin purchase WhatsApp failed for ${String(subscriptionId)}: ${error.message}`);
    }
};

const sendRenewalMessage = async (sub, now = new Date()) => {
    const customer = customerOf(sub);
    if (!customer.phone) return { ok: false, skipped: true };

    const planName = sub.planId?.name || 'Tiffin plan';
    const end = formatDate(sub.endDate);
    const daysLeftNum = Math.max(0, Math.ceil((new Date(sub.endDate) - now) / DAY_MS));
    const daysLeft = daysLeftNum === 1 ? '1 day' : `${daysLeftNum} days`;

    return sendWhatsappMessage({
        to: toWhatsappNumber(customer.phone, customer.countryCode),
        template: template('WHATSAPP_TEMPLATE_TIFFIN_RENEWAL'),
        params: [customer.name, planName, end, daysLeft],
        text: [
            `Hi ${customer.name}, your tiffin plan "${planName}" ends on ${end} (${daysLeft} left).`,
            '',
            'Renew your plan now to keep getting fresh tiffin without a break.'
        ].join('\n')
    });
};

/**
 * Renewal reminders for an explicit list (admin "send reminder" action).
 * Does not touch renewalWhatsappSentAt so the admin can resend on purpose.
 */
export const sendTiffinRenewalWhatsapp = async (subscriptionIds = []) => {
    try {
        if (!isWhatsappEnabled() || !subscriptionIds.length) return 0;
        const subs = await TiffinSubscription.find({ _id: { $in: subscriptionIds } })
            .populate('userId', 'name phone countryCode')
            .populate('planId', 'name')
            .lean();
        const results = await Promise.all(subs.map((sub) => sendRenewalMessage(sub)));
        return results.filter((r) => r.ok).length;
    } catch (error) {
        logger.warn(`Tiffin renewal WhatsApp (manual) failed: ${error.message}`);
        return 0;
    }
};

/**
 * Daily job: remind customers whose plan ends within RENEWAL_REMINDER_DAYS.
 * Each subscription is reminded once. Customers who already hold a later
 * plan are skipped.
 */
export const runTiffinRenewalWhatsappReminders = async () => {
    if (!isWhatsappEnabled()) return 0;

    const now = new Date();
    const horizon = new Date(now.getTime() + RENEWAL_REMINDER_DAYS * DAY_MS);

    const candidates = await TiffinSubscription.find({
        status: { $in: ['active', 'paused'] },
        endDate: { $gte: now, $lte: horizon },
        renewalWhatsappSentAt: null,
        $or: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod' }]
    })
        .populate('userId', 'name phone countryCode')
        .populate('planId', 'name')
        .lean();
    if (!candidates.length) return 0;

    const userIds = [...new Set(candidates.map((s) => String(s.userId?._id || s.userId)))];
    const laterPlans = await TiffinSubscription.find({
        userId: { $in: userIds },
        status: { $in: ['active', 'paused', 'pending'] },
        endDate: { $gt: horizon }
    }).select('userId').lean();
    const covered = new Set(laterPlans.map((s) => String(s.userId)));

    let sent = 0;
    for (const sub of candidates) {
        if (covered.has(String(sub.userId?._id || sub.userId))) continue;

        const claimed = await TiffinSubscription.findOneAndUpdate(
            { _id: sub._id, renewalWhatsappSentAt: null },
            { $set: { renewalWhatsappSentAt: new Date() } },
            { projection: { _id: 1 } }
        ).lean();
        if (!claimed) continue;

        const result = await sendRenewalMessage(sub, now);
        if (result.ok) sent += 1;
    }

    if (sent > 0) logger.info(`Tiffin renewal WhatsApp: sent ${sent} reminder(s)`);
    return sent;
};
