import React from "react";
import { Utensils, Hotel, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingServices({ activeServicesTab, setActiveServicesTab }) {
  const navigate = useNavigate();

  return (
    <section
      id="core-services"
      className="relative min-h-[96vh] sm:min-h-screen py-20 sm:py-28 md:py-36 bg-[#FBFDFD] flex flex-col justify-center overflow-hidden"
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-[#00D09C]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 relative z-10 w-full">
        {/* Section Heading */}
        <div className="text-center space-y-2 sm:space-y-3 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-[#0B1E1C] tracking-tight">
            Our <span className="text-[#00D09C]">Core</span> Services
          </h2>
          <p className="text-xs sm:text-base text-gray-500 font-medium">
            Everything you need, in your pocket.
          </p>

          {/* Filter Pills */}
          <div className="pt-1 sm:pt-2">
            <div className="p-1 sm:p-1.5 bg-[#0B1E1C] border border-white/10 rounded-full inline-flex items-center gap-1.5 sm:gap-2 shadow-xl">
              <button
                onClick={() => setActiveServicesTab("tiffin")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 ${
                  activeServicesTab === "tiffin"
                    ? "bg-[#00D09C] text-[#061211] shadow-md shadow-[#00D09C]/30"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Tiffin Services</span>
              </button>
              <button
                onClick={() => setActiveServicesTab("hotel")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 ${
                  activeServicesTab === "hotel"
                    ? "bg-[#00D09C] text-[#061211] shadow-md shadow-[#00D09C]/30"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Hotel className="w-3.5 h-3.5" />
                <span>Hotel Booking</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2 Compact Glassmorphism Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {/* Card 1: Tiffin Services */}
          <div className="relative rounded-2xl sm:rounded-[28px] overflow-hidden min-h-[230px] sm:min-h-[370px] shadow-xl sm:shadow-2xl border border-gray-200/40 bg-[#061413] flex flex-col justify-end sm:justify-center p-3 sm:p-6 group">
            {/* Steaming Thali Photo Background */}
            <img
              src="https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=1200&q=80"
              alt="Tiffin Services"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-90"
            />

            {/* Gradient Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none" />

            {/* Glowing Refraction Orb */}
            <div className="absolute top-1/4 right-1/4 w-32 sm:w-44 h-32 sm:h-44 bg-[#00D09C]/30 rounded-full blur-3xl pointer-events-none" />

            {/* Real Glassmorphism Floating Panel */}
            <div className="relative z-10 sm:ml-auto w-full sm:w-[58%] rounded-xl sm:rounded-[24px] bg-gradient-to-br from-[#061E1A]/75 via-[#0A2621]/65 to-[#02100E]/80 backdrop-blur-2xl border border-white/30 p-3.5 sm:p-6 space-y-2 sm:space-y-4 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden">
              {/* Top Glass Highlight Shimmer */}
              <div className="absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 bg-[#00D09C]/25 rounded-full blur-2xl pointer-events-none" />

              {/* Icon Badge */}
              <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#00D09C] to-[#059669] text-[#061211] flex items-center justify-center font-black shadow-md shadow-[#00D09C]/40 border border-white/20">
                <Utensils className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>

              {/* Content */}
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-base sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  Tiffin Services
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-200 leading-snug font-normal drop-shadow-sm">
                  Fresh, homemade and healthy meals delivered to your doorstep.
                </p>
              </div>

              {/* Checklist */}
              <ul className="space-y-1 sm:space-y-2 text-[11px] sm:text-sm text-gray-100">
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Hygienic & Fresh</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Daily, Weekly, Monthly Plans</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Local Home Chefs & Verified Partners</span>
                </li>
              </ul>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  onClick={() => navigate("/food/tiffin/plans")}
                  className="px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider bg-[#00D09C] hover:bg-[#00b587] text-[#061211] inline-flex items-center gap-1.5 sm:gap-2 shadow-md shadow-[#00D09C]/35 transition hover:scale-105 active:scale-95 border border-white/20"
                >
                  <span>Order Tiffin</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Hotel Booking */}
          <div className="relative rounded-2xl sm:rounded-[28px] overflow-hidden min-h-[230px] sm:min-h-[370px] shadow-xl sm:shadow-2xl border border-gray-200/40 bg-[#061413] flex flex-col justify-end sm:justify-center p-3 sm:p-6 group">
            {/* Luxury Hotel Bedroom Photo Background */}
            <img
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
              alt="Hotel Booking"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-90"
            />

            {/* Gradient Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none" />

            {/* Glowing Refraction Orb */}
            <div className="absolute top-1/4 right-1/4 w-32 sm:w-44 h-32 sm:h-44 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />

            {/* Real Glassmorphism Floating Panel */}
            <div className="relative z-10 sm:ml-auto w-full sm:w-[58%] rounded-xl sm:rounded-[24px] bg-gradient-to-br from-[#0D1E2D]/75 via-[#0A1826]/65 to-[#030910]/80 backdrop-blur-2xl border border-white/30 p-3.5 sm:p-6 space-y-2 sm:space-y-4 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden">
              {/* Top Glass Highlight Shimmer */}
              <div className="absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />

              {/* Icon Badge */}
              <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/40 border border-white/20">
                <Hotel className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>

              {/* Content */}
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-base sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  Hotel Booking
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-200 leading-snug font-normal drop-shadow-sm">
                  Find and book the best hotels at unbeatable prices.
                </p>
              </div>

              {/* Checklist */}
              <ul className="space-y-1 sm:space-y-2 text-[11px] sm:text-sm text-gray-100">
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Budget to Luxury Stays</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Instant Confirmation</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00D09C] shrink-0 drop-shadow-sm" />
                  <span className="font-medium">Verified & Rated Hotels</span>
                </li>
              </ul>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  onClick={() => navigate("/food")}
                  className="px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider bg-white/20 hover:bg-white/30 text-white border border-white/30 inline-flex items-center gap-1.5 sm:gap-2 transition hover:scale-105 active:scale-95 shadow-md backdrop-blur-md"
                >
                  <span>Book Hotel</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
