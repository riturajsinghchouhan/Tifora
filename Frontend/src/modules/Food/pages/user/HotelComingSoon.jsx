import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { 
  Building2, 
  ArrowLeft, 
  Sparkles, 
  BedDouble, 
  ShieldCheck, 
  Percent, 
  Clock, 
  BellRing, 
  UtensilsCrossed, 
  Star,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function HotelComingSoon() {
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotifySubmit = (e) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      toast.error("Please enter your email or phone number");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      toast.success("You're on the VIP waitlist! We'll notify you as soon as Hotel Booking goes live. 🎉");
    }, 600);
  };

  const features = [
    {
      icon: BedDouble,
      color: "from-blue-500 to-indigo-600",
      title: "Handpicked Luxury & Boutique Stays",
      desc: "Top-tier verified hotels and resorts with superior hygiene and comfort.",
    },
    {
      icon: Percent,
      color: "from-emerald-500 to-teal-600",
      title: "Exclusive Member Discounts",
      desc: "Guaranteed lowest prices with zero hidden convenience fees.",
    },
    {
      icon: ShieldCheck,
      color: "from-amber-500 to-orange-600",
      title: "100% Instant Confirmation",
      desc: "Hassle-free booking confirmation with flexible cancellation options.",
    },
    {
      icon: Clock,
      color: "from-purple-500 to-pink-600",
      title: "24/7 Concierge Support",
      desc: "Dedicated travel assistance from check-in to check-out.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#111] dark:to-[#0a0a0a] text-gray-900 dark:text-white pb-16">
      {/* Top Floating Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors p-1.5 -ml-1 rounded-xl active:scale-95"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 sm:pt-10">
        {/* Hero Card with Visuals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 mb-8"
        >
          {/* Decorative Ambient Glows */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Top Icon Badge */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-inner mb-5 text-blue-400"
            >
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300 animate-pulse" />
            </motion.div>

            {/* Launching Soon Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Stay Tuned • Launching Soon</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Hotel & Stay Bookings <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-200 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                Are On The Way!
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-blue-100/80 max-w-lg leading-relaxed mb-6 font-normal">
              We are curating handpicked luxury hotels, boutique stays, and cozy resorts with exclusive member-only discounts and instant confirmed bookings.
            </p>

            {/* Ratings / Trust Bar */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs text-blue-100 font-medium mb-6">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-bold text-white">500+</span> Stays
              </div>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <div>Instant Confirmations</div>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <div>Best Price Guarantee</div>
            </div>

            {/* Waitlist / Notify Box */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-lg">
              {isSubmitted ? (
                <div className="flex items-center justify-center gap-2 py-3 text-emerald-300 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>You're on the early access VIP list!</span>
                </div>
              ) : (
                <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter email or phone number"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="flex-1 bg-white/15 text-white placeholder-blue-200/60 px-4 py-2.5 rounded-xl text-sm outline-none border border-white/15 focus:border-blue-300 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>{loading ? "Adding..." : "Notify Me"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span>What to expect from Tifora Stays</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-start gap-3.5"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA to explore other services */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 p-6 rounded-3xl border border-emerald-200/50 dark:border-emerald-800/40 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Looking for delicious everyday meals?
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
            Try our wholesome, homemade Tiffin Subscription plans with customizable menus and instant doorstep delivery.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/food/user/tiffin"
              className="bg-[#009b67] hover:bg-[#00875a] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Explore Tiffin Plans</span>
            </Link>
            <Link
              to="/food/user"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
