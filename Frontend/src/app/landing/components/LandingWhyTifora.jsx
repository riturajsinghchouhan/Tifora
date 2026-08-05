import React from "react";
import { Utensils, ShieldCheck, Wallet, Calendar, Hotel, Headphones, CheckCircle2 } from "lucide-react";

export default function LandingWhyTifora() {
  const cards = [
    {
      id: 1,
      icon: Utensils,
      title: "Fresh & Homemade",
      desc: "Nutritious, authentic home-cooked meals prepared fresh every day by certified local home chefs.",
      badge: "Cooked fresh daily with pure oils",
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
      },
    },
    {
      id: 2,
      icon: ShieldCheck,
      title: "Verified & Hygienic",
      desc: "100% FSSAI-certified kitchens and regularly audited hotel properties ensuring absolute peace of mind.",
      badge: "Rigorous 25-point hygiene audit",
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
      },
    },
    {
      id: 3,
      icon: Wallet,
      title: "Affordable Plans",
      desc: "Pocket-friendly daily, weekly, and monthly subscriptions with transparent pricing and zero surge fees.",
      badge: "Save up to 40% on monthly plans",
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
      },
    },
    {
      id: 4,
      icon: Calendar,
      title: "Flexible Subscriptions",
      desc: "Easy 1-tap controls to skip meals, pause delivery during vacations, or switch your active address.",
      badge: "1-tap instant pause & wallet refund",
      theme: {
        gradient: "from-white/90 via-amber-50/50 to-white/70",
        border: "border-amber-500/20 hover:border-amber-500/40",
        shadow: "shadow-[0_10px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_20px_45px_rgba(245,158,11,0.18)]",
        glow: "from-amber-400/30 to-orange-400/10",
        iconBg: "from-amber-500 to-orange-500",
        iconShadow: "shadow-amber-500/35",
        textHover: "group-hover:text-amber-800",
        badgeBorder: "border-amber-500/10",
        badgeText: "text-amber-700",
        badgeIcon: "text-amber-500",
      },
    },
    {
      id: 5,
      icon: Hotel,
      title: "Instant Hotel Booking",
      desc: "Browse handpicked budget to luxury stays with honest photos, verified reviews, and instant confirmation.",
      badge: "Zero convenience fee on check-ins",
      theme: {
        gradient: "from-white/90 via-indigo-50/50 to-white/70",
        border: "border-indigo-500/20 hover:border-indigo-500/40",
        shadow: "shadow-[0_10px_30px_rgba(99,102,241,0.08)] hover:shadow-[0_20px_45px_rgba(99,102,241,0.18)]",
        glow: "from-indigo-500/30 to-purple-400/10",
        iconBg: "from-indigo-600 to-purple-600",
        iconShadow: "shadow-indigo-500/35",
        textHover: "group-hover:text-indigo-800",
        badgeBorder: "border-indigo-500/10",
        badgeText: "text-indigo-700",
        badgeIcon: "text-indigo-500",
      },
    },
    {
      id: 6,
      icon: Headphones,
      title: "24×7 Human Support",
      desc: "Dedicated support concierge ready to help with orders, special meal diets, and booking assistance.",
      badge: "Average response time under 1 min",
      theme: {
        gradient: "from-white/90 via-rose-50/50 to-white/70",
        border: "border-rose-500/20 hover:border-rose-500/40",
        shadow: "shadow-[0_10px_30px_rgba(244,63,94,0.08)] hover:shadow-[0_20px_45px_rgba(244,63,94,0.18)]",
        glow: "from-rose-400/30 to-pink-400/10",
        iconBg: "from-rose-500 to-pink-600",
        iconShadow: "shadow-rose-500/35",
        textHover: "group-hover:text-rose-800",
        badgeBorder: "border-rose-500/10",
        badgeText: "text-rose-700",
        badgeIcon: "text-rose-500",
      },
    },
  ];

  return (
    <section id="why-tifora" className="py-12 sm:py-20 md:py-28 bg-gradient-to-b from-[#F5F9F8] via-[#EEF5F3] to-[#F5F9F8] border-y border-gray-100/80 relative overflow-hidden">
      {/* Soft Ambient Background Orbs */}
      <div className="absolute top-10 left-1/4 -translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-[#00D09C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 relative z-10">
        {/* Section Heading */}
        <div className="text-center space-y-2 sm:space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-emerald-500/20 text-[#00D09C] text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
            <span>Why Choose Us</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#0B1E1C] tracking-tight">
            Why <span className="text-[#00D09C]">Tifora</span>?
          </h2>
          <p className="text-xs sm:text-base text-gray-500 font-medium">
            Designed for a simpler, smarter and better daily lifestyle.
          </p>
        </div>

        {/* 6 Glassmorphism Gradient Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-gradient-to-br ${card.theme.gradient} backdrop-blur-xl border ${card.theme.border} ${card.theme.shadow} hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden flex flex-col justify-between space-y-4 sm:space-y-6`}
              >
                {/* Inner Ambient Glow */}
                <div className={`absolute -top-12 -right-12 w-28 sm:w-32 h-28 sm:h-32 bg-gradient-to-br ${card.theme.glow} rounded-full blur-2xl group-hover:scale-150 transition-all duration-500 pointer-events-none`} />

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${card.theme.iconBg} text-white flex items-center justify-center font-bold shadow-md sm:shadow-lg ${card.theme.iconShadow} group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className={`text-base sm:text-xl font-bold text-gray-900 ${card.theme.textHover} transition-colors`}>
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className={`pt-2.5 sm:pt-3 border-t ${card.theme.badgeBorder} text-[11px] sm:text-xs font-semibold ${card.theme.badgeText} flex items-center gap-1.5 relative z-10`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.theme.badgeIcon} shrink-0`} />
                  <span className="truncate">{card.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
