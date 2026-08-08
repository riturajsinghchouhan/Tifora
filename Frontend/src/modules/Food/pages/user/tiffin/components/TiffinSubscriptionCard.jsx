import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ChevronRight, 
  Sun, 
  Calendar, 
  Leaf,
  Sprout
} from 'lucide-react';

const TIFFIN_IMAGES = [
  '/food/tiffin/tiffin_hero_banner.png',
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&h=600&fit=crop&q=80',
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=800&h=600&fit=crop&q=80';

export default function TiffinSubscriptionCard({ plan, index = 0 }) {
  const navigate = useNavigate();

  const primaryImage = plan?.image || TIFFIN_IMAGES[index % TIFFIN_IMAGES.length];
  const kitchenName = plan?.restaurantId?.restaurantName || plan?.restaurantId?.name || plan?.restaurantName || "Renuka's Kitchen";
  const duration = plan?.durationDays || (index === 1 ? 15 : 30);
  const price = plan?.price || (index === 1 ? 2499 : 4500);
  const title = plan?.name || (index === 1 ? "Renuka's 15-Day Ghar Ka Khana Plan" : "Renuka's 30-Day Monthly Ghar Ka Khana Delight");

  const handleCardClick = () => {
    navigate(`/food/user/tiffin/plan/${plan?._id || 'plan-' + index}`, { state: { plan } });
  };

  return (
    <div
      onClick={handleCardClick}
      className="subscription-card relative w-full min-h-[220px] sm:min-h-[250px] rounded-2xl sm:rounded-3xl overflow-hidden mx-auto border border-[#144434] shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.995] group cursor-pointer"
    >
      {/* 1. Card Background Image (Full background with dark gradient overlay) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#062016]">
        <img
          src={primaryImage}
          alt={title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="w-full h-full object-cover object-right opacity-70 group-hover:scale-105 transition-transform duration-700"
          loading="eager"
        />
        {/* Seamless dark emerald overlays for crystal clear typography */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#062016] via-[#062016]/95 sm:via-[#062016]/85 md:via-[#062016]/75 to-[#062016]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062016] via-transparent to-[#062016]/50" />
      </div>

      {/* 2. Top Bar: Veg Badge (Left) & Price + Duration (Right) */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-2">
        {/* Pure Veg Pill Badge */}
        <div className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-black border border-[#21be6c]/50 bg-[#0e4930]/90 backdrop-blur-md text-white flex items-center gap-1.5 shadow-sm">
          <Leaf className="w-3.5 h-3.5 fill-white text-white shrink-0" />
          <span>{plan?.isVegetarian !== false ? 'Pure Veg' : 'Non-Veg'}</span>
        </div>

        {/* Price & Duration Pill */}
        <div className="text-right">
          <div className="text-2xl sm:text-[28px] font-black tracking-tight leading-none text-[#d6af4b]">
            ₹{price}
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] sm:text-xs font-bold text-[#d6af4b] mt-1">
            <Calendar className="w-3 h-3 text-[#d6af4b]" />
            <span>{duration} Days</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Kitchen & Title */}
      <div className="relative z-10 my-1 max-w-sm sm:max-w-md">
        {/* Kitchen Name with Verified Checkmark */}
        <div className="flex items-center gap-1 text-xs sm:text-[13px] font-semibold text-[#b7cec2] mb-0.5">
          <span>{kitchenName}</span>
          <div className="w-3.5 h-3.5 rounded-full bg-[#00b87c] flex items-center justify-center text-[#062016] shrink-0">
            <CheckCircle2 className="w-3 h-3 fill-[#00b87c] text-white stroke-[2.8]" />
          </div>
        </div>

        {/* Bold Plan Title */}
        <h3 className="text-base sm:text-lg md:text-xl font-black text-white leading-snug tracking-tight">
          {title}
        </h3>
      </div>

      {/* 4. Frosted Glass Description Banner */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-white/10 flex items-center gap-2.5 my-2 max-w-md shadow-xs">
        <div className="w-7 h-7 rounded-full bg-[#051c13] border border-[#21be6c]/40 flex items-center justify-center shrink-0 text-[#21be6c]">
          <Sprout className="w-3.5 h-3.5 stroke-[2.4]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#f0f7f4] leading-tight line-clamp-1">
            Our most popular meal subscription.
          </p>
          <p className="text-[11px] text-[#c0d5cb] leading-tight mt-0.5 line-clamp-1">
            {plan?.itemsDescription || "Pure ghar jaisa swaad with rotating daily fresh vegetables."}
          </p>
        </div>
      </div>

      {/* 5. Bottom Action Row: Timing & View Details Button */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-1 border-t border-white/10 mt-1">
        {/* Left Timing Pill */}
        <div className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border border-[#1b5e40]/80 bg-[#0b3323]/90 text-[#d6af4b] flex items-center gap-1.5 shadow-xs backdrop-blur-sm">
          <Sun className="w-3.5 h-3.5 text-[#d6af4b] stroke-[2.4]" />
          <span>
            {plan?.mealType === 'Both' || !plan?.mealType
              ? 'Morning (11 AM) & Evening (7 PM)' 
              : `${plan?.mealType} Only`}
          </span>
        </div>

        {/* Right Gold Outlined View Details Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#d6af4b]/80 bg-[#062016]/70 hover:bg-[#d6af4b]/20 backdrop-blur-md text-[#e5bf58] text-xs font-extrabold transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
        >
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#e5bf58] stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
