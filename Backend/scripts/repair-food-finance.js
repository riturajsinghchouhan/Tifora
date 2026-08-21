import 'dotenv/config';
import { pathToFileURL } from 'url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../src/modules/food/orders/models/foodTransaction.model.js';
import {
    buildOrderPaymentMirror,
    createInitialTransaction
} from '../src/modules/food/orders/services/foodTransaction.service.js';
import { syncOrderFinanceDocuments } from '../src/core/payments/foodFinance.service.js';

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldBackfill = args.has('--backfill-missing-transactions');
const shouldDeleteOrphans = args.has('--delete-orphan-transactions');

async function repairOrderTransactionMismatches() {
    const orders = await FoodOrder.find({
        'payment.status': { $in: ['paid', 'refunded', 'cod_pending', 'created'] }
    }).lean();

    let checked = 0;
    let repaired = 0;

    for (const order of orders) {
        const tx = await FoodTransaction.findOne({ orderId: order._id });
        if (!tx) continue;
        checked += 1;

        const expectedPayment = buildOrderPaymentMirror(tx, order.payment || {});
        const statusMismatch =
            String(order.payment?.status || '') !== String(expectedPayment.status || '');
        const refundMismatch =
            String(order.payment?.refund?.status || 'none') !==
            String(expectedPayment.refund?.status || 'none');

        if (!statusMismatch && !refundMismatch) continue;

        if (shouldApply) {
            await FoodOrder.updateOne(
                { _id: order._id },
                { $set: { payment: expectedPayment } }
            );
            await syncOrderFinanceDocuments({
                orderId: order._id,
                source: 'repair_food_finance'
            });
        }

        repaired += 1;
    }

    return { checked, repaired };
}

async function backfillMissingTransactions() {
    const orders = await FoodOrder.find({
        'payment.status': { $in: ['paid', 'refunded'] }
    });

    let created = 0;
    for (const order of orders) {
        const existing = await FoodTransaction.findOne({ orderId: order._id }).lean();
        if (existing) continue;

        if (shouldApply && shouldBackfill) {
            await createInitialTransaction(order.toObject(), {});
            await syncOrderFinanceDocuments({
                orderId: order._id,
                orderDoc: order,
                source: 'repair_backfill_transaction'
            });
        }

        created += 1;
    }

    return { created };
}

async function handleOrphanTransactions() {
    const orphans = await FoodTransaction.aggregate([
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
                status: 1
            }
        }
    ]);

    if (shouldApply && shouldDeleteOrphans && orphans.length > 0) {
        await FoodTransaction.deleteMany({
            _id: { $in: orphans.map((item) => item._id) }
        });
    }

    return { orphanCount: orphans.length };
}

async function main() {
    await connectDB();

    try {
        const [mismatchResult, backfillResult, orphanResult] = await Promise.all([
            repairOrderTransactionMismatches(),
            backfillMissingTransactions(),
            handleOrphanTransactions()
        ]);

        console.log(
            JSON.stringify(
                {
                    mode: shouldApply ? 'apply' : 'dry-run',
                    mismatchResult,
                    backfillResult,
                    orphanResult,
                    options: {
                        shouldBackfill,
                        shouldDeleteOrphans
                    }
                },
                null,
                2
            )
        );
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
