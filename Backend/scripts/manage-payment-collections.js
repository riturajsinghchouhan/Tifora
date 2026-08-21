import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
    PAYMENT_COLLECTIONS,
    PAYMENT_COLLECTION_RENAMES
} from '../src/core/payments/paymentCollections.js';

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldDropEmpty = args.has('--drop-empty');

const targetCollectionNames = Object.values(PAYMENT_COLLECTIONS);

async function getCollectionMeta(name) {
    const exists =
        (await mongoose.connection.db.listCollections({ name }).toArray()).length > 0;

    if (!exists) {
        return { name, exists: false, count: 0 };
    }

    const count = await mongoose.connection.db.collection(name).countDocuments();
    return { name, exists: true, count };
}

async function renameCollection(from, to) {
    await mongoose.connection.db.collection(from).rename(to);
}

async function dropCollection(name) {
    await mongoose.connection.db.dropCollection(name);
}

async function buildAudit() {
    const renamePlan = [];

    for (const mapping of PAYMENT_COLLECTION_RENAMES) {
        const fromMeta = await getCollectionMeta(mapping.from);
        const toMeta = await getCollectionMeta(mapping.to);

        let action = 'noop';
        let reason = '';

        if (fromMeta.exists && !toMeta.exists && fromMeta.count === 0) {
            action = shouldDropEmpty ? 'drop_legacy_empty' : 'rename';
            reason = shouldDropEmpty
                ? 'legacy collection is empty and can be removed instead of renamed'
                : 'legacy collection exists and target does not exist';
        } else if (fromMeta.exists && !toMeta.exists) {
            action = 'rename';
            reason = 'legacy collection exists with data and target does not exist';
        } else if (fromMeta.exists && toMeta.exists && fromMeta.count === 0) {
            action = shouldDropEmpty ? 'drop_legacy_empty' : 'legacy_empty';
            reason = 'legacy collection is empty while target already exists';
        } else if (
            fromMeta.exists &&
            toMeta.exists &&
            fromMeta.count > 0 &&
            toMeta.count === 0 &&
            shouldDropEmpty
        ) {
            action = 'replace_empty_target_and_rename';
            reason = 'target collection is empty, so it can be dropped before renaming legacy data';
        } else if (fromMeta.exists && toMeta.exists && fromMeta.count > 0) {
            action = 'conflict';
            reason = 'legacy and target collections both exist with legacy data present';
        } else if (!fromMeta.exists && toMeta.exists && toMeta.count === 0) {
            action = shouldDropEmpty ? 'drop_target_empty' : 'target_empty';
            reason = 'target collection exists but is empty';
        } else if (!fromMeta.exists && toMeta.exists) {
            action = 'target_live';
            reason = 'target collection already active';
        } else {
            action = 'missing';
            reason = 'neither legacy nor target collection exists';
        }

        renamePlan.push({
            key: mapping.to,
            from: fromMeta,
            to: toMeta,
            action,
            reason
        });
    }

    const allCollections = await mongoose.connection.db.listCollections().toArray();
    const paymentPrefixedCollections = allCollections
        .map((item) => item.name)
        .filter((name) => name.startsWith('payment_'))
        .sort();

    const unknownPaymentCollections = [];
    for (const name of paymentPrefixedCollections) {
        if (targetCollectionNames.includes(name)) continue;
        const meta = await getCollectionMeta(name);
        unknownPaymentCollections.push({
            ...meta,
            action:
                shouldDropEmpty && meta.exists && meta.count === 0
                    ? 'drop_unknown_empty'
                    : 'inspect',
            reason:
                meta.count === 0
                    ? 'payment-prefixed collection is not recognized and is empty'
                    : 'payment-prefixed collection is not recognized'
        });
    }

    return {
        mode: shouldApply ? 'apply' : 'dry-run',
        options: {
            dropEmpty: shouldDropEmpty
        },
        renamePlan,
        unknownPaymentCollections
    };
}

async function applyAudit(audit) {
    const executed = [];

    for (const item of audit.renamePlan) {
        if (item.action === 'rename') {
            await renameCollection(item.from.name, item.to.name);
            executed.push({
                action: 'rename',
                from: item.from.name,
                to: item.to.name
            });
            continue;
        }

        if (item.action === 'drop_legacy_empty') {
            await dropCollection(item.from.name);
            executed.push({
                action: 'drop',
                collection: item.from.name
            });
            continue;
        }

        if (item.action === 'replace_empty_target_and_rename') {
            await dropCollection(item.to.name);
            executed.push({
                action: 'drop',
                collection: item.to.name
            });
            await renameCollection(item.from.name, item.to.name);
            executed.push({
                action: 'rename',
                from: item.from.name,
                to: item.to.name
            });
            continue;
        }

        if (item.action === 'drop_target_empty') {
            await dropCollection(item.to.name);
            executed.push({
                action: 'drop',
                collection: item.to.name
            });
        }
    }

    for (const item of audit.unknownPaymentCollections) {
        if (item.action !== 'drop_unknown_empty') continue;
        await dropCollection(item.name);
        executed.push({
            action: 'drop',
            collection: item.name
        });
    }

    return executed;
}

async function main() {
    await connectDB();

    try {
        const audit = await buildAudit();
        const executed = shouldApply ? await applyAudit(audit) : [];

        console.log(
            JSON.stringify(
                {
                    ...audit,
                    executed
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
