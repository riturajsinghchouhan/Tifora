import React from 'react';
import { Clock, Calendar, ShieldCheck } from 'lucide-react';

const FEATURES = [
  {
    id: 'fixed-timings',
    title: 'Fixed Timings',
    subtitle: '11 AM & 7 PM',
    icon: Clock,
    bgClass: 'bg-[#edf9f3] dark:bg-[#102319] border-[#d6f0e2] dark:border-[#1d402e]',
    iconBgClass: 'bg-[#0c593a] shadow-[0_4px_12px_rgba(12,89,58,0.25)]',
    subtitleClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-700',
  },
  {
    id: 'flexible-plans',
    title: 'Flexible Plans',
    subtitle: 'Pause anytime',
    icon: Calendar,
    bgClass: 'bg-[#fef8ed] dark:bg-[#261f13] border-[#faeacf] dark:border-[#42341e]',
    iconBgClass: 'bg-[#b37410] shadow-[0_4px_12px_rgba(179,116,16,0.25)]',
    subtitleClass: 'text-amber-800 dark:text-amber-400',
    dotClass: 'bg-amber-700',
  },
  {
    id: 'zero-surge',
    title: 'Zero Surge',
    subtitle: 'No extra charges',
    icon: ShieldCheck,
    bgClass: 'bg-[#f3f1fd] dark:bg-[#1c182c] border-[#e2dcfc] dark:border-[#352c54]',
    iconBgClass: 'bg-[#4c3b9b] shadow-[0_4px_12px_rgba(76,59,155,0.25)]',
    subtitleClass: 'text-indigo-700 dark:text-indigo-400',
    dotClass: 'bg-indigo-700',
  },
];

export default function TiffinFeatureCards() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 w-full my-4 sm:my-6">
      {FEATURES.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-3 sm:p-4 text-center transition-all duration-300 hover:shadow-md group ${item.bgClass}`}
          >
            {/* Dot Pattern Grid Accent in Top-Right Corner */}
            <div className="absolute top-2.5 right-2.5 grid grid-cols-2 gap-1 opacity-20 pointer-events-none">
              <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
              <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
              <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
              <div className={`w-1 h-1 rounded-full ${item.dotClass}`} />
            </div>

            {/* Circular Icon with Drop Shadow */}
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform duration-300 ${item.iconBgClass}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>

            {/* Title */}
            <h3 className="text-[12px] sm:text-[14px] font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              {item.title}
            </h3>

            {/* Subtitle */}
            <p className={`text-[10px] sm:text-[11.5px] font-semibold mt-0.5 tracking-tight ${item.subtitleClass}`}>
              {item.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
