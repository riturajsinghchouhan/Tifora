const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

function coerceTimestamp(value) {
  if (value == null || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

/**
 * Canonical MongoDB id for accept API + lock comparisons.
 * Prefers orderMongoId / _id over display order_id.
 */
export function getOrderMongoId(order) {
  if (!order) return '';
  const candidates = [
    order.orderMongoId,
    order.order_mongo_id,
    order._id,
    order.id,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value && MONGO_ID_RE.test(value)) return value;
  }
  return '';
}

/** Human-readable order id (ORD-xxx) when present. */
export function getOrderDisplayId(order) {
  if (!order) return '';
  return String(
    order.orderId ||
      order.order_id ||
      order.orderMongoId ||
      order._id ||
      order.id ||
      '',
  ).trim();
}

/** Id used for accept/reject API — mongo id when available. */
export function getOrderAcceptId(order) {
  return getOrderMongoId(order) || getOrderDisplayId(order);
}

export function isSameOrder(a, b) {
  if (!a || !b) return false;
  const aMongo = getOrderMongoId(a);
  const bMongo = getOrderMongoId(b);
  if (aMongo && bMongo) return aMongo === bMongo;

  const aDisplay = getOrderDisplayId(a);
  const bDisplay = getOrderDisplayId(b);
  return Boolean(aDisplay && bDisplay && aDisplay === bDisplay);
}

/** Normalize socket/poll payloads so _id and orderMongoId always match. */
export function normalizeIncomingOrder(order) {
  if (!order) return null;
  const mongoId = getOrderMongoId(order);
  const displayId = getOrderDisplayId(order);
  return {
    ...order,
    orderMongoId: mongoId || order.orderMongoId || order.order_mongo_id || undefined,
    _id: mongoId || order._id || order.id || undefined,
    orderId: displayId || order.orderId || order.order_id,
  };
}

export function getOrderAlertKey(order = {}) {
  return getOrderMongoId(order) || getOrderDisplayId(order);
}

export function getIncomingOrderOfferTimestamp(order) {
  if (!order) return 0;

  const candidates = [
    order.offeredAt,
    order.offerAt,
    order.last_updated,
    order.lastUpdated,
    order.recoveredAt,
    order.createdAt,
    order.updatedAt,
    order.dispatch?.assignedAt,
  ];

  for (const candidate of candidates) {
    const ts = coerceTimestamp(candidate);
    if (ts > 0) return ts;
  }

  return 0;
}

export function sortIncomingOrders(queue) {
  const list = Array.isArray(queue) ? queue : [];

  return list
    .map((item, index) => ({
      item,
      index,
      offeredAt: getIncomingOrderOfferTimestamp(item),
    }))
    .sort((a, b) => {
      if (a.offeredAt > 0 && b.offeredAt > 0 && a.offeredAt !== b.offeredAt) {
        return a.offeredAt - b.offeredAt;
      }
      if (a.offeredAt > 0 && b.offeredAt <= 0) return -1;
      if (a.offeredAt <= 0 && b.offeredAt > 0) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function upsertIncomingOrderInQueue(queue, order) {
  const normalized = normalizeIncomingOrder(order);
  if (!normalized) return Array.isArray(queue) ? queue : [];

  const list = Array.isArray(queue) ? queue : [];
  const exists = list.some((item) => isSameOrder(item, normalized));
  if (exists) {
    return sortIncomingOrders(list.map((item) =>
      isSameOrder(item, normalized) ? { ...item, ...normalized } : item,
    ));
  }
  return sortIncomingOrders([...list, normalized]);
}

export function removeIncomingOrderFromQueue(queue, orderRef) {
  if (!orderRef) return Array.isArray(queue) ? queue : [];
  const list = Array.isArray(queue) ? queue : [];
  return list.filter((item) => !isSameOrder(item, orderRef));
}

export function getPrimaryIncomingOrder(queue, selectedId = '') {
  const list = Array.isArray(queue) ? queue : [];
  if (!list.length) return null;

  const selected = String(selectedId || '').trim();
  if (selected) {
    const found = list.find(
      (item) =>
        getOrderMongoId(item) === selected ||
        isSameOrder(item, { orderMongoId: selected, _id: selected }),
    );
    if (found) return found;
  }
  return list[0];
}
