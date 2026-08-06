import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, X, Navigation, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@food/api';
import { getUserSocket } from '@food/utils/userSocketManager';

// Sleek Compact Tiffin Carrier Icon with Micro Steam
const CompactTiffinIcon = memo(() => (
  <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/40 shrink-0 shadow-2xs">
    {/* Micro Steam */}
    <div className="absolute -top-1.5 flex gap-1 pointer-events-none">
      <motion.div
        animate={{ opacity: [0, 0.8, 0], y: [0, -4, -8] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0, ease: "easeOut" }}
        className="w-1 h-1.5 bg-orange-400/80 rounded-full blur-[0.4px]"
      />
      <motion.div
        animate={{ opacity: [0, 0.8, 0], y: [0, -5, -10] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
        className="w-1 h-1.5 bg-amber-400/80 rounded-full blur-[0.4px]"
      />
    </div>

    {/* Compact 3-tier SVG */}
    <div className="text-orange-600 dark:text-orange-400">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 5V3.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 3.5V5" strokeWidth="1.8" />
        <rect x="5" y="5" width="14" height="4" rx="1" fill="currentColor" fillOpacity="0.15" />
        <rect x="5" y="10" width="14" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
        <rect x="5" y="15" width="14" height="4" rx="1" fill="currentColor" fillOpacity="0.35" />
        <path d="M4 7v11" strokeWidth="1.8" />
        <path d="M20 7v11" strokeWidth="1.8" />
      </svg>
    </div>
  </div>
));

function TiffinFloatingTrackingCardInner({ hasBottomNav = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTiffin, setActiveTiffin] = useState(null);
  const [dismissedKey, setDismissedKey] = useState(null);

  // Fetch active tiffin delivery
  const checkActiveTiffin = useCallback(async () => {
    try {
      const res = await api.get('/food/user/tiffin/deliveries').catch(() => null) 
        || await api.get('/food/tiffin/deliveries').catch(() => null);

      if (res?.data?.success && Array.isArray(res.data.data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find assigned or out_for_delivery tiffin for today
        const active = res.data.data.find((d) => {
          const dDate = new Date(d.date);
          dDate.setHours(0, 0, 0, 0);
          const isToday = dDate.getTime() === today.getTime();
          const isActiveStatus = d.status === 'assigned' || d.status === 'out_for_delivery';
          return isToday && isActiveStatus;
        });

        if (active) {
          setActiveTiffin(active);
        } else {
          setActiveTiffin(null);
        }
      }
    } catch (err) {
      console.warn('Could not fetch active tiffin delivery:', err);
    }
  }, []);

  useEffect(() => {
    checkActiveTiffin();
  }, [checkActiveTiffin]);

  // Real-time Socket and Window Events
  useEffect(() => {
    const handleTiffinNotification = (e) => {
      const detail = e.detail;
      if (!detail) return;

      if (detail.status === 'delivered' || detail.status === 'delivered_unattended' || detail.status === 'cancelled') {
        setActiveTiffin(null);
      } else if (detail.status === 'assigned' || detail.status === 'out_for_delivery') {
        setActiveTiffin((prev) => ({
          ...(prev || {}),
          ...detail,
          _id: detail.deliveryId || detail._id || prev?._id,
        }));
        setDismissedKey(null);
      }
    };

    window.addEventListener('tiffinStatusNotification', handleTiffinNotification);
    window.addEventListener('tiffin_delivery_assigned', handleTiffinNotification);

    const sock = getUserSocket();
    if (sock) {
      sock.on('tiffin_delivery_assigned', handleTiffinNotification);
      sock.on('tiffin_status_update', handleTiffinNotification);
    }

    return () => {
      window.removeEventListener('tiffinStatusNotification', handleTiffinNotification);
      window.removeEventListener('tiffin_delivery_assigned', handleTiffinNotification);
      if (sock) {
        sock.off('tiffin_delivery_assigned', handleTiffinNotification);
        sock.off('tiffin_status_update', handleTiffinNotification);
      }
    };
  }, []);

  const isTrackingScreen = location.pathname.includes('/tiffin-tracking');
  if (isTrackingScreen || !activeTiffin) {
    return null;
  }

  const deliveryId = activeTiffin._id || activeTiffin.deliveryId;
  if (!deliveryId || dismissedKey === deliveryId) {
    return null;
  }

  const isDelivered = activeTiffin.status === 'delivered' || activeTiffin.status === 'delivered_unattended';
  if (isDelivered) {
    return null;
  }

  const restaurantName =
    activeTiffin.restaurantId?.name ||
    activeTiffin.restaurant?.name ||
    activeTiffin.restaurantName ||
    "Tiffin Kitchen";

  const partnerName =
    activeTiffin.assignedTo?.name ||
    activeTiffin.partnerName ||
    "Rider";

  const isOutForDelivery = activeTiffin.status === 'out_for_delivery';
  const batchType = activeTiffin.type || 'Meal';

  const statusText = isOutForDelivery
    ? `Out for delivery`
    : `Rider assigned • ${partnerName}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className={`fixed ${hasBottomNav ? "bottom-24 sm:bottom-28" : "bottom-6"} left-1/2 -translate-x-1/2 w-[280px] sm:w-[295px] max-w-[92vw] z-[9998]`}
      >
        <div
          onClick={() => navigate(`/food/user/tiffin-tracking/${deliveryId}`)}
          className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl px-2.5 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.45)] border border-orange-200/90 dark:border-zinc-800 cursor-pointer group hover:border-orange-400 transition-all select-none"
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissedKey(deliveryId);
            }}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:scale-105 transition-all z-20"
            title="Dismiss"
          >
            <X className="w-2.5 h-2.5 pointer-events-none" />
          </button>

          <div className="flex items-center gap-2 w-full">
            <CompactTiffinIcon />

            {/* Middle Content */}
            <div className="flex-1 min-w-0 pr-0.5">
              <div className="flex items-center gap-1 leading-none mb-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100/90 dark:bg-orange-950/70 px-1 py-0.5 rounded">
                  {batchType}
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs truncate">
                  {restaurantName}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                <Bike className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                <span className="truncate">{statusText}</span>
              </div>
            </div>

            {/* Compact Track Action */}
            <div className="shrink-0">
              <div className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded-lg shadow-xs flex items-center gap-0.5 text-[11px] font-bold transition-transform group-hover:scale-[1.03]">
                <Navigation className="w-2.5 h-2.5 fill-current" />
                <span>Track</span>
                <ChevronRight className="w-2.5 h-2.5 -mr-0.5" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const TiffinFloatingTrackingCard = memo(TiffinFloatingTrackingCardInner);
export default TiffinFloatingTrackingCard;
