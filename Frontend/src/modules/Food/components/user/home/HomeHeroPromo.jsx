import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Building2, ChevronRight } from "lucide-react";
import homelyMealsBanner from "@food/assets/homely-meals-banner.png";
import tiffinCardBg from "@food/assets/tiffin-service-card-bg.png";
import hotelCardBg from "@food/assets/hotel-booking-card-bg.png";

export default function HomeHeroPromo({
  activeBanners = [],
  currentBannerIndex = 0,
  handlePromoBannerClick,
}) {
  const navigate = useNavigate();

  // Banner image resolution with fallback to authentic Indian Thali banner
  const currentBanner = activeBanners[currentBannerIndex];
  const bannerImage = currentBanner?.imageUrl || homelyMealsBanner;

  return (
    <div
      id="tiffin-banner-wrapper"
      className="mt-2 mb-2 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4"
    >
      {/* 1. Homely Meals Promotional Banner (Full width on mobile, 8 cols on desktop) */}
      <div className="w-full lg:col-span-8">
        <div
          className="relative w-full h-[160px] sm:h-[190px] md:h-[230px] lg:h-[250px] rounded-[22px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.16)] cursor-pointer group bg-[#121212]"
          onClick={() => {
            if (currentBanner && handlePromoBannerClick) {
              handlePromoBannerClick(currentBanner);
            } else {
              navigate("/food/user/tiffin");
            }
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentBannerIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Background Food Platter Image */}
              <img
                src={bannerImage}
                alt="Homely Meals Delivered Fresh"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  e.currentTarget.src = homelyMealsBanner;
                }}
              />

              {/* Left Vignette & Gradient Overlays for High Contrast Readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

              {/* Banner Left Content Overlay */}
              <div className="absolute inset-y-0 left-0 flex flex-col justify-center pl-4 sm:pl-7 lg:pl-9 pr-4 z-10 text-white max-w-[68%] sm:max-w-[55%]">
                <h2 className="text-[17px] sm:text-[22px] lg:text-[26px] font-black leading-[1.15] tracking-tight drop-shadow-md">
                  Homely Meals
                  <br />
                  Delivered{" "}
                  <span className="text-[#22c55e] italic font-serif">Fresh</span>
                </h2>

                <p className="text-[11px] sm:text-[13px] text-gray-200/95 font-medium leading-snug drop-shadow-sm mt-0.5 sm:mt-1">
                  Healthy. Hygienic. Delicious.
                </p>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/food/user/tiffin");
                    }}
                    className="mt-2.5 sm:mt-3 px-3 py-1 sm:px-4 sm:py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[11px] sm:text-[13px] rounded-full shadow-[0_4px_10px_rgba(34,197,94,0.35)] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Order Now</span>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/20 border border-white/60 flex items-center justify-center">
                      <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3.5]" />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Shimmer Ambient Glow Light Effect */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ x: ["-200%", "200%"] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                repeatDelay: 4,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] w-[150%] h-full"
            />
          </div>

          {/* Centered Pagination Dots */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full border border-white/15">
            <div className="w-4 h-1 rounded-full bg-white shadow-sm" />
            <div className="w-1 h-1 rounded-full bg-white/45 shadow-sm" />
            <div className="w-1 h-1 rounded-full bg-white/45 shadow-sm" />
            <div className="w-1 h-1 rounded-full bg-white/45 shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Service Cards (2 Columns on mobile, Stacked 4-cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-1 lg:col-span-4 gap-2.5 sm:gap-3.5 lg:h-[250px]">
        {/* Card 1: Tiffin Services */}
        <Link
          to="/food/user/tiffin"
          className="group relative flex flex-col justify-between h-[118px] sm:h-[135px] lg:h-[118px] rounded-[20px] overflow-hidden p-3 sm:p-3.5 bg-gray-950 border border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
        >
          <img
            src={tiffinCardBg}
            alt="Tiffin Services"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-emerald-950/20 pointer-events-none" />

          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 dark:bg-black/80 backdrop-blur-md shadow-md flex items-center justify-center p-2 border border-white/30 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#009b67] stroke-[2.4]" />
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div className="min-w-0 pr-1.5">
              <h3 className="text-[13.5px] sm:text-[15px] font-black text-white leading-tight tracking-tight drop-shadow-md">
                Tiffin Services
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-emerald-300 font-semibold leading-tight mt-0.5 drop-shadow-sm">
                Healthy Meals
              </p>
            </div>

            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center text-[#007a51] shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
            </div>
          </div>
        </Link>

        {/* Card 2: Hotel Booking */}
        <Link
          to="/food/user/hotel"
          className="group relative flex flex-col justify-between h-[118px] sm:h-[135px] lg:h-[118px] rounded-[20px] overflow-hidden p-3 sm:p-3.5 bg-gray-950 border border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
        >
          <img
            src={hotelCardBg}
            alt="Hotel Booking"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-blue-950/20 pointer-events-none" />

          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 dark:bg-black/80 backdrop-blur-md shadow-md flex items-center justify-center p-2 border border-white/30 group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#2563eb] stroke-[2.4]" />
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div className="min-w-0 pr-1.5">
              <h3 className="text-[13.5px] sm:text-[15px] font-black text-white leading-tight tracking-tight drop-shadow-md">
                Hotel Booking
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-blue-300 font-semibold leading-tight mt-0.5 drop-shadow-sm">
                Best Stays
              </p>
            </div>

            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center text-[#1d4ed8] shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
