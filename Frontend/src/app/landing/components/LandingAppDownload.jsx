import React from "react";
import { QrCode } from "lucide-react";

export default function LandingAppDownload() {
  return (
    <section id="download-app" className="py-10 sm:py-16 md:py-24 bg-[#F9FBFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#061816] via-[#092824] to-[#061816] rounded-2xl sm:rounded-[36px] p-5 sm:p-8 md:p-12 text-white border border-white/10 relative overflow-hidden shadow-2xl">
          {/* Glow Orbs */}
          <div className="absolute -right-12 -bottom-12 w-64 sm:w-96 h-64 sm:h-96 bg-[#00D09C]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  <span className="text-[#00D09C]">Take</span> Control of Your Everyday Life
                </h2>
                <p className="text-xs sm:text-base text-gray-300 max-w-lg leading-relaxed">
                  Download the app now and experience convenience like never before.
                </p>
              </div>

              {/* App Stores and QR Code Row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-4 pt-1 sm:pt-2">
                {/* Google Play Button */}
                <a
                  href="#download"
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-black/50 hover:bg-black/70 border border-white/20 flex items-center gap-2.5 sm:gap-3 transition hover:scale-105 active:scale-95 shadow-md"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D09C]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.428V3.242c0-.554.225-1.056.609-1.428zM15.207 13.414l2.793 2.793-12.71 7.234 9.917-10.027zM19.414 12l-2.071-2.071 2.071-2.071c.78.445 1.307 1.28 1.307 2.071s-.527 1.626-1.307 2.071zM5.29 1.773L18 9.007l-2.793 2.793L5.29 1.773z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider font-semibold">GET IT ON</p>
                    <p className="text-[11px] sm:text-xs font-bold text-white leading-none">Google Play</p>
                  </div>
                </a>

                {/* App Store Button */}
                <a
                  href="#download"
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-black/50 hover:bg-black/70 border border-white/20 flex items-center gap-2.5 sm:gap-3 transition hover:scale-105 active:scale-95 shadow-md"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-.98 1.7-0.87 2.72.99.08 2.02-.49 2.58-1.22z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Download on the</p>
                    <p className="text-[11px] sm:text-xs font-bold text-white leading-none">App Store</p>
                  </div>
                </a>

                {/* QR Code Container */}
                <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-lg p-1 flex items-center justify-center">
                    <QrCode className="w-full h-full text-[#061211]" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-300">Scan to Download</span>
                </div>
              </div>
            </div>

            {/* Right Visual: Floating Emblem & App Mockup (Desktop Only) */}
            <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center">
              <div className="relative w-full max-w-[280px]">
                {/* Floating 3D Badge */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D09C] to-[#047857] flex items-center justify-center shadow-xl border border-white/20">
                  <span className="text-white font-black text-2xl">T</span>
                </div>

                {/* Phone Screen Mockup */}
                <div className="bg-[#0F2321] rounded-[32px] border-[5px] border-[#1E443F] p-3 shadow-2xl overflow-hidden">
                  <div className="space-y-2">
                    <div className="w-16 h-2 bg-black rounded-full mx-auto" />
                    <div className="p-2 bg-[#17332F] rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-white">Daily Fresh Tiffins</p>
                      <p className="text-[8px] text-gray-400">Delivered hot to your door</p>
                    </div>
                    <div className="p-2 bg-[#17332F] rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-white">Luxury Hotel Stays</p>
                      <p className="text-[8px] text-gray-400">Exclusive member discounts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
