export function toMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
}

export function toPaise(value) {
    return Math.round(toMoney(value) * 100);
}

export function addMoney(...values) {
    return toMoney(values.reduce((sum, value) => sum + toMoney(value), 0));
}

export function subtractMoney(left, right) {
    return toMoney(toMoney(left) - toMoney(right));
}

export function multiplyMoney(value, multiplier) {
    return toMoney(toMoney(value) * Number(multiplier || 0));
}

export function compareMoney(left, right) {
    const diff = toPaise(left) - toPaise(right);
    if (diff === 0) return 0;
    return diff > 0 ? 1 : -1;
}
