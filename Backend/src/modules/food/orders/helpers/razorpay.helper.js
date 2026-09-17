import crypto from 'crypto';

let Razorpay;
try {
    const mod = await import('razorpay');
    Razorpay = mod.default;
} catch {
    Razorpay = null;
}

import { config } from '../../../../config/env.js';

/**
 * Credentials are resolved on every call, never captured at module load.
 *
 * This module is pulled in through the route graph (server.js -> app.js -> routes),
 * which ESM evaluates before startServer() ever awaits loadEnvFromDb(). Keys read
 * into a module-level const here would freeze the pre-DB values — and the admin
 * panel stores Razorpay keys in the DB (EnvSetting), so they would never be seen.
 * An empty secret also makes verifyPaymentSignature() reject every payment.
 */
function getKeyId() {
    return config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '';
}

function getKeySecret() {
    return config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '';
}

export function isRazorpayConfigured() {
    return Boolean(getKeyId() && getKeySecret() && Razorpay);
}

export function getRazorpayKeyId() {
    return getKeyId();
}

export function getRazorpayInstance() {
    if (!isRazorpayConfigured()) return null;
    return new Razorpay({ key_id: getKeyId(), key_secret: getKeySecret() });
}

export function createRazorpayOrder(amountPaise, currency = 'INR', receipt = '') {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.orders.create({
        amount: Math.round(amountPaise),
        currency,
        receipt: receipt || undefined,
        // Force auto-capture. Without this the account-level dashboard setting
        // decides, and if it is off every payment stops at `authorized` — which
        // the confirmation/reconciliation paths used to treat as unpaid.
        payment_capture: 1
    });
}

export function createPaymentLink({ amountPaise, currency = 'INR', description, orderId, customerName, customerEmail, customerPhone }) {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.paymentLink.create({
        amount: Math.round(amountPaise),
        currency,
        description: description || `Order ${orderId}`,
        customer: {
            name: customerName || 'Customer',
            email: customerEmail || 'customer@example.com',
            contact: customerPhone ? String(customerPhone).replace(/\D/g, '').slice(-10) : '9999999999'
        }
    });
}

export function createRazorpayQrCode(payload = {}) {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.qrCode.create(payload);
}

export async function fetchRazorpayQrCode(qrCodeId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!qrCodeId) throw new Error('qrCodeId is required');
    return instance.qrCode.fetch(String(qrCodeId));
}

export async function fetchRazorpayQrCodePayments(qrCodeId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!qrCodeId) throw new Error('qrCodeId is required');
    return instance.qrCode.fetchAllPayments(String(qrCodeId));
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
    const secret = getKeySecret();
    if (!secret) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
}

/**
 * Fetch all payment attempts recorded against a Razorpay order (server-side reconciliation).
 * Used to detect payments that were actually captured by Razorpay but never confirmed
 * back to our system (client callback dropped, webhook missed, etc).
 * @param {string} razorpayOrderId
 */
export async function fetchRazorpayOrderPayments(razorpayOrderId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!razorpayOrderId) throw new Error('razorpayOrderId is required');
    return instance.orders.fetchPayments(String(razorpayOrderId));
}

/**
 * Fetch Razorpay payment (server-side) for additional validation (amount/status/order match).
 * @param {string} paymentId
 */
export async function fetchRazorpayPayment(paymentId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentId) throw new Error('paymentId is required');
    return instance.payments.fetch(String(paymentId));
}

/**
 * Capture an `authorized` payment so it becomes `captured`.
 *
 * An authorized payment means Razorpay is holding the customer's money but the
 * funds have not been claimed yet; Razorpay voids the authorisation after a few
 * days if nobody captures it. Every confirmation path here treats `captured` as
 * the paid state, so an authorised-only payment must be captured before the
 * order can be confirmed.
 *
 * Capturing twice is safe: Razorpay rejects the second call, and we surface an
 * already-captured payment as a success.
 *
 * @param {string} paymentId
 * @param {number} amountPaise - must match the authorised amount exactly
 * @param {string} currency
 * @returns {Promise<{ success: boolean, payment?: object, error?: string }>}
 */
export async function captureRazorpayPayment(paymentId, amountPaise, currency = 'INR') {
    const instance = getRazorpayInstance();
    if (!instance) return { success: false, error: 'Razorpay not configured' };
    if (!paymentId) return { success: false, error: 'paymentId is required' };

    try {
        const payment = await instance.payments.capture(
            String(paymentId),
            Math.round(Number(amountPaise) || 0),
            currency
        );
        return { success: true, payment };
    } catch (err) {
        // Already captured by a concurrent webhook/reconcile pass, or auto-capture
        // beat us to it — re-fetch and treat a captured payment as success.
        try {
            const existing = await instance.payments.fetch(String(paymentId));
            if (existing?.status === 'captured') {
                return { success: true, payment: existing };
            }
        } catch {
            // fall through to the original failure below
        }

        return {
            success: false,
            error: err?.error?.description || err?.message || 'Razorpay capture failed'
        };
    }
}

/**
 * Fetch Razorpay payment-link to check status (used for Razorpay QR auto verification).
 * @param {string} paymentLinkId
 */
export async function fetchRazorpayPaymentLink(paymentLinkId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentLinkId) throw new Error('paymentLinkId is required');
    return instance.paymentLink.fetch(String(paymentLinkId));
}

/**
 * ✅ NEW: Initiate a refund for a successful payment.
 * NON-BREAKING Extension for automated cancellation refunds.
 * @param {string} paymentId - Original Razorpay payment_id (captured)
 * @param {number} amount - Amount to refund (in major unit, e.g., INR 123.45)
 */
export async function initiateRazorpayRefund(paymentId, amount) {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay is not configured on this server');
    }
    const instance = getRazorpayInstance();
    try {
        const refund = await instance.payments.refund(paymentId, {
            amount: Math.round(Number(amount) * 100), // convert to paise
            notes: {
                reason: 'Order cancelled by system flow',
                at: new Date().toISOString()
            }
        });
        return {
            success: true,
            refundId: refund.id,
            status: refund.status || 'processed',
            raw: refund
        };
    } catch (err) {
        // Log locally but pass the error to the service to handle status update
        console.error(`Razorpay Refund API Failure [PaymentId: ${paymentId}]:`, err?.message || err);
        return {
            success: false,
            error: err?.message || 'Razorpay refund API error',
            status: 'failed'
        };
    }
}
