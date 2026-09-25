import { getOrderQueue } from '../index.js';
import { logger } from '../../utils/logger.js';

/** @type {Map<string, NodeJS.Timeout>} */
const pendingFallbackTimers = new Map();

const DISPATCH_TIMEOUT_JOB_PREFIX = 'dispatch-timeout';

/** Shared id prefix of every dispatch timeout job belonging to one order. */
function dispatchTimeoutJobPrefix(orderMongoId) {
    return `${DISPATCH_TIMEOUT_JOB_PREFIX}-${String(orderMongoId)}-`;
}

/**
 * Build a job id for a dispatch timeout check.
 *
 * Every scheduling gets its own id, and that is load-bearing. BullMQ silently drops
 * an `add` whose job id already exists in Redis — it emits a `duplicated` event and
 * hands back the old job, so the call looks successful — and these jobs re-arm
 * themselves from inside their own run. A single stable id per order therefore made
 * each follow-up collide with the still-active job and get thrown away, ending the
 * radius cascade (2 -> 4 -> ... -> 15km) after one timeout and leaving the order
 * unassigned until the watchdog swept it up. The order id stays in the prefix so
 * pending jobs for an order can still be found and cancelled.
 *
 * @param {string} orderMongoId
 */
export function dispatchTimeoutJobId(orderMongoId) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${dispatchTimeoutJobPrefix(orderMongoId)}${unique}`;
}

/**
 * Cancel every pending dispatch timeout job for an order (BullMQ + setTimeout fallback).
 *
 * Best-effort on purpose: a run that is already active is left alone, and both
 * processDispatchTimeout() and tryAutoAssign() re-check the order's state before
 * they touch anything, so a check that slips through is a no-op rather than a
 * duplicate broadcast.
 *
 * @param {string} orderMongoId
 */
export async function cancelDispatchTimeoutJob(orderMongoId) {
    const prefix = dispatchTimeoutJobPrefix(orderMongoId);

    for (const [timerKey, timerId] of pendingFallbackTimers) {
        if (!timerKey.startsWith(prefix)) continue;
        clearTimeout(timerId);
        pendingFallbackTimers.delete(timerKey);
    }

    const queue = getOrderQueue();
    if (!queue) return;

    try {
        // Ids only — one Redis round trip, no per-job fetch. Active jobs are not
        // listed here, which is what we want: that run already owns the order.
        const pendingIds = await queue.getRanges(['delayed', 'waiting', 'paused'], 0, -1);
        for (const jobId of pendingIds) {
            if (!String(jobId).startsWith(prefix)) continue;
            const removed = await queue.remove(jobId);
            if (removed) logger.info(`Removed pending dispatch timeout job ${jobId}`);
        }
    } catch (err) {
        logger.warn(`Could not cancel dispatch timeout jobs for order ${orderMongoId}: ${err.message}`);
    }
}

/**
 * Schedule a dispatch timeout check, replacing any still-pending one for the order.
 *
 * @param {string} orderMongoId
 * @param {object} data - Job payload (must include attempt)
 * @param {number} [delay=20000]
 */
export async function scheduleDispatchTimeoutJob(orderMongoId, data, delay = 20000) {
    const queue = getOrderQueue();
    const jobId = dispatchTimeoutJobId(orderMongoId);

    await cancelDispatchTimeoutJob(orderMongoId);

    if (!queue) {
        logger.warn('BullMQ order queue not available. Using setTimeout fallback for dispatch timeout.');

        const timerId = setTimeout(async () => {
            pendingFallbackTimers.delete(jobId);
            try {
                const { processOrderJob } = await import('../processors/order.processor.js');
                await processOrderJob({ id: jobId, data });
            } catch (err) {
                logger.error(`Fallback dispatch timeout job failed: ${err.message}`);
            }
        }, delay);

        pendingFallbackTimers.set(jobId, timerId);
        return { id: jobId };
    }

    try {
        // removeOnComplete: these fire constantly, and retaining them would crowd out
        // the queue's shared 1000-job completed window that is useful for debugging
        // other actions. Failures are still retained by the queue default.
        const job = await queue.add('process-order', data, { jobId, delay, removeOnComplete: true });
        logger.info(`Dispatch timeout job scheduled: ${job.id} attempt=${data.attempt} delay=${delay}ms`);
        return job;
    } catch (err) {
        logger.error(`Failed to schedule dispatch timeout job: ${err.message}`);
        throw err;
    }
}

/**
 * Add an order processing job to the queue. No-op if BullMQ is disabled.
 * @param {object} data - Job data (e.g. { orderId, action })
 * @param {object} [options] - BullMQ job options override
 * @returns {Promise<import('bullmq').Job | null>}
 */
export const addOrderJob = async (data, options = {}) => {
    const action = data?.action || '';

    // Route dispatch timeout jobs through the deduplicating scheduler.
    if (action === 'DISPATCH_TIMEOUT_CHECK' && data.orderMongoId) {
        return scheduleDispatchTimeoutJob(
            data.orderMongoId,
            data,
            options.delay ?? 20000,
        );
    }

    const queue = getOrderQueue();
    if (!queue) {
        logger.warn('BullMQ order queue not available. Using setTimeout fallback for job.');

        setTimeout(async () => {
            try {
                const { processOrderJob } = await import('../processors/order.processor.js');
                await processOrderJob({ id: `fallback-${Date.now()}`, data });
            } catch (err) {
                logger.error(`Fallback order job failed: ${err.message}`);
            }
        }, options.delay || 0);

        return { id: `fallback-${Date.now()}` };
    }
    try {
        const job = await queue.add('process-order', data, options);
        logger.info(`Order job added: ${job.id}`);
        return job;
    } catch (err) {
        logger.error(`Failed to add order job: ${err.message}`);
        throw err;
    }
};
