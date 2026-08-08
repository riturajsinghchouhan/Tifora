import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Mic, Bell, CheckCircle2, Tag, Gift, AlertCircle, BellOff } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@food/components/ui/popover";
import { Badge } from "@food/components/ui/badge";
import brandLogo from "@/assets/logo.png";
import useNotificationInbox from "@food/hooks/useNotificationInbox";

const ICON_MAP = {
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle
};

// Premium Veg Leaf SVG matching exact reference UI
function VegLeafIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="vegLeafGradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="60%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      {/* Leaf Body */}
      <path
        d="M20.8 3.2C13.5 3.2 5.5 8.8 4.2 16C3.2 21.2 7.8 21.8 10.5 21.2C17.8 19.5 22.8 11.2 20.8 3.2Z"
        fill="url(#vegLeafGradient)"
      />
      {/* Central Stem */}
      <path
        d="M5.5 19.5C8.2 16.8 12.8 12.2 19.2 5"
        stroke="#047857"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Veins */}
      <path
        d="M9.2 15.8C11.2 14.5 13.5 14.8 13.5 14.8"
        stroke="#047857"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M12.2 12.8C14.2 11.5 16.5 11.8 16.5 11.8"
        stroke="#047857"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M7.2 17.8C7.8 16.5 7.2 15 7.2 15"
        stroke="#047857"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HomeHeader({
  location,
  handleLocationClick,
  handleSearchFocus,
  placeholderIndex,
  placeholders,
  vegMode = false,
  handleVegModeChange,
  isCategoryStuck = false,
  handleVoiceSearchClick
}) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('food_user_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    dismiss: dismissBroadcastNotification,
  } = useNotificationInbox("user", { limit: 20 });

  useEffect(() => {
    const syncNotifications = () => {
      const saved = localStorage.getItem('food_user_notifications');
      setNotifications(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener('notificationsUpdated', syncNotifications);
    return () => window.removeEventListener('notificationsUpdated', syncNotifications);
  }, []);

  const mergedNotifications = useMemo(() => {
    const localItems = Array.isArray(notifications)
      ? notifications.map((item) => ({ ...item, source: "local" }))
      : [];
    const broadcastItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      source: "broadcast",
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "Just now",
      type: "broadcast",
      icon: "Bell",
      iconColor: "text-blue-600",
    }));

    return [...broadcastItems, ...localItems].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() -
        new Date(a.createdAt || a.timestamp || 0).getTime()
    );
  }, [broadcastNotifications, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length + broadcastUnreadCount;

  // Format Area Title
  const areaTitle = useMemo(() => {
    const area = location?.area || location?.subLocality || location?.mainTitle || location?.neighborhood;
    const city = (location?.city || "").toLowerCase();
    const state = (location?.state || "").toLowerCase();

    if (area && !/^-?\d+(\.\d+)?$/.test(area.trim())) {
      const areaLower = area.toLowerCase();
      if (areaLower !== city && areaLower !== state) {
        return area;
      }
    }

    if (location?.address && location.address !== "Select location") {
      const parts = location.address.split(',').map((p) => p.trim());
      for (const part of parts) {
        const partLower = part.toLowerCase();
        if (
          partLower &&
          partLower !== city &&
          partLower !== state &&
          !/^-?\d/.test(part) &&
          part.length > 2
        ) {
          return part;
        }
      }
    }

    return location?.area || location?.city || "Select Location";
  }, [location]);

  // Format Subtitle Address
  const subtitleAddress = useMemo(() => {
    const addr = location?.formattedAddress || location?.address || "";
    if (addr && addr.length > 5 && addr !== "Select location") {
      return addr;
    }

    const state = location?.state || "";
    const pincode = location?.pincode || "";

    if (state && pincode) return `${state}, ${pincode}`;
    if (state) return state;
    if (pincode) return pincode;

    return "Pinpoint location";
  }, [location]);

  return (
    <>
      {/* Top Header Background with Warm Ambient Glow (Mobile Only - Desktop has DesktopNavbar) */}
      <div id="home-header-loc-row" className="md:hidden relative pt-2.5 pb-1 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 transition-all duration-500 overflow-hidden bg-gradient-to-b from-[#FEF5E7] via-[#FFFBF5] to-white/90 dark:from-[#1f180e] dark:via-[#13110e] dark:to-[#0a0a0a]">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-amber-400/10 blur-[70px] rounded-full pointer-events-none" />
        <div className="absolute top-0 -left-12 w-48 h-48 bg-[#10b981]/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Faint Background Art Pattern on Left */}
        <svg
          className="absolute -top-4 -left-6 w-36 h-36 opacity-[0.08] dark:opacity-[0.05] pointer-events-none text-amber-900 dark:text-amber-100"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="30" />
          <circle cx="50" cy="50" r="15" />
          <path d="M50 5 L50 95 M5 50 L95 50" strokeDasharray="2 2" />
        </svg>

        {/* Main Location & Notification Row */}
        <div className="relative z-10 flex items-center justify-between gap-3 py-1">
          {/* Left: Brand Logo in Green Circle */}
          <Link to="/food/user" className="shrink-0 flex items-center active:scale-95 transition-transform">
            <div className="w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-full overflow-hidden shadow-[0_2px_8px_rgba(16,185,129,0.25)] border border-emerald-500/20 shrink-0 bg-gradient-to-br from-[#00A86B] via-[#059669] to-[#047857] flex items-center justify-center p-0.5">
              <img
                src={brandLogo}
                alt="Tifora"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span className="hidden w-full h-full rounded-full bg-emerald-600 text-white font-black text-xl items-center justify-center">
                T
              </span>
            </div>
          </Link>

          {/* Center: Location Title & Subtitle */}
          <div
            className="flex flex-col min-w-0 flex-1 cursor-pointer group select-none"
            onClick={handleLocationClick}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[16px] sm:text-[17px] font-extrabold text-gray-900 dark:text-white truncate tracking-tight">
                {areaTitle}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-900 dark:text-white shrink-0 stroke-[2.8] group-hover:translate-y-0.5 transition-transform" />
            </div>

            <span className="text-[12px] sm:text-[12.5px] font-normal text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5 max-w-[210px] sm:max-w-xs md:max-w-md">
              {subtitleAddress}
            </span>
          </div>

          {/* Right: Notification Bell Button */}
          <div className="shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <div className="w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] relative flex items-center justify-center rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-200/80 dark:border-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.05)] cursor-pointer active:scale-90 transition-all hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <Bell className="h-5 w-5 text-gray-900 dark:text-gray-100 stroke-[2]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl mt-2" align="end">
                <div className="bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none text-[10px] h-4">
                          {unreadCount} New
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {mergedNotifications.length > 0 ? (
                      mergedNotifications.slice(0, 5).map((notif) => {
                        const Icon = ICON_MAP[notif.icon] || Bell;
                        return (
                          <div key={notif.id} className="p-4 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                            <div className="mt-1 p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{notif.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{notif.message}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <BellOff className="h-10 w-10 text-gray-300 dark:text-zinc-600" />
                        <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                    <Link to="/food/user/notifications" className="text-xs font-bold text-gray-500 hover:text-emerald-600">View All</Link>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Sticky Search Bar and VEG MODE Row (Mobile Only) */}
      <div
        id="home-header-search-row"
        className={`md:hidden sticky z-[60] px-0 pb-2 transition-all duration-300 ${
          isCategoryStuck
            ? 'top-0 pt-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-sm'
            : 'top-0 pt-1.5 bg-gradient-to-b from-white/90 to-transparent dark:from-[#0a0a0a]/90 dark:to-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 w-full">
          {/* Search Bar (Matching reference UI) */}
          <div
            className="relative flex-1 h-[52px] bg-white dark:bg-[#18181b] rounded-2xl flex items-center px-4 shadow-[0_3px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_14px_rgba(0,0,0,0.3)] border border-gray-200/90 dark:border-zinc-800/90 cursor-pointer active:scale-[0.99] transition-all duration-200"
            onClick={handleSearchFocus}
          >
            <Search className="h-5 w-5 text-gray-800 dark:text-gray-200 mr-3 shrink-0 stroke-[2.2]" />

            <div className="flex-1 overflow-hidden relative h-5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-0 text-[14.5px] font-normal text-gray-400 dark:text-zinc-500 truncate flex items-center"
                >
                  {placeholders?.[placeholderIndex] || 'Search "home style veg"'}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Mic with subtle divider */}
            <div className="flex items-center gap-2.5 pl-2 shrink-0">
              <div className="h-6 w-[1px] bg-gray-200 dark:bg-zinc-700" />
              <Mic
                className="h-5 w-5 text-gray-800 dark:text-gray-200 stroke-[2] hover:text-emerald-600 active:scale-90 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoiceSearchClick?.();
                }}
              />
            </div>
          </div>

          {/* VEG MODE Card (Matching exact reference leaf + text) */}
          <div
            className={`shrink-0 h-[52px] px-3.5 rounded-2xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all duration-200 shadow-[0_3px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_14px_rgba(0,0,0,0.3)] select-none border ${
              vegMode
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/70 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-[#18181b] border-gray-200/90 dark:border-zinc-800/90 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
            onClick={() => handleVegModeChange?.(!vegMode)}
          >
            <div className="shrink-0 flex items-center justify-center">
              <VegLeafIcon className={`w-6 h-6 transition-transform duration-300 ${vegMode ? 'scale-110 drop-shadow-[0_2px_6px_rgba(16,185,129,0.4)]' : 'opacity-90'}`} />
            </div>

            <div className="flex flex-col text-left justify-center">
              <span className={`text-[10.5px] font-black tracking-wider leading-none ${vegMode ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                VEG
              </span>
              <span className={`text-[9.5px] font-bold tracking-wider leading-none mt-0.5 ${vegMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                MODE
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
