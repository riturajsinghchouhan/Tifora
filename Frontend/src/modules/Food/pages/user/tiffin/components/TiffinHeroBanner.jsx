import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ChevronRight } from 'lucide-react';

const BANNER_BG_IMAGE = '/food/tiffin/tiffin_hero_banner.png';
const FALLBACK_BG_IMAGE = 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=1000&h=500&fit=crop&q=80';

export default function TiffinHeroBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-[160px] sm:min-h-[190px] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#164d3b]/80 shadow-[0_10px_30px_rgba(0,0,0,0.2)] p-4 sm:p-6 md:p-7 text-white flex flex-col justify-between">
      {/* 1. Background Image (Right Aligned) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#06241a]">
        <img
          src={BANNER_BG_IMAGE}
          alt="Tiffin Banner Background"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_BG_IMAGE;
          }}
          className="w-full h-full object-cover object-right-top md:object-right opacity-75 sm:opacity-85"
        />
        {/* Seamless Dark Emerald Gradient Overlays for readable text on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06241a] via-[#06241a]/95 sm:via-[#06241a]/85 md:via-[#06241a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06241a]/60 via-transparent to-[#06241a]/30" />
      </div>

      {/* 2. Top Bar Row: Crown Badge (Left) & My Plans Button (Right) */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-2 sm:mb-3">
        {/* Gold Crown Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-[#d4af37]/40 backdrop-blur-md">
          <div className="w-4 h-4 rounded-full bg-[#d4af37]/25 flex items-center justify-center text-[#fed049]">
            <Crown className="w-2.5 h-2.5 fill-[#fed049]/30" />
          </div>
          <span className="text-[#fed049] text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
            DAILY MEAL SUBSCRIPTIONS
          </span>
        </div>

        {/* My Plans Outlined Pill Button */}
        <button
          type="button"
          onClick={() => navigate('/food/user/tiffin/my-subscriptions')}
          className="group flex items-center gap-1 px-3 py-1 rounded-full border border-[#d4af37]/80 text-[#f5d796] bg-[#06241a]/80 hover:bg-[#d4af37]/20 backdrop-blur-md transition-all text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
        >
          <span>My Plans</span>
          <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 3. Hero Content: Titles, Filigree & Subtitle */}
      <div className="relative z-10 max-w-sm sm:max-w-md md:max-w-lg mt-auto">
        <h1 className="text-2xl sm:text-3xl md:text-[34px] font-black tracking-tight leading-[1.12]">
          <span className="text-white font-serif tracking-normal block">Homestyle</span>
          <span className="text-[#f5d796] font-serif tracking-tight block">Tiffin Service</span>
        </h1>

        {/* Delicate Gold Filigree Divider */}
        <div className="flex items-center gap-2 my-1.5 sm:my-2 max-w-[170px]">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/80" />
          <span className="text-[#d4af37] text-[10px]">❖</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/80" />
        </div>

        <p className="text-[#cce3d8] text-[11px] sm:text-xs leading-relaxed max-w-xs sm:max-w-sm font-medium">
          Freshly cooked meals delivered to your door every morning (11 AM) &amp; evening (7 PM).
        </p>
      </div>
    </div>
  );
}
