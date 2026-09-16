import 'dotenv/config';
import { pathToFileURL } from 'url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../src/modules/food/orders/models/foodTransaction.model.js';
import { attachFinancialSnapshotToOrder } from '../src/modules/food/orders/services/order.helpers.js';
import { reconcileOrderWithRazorpay } from '../src/modules/food/orders/services/order.service.js';
import { fetchRazorpayOrderPayments, isRazorpayConfigured } from '../src/modules/food/orders/helpers/razorpay.helper.js';

/**
 * Finds Razorpay orders that our system marked as cancelled/failed but that Razorpay
 * actually captured a payment for (client never called verifyPayment and the
 * payment.captured webhook was missed or never arrived), and restores them.
 *
 * Dry run by default — only reports what it finds. Pass --apply to actually restore
 * the affected orders (marks the transaction captured, flips the order back to
 * "created", and fires the normal post-payment notifications/petpooja sync).
 *
 * Usage:
 *   node scripts/reconcile-razorpay-orders.js                 (dry run, last 30 days)
 *   node scripts/reconcile-razorpay-orders.js --apply
 *   node scripts/reconcile-razorpay-orders.js --since-days=90 --apply
 */

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const sinceDaysArg = [...args].find((a) => a.startsWith('--since-days='));
const sinceDays = sinceDaysArg ? Number(sinceDaysArg.split('=')[1]) : 30;

const CANDIDATE_STATUSES = [
    'cancelled_by_user',
    'cancelled_by_restaurant',
    'cancelled_by_admin',
    'dead',
    'created'
];

// Razorpay order id / payment status live on FoodTransaction, not FoodOrder — the
// order document has no "payment" field of its own (it's merged in at read time via
// attachFinancialSnapshotToOrder). So candidates must be found by scanning
// transactions first, then joining back to the order for its current status.
async function findCandidateTransactions() {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    return FoodTransaction.find({
        'payment.razorpay.orderId': { $exists: true, $ne: '' },
        'payment.status': { $nin: ['paid', 'refunded'] },
        createdAt: { $gte: since }
    }).lean();
}

async function main() {
    if (!isRazorpayConfigured()) {
        console.error('Razorpay is not configured on this environment (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET). Aborting.');
        process.exitCode = 1;
        return;
    }

    await connectDB();

    try {
        console.log(`Mode: ${shouldApply ? 'APPLY (will restore paid orders)' : 'DRY RUN (report only — pass --apply to fix)'}`);
        console.log(`Scanning Razorpay transactions created in the last ${sinceDays} day(s)...\n`);

        const candidateTransactions = await findCandidateTransactions();
        console.log(`Found ${candidateTransactions.length} unpaid/failed Razorpay transaction(s) to check.\n`);

        const restored = [];
        const stillUnpaid = [];
        const errors = [];

        for (const transaction of candidateTransactions) {
            const razorpayOrderId = transaction.payment?.razorpay?.orderId || transaction.gateway?.razorpayOrderId;
            if (!razorpayOrderId) continue;

            const order = await FoodOrder.findById(transaction.orderId).lean();
            if (!order) continue;
            if (!CANDIDATE_STATUSES.includes(order.orderStatus)) continue;

            const displayId = order.order_id || order.orderId || String(order._id);

            try {
                if (!shouldApply) {
                    const result = await fetchRazorpayOrderPayments(razorpayOrderId);
                    const items = result?.items || [];
                    // `authorized` counts too: Razorpay is holding the customer's money,
                    // it just has not been claimed yet. --apply captures it before
                    // confirming the order.
                    const paid =
                        items.find((p) => p.status === 'captured') ||
                        items.find((p) => p.status === 'authorized');
                    if (paid) {
                        restored.push({
                            orderId: displayId,
                            razorpayPaymentId: paid.id,
                            amountPaise: paid.amount,
                            razorpayStatus: paid.status
                        });
                    } else {
                        stillUnpaid.push({ orderId: displayId, razorpayOrderId });
                    }
                } else {
                    const hydrated = await attachFinancialSnapshotToOrder(order, transaction);
                    const result = await reconcileOrderWithRazorpay(hydrated);
                    if (result.reconciled) {
                        restored.push({ orderId: displayId, restoredFromCancellation: result.restoredFromCancellation });
                    } else {
                        stillUnpaid.push({ orderId: displayId, reason: result.reason });
                    }
                }
            } catch (err) {
                errors.push({ orderId: displayId, error: err.message });
            }
        }

        console.log(`\n=== ${shouldApply ? 'Restored' : 'Would restore'} (${restored.length}) ===`);
        restored.forEach((r) => console.log(JSON.stringify(r)));

        console.log(`\n=== No captured payment found / already handled (${stillUnpaid.length}) ===`);
        stillUnpaid.slice(0, 30).forEach((r) => console.log(JSON.stringify(r)));
        if (stillUnpaid.length > 30) {
            console.log(`... truncated ${stillUnpaid.length - 30} more`);
        }

        if (errors.length > 0) {
            console.log(`\n=== Errors (${errors.length}) ===`);
            errors.forEach((r) => console.log(JSON.stringify(r)));
        }

        if (!shouldApply && restored.length > 0) {
            console.log(`\nRun again with --apply to actually restore these ${restored.length} order(s).`);
        }
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
