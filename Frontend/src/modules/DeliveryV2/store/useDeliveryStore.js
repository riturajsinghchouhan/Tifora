import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deriveTripStatus, furthestTripStatus } from '@/modules/DeliveryV2/utils/tripStatus'
import { getOrderAcceptId } from '@food/utils/orderDispatchId'

/**
 * @typedef {Object} Location
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} ActiveOrder
 * @property {string} orderId
 * @property {string} status
 * @property {Location} restaurantLocation
 * @property {Location} customerLocation
 * @property {number} orderAmount
 */

/**
 * useDeliveryStore - Professional Zustand store for Delivery V2
 * Handles Trip Lifecycle, Rider Status, and Admin Settings.
 */
export const useDeliveryStore = create(
  persist(
    (set, get) => ({
      // --- Rider Status ---
      isOnline: false,
      riderLocation: null, // { lat, lng }
      
      // --- Trip State ---
      // A rider can hold several orders at once (multi-order batches), so
      // tripStatus always describes activeOrderId and nothing else.
      activeOrder: null, // ActiveOrder | null
      activeOrderId: null, // id tripStatus belongs to
      tripStatus: 'IDLE', // 'IDLE' | 'PICKING_UP' | 'REACHED_PICKUP' | 'PICKED_UP' | 'REACHED_DROP' | 'COMPLETED'
      
      // --- Admin / Business Settings ---
      settings: {
        pickupRangeLimit: 500, // meters, fallback default
        deliveryRangeLimit: 500, // meters, fallback default
      },

      // --- Actions ---
      toggleOnline: () => set((state) => ({ isOnline: !state.isOnline })),
      
      setOnline: (online) => set({ isOnline: online }),
      
      setRiderLocation: (location) => set({ riderLocation: location }),
      
      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setActiveOrder: (order) => set((state) => {
        if (!order) return { activeOrder: null, activeOrderId: null, tripStatus: 'IDLE' };

        const nextId = getOrderAcceptId(order);
        const derived = deriveTripStatus(order);
        const isSameOrder = Boolean(nextId) && nextId === state.activeOrderId;

        return {
          activeOrder: order,
          activeOrderId: nextId || state.activeOrderId,
          // Switching to a DIFFERENT order must never inherit the previous
          // order's stage - that is what made every order in a batch move
          // together. For the same order, keep whichever stage is further
          // along so a stale payload cannot walk the rider backwards.
          tripStatus: isSameOrder ? furthestTripStatus(state.tripStatus, derived) : derived,
        };
      }),

      updateTripStatus: (status) => set({ tripStatus: status }),

      clearActiveOrder: () => set({ 
        activeOrder: null, 
        activeOrderId: null,
        tripStatus: 'IDLE' 
      }),

      // --- Selectors / Computed Helper ---
      canAdvanceToPickup: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKING_UP';
      },

      canAdvanceToDeliver: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKED_UP';
      }
    }),
    {
      name: 'delivery-v2-online-pref',
      // ONLY persist the 'isOnline' state, ignoring orders/location to prevent dummy order bugs
      partialize: (state) => ({ isOnline: state.isOnline }),
    }
  )
);
