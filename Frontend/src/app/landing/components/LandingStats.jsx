import React from "react";
import { Users, ShoppingBag, Building, MapPin, Star } from "lucide-react";

export default function LandingStats() {
  const stats = [
    {
      icon: Users,
      value: "1M+",
      label: "Happy Users",
      color: "text-[#00D09C]",
      bg: "bg-[#00D09C]/10",
    },
    {
      icon: ShoppingBag,
      value: "50K+",
      label: "Orders Delivered",
      color: "text-[#00D09C]",
      bg: "bg-[#00D09C]/10",
    },
    {
      icon: Building,
      value: "5K+",
      label: "Hotels Listed",
      color: "text-[#00D09C]",
      bg: "bg-[#00D09C]/10",
    },
    {
      icon: MapPin,
      value: "100+",
      label: "Cities",
      color: "text-[#00D09C]",
      bg: "bg-[#00D09C]/10",
    },
    {
      icon: Star,
      value: "4.9★",
      label: "Average Rating",
      color: "text-amber-400 fill-amber-400",
      bg: "bg-amber-400/10",
      extraCol: "col-span-2 sm:col-span-1",
    },
  ];

  return (
    <section className="relative z-30 -mt-8 sm:-mt-14 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      <div className="bg-[#091D1B] border border-white/10 rounded-2xl md:rounded-full py-3.5 sm:py-5 px-3.5 sm:px-8 md:px-12 shadow-2xl shadow-black/40 text-white backdrop-blur-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-center sm:divide-x divide-white/10 text-center">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={`flex flex-row items-center justify-center gap-2.5 sm:gap-3 py-1.5 sm:py-0 ${stat.extraCol || ""}`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-base sm:text-2xl lg:text-3xl font-black text-white leading-tight">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
