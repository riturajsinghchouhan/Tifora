import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Clock, 
  SlidersHorizontal, 
  MapPin,
  Flame
} from "lucide-react";
import OptimizedImage from "@food/components/OptimizedImage";

// Curated Top-Down Indian Dish Plate Imagery matching user's exact visual reference
const DEFAULT_PLATE_CATEGORIES = [
  {
    id: "breads-sabzi",
    name: "Breads & Sabzi",
    slug: "breads-sabzi",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop&q=80",
    kitchenCount: 18,
  },
  {
    id: "dal-rice-more",
    name: "Dal, Rice & More",
    slug: "dal-rice-more",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=400&fit=crop&q=80",
    kitchenCount: 24,
  },
  {
    id: "main-course",
    name: "Main Course",
    slug: "main-course",
    image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=400&fit=crop&q=80",
    kitchenCount: 32,
  },
  {
    id: "tiffin-snacks",
    name: "Tiffin & Snacks",
    slug: "tiffin-snacks",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=400&fit=crop&q=80",
    kitchenCount: 15,
  },
  {
    id: "healthy-diet",
    name: "Healthy & Diet",
    slug: "healthy-diet",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&q=80",
    kitchenCount: 12,
  },
  {
    id: "south-indian",
    name: "South Indian",
    slug: "south-indian",
    image: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&h=400&fit=crop&q=80",
    kitchenCount: 14,
  },
  {
    id: "biryani-pulao",
    name: "Biryani & Pulao",
    slug: "biryani-pulao",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=400&fit=crop&q=80",
    kitchenCount: 20,
  },
  {
    id: "sweets-desserts",
    name: "Sweets & Desserts",
    slug: "sweets-desserts",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop&q=80",
    kitchenCount: 9,
  }
];

export default function HomeExploreTiffinPlans({
  categoryAnchorRef,
  isCategoryStuck = false,
  displayCategories = [],
  setIsFilterOpen,
  activeFilters = new Set(),
  setActiveFilters,
  applyFiltersAndRefetch,
  sortBy,
  selectedCuisine
}) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // Merge dynamic categories or use rich plate categories as fallback
  const categoriesList =
    Array.isArray(displayCategories) && displayCategories.length > 0
      ? displayCategories.map((cat, idx) => ({
          ...cat,
          image: cat.image || DEFAULT_PLATE_CATEGORIES[idx % DEFAULT_PLATE_CATEGORIES.length].image
        }))
      : DEFAULT_PLATE_CATEGORIES;

  const handleFilterToggle = (filterId) => {
    const nextFilters = new Set(activeFilters);
    if (nextFilters.has(filterId)) {
      nextFilters.delete(filterId);
    } else {
      nextFilters.add(filterId);
    }
    setActiveFilters(nextFilters);
    if (applyFiltersAndRefetch) {
      void applyFiltersAndRefetch(nextFilters, sortBy, selectedCuisine);
    }
  };

  return (
    <div className="w-full space-y-4 pt-1">
      {/* Anchor Ref for Scroll Intersection & Offset Tracking */}
      <div ref={categoryAnchorRef} className="h-0 w-full" />

      {/* 1. Persistent Sticky Category Bar (Sticks with Search Bar on Scroll - ONLY Categories) */}
      {isCategoryStuck && (
        <div
          id="sticky-categories-header"
          className="fixed top-[64px] md:top-[72px] left-0 right-0 z-[55] w-full bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] border-b border-gray-200/90 dark:border-zinc-800/90 transition-all duration-300"
        >
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8 lg:px-10 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide mask-edge-fade">
            {/* ONLY Sticky Category Chips */}
            {categoriesList.map((cat, idx) => (
              <Link
                key={`sticky-cat-${cat.id || idx}`}
                to={`/food/user/category/${cat.slug}`}
                className="h-[36px] pl-1.5 pr-3.5 rounded-full flex items-center gap-2 whitespace-nowrap flex-shrink-0 transition-all bg-white dark:bg-[#18181b] border border-gray-200/90 dark:border-zinc-800 shadow-2xs hover:border-[#009b67]/60 hover:bg-gray-50 dark:hover:bg-zinc-800/80 active:scale-95 group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-200/80 dark:border-zinc-700 bg-gray-50 shadow-2xs">
                  <OptimizedImage
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
                <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#009b67] dark:group-hover:text-emerald-400">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. In-Page Explore Categories Section (Reference UI: Top-Down Circular Food Plates) */}
      <div id="categories-section" className="w-full bg-transparent">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-4.5 bg-[#009b67] rounded-full inline-block shrink-0 shadow-[0_2px_4px_rgba(0,155,103,0.35)]" />
            <h2 className="text-[17px] sm:text-[19px] font-black text-gray-950 dark:text-white tracking-tight leading-none">
              Explore Tiffin Categories
            </h2>
          </div>

          {/* Right Action: View All */}
          <Link
            to="/food/user/categories"
            className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-[#009b67] dark:hover:text-white transition-colors group shrink-0"
          >
            <span className="text-[12px] font-bold">View All</span>
            <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-white dark:bg-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-zinc-700/80 flex items-center justify-center text-gray-700 dark:text-gray-200 group-hover:scale-105 group-hover:bg-gray-50 transition-all">
              <ChevronRight className="w-3 h-3 stroke-[2.5]" />
            </div>
          </Link>
        </div>

        {/* Categories Horizontal Plate Carousel (Compact Circular Plates) */}
        <div className="flex overflow-x-auto gap-3.5 sm:gap-5 md:gap-6 pb-2 scrollbar-hide items-start">
          {categoriesList.map((category, index) => {
            const isActive = index === activeCategoryIndex;
            return (
              <Link
                key={category.id || index}
                to={`/food/user/category/${category.slug}`}
                onClick={() => setActiveCategoryIndex(index)}
                className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
              >
                {/* Circular Food Plate Image with Soft Glow and Border Rim */}
                <div className="relative w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] md:w-[86px] md:h-[86px] rounded-full p-0.5 sm:p-1 bg-white dark:bg-[#18181b] shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-zinc-800 transition-all duration-300 group-hover:shadow-[0_8px_20px_rgba(0,155,103,0.18)] group-hover:-translate-y-0.5 group-active:scale-95">
                  {/* Top-Down Plate */}
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-700/60">
                    <OptimizedImage
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                  </div>
                </div>

                {/* Category Name Below Plate */}
                <h4 className="text-[11px] sm:text-[12px] font-bold text-[#1a233a] dark:text-gray-100 group-hover:text-[#009b67] transition-colors text-center mt-1.5 leading-snug line-clamp-2 max-w-[76px] sm:max-w-[88px]">
                  {category.name}
                </h4>

                {/* Active Indicator Dot */}
                {isActive && (
                  <motion.div
                    layoutId="category-active-dot"
                    className="w-1.5 h-1.5 rounded-full bg-[#009b67] shadow-[0_0_6px_rgba(0,155,103,0.6)] mt-1"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. In-Page Filter Pills Row */}
      <div className="w-full pt-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">
          {/* Main "FILTERS" Capsule Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen && setIsFilterOpen(true)}
            className="h-[38px] px-3.5 rounded-full flex items-center gap-2 whitespace-nowrap flex-shrink-0 font-extrabold transition-all bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 shadow-xs hover:border-[#009b67]/40 active:scale-95 cursor-pointer text-gray-900 dark:text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#009b67] stroke-[2.8]" />
            <span className="text-[11.5px] font-extrabold uppercase tracking-wider">
              FILTERS
            </span>
          </button>

          {/* Under 30 mins Pill */}
          <button
            type="button"
            onClick={() => handleFilterToggle("delivery-under-30")}
            className={`h-[38px] px-3.5 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-all font-semibold text-[12px] shadow-xs active:scale-95 cursor-pointer ${
              activeFilters.has("delivery-under-30")
                ? "bg-[#009b67] text-white border border-[#009b67]"
                : "bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 hover:border-[#009b67]/40 text-gray-800 dark:text-gray-200"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 stroke-[2.2] ${activeFilters.has("delivery-under-30") ? "text-white" : "text-gray-600 dark:text-gray-300"}`} />
            <span>Under 30 mins</span>
          </button>

          {/* Under 45 mins Pill */}
          <button
            type="button"
            onClick={() => handleFilterToggle("delivery-under-45")}
            className={`h-[38px] px-3.5 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-all font-semibold text-[12px] shadow-xs active:scale-95 cursor-pointer ${
              activeFilters.has("delivery-under-45")
                ? "bg-[#009b67] text-white border border-[#009b67]"
                : "bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 hover:border-[#009b67]/40 text-gray-800 dark:text-gray-200"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 stroke-[2.2] ${activeFilters.has("delivery-under-45") ? "text-white" : "text-gray-600 dark:text-gray-300"}`} />
            <span>Under 45 mins</span>
          </button>

          {/* Under 1km Pill */}
          <button
            type="button"
            onClick={() => handleFilterToggle("distance-under-1km")}
            className={`h-[38px] px-3.5 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-all font-semibold text-[12px] shadow-xs active:scale-95 cursor-pointer ${
              activeFilters.has("distance-under-1km")
                ? "bg-[#009b67] text-white border border-[#009b67]"
                : "bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 hover:border-[#009b67]/40 text-gray-800 dark:text-gray-200"
            }`}
          >
            <MapPin className={`h-3.5 w-3.5 stroke-[2.2] ${activeFilters.has("distance-under-1km") ? "text-white" : "text-gray-600 dark:text-gray-300"}`} />
            <span>Under 1km</span>
          </button>

          {/* Right Circular Filter Setting Icon */}
          <button
            type="button"
            onClick={() => setIsFilterOpen && setIsFilterOpen(true)}
            className="h-[38px] w-[38px] min-w-[38px] rounded-full flex items-center justify-center whitespace-nowrap flex-shrink-0 transition-all bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 shadow-xs hover:border-[#009b67]/40 active:scale-95 cursor-pointer text-gray-800 dark:text-gray-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 stroke-[2.4]" />
          </button>
        </div>
      </div>
    </div>
  );
}
