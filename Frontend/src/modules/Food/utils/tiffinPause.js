/**
 * Mirrors Backend/src/modules/food/tiffin/helpers/tiffinPause.helper.js.
 * The allowance lives on the plan (set by admin/kitchen when the plan is
 * created or edited); the duration-based suggestion is only a fallback for
 * plans saved before the field existed, and the default the forms pre-fill.
 */
export const suggestMaxPauseDays = (durationDays) => {
    const days = Math.max(0, Number(durationDays) || 0);
    if (!days) return 0;
    return Math.max(1, Math.floor(days / 3));
};

/** Off-days allowed on a plan (0 means none). Accepts a plan object. */
export const getMaxSkipDays = (plan) => {
    const configured = plan?.maxPauseDays;
    if (configured !== undefined && configured !== null && configured !== '' && Number.isFinite(Number(configured))) {
        return Math.max(0, Number(configured));
    }
    return suggestMaxPauseDays(plan?.durationDays);
};
