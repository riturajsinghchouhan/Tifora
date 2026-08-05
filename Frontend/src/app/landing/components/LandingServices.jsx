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

        {/* 2 Featured Service Cards matching exact design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {/* Card 1: Tiffin Services */}
          <div
            onClick={() => navigate("/food/tiffin/plans")}
            className="group relative rounded-2xl sm:rounded-[26px] overflow-hidden min-h-[185px] sm:min-h-[210px] p-5 sm:p-7 bg-gradient-to-r from-[#04281e] via-[#06382a] to-[#032017] border border-emerald-500/20 shadow-[0_12px_32px_rgba(3,40,30,0.35)] flex items-center justify-between cursor-pointer hover:shadow-[0_16px_40px_rgba(0,208,156,0.25)] hover:-translate-y-1 transition-all duration-300"
          >
            {/* Background Ambient Radial Glow */}
            <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#00D09C]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-10 max-w-[58%] sm:max-w-[60%] space-y-2 sm:space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Tiffin Services
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-normal leading-snug">
                Fresh, hygienic and tasty meals delivered to your doorstep.
              </p>
              <div className="pt-1">
                <span className="px-4 sm:px-5 py-2 rounded-full text-xs font-black bg-gradient-to-r from-[#00E5AA] to-[#00C28E] text-[#042017] inline-flex items-center gap-1.5 shadow-md shadow-[#00E5AA]/25 group-hover:scale-105 group-hover:brightness-105 active:scale-95 transition-all">
                  <span>Explore Tiffins</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Right Thali Plate Image */}
            <div className="relative z-10 shrink-0 w-32 h-32 sm:w-44 sm:h-44 -mr-3 sm:-mr-2 flex items-center justify-center">
              <div className="w-full h-full rounded-full overflow-hidden shadow-2xl border-2 border-emerald-400/20 group-hover:scale-105 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80"
                  alt="Tiffin Meals"
                  className="w-full h-full object-cover scale-110"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Hotel Booking */}
          <div
            onClick={() => navigate("/food")}
            className="group relative rounded-2xl sm:rounded-[26px] overflow-hidden min-h-[185px] sm:min-h-[210px] p-5 sm:p-7 bg-gradient-to-r from-[#17153a] via-[#211e53] to-[#12102f] border border-indigo-500/20 shadow-[0_12px_32px_rgba(23,21,58,0.4)] flex items-center justify-between cursor-pointer hover:shadow-[0_16px_40px_rgba(99,102,241,0.25)] hover:-translate-y-1 transition-all duration-300"
          >
            {/* Background Ambient Radial Glow */}
            <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-10 max-w-[56%] sm:max-w-[58%] space-y-2 sm:space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hotel Booking
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100/80 font-normal leading-snug">
                Find and book the best hotels at unbeatable prices.
              </p>
              <div className="pt-1">
                <span className="px-4 sm:px-5 py-2 rounded-full text-xs font-semibold bg-[#2a275e]/90 hover:bg-[#343073] text-white border border-indigo-400/30 inline-flex items-center gap-1.5 shadow-md group-hover:scale-105 active:scale-95 transition-all">
                  <span>Book Hotels</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Right Hotel Room Image */}
            <div className="relative z-10 shrink-0 w-36 h-28 sm:w-48 sm:h-36 -mr-4 sm:-mr-3 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-indigo-400/20 group-hover:scale-105 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"
                alt="Hotel Booking"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#211e53]/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
