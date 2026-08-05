import React from "react";
import { Utensils, Hotel, ChevronLeft, ChevronRight, Heart, Star, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPopularPicks({
  activePicksTab,
  setActivePicksTab,
  currentPicks,
  picksIndex,
  setPicksIndex,
}) {
  const navigate = useNavigate();

  return (
    <section id="popular-picks" className="py-12 sm:py-20 md:py-24 bg-[#F9FBFA] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-10">
        {/* Header Row with Filter & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D09C]/10 text-[#00D09C] text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <span>Handpicked For You</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Explore <span className="text-[#00D09C]">Popular</span> Picks
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Top-rated daily tiffin meals and verified hotel stays in your city.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Category Toggle Tabs */}
            <div className="p-1 bg-white border border-gray-200/90 rounded-2xl inline-flex items-center shadow-sm">
              <button
                onClick={() => setActivePicksTab("tiffins")}
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                  activePicksTab === "tiffins"
                    ? "bg-[#00D09C] text-[#061211] shadow-sm shadow-[#00D09C]/20"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Tiffins</span>
              </button>
              <button
                onClick={() => setActivePicksTab("hotels")}
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                  activePicksTab === "hotels"
                    ? "bg-[#0B1E1C] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Hotel className="w-3.5 h-3.5" />
                <span>Hotels</span>
              </button>
            </div>

            {/* Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setPicksIndex((prev) => Math.max(0, prev - 1))}
                disabled={picksIndex === 0}
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center transition disabled:opacity-40 shadow-sm"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPicksIndex((prev) => Math.min(currentPicks.length - 1, prev + 1))}
                className="w-9 h-9 rounded-xl bg-[#00D09C] text-[#061211] flex items-center justify-center shadow-sm shadow-[#00D09C]/25 hover:bg-[#00b587] transition"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Premium Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {currentPicks.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100/80 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Image & Overlay Badges */}
              <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-gray-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Top Tag */}
                <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-gray-800 shadow-sm border border-gray-100">
                  {item.tag}
                </span>

                {/* Favorite Heart */}
                <button
                  className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-md text-gray-600 hover:text-rose-500 hover:scale-110 flex items-center justify-center shadow-sm transition"
                  title="Add to favorites"
                  aria-label="Add to favorites"
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Bottom Rating Pill */}
                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-black/70 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  <span>{item.rating}</span>
                  <span className="text-gray-300 font-normal text-[9px] sm:text-[10px]">({item.reviews})</span>
                </div>

                {/* Bottom Time/Location Pill */}
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-black/70 backdrop-blur-md text-[10px] sm:text-[11px] font-medium text-white flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-[#00D09C]" />
                  <span>{item.time}</span>
                </div>
              </div>

              {/* Details Body */}
              <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 group-hover:text-[#00D09C] transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    {activePicksTab === "tiffins"
                      ? "Homemade • Nutritious • Fresh Daily"
                      : "Verified Stay • Premium Hospitality"}
                  </p>
                </div>

                {/* Price & Action Row */}
                <div className="pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-base sm:text-lg font-black text-gray-900">{item.price}</span>
                    <span className="text-gray-400 text-[10px] sm:text-xs font-normal">
                      {activePicksTab === "tiffins" ? " / meal" : " / night"}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(item.link)}
                    className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-[#00D09C] hover:bg-[#00b587] text-[#061211] transition-all flex items-center gap-1 shadow-sm shadow-[#00D09C]/25 hover:scale-105 active:scale-95"
                  >
                    <span>{activePicksTab === "tiffins" ? "Order" : "Book"}</span>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
