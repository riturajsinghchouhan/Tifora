import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../src/modules/food/orders/models/foodTransaction.model.js';
import { Payment } from '../src/core/payments/models/payment.model.js';
import { Refund } from '../src/core/payments/models/refund.model.js';
import { Transaction } from '../src/core/payments/models/transaction.model.js';
import { PAYMENT_COLLECTIONS } from '../src/core/payments/paymentCollections.js';

function logSection(title, rows) {
    console.log(`\n=== ${title} (${rows.length}) ===`);
    for (const row of rows.slice(0, 50)) {
        console.log(JSON.stringify(row));
    }
    if (rows.length > 50) {
        console.log(`... truncated ${rows.length - 50} more rows`);
    }
}

async function findPaidOrdersWithoutTransaction() {
    return FoodOrder.aggregate([
        {
            $match: {
                'payment.status': { $in: ['paid', 'refunded'] }
            }
        },
        {
            $lookup: {
                from: PAYMENT_COLLECTIONS.PAYMENT_FOOD_TRANSACTIONS,
                localField: '_id',
                foreignField: 'orderId',
                as: 'tx'
            }
        },
        {
            $match: { tx: { $size: 0 } }
        },
        {
            $project: {
                _id: 1,
                order_id: 1,
                payment: 1,
                orderStatus: 1
            }
        }
    ]);
}

async function findTransactionsWithoutOrder() {
    return FoodTransaction.aggregate([
        {
            $lookup: {
                from: 'food_orders',
                localField: 'orderId',
                foreignField: '_id',
                as: 'order'
            }
        },
        {
            $match: { order: { $size: 0 } }
        },
        {
            $project: {
                _id: 1,
                orderId: 1,
                status: 1,
                payment: 1
            }
        }
    ]);
}

async function findRefundMirrorMismatches() {
    return FoodOrder.aggregate([
        {
            $lookup: {
                from: PAYMENT_COLLECTIONS.PAYMENT_FOOD_TRANSACTIONS,
                localField: '_id',
                foreignField: 'orderId',
                as: 'tx'
            }
        },
        { $unwind: '$tx' },
        {
            $match: {
                $expr: {
                    $or: [
                        { $ne: ['$payment.status', '$tx.payment.status'] },
                        { $ne: ['$payment.refund.status', '$tx.payment.refund.status'] }
                    ]
                }
            }
        },
        {
            $project: {
                _id: 1,
                order_id: 1,
                orderPaymentStatus: '$payment.status',
                txPaymentStatus: '$tx.payment.status',
                orderRefundStatus: '$payment.refund.status',
                txRefundStatus: '$tx.payment.refund.status'
            }
        }
    ]);
}

async function findRefundedTransactionsWithoutRefundDoc() {
    return FoodTransaction.aggregate([
        {
            $match: {
                'payment.refund.status': 'processed'
            }
        },
        {
            $lookup: {
                from: PAYMENT_COLLECTIONS.PAYMENT_REFUNDS,
                localField: 'orderId',
                foreignField: 'orderId',
                as: 'refundDocs'
            }
        },
        {
            $match: { refundDocs: { $size: 0 } }
        },
        {
            $project: {
                _id: 1,
                orderId: 1,
                refund: '$payment.refund'
            }
        }
    ]);
}

async function findDuplicateWalletRefundCredits() {
    return Transaction.aggregate([
        {
            $match: {
                entityType: 'user',
                type: 'credit',
                category: 'order_refund',
                status: 'completed',
                orderId: { $ne: null }
            }
        },
        {
            $group: {
                _id: '$orderId',
                count: { $sum: 1 },
                transactions: {
                    $push: {
                        _id: '$_id',
                        amount: '$amount',
                        createdAt: '$createdAt',
                        metadata: '$metadata'
                    }
                }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);
}

async function findSettlementMismatches() {
    return FoodTransaction.find({
        status: 'captured',
        $or: [
            {
                deliveryPartnerId: { $ne: null },
                'settlement.isRiderSettled': true
            },
            {
                restaurantId: { $ne: null },
                'settlement.isRestaurantSettled': true
            }
        ]
    })
        .select('orderId restaurantId deliveryPartnerId amounts settlement')
        .lean();
}

async function main() {
    await connectDB();

    try {
        const [
            paidOrdersWithoutTransaction,
            transactionsWithoutOrder,
            refundMirrorMismatches,
            refundedTransactionsWithoutRefundDoc,
            duplicateWalletRefundCredits,
            settlementMarkedTransactions
        ] = await Promise.all([
            findPaidOrdersWithoutTransaction(),
            findTransactionsWithoutOrder(),
            findRefundMirrorMismatches(),
            findRefundedTransactionsWithoutRefundDoc(),
            findDuplicateWalletRefundCredits(),
            findSettlementMismatches()
        ]);

        logSection('Paid Orders Without FoodTransaction', paidOrdersWithoutTransaction);
        logSection('FoodTransactions Without Order', transactionsWithoutOrder);
        logSection('Order/Transaction Refund Mirror Mismatches', refundMirrorMismatches);
        logSection('Refunded Transactions Without Refund Doc', refundedTransactionsWithoutRefundDoc);
        logSection('Duplicate Wallet Refund Credits', duplicateWalletRefundCredits);
        logSection('Transactions Marked Settled', settlementMarkedTransactions);

        const summary = {
            paidOrdersWithoutTransaction: paidOrdersWithoutTransaction.length,
            transactionsWithoutOrder: transactionsWithoutOrder.length,
            refundMirrorMismatches: refundMirrorMismatches.length,
            refundedTransactionsWithoutRefundDoc: refundedTransactionsWithoutRefundDoc.length,
            duplicateWalletRefundCredits: duplicateWalletRefundCredits.length,
            settlementMarkedTransactions: settlementMarkedTransactions.length
        };

        console.log('\n=== Summary ===');
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        await disconnectDB();
    }
}

const isDirectRun =
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    main()
        .then(() => process.exit(0))
        .catch(async (error) => {
            console.error(error);
            try {
                await disconnectDB();
            } catch {}
            process.exit(1);
        });
}
