import { Link } from "react-router-dom";
import { memo, useMemo, useState, useEffect } from "react";
import {
  BadgePercent,
  Bookmark,
  Clock,
  Star,
  Timer,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@food/components/ui/card";
import { Button } from "@food/components/ui/button";
import RestaurantImageCarousel from "@food/components/user/home/RestaurantImageCarousel";
import { useDeferredOutletTimings } from "@food/hooks/user/useDeferredOutletTimings";
import { getRestaurantAvailabilityStatus } from "@food/utils/restaurantAvailability";

function resolveRestaurantSlug(restaurant, index) {
  const nameStr = typeof restaurant?.name === "string" ? restaurant.name.trim() : "";
  const fallbackSlugSource =
    nameStr ||
    (typeof restaurant?.restaurantName === "string"
      ? restaurant.restaurantName.trim()
      : "") ||
    String(
      restaurant?.slug ||
        restaurant?.id ||
        restaurant?._id ||
        `restaurant-${index}`,
    );

  return typeof restaurant?.slug === "string" && restaurant.slug.trim()
    ? restaurant.slug.trim()
    : fallbackSlugSource.toLowerCase().replace(/\s+/g, "-");
}

function HomeRestaurantCard({
  restaurant,
  index = 0,
  backendOrigin = "",
  isOutOfService = false,
  isFavorite,
  onToggleFavorite,
  animateEntrance = false,
}) {
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0);

  const plansData = useMemo(() => {
    if (restaurant?.plans?.length > 0) {
      return restaurant.plans.map(p => ({
        menu: `${p.name}: ${p.itemsDescription || "Contact for items"}`,
        price: p.price || "--"
      }));
    }
    return [
      { menu: "No active plans available", price: "--" }
    ];
  }, [restaurant?.plans, restaurant?.monthlyPrice]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMenuIndex((prev) => (prev + 1) % plansData.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [plansData.length]);

  const { ref, outletTimings } = useDeferredOutletTimings(
    restaurant?.mongoId,
    restaurant?.outletTimings ?? null,
  );

  const restaurantForAvailability = useMemo(
    () => ({ ...restaurant, outletTimings: outletTimings ?? restaurant?.outletTimings }),
    [restaurant, outletTimings],
  );

  const availability = getRestaurantAvailabilityStatus(
    restaurantForAvailability,
    new Date(),
    { ignoreOperationalStatus: true },
  );

  const restaurantSlug = resolveRestaurantSlug(restaurant, index);
  const favorite = isFavorite(restaurantSlug);
  const priority = index < 3;

  return (
    <div
      ref={ref}
      className="h-full transform transition-all duration-300 hover:-translate-y-3 hover:scale-[1.02]"
      style={{
        perspective: 1000,
        animation: animateEntrance
          ? `fade-in-up 0.5s ease-out ${Math.min(index, 9) * 0.05}s backwards`
          : "none",
      }}
    >
      <div className="h-full group">
        <Link to={`/user/restaurants/${restaurantSlug}`} className="h-full flex">
          <Card
            className={`overflow-hidden gap-0 cursor-pointer border-0 dark:border-gray-800 group bg-white dark:bg-[#1a1a1a] border-background transition-all duration-500 py-0 rounded-[28px] flex flex-col h-full w-full relative shadow-sm hover:shadow-xl ${
              isOutOfService || !availability.isOpen
                ? "grayscale opacity-75"
                : ""
            }`}
          >
            <div className="relative">
              <RestaurantImageCarousel
                restaurant={restaurant}
                priority={priority}
                backendOrigin={backendOrigin}
              />

              {/* Removed Pure Veg Badge from Image */}

              <div className="absolute top-4 right-4 z-10 transform transition-transform duration-300 group-hover:scale-110">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => onToggleFavorite(event, restaurant, restaurantSlug, favorite)}
                  aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                  className={`h-11 w-11 rounded-[20px] shadow-xl flex items-center justify-center transition-all duration-300 ${
                    favorite
                      ? "bg-red-500 text-white"
                      : "bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white"
                  }`}
                >
                  <Bookmark
                    className={`h-5 w-5 transition-all duration-300 ${
                      favorite ? "fill-white" : ""
                    }`}
                  />
                </Button>
              </div>

              {/* Chef Avatar Overlapping Image Bottom */}
              <div className="absolute -bottom-6 right-4 z-20">
                <div className="h-16 w-16 rounded-full border-[3px] border-white bg-gray-200 overflow-hidden shadow-xl">
                  <img 
                    src={restaurant.chefAvatar || "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop"} 
                    alt="Chef"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
              <CardContent className="px-2.5 pb-3 sm:px-3 sm:pb-4 lg:px-4 lg:pb-5 pt-8 sm:pt-8 lg:pt-8 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-xl lg:text-2xl font-extrabold text-gray-950 dark:text-white line-clamp-1 leading-tight tracking-tight transition-all duration-300 group-hover:scale-[1.02]"
                      style={{
                        fontFamily: "'Outfit', 'Poppins', sans-serif"
                      }}
                    >
                      {restaurant.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 mt-1">
                       <MapPin className="h-3.5 w-3.5 shrink-0" />
                       <span className="truncate max-w-[120px]">{typeof restaurant.address === 'object' ? restaurant.address?.locality || restaurant.address?.city : restaurant.address || restaurant.locationName || "Nearby"}</span>
                       <span className="mx-0.5">•</span>
                       <span className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{restaurant.distance || restaurant.distanceText || ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Veg/Non-Veg Icon */}
                    <div className={`h-4 w-4 border-[1.5px] rounded-[3px] flex items-center justify-center shrink-0 shadow-sm ${restaurant.isVeg !== false ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`h-2 w-2 rounded-full ${restaurant.isVeg !== false ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                    <div className="flex-shrink-0 bg-green-600 text-white px-2 py-1 rounded-xl flex items-center gap-1 shadow-sm transform transition-transform duration-300 group-hover:scale-105">
                      <span className="text-xs font-bold tracking-tight">
                        {Number(restaurant.rating) > 0
                          ? Number(restaurant.rating).toFixed(1)
                          : "NEW"}
                      </span>
                      {Number(restaurant.rating) > 0 && (
                        <Star
                          className="h-3 w-3 fill-white text-white"
                          strokeWidth={0}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                   <span className="inline-flex rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                     Lunch & Dinner
                   </span>
                   {availability.isOpen ? (
                     <span className="inline-flex rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 text-[10px] font-bold">
                       Accepting Orders
                     </span>
                   ) : (
                     <span className="inline-flex rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 text-[10px] font-bold">
                       Currently Closed
                     </span>
                   )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Starting at</p>
                    <div className="overflow-hidden relative h-[28px] w-[120px]">
                       <div 
                          className="absolute w-full transition-transform duration-500 ease-in-out" 
                          style={{ transform: `translateY(-${currentMenuIndex * 28}px)` }}
                       >
                          {plansData.map((plan, idx) => (
                             <p key={idx} className="h-[28px] text-base lg:text-lg font-black text-gray-900 dark:text-white flex items-center">
                               ₹{plan.price}<span className="text-xs font-medium text-gray-500 ml-1">/mo</span>
                             </p>
                          ))}
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{restaurant.deliveryTime || "Daily"}</span>
                    </div>
                  </div>
                </div>

                <div className="-mt-1 overflow-hidden relative h-[34px]">
                   <div 
                      className="absolute w-full transition-transform duration-500 ease-in-out" 
                      style={{ transform: `translateY(-${currentMenuIndex * 34}px)` }}
                   >
                     {plansData.map((plan, idx) => (
                       <p key={idx} className="h-[34px] text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1 flex items-center">
                         <span className="font-semibold text-gray-800 dark:text-gray-300 mr-1 shrink-0">Menu:</span> 
                         <span className="truncate">{plan.menu}</span>
                       </p>
                     ))}
                   </div>
                </div>
              </CardContent>
            </div>

            <div className="absolute inset-0 rounded-md pointer-events-none z-0 transition-all duration-300 border border-transparent group-hover:border-primary/30 group-hover:shadow-[inset_0_0_0_1px_rgba(235,89,14,0.2)]" />
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default memo(HomeRestaurantCard);
