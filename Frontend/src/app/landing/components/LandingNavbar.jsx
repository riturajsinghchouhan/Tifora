import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Sun,
  ArrowRight,
  Menu,
  X,
  Home,
  UtensilsCrossed,
  ShieldCheck,
  HelpCircle,
  Flame,
  Star,
  Phone,
  ChevronRight,
  Download,
  Sparkles,
} from "lucide-react";

export default function LandingNavbar({
  activeSection,
  navLinks,
  scrollToSection,
  isDarkMode,
  setIsDarkMode,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Icon mapping for navigation links
  const getNavIcon = (id) => {
    switch (id) {
      case "hero":
        return Home;
      case "core-services":
        return UtensilsCrossed;
      case "why-tifora":
        return ShieldCheck;
      case "how-it-works":
        return HelpCircle;
      case "popular-picks":
        return Flame;
      case "testimonials":
        return Star;
      case "footer-section":
        return Phone;
      default:
        return Sparkles;
    }
  };

  const handleNavClick = (id) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      scrollToSection(id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#061211]/90 border-b border-white/10 text-white"
            : "bg-white/90 border-b border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#00D09C] to-[#059669] flex items-center justify-center shadow-lg shadow-[#00D09C]/20 group-hover:scale-105 transition-transform">
              <span className="text-[#061211] font-black text-lg sm:text-2xl tracking-tighter">T</span>
            </div>
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Tifora
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`relative py-1 text-sm font-semibold transition-colors ${
                    isActive
                      ? isDarkMode
                        ? "text-[#00D09C]"
                        : "text-emerald-600"
                      : isDarkMode
                      ? "text-gray-300 hover:text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className={`absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full ${
                        isDarkMode
                          ? "bg-[#00D09C] shadow-[0_0_8px_rgba(0,208,156,0.8)]"
                          : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
                isDarkMode
                  ? "bg-white/10 hover:bg-white/15 border-white/10 text-gray-300 hover:text-white"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-black"
              }`}
              title="Toggle theme mode"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={() => scrollToSection("download-app")}
              className="px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#00D09C] hover:bg-[#00b587] text-[#061211] flex items-center gap-1.5 shadow-lg shadow-[#00D09C]/25 transition hover:scale-105 active:scale-95"
            >
              <span>Get the App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Right Controls: Theme + Hamburger Menu */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                isDarkMode
                  ? "bg-white/10 hover:bg-white/15 border-white/10 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700"
              }`}
              title="Toggle theme mode"
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-xl active:scale-95 transition ${
                isDarkMode
                  ? "bg-white/10 hover:bg-white/15 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              }`}
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* PROPER MOBILE SIDEBAR DRAWER & BACKDROP OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Slide-over Sidebar Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className={`absolute top-0 right-0 bottom-0 w-[84%] max-w-[320px] shadow-2xl flex flex-col justify-between p-5 overflow-y-auto transition-colors duration-300 ${
                isDarkMode
                  ? "bg-gradient-to-b from-[#071C19] via-[#061614] to-[#040E0D] border-l border-white/15 text-white"
                  : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FCFA] to-[#EFF8F5] border-l border-emerald-900/10 text-[#08221E]"
              }`}
            >
              {/* Drawer Top Header */}
              <div className="space-y-6">
                <div
                  className={`flex items-center justify-between pb-4 border-b ${
                    isDarkMode ? "border-white/10" : "border-emerald-900/10"
                  }`}
                >
                  {/* Brand */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D09C] to-[#059669] flex items-center justify-center shadow-md">
                      <span className="text-[#061211] font-black text-lg">T</span>
                    </div>
                    <span
                      className={`text-lg font-black tracking-tight ${
                        isDarkMode ? "text-white" : "text-[#08221E]"
                      }`}
                    >
                      Tifora
                    </span>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
                      isDarkMode
                        ? "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black"
                    }`}
                    aria-label="Close sidebar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Links with Icons */}
                <div className="space-y-1">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest px-3 pb-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Navigation
                  </p>
                  {navLinks.map((link) => {
                    const isActive = activeSection === link.id;
                    const Icon = getNavIcon(link.id);
                    return (
                      <button
                        key={link.id}
                        onClick={() => handleNavClick(link.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? isDarkMode
                              ? "bg-[#00D09C]/15 text-[#00D09C] border border-[#00D09C]/30 shadow-sm"
                              : "bg-[#00D09C]/15 text-[#008765] border border-[#00D09C]/30 shadow-sm"
                            : isDarkMode
                            ? "text-gray-300 hover:text-white hover:bg-white/5"
                            : "text-gray-600 hover:text-gray-950 hover:bg-emerald-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 ${
                              isActive
                                ? isDarkMode
                                  ? "text-[#00D09C]"
                                  : "text-[#008765]"
                                : isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          />
                          <span>{link.label}</span>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isActive
                              ? isDarkMode
                                ? "text-[#00D09C]"
                                : "text-[#008765]"
                              : isDarkMode
                              ? "text-gray-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Bottom Actions & App Download Card */}
              <div
                className={`pt-6 space-y-3 border-t ${
                  isDarkMode ? "border-white/10" : "border-emerald-900/10"
                }`}
              >
                {/* Download CTA Card */}
                <div
                  className={`p-3 rounded-2xl backdrop-blur-md space-y-2 ${
                    isDarkMode
                      ? "bg-white/5 border border-white/10"
                      : "bg-white border border-emerald-900/10 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Download
                      className={`w-4 h-4 ${isDarkMode ? "text-[#00D09C]" : "text-[#008765]"}`}
                    />
                    <p
                      className={`text-xs font-bold ${
                        isDarkMode ? "text-white" : "text-[#08221E]"
                      }`}
                    >
                      Tifora Mobile App
                    </p>
                  </div>
                  <p className={`text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Order tiffins & book hotels in seconds with exclusive discounts.
                  </p>
                  <button
                    onClick={() => {
                      scrollToSection("download-app");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#00D09C] hover:bg-[#00b587] text-[#061211] flex items-center justify-center gap-1.5 shadow-md shadow-[#00D09C]/20 active:scale-95 transition"
                  >
                    <span>Get the App</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Footer Tag */}
                <div
                  className={`flex items-center justify-between text-[10px] px-1 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  <span>© 2026 Tifora App</span>
                  <span className="text-[#00A87E] dark:text-[#00D09C] font-semibold">v2.0</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
