import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Clock, 
  SlidersHorizontal, 
  Plus, 
  Loader2,
  MapPin
} from "lucide-react";
import OptimizedImage from "@food/components/OptimizedImage";

export default function HomeExploreTiffinPlans({
  categoryAnchorRef,
  isCategoryStuck = false,
  displayCategories = [],
  hasMoreCategories = false,
  realCategories = [],
  loadMoreCategories,
  isLoadingMoreCategories = false,
  setIsFilterOpen,
  activeFilters = new Set(),
  setActiveFilters,
  applyFiltersAndRefetch,
  sortBy,
  selectedCuisine
}) {
  // Real kitchen count formatter
  const getKitchenCount = (category) => {
    const count = Number(category?.kitchenCount ?? category?.restaurantCount ?? category?.count ?? 0);
    if (count > 0) {
      return `${count} ${count === 1 ? "Kitchen" : "Kitchens"}`;
    }
    if (category?.itemCount && Number(category.itemCount) > 0) {
      const items = Number(category.itemCount);
      return `${items} ${items === 1 ? "Dish" : "Dishes"}`;
    }
    return "Explore";
  };

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
    <div className="w-full space-y-3 pt-0.5">
      {/* Anchor Ref for Sticky Intersection Detection */}
      <div ref={categoryAnchorRef} className="h-0 w-full" />

      {/* 1. Explore Tiffin Plans Section */}
      <div
        id="categories-section"
        className={`w-full transition-all duration-300 ${
          isCategoryStuck
            ? "sticky top-[60px] z-[50] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] pb-2 pt-1.5 border-b border-white/50 dark:border-white/10 px-4"
            : "bg-transparent px-4"
        }`}
      >
        {/* Section Header with Green Vertical Accent */}
        <div className={`flex items-center justify-between mb-2.5 ${isCategoryStuck ? "hidden" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Compact Green Vertical Accent Pill */}
            <span className="w-1.5 h-4.5 bg-[#009b67] rounded-full inline-block shrink-0 shadow-[0_2px_4px_rgba(0,155,103,0.35)]" />
            <h2 className="text-[16px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight leading-tight line-clamp-1">
              Explore Tiffin Plans
            </h2>
          </div>

          {/* Right Action: View All with Chevron Circle */}
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

        {/* Categories Horizontal Card Carousel (Compact Size) */}
        <div className="flex overflow-x-auto gap-2.5 sm:gap-3 pb-1 -mx-4 px-4 scrollbar-hide items-stretch mask-edge-fade">
          {displayCategories.map((category, index) => (
            <Link
              key={category.id || index}
              to={`/food/user/category/${category.slug}`}
              className="flex-shrink-0 group"
            >
              <div className="w-[102px] sm:w-[114px] h-full bg-white dark:bg-[#18181b] rounded-[18px] sm:rounded-[20px] p-2 sm:p-2.5 flex flex-col items-center text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-zinc-800/80 hover:shadow-md transition-all duration-300 active:scale-95">
                {/* Circular Food Image Container */}
                <div className="relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden shadow-xs mx-auto mb-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800">
                  {/* Subtle Shimmer Glint */}
                  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                    <motion.div
                      animate={{ x: ["-200%", "200%"] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        repeatDelay: 3.5 + index * 0.4,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-20deg] w-[150%] h-full"
                    />
                  </div>

                  <OptimizedImage
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Category Title */}
                <h4 className="text-[12px] sm:text-[13px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 group-hover:text-[#009b67] transition-colors w-full px-0.5">
                  {category.name}
                </h4>

                {/* Subtitle / Kitchen Count */}
                <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 dark:text-gray-400 mt-0.5 line-clamp-1 w-full">
                  {getKitchenCount(category)}
                </p>
              </div>
            </Link>
          ))}

          {/* Load More Categories Card */}
          {hasMoreCategories && displayCategories === realCategories && (
            <button
              type="button"
              onClick={loadMoreCategories}
              disabled={isLoadingMoreCategories}
              className="flex-shrink-0 group cursor-pointer"
            >
              <div className="w-[102px] sm:w-[114px] h-full bg-white dark:bg-[#18181b] rounded-[18px] sm:rounded-[20px] p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-[#009b67] transition-all">
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 text-[#009b67] mb-1 group-hover:scale-110 transition-transform">
                  {isLoadingMoreCategories ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  )}
                </div>
                <span className="text-[11.5px] font-bold text-gray-800 dark:text-gray-200">
                  View More
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 2. Compact Filter Pills Row */}
      <div className="px-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 -mx-4 px-4">
          {/* Main "FILTERS" Capsule Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen && setIsFilterOpen(true)}
            className="h-[38px] px-3.5 rounded-full flex items-center gap-2 whitespace-nowrap flex-shrink-0 font-extrabold transition-all bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-zinc-800 shadow-xs hover:border-[#009b67]/40 active:scale-95 cursor-pointer text-gray-900 dark:text-white"
          >
            {/* Green Filters Icon */}
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
