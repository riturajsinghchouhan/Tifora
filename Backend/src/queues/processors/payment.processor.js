import { logger } from '../../utils/logger.js';
import { creditWallet } from '../../core/payments/wallet.service.js';
import { syncOrderFinanceDocuments } from '../../core/payments/foodFinance.service.js';
import { FoodTransaction } from '../../modules/food/orders/models/foodTransaction.model.js';
import { checkEarningAddonCompletions } from '../../modules/food/admin/services/admin.service.js';

export const processPaymentJob = async (job) => {
    const { action, orderMongoId, orderId } = job.data || {};
    logger.info(
        `[PaymentProcessor] action=${action} order=${orderId || orderMongoId || 'unknown'} job=${job.id}`
    );

    try {
        switch (action) {
            case 'delivery_completed':
                await handleDeliveryCompleted(job.data);
                break;

            case 'order_cancelled':
                await handleOrderCancelled(job.data);
                break;

            case 'payment_verified':
                await handlePaymentVerified(job.data);
                break;

            default:
                logger.info(`[PaymentProcessor] No handler for action: ${action}`);
        }
    } catch (err) {
        logger.error(`[PaymentProcessor] Error processing ${action}: ${err.message}`);
        throw err;
    }

    return { processed: true, action, jobId: job.id };
};

async function handleDeliveryCompleted(data) {
    const orderMongoId = data?.orderMongoId;
    if (!orderMongoId) {
        throw new Error('orderMongoId is required for delivery_completed');
    }

    const [order, transaction] = await Promise.all([
        FoodOrder.findById(orderMongoId).lean(),
        FoodTransaction.findOne({ orderId: orderMongoId })
    ]);

    if (!transaction) {
        throw new Error(`FoodTransaction not found for order ${orderMongoId}`);
    }

    const displayOrderId =
        order?.order_id ||
        order?.orderId ||
        transaction?.orderSnapshot?.orderDisplayId ||
        String(orderMongoId);

    const paymentSnapshotStatus = String(transaction.payment?.status || '').toLowerCase();
    if (!['paid', 'refunded'].includes(paymentSnapshotStatus) && transaction.status !== 'captured') {
        logger.warn(
            `[PaymentProcessor] Skipping settlement for ${displayOrderId}; payment not captured yet`
        );
        return;
    }

    const failures = [];
    const settlement = transaction.settlement || {};

    if (
        transaction.restaurantId &&
        !settlement.isRestaurantSettled &&
        Number(transaction.amounts?.restaurantShare || 0) > 0
    ) {
        try {
            await creditWallet({
                entityType: 'restaurant',
                entityId: String(transaction.restaurantId),
                amount: Number(transaction.amounts.restaurantShare),
                description: `Order ${displayOrderId} - restaurant payout`,
                category: 'order_payment',
                orderId: String(orderMongoId),
                metadata: {
                    orderId: displayOrderId,
                    source: 'delivery_completed',
                    paymentMethod: transaction.payment?.method || transaction.paymentMethod || 'cash'
                }
            });

            await FoodTransaction.updateOne(
                {
                    _id: transaction._id,
                    'settlement.isRestaurantSettled': { $ne: true }
                },
                {
                    $set: {
                        'settlement.isRestaurantSettled': true,
                        'settlement.restaurantSettledAt': new Date()
                    },
                    $push: {
                        history: {
                            kind: 'restaurant_wallet_credited',
                            amount: Number(transaction.amounts.restaurantShare),
                            at: new Date(),
                            note: 'Restaurant payout credited by payment worker',
                            recordedBy: { role: 'SYSTEM' }
                        }
                    }
                }
            );
        } catch (err) {
            failures.push(`restaurant:${err.message}`);
        }
    }

    if (
        transaction.deliveryPartnerId &&
        !settlement.isRiderSettled &&
        Number(transaction.amounts?.riderShare || 0) > 0
    ) {
        try {
            await creditWallet({
                entityType: 'deliveryBoy',
                entityId: String(transaction.deliveryPartnerId),
                amount: Number(transaction.amounts.riderShare),
                description: `Order ${displayOrderId} - delivery earning`,
                category: 'delivery_earning',
                orderId: String(orderMongoId),
                metadata: {
                    orderId: displayOrderId,
                    source: 'delivery_completed',
                    paymentMethod: transaction.payment?.method || transaction.paymentMethod || 'cash'
                }
            });

            const { FoodDeliveryWallet } = await import(
                '../../modules/food/delivery/models/deliveryWallet.model.js'
            );
            await FoodDeliveryWallet.updateOne(
                { deliveryPartnerId: transaction.deliveryPartnerId },
                { $inc: { totalDeliveries: 1 } }
            );

            await FoodTransaction.updateOne(
                {
                    _id: transaction._id,
                    'settlement.isRiderSettled': { $ne: true }
                },
                {
                    $set: {
                        'settlement.isRiderSettled': true,
                        'settlement.riderSettledAt': new Date()
                    },
                    $push: {
                        history: {
                            kind: 'rider_wallet_credited',
                            amount: Number(transaction.amounts.riderShare),
                            at: new Date(),
                            note: 'Rider earning credited by payment worker',
                            recordedBy: { role: 'SYSTEM' }
                        }
                    }
                }
            );

            try {
                await checkEarningAddonCompletions(String(transaction.deliveryPartnerId), false, true);
            } catch (addonErr) {
                logger.error(
                    `[PaymentProcessor] Earning addon completion failed for ${transaction.deliveryPartnerId}: ${addonErr.message}`
                );
            }
        } catch (err) {
            failures.push(`rider:${err.message}`);
        }
    }

    if (
        !settlement.isPlatformSettled &&
        Number(transaction.amounts?.platformNetProfit || 0) > 0
    ) {
        try {
            await creditWallet({
                entityType: 'admin',
                entityId: 'platform',
                amount: Number(transaction.amounts.platformNetProfit),
                description: `Order ${displayOrderId} - platform profit`,
                category: 'platform_fee',
                orderId: String(orderMongoId),
                metadata: {
                    orderId: displayOrderId,
                    source: 'delivery_completed',
                    riderShare: Number(transaction.amounts?.riderShare || 0)
                }
            });

            await FoodTransaction.updateOne(
                {
                    _id: transaction._id,
                    'settlement.isPlatformSettled': { $ne: true }
                },
                {
                    $set: {
                        'settlement.isPlatformSettled': true,
                        'settlement.platformSettledAt': new Date()
                    },
                    $push: {
                        history: {
                            kind: 'platform_wallet_credited',
                            amount: Number(transaction.amounts.platformNetProfit),
                            at: new Date(),
                            note: 'Platform profit credited by payment worker',
                            recordedBy: { role: 'SYSTEM' }
                        }
                    }
                }
            );
        } catch (err) {
            failures.push(`platform:${err.message}`);
        }
    }

    await syncOrderFinanceDocuments({
        orderId: orderMongoId,
        source: 'payment_queue_delivery_completed'
    });

    if (failures.length > 0) {
        throw new Error(`delivery_completed partial failures: ${failures.join(', ')}`);
    }
}

async function handleOrderCancelled(data) {
    const orderMongoId = data?.orderMongoId;
    if (!orderMongoId) {
        throw new Error('orderMongoId is required for order_cancelled');
    }

    await syncOrderFinanceDocuments({
        orderId: orderMongoId,
        source: 'payment_queue_order_cancelled',
        refundReason: data?.reason || 'Order cancelled'
    });
}

async function handlePaymentVerified(data) {
    const orderMongoId = data?.orderMongoId;
    if (!orderMongoId) {
        throw new Error('orderMongoId is required for payment_verified');
    }

    await syncOrderFinanceDocuments({
        orderId: orderMongoId,
        source: 'payment_queue_payment_verified'
    });
}
