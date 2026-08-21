import * as userWalletService from '../../modules/food/user/services/userWallet.service.js';
import { initiateRazorpayRefund } from '../../modules/food/orders/helpers/razorpay.helper.js';
import { FoodTransaction } from '../../modules/food/orders/models/foodTransaction.model.js';
import { toMoney } from './money.utils.js';

export async function processFoodOrderRefund({
    order,
    refundDestination = 'source',
    reason = '',
    actorRole = 'SYSTEM',
    actorId = null,
    session = null
}) {
    if (!order) {
        throw new Error('order is required for refund processing');
    }

    const paymentMethod = String(order.payment?.method || 'cash').toLowerCase();
    const paymentStatus = String(order.payment?.status || 'cod_pending').toLowerCase();
    const normalizedRefundDestination =
        String(refundDestination || 'source').toLowerCase() === 'wallet'
            ? 'wallet'
            : 'source';
    const hasRefundProcessed =
        String(order.payment?.refund?.status || 'none').toLowerCase() === 'processed';

    if (hasRefundProcessed || paymentStatus !== 'paid') {
        return {
            refunded: false,
            skipped: true,
            reason: 'refund_not_required'
        };
    }

    const transaction = order?._id
        ? await FoodTransaction.findOne({ orderId: order._id })
            .select('pricing.total amounts.totalCustomerPaid')
            .lean()
        : null;
    const refundAmount = toMoney(
        transaction?.pricing?.total ??
        transaction?.amounts?.totalCustomerPaid ??
        order.payment?.amountDue ??
        order.pricing?.total
    );

    if (paymentMethod === 'razorpay' && order.payment?.razorpay?.paymentId) {
        if (normalizedRefundDestination === 'wallet') {
            await userWalletService.refundWalletBalance(
                order.userId,
                refundAmount,
                `Refund for order #${order.order_id || order._id}`,
                {
                    orderId: order._id,
                    source: 'order_refund_wallet',
                    actorRole,
                    actorId: actorId ? String(actorId) : null,
                    reason
                },
                { session }
            );

            order.payment.status = 'refunded';
            order.payment.refund = {
                status: 'processed',
                destination: 'wallet',
                amount: refundAmount,
                refundId: '',
                processedAt: new Date()
            };

            return {
                refunded: true,
                destination: 'wallet',
                status: 'processed'
            };
        }

        const refundResult = await initiateRazorpayRefund(
            order.payment.razorpay.paymentId,
            refundAmount
        );

        if (refundResult.success) {
            order.payment.status = 'refunded';
            order.payment.refund = {
                status: 'processed',
                destination: 'source',
                amount: refundAmount,
                refundId: refundResult.refundId,
                processedAt: new Date()
            };
            return {
                refunded: true,
                destination: 'source',
                status: 'processed',
                refundId: refundResult.refundId,
                raw: refundResult.raw
            };
        }

        order.payment.refund = {
            status: 'failed',
            destination: 'source',
            amount: refundAmount
        };

        return {
            refunded: false,
            destination: 'source',
            status: 'failed',
            error: refundResult.error || 'gateway_refund_failed'
        };
    }

    if (paymentMethod === 'wallet') {
        await userWalletService.refundWalletBalance(
            order.userId,
            refundAmount,
            `Refund for order #${order.order_id || order._id}`,
            {
                orderId: order._id,
                source: 'order_refund_wallet',
                actorRole,
                actorId: actorId ? String(actorId) : null,
                reason
            },
            { session }
        );

        order.payment.status = 'refunded';
        order.payment.refund = {
            status: 'processed',
            destination: 'wallet',
            amount: refundAmount,
            processedAt: new Date()
        };

        return {
            refunded: true,
            destination: 'wallet',
            status: 'processed'
        };
    }

    return {
        refunded: false,
        skipped: true,
        reason: 'payment_method_not_refundable'
    };
}
