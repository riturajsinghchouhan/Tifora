import React from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, ChevronRight, Sun, Calendar, Leaf, Sprout } from "lucide-react"

const TIFFIN_IMAGES = [
  "/food/tiffin/tiffin_hero_banner.png",
  "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&h=600&fit=crop&q=80",
]

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=800&h=600&fit=crop&q=80"

const CARD_THEMES = [
  {
    border: "#144434",
    overlay: "linear-gradient(90deg, rgba(6,32,22,0.97) 0%, rgba(6,32,22,0.84) 52%, rgba(6,32,22,0.26) 100%)",
    tint: "linear-gradient(180deg, rgba(28,115,83,0.24) 0%, rgba(6,32,22,0) 100%)",
    badgeBg: "#0e4930",
    badgeBorder: "rgba(33,190,108,0.55)",
    price: "#d6af4b",
    descriptionBg: "rgba(0,0,0,0.42)",
    descriptionBorder: "rgba(255,255,255,0.1)",
    actionBg: "rgba(6,32,22,0.72)",
    actionBorder: "rgba(214,175,75,0.82)",
    actionText: "#e5bf58",
    pillBg: "rgba(11,51,35,0.92)",
  },
  {
    border: "#3f2a87",
    overlay: "linear-gradient(90deg, rgba(20,15,45,0.96) 0%, rgba(20,15,45,0.84) 54%, rgba(20,15,45,0.24) 100%)",
    tint: "linear-gradient(180deg, rgba(124,92,255,0.2) 0%, rgba(20,15,45,0) 100%)",
    badgeBg: "#2b1f5f",
    badgeBorder: "rgba(168,140,255,0.55)",
    price: "#cdb7ff",
    descriptionBg: "rgba(10,8,28,0.45)",
    descriptionBorder: "rgba(255,255,255,0.12)",
    actionBg: "rgba(20,15,45,0.72)",
    actionBorder: "rgba(205,183,255,0.8)",
    actionText: "#e8dcff",
    pillBg: "rgba(29,19,75,0.92)",
  },
  {
    border: "#8b4d1c",
    overlay: "linear-gradient(90deg, rgba(56,24,14,0.96) 0%, rgba(56,24,14,0.82) 52%, rgba(56,24,14,0.22) 100%)",
    tint: "linear-gradient(180deg, rgba(255,170,72,0.22) 0%, rgba(56,24,14,0) 100%)",
    badgeBg: "#5c2f10",
    badgeBorder: "rgba(255,181,106,0.55)",
    price: "#ffd08a",
    descriptionBg: "rgba(28,11,6,0.45)",
    descriptionBorder: "rgba(255,255,255,0.12)",
    actionBg: "rgba(56,24,14,0.72)",
    actionBorder: "rgba(255,208,138,0.82)",
    actionText: "#ffe2b8",
    pillBg: "rgba(89,43,20,0.92)",
  },
  {
    border: "#155b74",
    overlay: "linear-gradient(90deg, rgba(8,33,48,0.96) 0%, rgba(8,33,48,0.82) 52%, rgba(8,33,48,0.22) 100%)",
    tint: "linear-gradient(180deg, rgba(79,195,247,0.2) 0%, rgba(8,33,48,0) 100%)",
    badgeBg: "#0d4055",
    badgeBorder: "rgba(121,224,255,0.52)",
    price: "#9fe9ff",
    descriptionBg: "rgba(3,18,29,0.45)",
    descriptionBorder: "rgba(255,255,255,0.12)",
    actionBg: "rgba(8,33,48,0.72)",
    actionBorder: "rgba(159,233,255,0.8)",
    actionText: "#d7f7ff",
    pillBg: "rgba(10,49,69,0.92)",
  },
]

export default function TiffinSubscriptionCard({ plan, index = 0 }) {
  const navigate = useNavigate()
  const theme = CARD_THEMES[index % CARD_THEMES.length]

  const primaryImage = plan?.image || TIFFIN_IMAGES[index % TIFFIN_IMAGES.length]
  const kitchenName = plan?.restaurantId?.restaurantName || plan?.restaurantId?.name || plan?.restaurantName || "Renuka's Kitchen"
  const duration = plan?.durationDays || (index === 1 ? 15 : 30)
  const price = plan?.price || (index === 1 ? 2499 : 4500)
  const title = plan?.name || (index === 1 ? "Renuka's 15-Day Ghar Ka Khana Plan" : "Renuka's 30-Day Monthly Ghar Ka Khana Delight")

  const handleCardClick = () => {
    navigate(`/food/user/tiffin/plan/${plan?._id || "plan-" + index}`, { state: { plan } })
  }

  return (
    <div
      onClick={handleCardClick}
      className="subscription-card relative w-full min-h-[220px] sm:min-h-[250px] rounded-2xl sm:rounded-3xl overflow-hidden mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.995] group cursor-pointer"
      style={{ border: `1px solid ${theme.border}` }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#062016]">
        <img
          src={primaryImage}
          alt={title}
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = FALLBACK_IMAGE
          }}
          className="w-full h-full object-cover object-right opacity-70 group-hover:scale-105 transition-transform duration-700"
          loading="eager"
        />
        <div className="absolute inset-0" style={{ background: theme.overlay }} />
        <div className="absolute inset-0" style={{ background: theme.tint }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3 mb-2">
        <div
          className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-black backdrop-blur-md text-white flex items-center gap-1.5 shadow-sm"
          style={{ background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}` }}
        >
          <Leaf className="w-3.5 h-3.5 fill-white text-white shrink-0" />
          <span>{plan?.isVegetarian !== false ? "Pure Veg" : "Non-Veg"}</span>
        </div>

        <div className="text-right">
          <div className="text-2xl sm:text-[28px] font-black tracking-tight leading-none" style={{ color: theme.price }}>
            ₹{price}
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] sm:text-xs font-bold mt-1" style={{ color: theme.price }}>
            <Calendar className="w-3 h-3" style={{ color: theme.price }} />
            <span>{duration} Days</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 my-1 max-w-sm sm:max-w-md">
        <div className="flex items-center gap-1 text-xs sm:text-[13px] font-semibold text-white/75 mb-0.5">
          <span>{kitchenName}</span>
          <div className="w-3.5 h-3.5 rounded-full bg-[#00b87c] flex items-center justify-center text-[#062016] shrink-0">
            <CheckCircle2 className="w-3 h-3 fill-[#00b87c] text-white stroke-[2.8]" />
          </div>
        </div>

        <h3 className="text-base sm:text-lg md:text-xl font-black text-white leading-snug tracking-tight">
          {title}
        </h3>
      </div>

      <div
        className="relative z-10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 my-2 max-w-md shadow-xs"
        style={{ background: theme.descriptionBg, border: `1px solid ${theme.descriptionBorder}` }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: theme.pillBg, color: theme.price }}
        >
          <Sprout className="w-3.5 h-3.5 stroke-[2.4]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-tight line-clamp-1">
            Our most popular meal subscription.
          </p>
          <p className="text-[11px] text-white/70 leading-tight mt-0.5 line-clamp-1">
            {plan?.itemsDescription || "Pure ghar jaisa swaad with rotating daily fresh vegetables."}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2 pt-1 border-t border-white/10 mt-1">
        <div
          className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs backdrop-blur-sm"
          style={{ background: theme.pillBg, border: `1px solid ${theme.badgeBorder}`, color: theme.price }}
        >
          <Sun className="w-3.5 h-3.5 stroke-[2.4]" style={{ color: theme.price }} />
          <span>
            {plan?.mealType === "Both" || !plan?.mealType ? "Morning (11 AM) & Evening (7 PM)" : `${plan?.mealType} Only`}
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleCardClick()
          }}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-extrabold transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{ background: theme.actionBg, border: `1px solid ${theme.actionBorder}`, color: theme.actionText }}
        >
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: theme.actionText }} />
        </button>
      </div>
    </div>
  )
}
