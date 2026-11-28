import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import api from '@food/api';
import MobilePromoFooter from '@food/components/user/MobilePromoFooter';
import { useLocationContext } from '@food/context/locationContext';

import TiffinHeroBanner from './components/TiffinHeroBanner';
import TiffinFeatureCards from './components/TiffinFeatureCards';
import TiffinSubscriptionCard from './components/TiffinSubscriptionCard';

export default function TiffinHome() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const locationCtx = useLocationContext();
  const tiffinZoneId = locationCtx?.tiffinZoneId || null;
  const tiffinZoneStatus = locationCtx?.tiffinZoneStatus;
  // Only this screen reacts to the tiffin zone; the rest of the app is unaffected.
  const isOutOfTiffinZone = locationCtx?.isTiffinOutOfZone === true;

  useEffect(() => {
    if (isOutOfTiffinZone) {
      setPlans([]);
      setLoading(false);
      return undefined;
    }
    if (tiffinZoneStatus === 'loading') {
      setLoading(true);
      return undefined;
    }

    let isCancelled = false;
    const fetchPlans = async () => {
      try {
        const res = await api.get('/user/tiffin/plans/available').catch(() => null);
        if (isCancelled) return;
        if (res?.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setPlans(res.data.data);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error('Error fetching tiffin plans', err);
        if (!isCancelled) {
          setPlans([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchPlans();
    return () => {
      isCancelled = true;
    };
    // Re-fetch when the detected tiffin zone changes so plans match the area.
  }, [isOutOfTiffinZone, tiffinZoneStatus, tiffinZoneId]);

  if (isOutOfTiffinZone) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] pb-24 text-gray-900 dark:text-gray-100">
        <div className="relative w-full max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-5">
          <TiffinHeroBanner />
          <div className="mt-6 sm:mt-8 rounded-[24px] border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#009b67]/10">
              <MapPin className="h-7 w-7 text-[#009b67]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-950 dark:text-white">
              Tiffin service is not available in your zone
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-gray-500 dark:text-gray-400">
              Currently tiffin service is not available in your zone. We are expanding fast &mdash;
              try changing your delivery location, or check back soon.
            </p>
            {locationCtx?.address ? (
              <p className="mt-4 text-xs font-semibold text-gray-400 dark:text-gray-500">
                Checked for: {locationCtx.address}
              </p>
            ) : null}
          </div>
        </div>
        <MobilePromoFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] pb-24 text-gray-900 dark:text-gray-100">
      {/* Main Container with Standardized Left & Right Margins */}
      <div className="relative w-full max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-5">
        
        {/* 1. Luxury Dark Emerald Hero Banner */}
        <TiffinHeroBanner />

        {/* 2. Three Pastel Feature Cards */}
        <TiffinFeatureCards />

        {/* 3. Available Subscription Plans Section */}
        <div className="w-full mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight">
                Available Subscription Plans
              </h2>
              {/* Accent Underline Bar matching screenshot */}
              <div className="w-10 h-1 bg-[#b87c26] rounded-full mt-1.5" />
            </div>

            {/* View All Button */}
            <Link
              to="/food/user/tiffin"
              className="flex items-center gap-1 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-[#009b67] dark:hover:text-[#00b87c] transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="space-y-4 py-6">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="w-full h-48 rounded-[24px] bg-gray-100 dark:bg-zinc-900 animate-pulse"
                />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                No active tiffin plans available right now. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {plans.map((plan, index) => (
                <TiffinSubscriptionCard
                  key={plan._id || index}
                  plan={plan}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <MobilePromoFooter />
    </div>
  );
}
