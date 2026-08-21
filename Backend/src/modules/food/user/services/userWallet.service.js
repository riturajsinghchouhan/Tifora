import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodUserWallet } from '../models/userWallet.model.js';
import { creditWallet, debitWallet } from '../../../../core/payments/wallet.service.js';
import { Transaction } from '../../../../core/payments/models/transaction.model.js';
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured, verifyPaymentSignature } from '../../orders/helpers/razorpay.helper.js';

const ensureWallet = async (userId, session = null) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    const existing = await FoodUserWallet.findOne({ userId: oid }).session(session);
    if (existing) return existing;
    if (session) {
        const [wallet] = await FoodUserWallet.create([{ userId: oid, balance: 0, transactions: [] }], { session });
        return wallet;
    }
    return FoodUserWallet.create({ userId: oid, balance: 0, transactions: [] });
};

const mirrorLegacyWalletTransaction = async (userId, transaction, session = null) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }

    await ensureWallet(id, session);

    await FoodUserWallet.updateOne(
        { userId: new mongoose.Types.ObjectId(id) },
        {
            $push: {
                transactions: {
                    $each: [transaction],
                    $position: 0
                }
            }
        },
        session ? { session } : {}
    );
};

export const creditReferralReward = async (userId, amountInr, metadata = {}, options = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { wallet: await getUserWallet(userId) };
    }
    const session = options?.session || null;

    await creditWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description: 'Referral reward',
        category: 'referral_reward',
        metadata: { source: 'referral_reward', ...(metadata || {}) },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'addition',
        amount,
        status: 'Completed',
        description: 'Referral reward',
        metadata: { source: 'referral_reward', ...(metadata || {}) }
    }, session);
    await FoodUserWallet.updateOne(
        { userId: new mongoose.Types.ObjectId(String(userId)) },
        { $inc: { referralEarnings: amount } },
        session ? { session } : {}
    );

    return { wallet: await getUserWallet(userId) };
};

export const getUserWallet = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    const wallet = await FoodUserWallet.findOne({ userId: oid });
    if (!wallet) {
        return { balance: 0, referralEarnings: 0, transactions: [] };
    }
    // Return newest first (UI expects recent transactions on top)
    const tx = Array.isArray(wallet.transactions) ? [...wallet.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
    return {
        balance: Number(wallet.balance) || 0,
        referralEarnings: Number(wallet.referralEarnings) || 0,
        transactions: tx.map((t) => ({
            id: String(t._id),
            _id: t._id,
            type: t.type,
            amount: Number(t.amount) || 0,
            status: t.status || 'Completed',
            description: t.description || '',
            date: t.createdAt,
            createdAt: t.createdAt,
            metadata: t.metadata || {}
        }))
    };
};

export const createWalletTopupOrder = async (userId, amountInr) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
    }
    if (amount > 50000) {
        throw new ValidationError('Maximum amount is 50,000');
    }

    const amountPaise = Math.round(amount * 100);

    if (!isRazorpayConfigured()) {
        // Dev fallback: return a compatible shape without writing to DB.
        const orderId = `order_dev_${Date.now()}`;
        return {
            razorpay: {
                key: getRazorpayKeyId() || 'rzp_test_dummy',
                orderId,
                amount: amountPaise,
                currency: 'INR'
            }
        };
    }

    const receipt = `wallet_topup_${String(userId).slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder(amountPaise, 'INR', receipt);

    return {
        razorpay: {
            key: getRazorpayKeyId(),
            orderId: String(order.id),
            amount: Number(order.amount) || amountPaise,
            currency: order.currency || 'INR'
        }
    };
};

export const verifyWalletTopupPayment = async (userId, payload, options = {}) => {
    const orderId = String(payload?.razorpayOrderId || '').trim();
    const paymentId = String(payload?.razorpayPaymentId || '').trim();
    const signature = String(payload?.razorpaySignature || '').trim();
    const amount = Number(payload?.amount);

    if (!orderId) throw new ValidationError('razorpayOrderId is required');
    if (!paymentId) throw new ValidationError('razorpayPaymentId is required');
    if (!signature) throw new ValidationError('razorpaySignature is required');
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('amount is required');

    const session = options?.session || null;
    const wallet = await ensureWallet(userId, session);
    const existing = wallet.transactions.find((t) => String(t.razorpayOrderId || '') === orderId);
    if (existing && String(existing.status).toLowerCase() === 'completed') {
        return { wallet: await getUserWallet(userId) };
    }

    // If razorpay not configured (dev), accept and credit wallet.
    const ok = isRazorpayConfigured()
        ? verifyPaymentSignature(orderId, paymentId, signature)
        : true;
    if (!ok) {
        throw new ValidationError('Payment verification failed');
    }

    await creditWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description: isRazorpayConfigured() ? 'Wallet top-up' : 'Wallet top-up (dev)',
        category: 'wallet_topup',
        metadata: { source: 'wallet_topup', mode: isRazorpayConfigured() ? 'razorpay' : 'dev' },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'addition',
        amount,
        status: 'Completed',
        description: isRazorpayConfigured() ? 'Wallet top-up' : 'Wallet top-up (dev)',
        metadata: { source: 'wallet_topup', mode: isRazorpayConfigured() ? 'razorpay' : 'dev' },
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
    }, session);

    return { wallet: await getUserWallet(userId) };
};

export const deductWalletBalance = async (userId, amountInr, description = 'Order payment', metadata = {}, options = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Invalid deduction amount');
    }
    const session = options?.session || null;

    await debitWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description,
        category: 'order_payment',
        orderId: metadata?.orderId ? String(metadata.orderId) : null,
        metadata: { source: 'order_payment', ...(metadata || {}) },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'deduction',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'order_payment', ...(metadata || {}) }
    }, session);

    return { wallet: await getUserWallet(userId) };
};

export const refundWalletBalance = async (userId, amountInr, description = 'Order refund', metadata = {}, options = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { wallet: await getUserWallet(userId) };
    }
    const session = options?.session || null;

    const orderId = metadata?.orderId && mongoose.Types.ObjectId.isValid(String(metadata.orderId))
        ? new mongoose.Types.ObjectId(String(metadata.orderId))
        : null;
    const existingRefund = orderId
        ? await Transaction.findOne({
            entityType: 'user',
            entityId: new mongoose.Types.ObjectId(String(userId)),
            type: 'credit',
            category: 'order_refund',
            orderId,
            status: 'completed'
        }).session(session).lean()
        : null;

    if (existingRefund) {
        return { wallet: await getUserWallet(userId) };
    }

    await creditWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description,
        category: 'order_refund',
        orderId: orderId ? String(orderId) : null,
        metadata: { source: 'order_refund', ...(metadata || {}) },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'refund',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'order_refund', ...(metadata || {}) }
    }, session);

    return { wallet: await getUserWallet(userId) };
};

export const topupUserWalletByAdmin = async (userId, amountInr, adminId, description = 'Admin Top-up', options = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Invalid top-up amount');
    }
    const session = options?.session || null;

    await creditWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description,
        category: 'adjustment',
        metadata: { source: 'admin_topup', adminId: String(adminId) },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'addition',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'admin_topup', adminId: String(adminId) }
    }, session);

    return { wallet: await getUserWallet(userId) };
};

export const deductUserWalletByAdmin = async (userId, amountInr, adminId, description = 'Admin Deduction', options = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Invalid deduction amount');
    }
    const session = options?.session || null;

    await debitWallet({
        entityType: 'user',
        entityId: String(userId),
        amount,
        description,
        category: 'adjustment',
        metadata: { source: 'admin_deduction', adminId: String(adminId) },
        session
    });

    await mirrorLegacyWalletTransaction(userId, {
        type: 'deduction',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'admin_deduction', adminId: String(adminId) }
    }, session);

    return { wallet: await getUserWallet(userId) };
};
