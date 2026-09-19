import { getFirebaseDB } from '../../../../config/firebase.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Best-effort Firebase offer channel.
 *
 * Every export here MUST resolve (false on failure) and never throw:
 * dispatch treats Firebase as the primary channel with Socket.IO as the
 * fallback, so a throw from here would take the fallback down with it and
 * riders would stop receiving orders entirely.
 */

function sanitizeFirebaseKey(value) {
  return String(value || '').trim().replace(/[.#$/[\]]/g, '_');
}

function getOfferPath(partnerId, orderMongoId) {
  return `delivery_partner_offers/${sanitizeFirebaseKey(partnerId)}/${sanitizeFirebaseKey(orderMongoId)}`;
}

function stripUndefined(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export async function publishDeliveryOfferToFirebase(partnerId, orderMongoId, payload = {}) {
  if (!partnerId || !orderMongoId) return false;

  try {
    const db = getFirebaseDB();
    if (!db) return false;
    const offeredAt = Number(payload.offeredAt) || Date.now();
    await db.ref(getOfferPath(partnerId, orderMongoId)).set(
      stripUndefined({
        ...payload,
        status: 'offered',
        offeredAt,
        last_updated: Date.now(),
      }),
    );
    return true;
  } catch (err) {
    logger.warn(`Firebase delivery offer publish failed: ${err.message}`);
    return false;
  }
}

export async function removeDeliveryOfferFromFirebase(partnerId, orderMongoId) {
  if (!partnerId || !orderMongoId) return false;

  try {
    const db = getFirebaseDB();
    if (!db) return false;
    await db.ref(getOfferPath(partnerId, orderMongoId)).remove();
    return true;
  } catch (err) {
    logger.warn(`Firebase delivery offer remove failed: ${err.message}`);
    return false;
  }
}

export async function removeDeliveryOffersForPartners(partnerIds = [], orderMongoId) {
  if (!orderMongoId || !Array.isArray(partnerIds) || partnerIds.length === 0) return;

  await Promise.all(
    partnerIds
      .map((partnerId) => String(partnerId || '').trim())
      .filter(Boolean)
      .map((partnerId) => removeDeliveryOfferFromFirebase(partnerId, orderMongoId)),
  );
}

export async function clearDeliveryOffersForOrder(order, options = {}) {
  const orderMongoId = String(order?._id || order?.orderMongoId || '').trim();
  if (!orderMongoId) return;

  const partnerIds = new Set();
  if (options.includeAssignedPartner && order?.dispatch?.deliveryPartnerId) {
    partnerIds.add(String(order.dispatch.deliveryPartnerId));
  }

  for (const entry of order?.dispatch?.offeredTo || []) {
    if (entry?.partnerId) partnerIds.add(String(entry.partnerId));
  }

  await removeDeliveryOffersForPartners([...partnerIds], orderMongoId);
}
