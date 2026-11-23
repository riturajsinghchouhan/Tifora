/**
 * Suggested off-day allowance for a plan length: one third of the duration,
 * so a 30-day plan suggests 10 and a 15-day plan 5. Only used as a fallback
 * for plans saved before `maxPauseDays` became a field, and as the default the
 * plan form pre-fills.
 */
export const suggestMaxPauseDays = (durationDays) => {
    const days = Math.max(0, Number(durationDays) || 0);
    if (!days) return 0;
    return Math.max(1, Math.floor(days / 3));
};

/**
 * How many days a customer may mark off on a given plan.
 * Uses the value configured on the plan (0 means no off-days at all) and only
 * falls back to the duration-based suggestion when the plan has none stored.
 */
export const getMaxSkipDays = (plan) => {
    const configured = plan?.maxPauseDays;
    if (configured !== undefined && configured !== null && Number.isFinite(Number(configured))) {
        return Math.max(0, Number(configured));
    }
    return suggestMaxPauseDays(plan?.durationDays);
};
