import React from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Utensils, Hotel, Star, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export default function LandingHero({
  isDarkMode,
  activeHeroTab,
  setActiveHeroTab,
  searchLocation,
  setSearchLocation,
  handleSearchSubmit,
}) {
  return (
    <section
      id="hero"
      className={`relative min-h-[96vh] sm:min-h-screen pt-12 pb-24 sm:pt-16 sm:pb-32 flex flex-col justify-center overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#061413] text-white"
          : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] text-slate-900"
      }`}
    >
      {/* Hero Background Image (with dynamic opacity for dark/light) */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 transition-opacity duration-300 ${
          isDarkMode ? "opacity-100" : "opacity-15 mix-blend-multiply"
        }`}
        style={{ backgroundImage: `url('/landingpage/herobg.png')` }}
      />

      {/* Glow Curves & Gradient Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none z-0 ${
          isDarkMode
            ? "bg-gradient-to-b from-[#061413]/30 via-transparent to-[#061413]/90"
            : "bg-gradient-to-b from-white/60 via-transparent to-white/90"
        }`}
      />
      <div
        className={`absolute top-0 right-0 w-72 sm:w-[600px] h-72 sm:h-[600px] rounded-full blur-3xl pointer-events-none z-0 ${
          isDarkMode ? "bg-[#00D09C]/15" : "bg-emerald-400/15"
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 w-64 sm:w-[500px] h-64 sm:h-[500px] rounded-full blur-3xl pointer-events-none z-0 ${
          isDarkMode ? "bg-[#10B981]/10" : "bg-teal-400/10"
        }`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          {/* Left Column: Headline, Switcher, Search, Value Cards */}
          <div className="lg:col-span-7 space-y-7 sm:space-y-9 text-left flex flex-col items-start">
            {/* Welcome Badge */}
            <div
              className={`inline-flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm backdrop-blur-md transition-colors ${
                isDarkMode
                  ? "bg-white/10 border border-white/15 text-white"
                  : "bg-white border border-slate-200 text-emerald-700 shadow-sm"
              }`}
            >
              <span>Welcome to Tifora</span>
              <span className="text-amber-400">✦</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2.5 sm:space-y-4">
              <h1
                className={`text-4xl sm:text-6xl lg:text-[64px] xl:text-[76px] font-black tracking-tight leading-[1.08] ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                One App. <br />
                <span className="whitespace-nowrap">
                  Endless{" "}
                  <span
                    className={
                      isDarkMode
                        ? "bg-gradient-to-r from-[#00D09C] via-[#2DD4BF] to-[#34D399] bg-clip-text text-transparent"
                        : "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent"
                    }
                  >
                    Convenience.
                  </span>
                </span>
              </h1>
              <p
                className={`text-sm sm:text-lg lg:text-xl font-normal max-w-2xl leading-relaxed ${
                  isDarkMode ? "text-gray-200" : "text-slate-600"
                }`}
              >
                Enjoy authentic home-style daily tiffin plans and verified hotel stays with instant booking. Simple, reliable, and tailored for your everyday lifestyle.
              </p>
            </div>

            {/* Dual Service Switcher Pills */}
            <div
              className={`p-1.5 sm:p-2 rounded-full inline-flex items-center gap-2 sm:gap-2.5 transition-colors ${
                isDarkMode
                  ? "bg-[#0D2321] border border-white/10 shadow-inner"
                  : "bg-slate-100/90 border border-slate-200 shadow-sm"
              }`}
            >
              <button
                onClick={() => setActiveHeroTab("tiffin")}
                className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-black transition-all flex items-center gap-2 sm:gap-2.5 ${
                  activeHeroTab === "tiffin"
                    ? "bg-[#00D09C] text-[#061211] shadow-md shadow-[#00D09C]/30"
                    : isDarkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Tiffin</span>
              </button>
              <button
                onClick={() => setActiveHeroTab("hotel")}
                className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-black transition-all flex items-center gap-2 sm:gap-2.5 ${
                  activeHeroTab === "hotel"
                    ? "bg-[#00D09C] text-[#061211] shadow-md shadow-[#00D09C]/30"
                    : isDarkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Hotel</span>
              </button>
            </div>

            {/* Location Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className={`bg-white rounded-full p-2 pl-5 sm:p-2.5 sm:pl-7 flex items-center gap-2 sm:gap-3 shadow-xl w-full max-w-xl border transition-colors ${
                isDarkMode
                  ? "border-white/20"
                  : "border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.08)]"
              }`}
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder={
                  activeHeroTab === "tiffin"
                    ? "Enter city or delivery location..."
                    : "Enter city, landmark or hotel..."
                }
                className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-lg font-medium outline-none min-w-0"
              />
              <button
                type="submit"
                className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-[#00D09C] hover:bg-[#00b587] text-[#061211] flex items-center justify-center shadow-md shadow-[#00D09C]/30 hover:scale-105 active:scale-95 transition shrink-0 p-2.5"
                title="Search now"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </button>
            </form>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-start gap-2 pt-1">
              <span
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border border-white/10 text-gray-200"
                    : "bg-white border border-slate-200/80 text-slate-700 shadow-sm"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Healthy Food</span>
              </span>
              <span
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border border-white/10 text-gray-200"
                    : "bg-white border border-slate-200/80 text-slate-700 shadow-sm"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Verified Partners</span>
              </span>
              <span
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border border-white/10 text-gray-200"
                    : "bg-white border border-slate-200/80 text-slate-700 shadow-sm"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Express Delivery</span>
              </span>
            </div>

            {/* Value Highlights Cards for Mobile & Desktop */}
            <div className="w-full max-w-xl grid grid-cols-2 sm:grid-cols-2 gap-3 pt-2">
              <div
                className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md space-y-1 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border border-white/10"
                    : "bg-white border border-slate-200/80 shadow-md"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-[#00D09C]/20 text-[#00D09C]" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                  </div>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Daily Tiffins
                  </span>
                </div>
                <p
                  className={`text-[11px] sm:text-xs leading-snug ${
                    isDarkMode ? "text-gray-400" : "text-slate-500"
                  }`}
                >
                  Fresh, home-cooked meal subscriptions starting at ₹99.
                </p>
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md space-y-1 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border border-white/10"
                    : "bg-white border border-slate-200/80 shadow-md"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Hotel className="w-4 h-4" />
                  </div>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Hotel Stays
                  </span>
                </div>
                <p
                  className={`text-[11px] sm:text-xs leading-snug ${
                    isDarkMode ? "text-gray-400" : "text-slate-500"
                  }`}
                >
                  Verified accommodations with instant confirmation.
                </p>
              </div>
            </div>

            {/* Social Proof Line */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-0.5 text-amber-500 text-sm">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isDarkMode ? "text-gray-300" : "text-slate-600"
                }`}
              >
                <strong className={isDarkMode ? "text-white font-bold" : "text-slate-900 font-bold"}>
                  4.9/5
                </strong>{" "}
                rated by 50,000+ happy customers
              </span>
            </div>
          </div>

          {/* Right Column: High-Res Mobile Mockup Preview (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 relative items-center justify-end">
            <div className="relative w-full max-w-[1200px] scale-165 xl:scale-180 2xl:scale-190 origin-right transition-transform">
              <motion.img
                src="/landingpage/mobile.png"
                alt="Tifora Super App Mobile Mockup"
                className="w-full h-auto object-contain drop-shadow-[0_45px_100px_rgba(0,208,156,0.45)] hover:scale-105 transition-transform duration-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
