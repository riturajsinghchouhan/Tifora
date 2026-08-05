import React from "react";
import { Search, Calendar, Rocket, CheckCircle2 } from "lucide-react";

export default function LandingHowItWorks() {
  const steps = [
    {
      step: "Step 01",
      icon: Search,
      title: "Choose Service",
      desc: "Select between daily home-cooked Tiffin Plans or verified Hotel Stays in your city.",
      badge: "Search by location & cuisine",
      theme: {
        gradient: "from-white/90 via-emerald-50/50 to-white/70",
        border: "border-emerald-500/20 hover:border-emerald-500/40",
        shadow: "shadow-[0_10px_30px_rgba(16,185,129,0.08)] hover:shadow-[0_20px_45px_rgba(16,185,129,0.18)]",
        glow: "from-[#00D09C]/30 to-emerald-400/10",
        iconBg: "from-[#00D09C] to-[#047857]",
        iconShadow: "shadow-[#00D09C]/35",
        textHover: "group-hover:text-emerald-800",
        badgeBorder: "border-emerald-500/10",
        badgeText: "text-emerald-700",
        badgeIcon: "text-[#00D09C]",
        stepPill: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
      },
    },
    {
      step: "Step 02",
      icon: Calendar,
      title: "Customize & Select",
      desc: "Pick your meal plan (Veg/Non-Veg, Daily/Monthly) or select your hotel check-in dates and room type.",
      badge: "Flexible pause & skip anytime",
      theme: {
        gradient: "from-white/90 via-blue-50/50 to-white/70",
        border: "border-blue-500/20 hover:border-blue-500/40",
        shadow: "shadow-[0_10px_30px_rgba(59,130,246,0.08)] hover:shadow-[0_20px_45px_rgba(59,130,246,0.18)]",
        glow: "from-blue-500/30 to-indigo-400/10",
        iconBg: "from-blue-500 to-indigo-600",
        iconShadow: "shadow-blue-500/35",
        textHover: "group-hover:text-blue-800",
        badgeBorder: "border-blue-500/10",
        badgeText: "text-blue-700",
        badgeIcon: "text-blue-500",
        stepPill: "text-blue-700 bg-blue-500/10 border-blue-500/20",
      },
    },
    {
      step: "Step 03",
      icon: Rocket,
      title: "Enjoy Seamless Service",
      desc: "Confirm your order with 100% secure payments. Enjoy timely doorstep delivery or effortless hotel check-in.",
      badge: "Instant confirmation & live support",
      theme: {
        gradient: "from-white/90 via-teal-50/50 to-white/70",
        border: "border-teal-500/20 hover:border-teal-500/40",
        shadow: "shadow-[0_10px_30px_rgba(20,184,166,0.08)] hover:shadow-[0_20px_45px_rgba(20,184,166,0.18)]",
        glow: "from-teal-400/30 to-emerald-400/10",
        iconBg: "from-teal-400 to-emerald-600",
        iconShadow: "shadow-teal-500/35",
        textHover: "group-hover:text-teal-800",
        badgeBorder: "border-teal-500/10",
        badgeText: "text-teal-700",
        badgeIcon: "text-teal-500",
        stepPill: "text-teal-700 bg-teal-500/10 border-teal-500/20",
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-20 md:py-28 bg-gradient-to-b from-white via-[#F5FBF9] to-white border-b border-gray-100/80 relative overflow-hidden">
      {/* Soft Ambient Background Orbs */}
      <div className="absolute top-10 left-1/6 w-64 sm:w-96 h-64 sm:h-96 bg-[#00D09C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/6 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 relative z-10">
        {/* Section Heading */}
        <div className="text-center space-y-2 sm:space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-emerald-500/20 text-[#00D09C] text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
            <span>Simple 3-Step Process</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#0B1E1C] tracking-tight">
            How It <span className="text-[#00D09C]">Works</span>
          </h2>
          <p className="text-xs sm:text-base text-gray-500 font-medium">
            Get wholesome meals or book verified stays in 3 simple steps.
          </p>
        </div>

        {/* 3 Connected Glassmorphism Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-gradient-to-br ${item.theme.gradient} backdrop-blur-xl border ${item.theme.border} ${item.theme.shadow} hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden flex flex-col justify-between space-y-4 sm:space-y-6`}
              >
                {/* Inner Glow Orb */}
                <div className={`absolute -top-12 -right-12 w-28 sm:w-32 h-28 sm:h-32 bg-gradient-to-br ${item.theme.glow} rounded-full blur-2xl group-hover:scale-150 transition-all duration-500 pointer-events-none`} />

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.theme.iconBg} text-white flex items-center justify-center font-bold shadow-md sm:shadow-lg ${item.theme.iconShadow} group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest border px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm ${item.theme.stepPill}`}>
                      {item.step}
                    </span>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <h3 className={`text-base sm:text-xl font-bold text-gray-900 ${item.theme.textHover} transition-colors`}>
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className={`pt-2.5 sm:pt-3 border-t ${item.theme.badgeBorder} text-[11px] sm:text-xs font-semibold ${item.theme.badgeText} flex items-center gap-1.5 relative z-10`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.theme.badgeIcon} shrink-0`} />
                  <span className="truncate">{item.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
