/**
 * Trip stage helpers.
 *
 * A rider can hold several orders at once (multi-order batches), so the trip
 * stage belongs to ONE order and must always be derived from that order's own
 * backend state. Keeping the mapping here stops the feed, the resync handler
 * and the store from each inventing their own slightly different version.
 */

export const TRIP_STATUSES = [
  'IDLE',
  'PICKING_UP',
  'REACHED_PICKUP',
  'PICKED_UP',
  'REACHED_DROP',
  'COMPLETED',
];

const RANK = TRIP_STATUSES.reduce((acc, status, i) => {
  acc[status] = i;
  return acc;
}, {});

export function tripStatusRank(status) {
  return RANK[String(status || 'IDLE').toUpperCase()] ?? 0;
}

/** The later of two stages, so a stale payload can never walk a rider backwards. */
export function furthestTripStatus(a, b) {
  return tripStatusRank(a) >= tripStatusRank(b) ? a : b;
}

const lower = (v) => String(v ?? '').toLowerCase();

/**
 * Map one order (API payload or socket payload) to its trip stage.
 *
 * Order matters: an order waiting at the customer's door still has
 * orderStatus 'picked_up' — only deliveryState tells us it reached the drop —
 * so at_drop has to be checked before picked_up.
 */
export function deriveTripStatus(order) {
  if (!order) return 'IDLE';

  const orderStatus = lower(order.orderStatus || order.status);
  const deliveryStatus = lower(order.deliveryStatus || order.deliveryState?.status);
  const phase = lower(order.deliveryState?.currentPhase);

  if (
    ['delivered', 'completed'].includes(orderStatus) ||
    ['delivered', 'completed'].includes(deliveryStatus) ||
    ['delivered', 'completed'].includes(phase)
  ) {
    return 'COMPLETED';
  }

  if (phase === 'at_drop' || deliveryStatus === 'reached_drop' || orderStatus === 'reached_drop') {
    return 'REACHED_DROP';
  }

  if (
    phase === 'en_route_to_delivery' ||
    ['picked_up', 'delivering'].includes(deliveryStatus) ||
    orderStatus === 'picked_up'
  ) {
    return 'PICKED_UP';
  }

  if (
    phase === 'at_pickup' ||
    deliveryStatus === 'reached_pickup' ||
    orderStatus === 'reached_pickup'
  ) {
    return 'REACHED_PICKUP';
  }

  return 'PICKING_UP';
}
