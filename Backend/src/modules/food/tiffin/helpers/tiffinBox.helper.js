export const TIFFIN_BOX_TYPES = ['steel', 'disposable'];

export const TIFFIN_BOX_LABELS = {
    steel: 'Steel Box',
    disposable: 'Use & Throw Box'
};

/**
 * Resolve the box charge for a plan from the customer's selection.
 * Selection is mandatory; the charge always comes from the plan itself so a
 * tampered client cannot lower the amount. A plan priced at 0 still requires a
 * choice, it is simply free.
 *
 * @returns {{ boxType: string, boxCharge: number } | { error: string }}
 */
export const resolveBoxCharge = (plan, boxType) => {
    const selected = String(boxType || '').trim().toLowerCase();
    if (!TIFFIN_BOX_TYPES.includes(selected)) {
        return { error: 'Please select a tiffin box type (steel or disposable).' };
    }
    const price = selected === 'steel' ? plan?.steelBoxPrice : plan?.disposableBoxPrice;
    const boxCharge = Math.max(0, Number(price) || 0);
    return { boxType: selected, boxCharge };
};

/** Plan price + the selected box charge. */
export const resolvePlanTotal = (plan, boxCharge) => {
    const planPrice = Math.max(0, Number(plan?.price || plan?.totalPrice || 0));
    return {
        planPrice,
        total: planPrice + Math.max(0, Number(boxCharge) || 0)
    };
};
