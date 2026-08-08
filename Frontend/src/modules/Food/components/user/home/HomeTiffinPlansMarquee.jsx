import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Flame,
  Star,
  Heart,
  ArrowRight,
  Bike,
  MapPin,
} from "lucide-react";
import api from "@food/api";

const THEME_ACCENTS = [
  // 1. Saffron & Sunset Gold
  {
    tag: "🔥 Bestseller",
    tagBg: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    accent: "text-amber-600 dark:text-amber-400",
    btnHover: "hover:bg-amber-600 hover:text-white",
  },
  // 2. Royal Ruby Crimson
  {
    tag: "👑 Chef Special",
    tagBg: "bg-gradient-to-r from-rose-600 to-red-600 text-white",
    accent: "text-rose-600 dark:text-rose-400",
    btnHover: "hover:bg-rose-600 hover:text-white",
  },
  // 3. Fresh Emerald Herb
  {
    tag: "🌱 100% Desi Ghee",
    tagBg: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white",
    accent: "text-emerald-600 dark:text-emerald-400",
    btnHover: "hover:bg-emerald-600 hover:text-white",
  },
  // 4. Vibrant Sunset Orange
  {
    tag: "⚡ Top Rated",
    tagBg: "bg-gradient-to-r from-orange-500 to-amber-600 text-white",
    accent: "text-orange-600 dark:text-orange-400",
    btnHover: "hover:bg-orange-600 hover:text-white",
  },
  // 5. Royal Indigo Deluxe
  {
    tag: "💎 Premium Feast",
    tagBg: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white",
    accent: "text-indigo-600 dark:text-indigo-400",
    btnHover: "hover:bg-indigo-600 hover:text-white",
  },
  // 6. Healthy Mint Clean
  {
    tag: "🥗 High Protein",
    tagBg: "bg-gradient-to-r from-teal-500 to-emerald-600 text-white",
    accent: "text-teal-600 dark:text-teal-400",
    btnHover: "hover:bg-teal-600 hover:text-white",
  },
];

const DEFAULT_FALLBACK_PLANS = [
  {
    _id: "plan-mock-1",
    name: "Deluxe Homestyle Thali",
    kitchenName: "Maa Ki Rasoi",
    cuisine: "North Indian • Homestyle",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=120&auto=format&fit=crop&q=80",
    rating: 4.8,
    durationDays: 30,
    mealType: "Morning",
    deliveryTime: "Lunch (12:30 PM)",
    distance: "1.2 km",
    price: 2999,
    itemsDescription: "4 Butter Rotis • Dal Tadka • Paneer Sabzi • Rice",
    isVegetarian: true,
  },
  {
    _id: "plan-mock-2",
    name: "Royal Punjabi 2-Meal Plan",
    kitchenName: "Amritsari Tiffin",
    cuisine: "Punjabi • Deluxe",
    image:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&auto=format&fit=crop&q=80",
    rating: 4.9,
    durationDays: 30,
    mealType: "Both",
    deliveryTime: "Lunch + Dinner",
    distance: "2.1 km",
    price: 4999,
    itemsDescription: "Paneer Sabzi • Dal Makhani • 4 Rotis • Jeera Rice",
    isVegetarian: true,
  },
  {
    _id: "plan-mock-3",
    name: "Student 15-Day Saver Box",
    kitchenName: "Shree Ganesh Kitchen",
    cuisine: "Home Cooked • Pocket Friendly",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    rating: 4.6,
    durationDays: 15,
    mealType: "Morning",
    deliveryTime: "Lunch (1:00 PM)",
    distance: "0.8 km",
    price: 1599,
    itemsDescription: "4 Soft Rotis • Desi Dal • Dry Sabzi • Steamed Rice",
    isVegetarian: true,
  },
  {
    _id: "plan-mock-4",
    name: "Healthy Fit Diet Tiffin",
    kitchenName: "NutriMeal Cloud",
    cuisine: "High Protein • Low Oil",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=120&auto=format&fit=crop&q=80",
    rating: 4.7,
    durationDays: 30,
    mealType: "Morning",
    deliveryTime: "Diet Lunch Box",
    distance: "1.5 km",
    price: 3699,
    itemsDescription: "3 Multigrain Rotis • Sprouts Salad • Protein Dal",
    isVegetarian: true,
  },
  {
    _id: "plan-mock-5",
    name: "Maharaja Royal Thali Feast",
    kitchenName: "Annapurna Rasoi",
    cuisine: "Traditional • Pure Veg",
    image:
      "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    rating: 4.9,
    durationDays: 7,
    mealType: "Both",
    deliveryTime: "Lunch + Dinner",
    distance: "1.9 km",
    price: 1399,
    itemsDescription: "4 Rotis • Dal • Seasonal Sabzi • Gulab Jamun",
    isVegetarian: true,
  },
  {
    _id: "plan-mock-6",
    name: "Coastal South Special Meal",
    kitchenName: "Dakshin Tiffin House",
    cuisine: "South Indian • Traditional",
    image:
      "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=700&auto=format&fit=crop&q=80",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    rating: 4.8,
    durationDays: 30,
    mealType: "Both",
    deliveryTime: "Lunch + Dinner",
    distance: "2.3 km",
    price: 3899,
    itemsDescription: "Steamed Rice • Sambar • Rasam • Poriyal • Curd",
    isVegetarian: true,
  },
];

export default function HomeTiffinPlansMarquee() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchTiffinPlans = async () => {
      try {
        const res = await api
          .get("/food/tiffin/user/plans/available")
          .catch(() => null);

        if (isMounted) {
          const livePlans =
            res?.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0
              ? res.data.data.filter((p) => p.isActive !== false)
              : [];

          if (livePlans.length > 0) {
            setPlans(livePlans);
          } else {
            setPlans(DEFAULT_FALLBACK_PLANS);
          }
        }
      } catch (err) {
        if (isMounted) {
          setPlans(DEFAULT_FALLBACK_PLANS);
        }
      }
    };

    fetchTiffinPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleFavorite = (e, planId) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [planId]: !prev[planId] }));
  };

  const handlePlanClick = (plan) => {
    if (plan?._id && !String(plan._id).startsWith("plan-mock")) {
      navigate(`/food/user/tiffin/plan/${plan._id}`, { state: { plan } });
    } else {
      navigate("/food/user/tiffin");
    }
  };

  const displayPlans = plans.length > 0 ? plans : DEFAULT_FALLBACK_PLANS;

  return (
    <div id="restaurant-tiffin-plans-section" className="w-full mt-4 mb-3">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] sm:text-[19px] font-black text-gray-950 dark:text-white tracking-tight leading-none">
              Recommended Tiffin Plans
            </h2>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500 text-white rounded-full tracking-wider shadow-xs">
              <Flame className="w-2.5 h-2.5 fill-current" /> Live
            </span>
          </div>
          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Curated daily meal subscriptions by verified kitchens
          </p>
        </div>

        <Link
          to="/food/user/tiffin"
          className="flex items-center gap-1 text-[12px] font-bold text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/80 shadow-2xs hover:shadow-xs transition-all group shrink-0"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Manual Swipe/Scroll Horizontal Carousel (Static, No Auto-Sliding) */}
      <div className="relative w-full">
        <div className="flex overflow-x-auto scrollbar-hide gap-3.5 sm:gap-4 pb-2 pt-0.5 items-stretch snap-x snap-mandatory px-0">
          {displayPlans.map((plan, index) => {
            const planKey = `${plan._id || index}`;
            const isFav = !!favorites[plan._id];
            const theme = THEME_ACCENTS[index % THEME_ACCENTS.length];
            const dailyPrice = Math.round((plan.price || 0) / (plan.durationDays || 30));
            const restaurantName =
              plan.kitchenName ||
              plan.restaurantId?.restaurantName ||
              plan.restaurantId?.name ||
              "Verified Homestyle Kitchen";

            const planImage =
              plan.image ||
              plan.coverImage ||
              plan.restaurantId?.coverImage ||
              DEFAULT_FALLBACK_PLANS[index % DEFAULT_FALLBACK_PLANS.length].image;

            const avatarImage =
              plan.avatar ||
              plan.restaurantId?.logo?.url ||
              plan.restaurantId?.logo ||
              DEFAULT_FALLBACK_PLANS[index % DEFAULT_FALLBACK_PLANS.length].avatar;

            const rating = plan.rating || (4.6 + ((index * 7) % 4) * 0.1).toFixed(1);
            const cuisine = plan.cuisine || "Homestyle • Nutritious";
            const distance = plan.distance || `${(0.9 + (index % 5) * 0.4).toFixed(1)} km`;

            const mealLabel =
              plan.mealType === "Morning"
                ? "Lunch"
                : plan.mealType === "Evening"
                ? "Dinner"
                : "Lunch + Dinner";

            return (
              <div
                key={planKey}
                onClick={() => handlePlanClick(plan)}
                className="w-[220px] sm:w-[235px] md:w-[245px] shrink-0 snap-start bg-white dark:bg-[#18181b] rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_3px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)] hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Top Food Image Container */}
                <div className="relative w-full aspect-[16/11] overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <img
                    src={planImage}
                    alt={plan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&auto=format&fit=crop&q=80";
                    }}
                  />

                  {/* Top-Left Promotional Theme Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${theme.tagBg} shadow-sm tracking-wide`}
                    >
                      {theme.tag}
                    </span>
                  </div>

                  {/* Top-Right Frosted Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, plan._id)}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-10"
                    aria-label="Favorite"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors ${
                        isFav ? "fill-rose-500 text-rose-500" : "text-white"
                      }`}
                    />
                  </button>

                  {/* Overlapping Circular Kitchen Avatar */}
                  <div className="absolute -bottom-3 left-3 w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 overflow-hidden shadow-md bg-white z-10">
                    <img
                      src={avatarImage}
                      alt={restaurantName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=120&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>

                  {/* Bottom-Right Duration Pill */}
                  <div className="absolute bottom-1.5 right-2 z-10">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-black bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs">
                      <Calendar className="w-2.5 h-2.5 text-amber-300" />
                      {plan.durationDays || 30} Days
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-3 pt-4 flex flex-col flex-1 justify-between gap-2">
                  {/* Row 1: Plan Title + Rating */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <h3 className="text-[13.5px] font-black text-gray-900 dark:text-white truncate leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {plan.name}
                      </h3>
                      <div className="shrink-0 flex items-center gap-0.5 bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{rating}</span>
                      </div>
                    </div>

                    {/* Row 2: Kitchen Name & Cuisine */}
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                      {restaurantName} • {cuisine}
                    </p>
                  </div>

                  {/* Row 3: Timing & Distance Row */}
                  <div className="flex items-center gap-2 text-[10.5px] text-gray-600 dark:text-gray-300 font-medium">
                    <div className="flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{mealLabel}</span>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>{distance}</span>
                    </div>
                  </div>

                  {/* Row 4: Free Tag & Price */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-800">
                    <div className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                      <Bike className="w-3 h-3" />
                      <span>Free Delivery</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-[13.5px] font-black text-gray-900 dark:text-white">
                        ₹{plan.price}
                      </span>
                      <span className={`text-[9.5px] font-bold ${theme.accent}`}>
                        (₹{dailyPrice}/d)
                      </span>
                    </div>
                  </div>

                  {/* Row 5: Full-Width Clean CTA Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanClick(plan);
                    }}
                    className={`w-full py-1.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-950 text-[11.5px] font-extrabold ${theme.btnHover} dark:hover:bg-amber-500 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-98 cursor-pointer mt-0.5`}
                  >
                    <span>View Plan</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
