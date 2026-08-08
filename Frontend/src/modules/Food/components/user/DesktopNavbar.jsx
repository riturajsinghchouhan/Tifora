import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef, useMemo } from "react"
import {
    ChevronDown,
    ShoppingCart,
    Wallet,
    Search,
    Home as HomeIcon,
    Package,
    Leaf,
    ShoppingBag,
    User,
    X
} from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Switch } from "@food/components/ui/switch"
import { useLocation as useLocationHook } from "@food/hooks/useLocation"
import { useCart } from "@food/context/CartContext"
import { useLocationSelector, useSearchOverlay } from "./UserLayout"
import { useProfile } from "@food/context/ProfileContext"
import { FaLocationDot } from "react-icons/fa6"
import { motion } from "framer-motion"
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings"
import brandLogo from "@/assets/logo.png"

export default function DesktopNavbar({ showLogo = true }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { location: userLocation, loading: locationLoading } = useLocationHook()
    const { getCartCount } = useCart()
    const { openLocationSelector } = useLocationSelector()
    const { setSearchValue } = useSearchOverlay()
    const { vegMode, setVegMode } = useProfile()
    const [heroSearch, setHeroSearch] = useState("")
    const [logoUrl, setLogoUrl] = useState(null)
    const [companyName, setCompanyName] = useState(null)
    const [hasScrolledPastBanner, setHasScrolledPastBanner] = useState(false)
    const navRef = useRef(null)
    const cartCount = getCartCount()

    // Location display formatting
    const areaName = userLocation?.area && userLocation?.area.trim() ? userLocation.area.trim() : null
    const cityName = userLocation?.city || "Indore"
    const fullAddress = userLocation?.address || userLocation?.formattedAddress || ""

    const mainLocationName = useMemo(() => {
        let name = areaName || "Select Location"
        if (/^-?\d+(\.\d+)?$/.test(name.trim())) {
            return "Current Location"
        }
        return name
    }, [areaName])

    const baseAddress = useMemo(() => {
        let addr = fullAddress || ""
        if (cityName) {
            addr = addr.replace(new RegExp(`,?\\s*${cityName}\\s*`, 'gi'), '').trim()
        }
        if (areaName && areaName.length > 3) {
            addr = addr.replace(new RegExp(`^${areaName},?\\s*`, 'i'), '').trim()
        }
        if (/^-?\d+\.\d+,\s*-?\\s*\d+\.\d+$/.test(fullAddress.trim()) || /^-?\d+\.\d+,\s*-?\\s*\d+\.\d+$/.test(addr.trim()) || !addr || addr === ",") {
            return "Pinpoint location"
        }
        return addr
    }, [fullAddress, cityName, areaName])

    const handleLocationClick = () => {
        openLocationSelector()
    }

    // Active route checks for the 5 tabs: Home, Tiffin, Dietbox, Orders, Profile
    const pathname = location.pathname
    const isTiffin = pathname.startsWith("/food/user/tiffin") || pathname.startsWith("/food/tiffin")
    const isDietbox = pathname === "/food/user/under-250" || pathname === "/food/under-250" || pathname.startsWith("/food/user/dietbox") || pathname.startsWith("/food/dietbox") || pathname.startsWith("/food/user/diet-box") || pathname.startsWith("/food/diet-box")
    const isOrders = pathname.startsWith("/food/user/orders") || pathname.startsWith("/food/orders")
    const isProfile = pathname.startsWith("/food/user/profile") || pathname.startsWith("/food/profile")
    const isHome = !isTiffin && !isDietbox && !isOrders && !isProfile && (
        pathname === "/food/user" ||
        pathname === "/food/user/" ||
        pathname === "/food" ||
        pathname === "/food/" ||
        (pathname.startsWith("/food/user") &&
            !pathname.includes("/tiffin") &&
            !pathname.includes("/under-250") &&
            !pathname.includes("/dietbox") &&
            !pathname.includes("/orders") &&
            !pathname.includes("/profile"))
    )

    const isBannerRoute = pathname === "/food/user" || pathname === "/food/user/" || pathname === "/food" || pathname === "/food/"

    // Load business settings logo
    useEffect(() => {
        const loadLogo = async () => {
            try {
                const cached = getCachedSettings()
                if (cached) {
                    if (cached.logo?.url) setLogoUrl(cached.logo.url)
                    if (cached.companyName) setCompanyName(cached.companyName)
                } else {
                    const settings = await loadBusinessSettings()
                    if (settings) {
                        if (settings.logo?.url) setLogoUrl(settings.logo.url)
                        if (settings.companyName) setCompanyName(settings.companyName)
                    }
                }
            } catch (error) {
                // silent fallback
            }
        }
        loadLogo()
    }, [])

    // Scroll state detection
    useEffect(() => {
        if (!isBannerRoute) {
            setHasScrolledPastBanner(true)
            return
        }

        const handleScroll = () => {
            const heroShell = document.querySelector('[data-home-hero-shell="true"]') || document.querySelector('#tiffin-banner-wrapper')
            const navElement = navRef.current

            if (!heroShell || !navElement) {
                setHasScrolledPastBanner(false)
                return
            }

            const heroRect = heroShell.getBoundingClientRect()
            const navHeight = navElement.getBoundingClientRect().height || 0
            setHasScrolledPastBanner(heroRect.bottom <= navHeight)
        }

        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", handleScroll)

        return () => {
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleScroll)
        }
    }, [isBannerRoute])

    return (
        <nav
            ref={navRef}
            className={`hidden md:flex flex-col fixed top-0 left-0 right-0 z-50 py-1.5 transition-all duration-300 ${
                isBannerRoute && !hasScrolledPastBanner
                    ? "bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800/80 shadow-xs"
                    : "bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-zinc-800 shadow-sm"
            }`}
        >
            {/* Top Row: Brand Logo - Location - Search - Veg Mode - Wallet & Cart */}
            <div className="w-full border-b border-gray-100 dark:border-zinc-800/60 pb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 gap-4">
                        {/* Left: Brand Logo & Location */}
                        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
                            {showLogo && (
                                <Link to="/food/user/" className="flex items-center gap-2.5 shrink-0 group">
                                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-emerald-500/30 shrink-0 bg-emerald-600 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
                                        <img
                                            src={logoUrl || brandLogo}
                                            alt={companyName || "Tifora"}
                                            className="w-full h-full rounded-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = brandLogo
                                            }}
                                        />
                                    </div>
                                    <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {companyName || "Tifora"}
                                    </span>
                                </Link>
                            )}

                            {/* Location Selector */}
                            <Button
                                variant="ghost"
                                onClick={handleLocationClick}
                                disabled={locationLoading}
                                className="h-auto px-2 py-1 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70 rounded-xl transition-colors shrink-0"
                            >
                                {locationLoading ? (
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Loading...</span>
                                ) : (
                                    <div className="flex flex-col items-start min-w-0 text-left">
                                        <div className="flex items-center gap-1.5">
                                            <FaLocationDot className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                {mainLocationName}
                                            </span>
                                            <ChevronDown className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300 shrink-0 stroke-[2.5]" />
                                        </div>
                                        {baseAddress && (
                                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[180px] lg:max-w-[220px]">
                                                {baseAddress}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Button>
                        </div>

                        {/* Center: Search Bar & Veg Mode */}
                        <div className="flex-1 max-w-2xl mx-2 flex items-center gap-3">
                            <div className="relative flex-1">
                                <div className="relative bg-gray-100/90 dark:bg-[#202022] rounded-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white dark:focus-within:bg-[#18181a] border border-gray-200/60 dark:border-zinc-800">
                                    <div className="flex items-center px-3.5 py-2">
                                        <Search className="h-4 w-4 text-gray-400 shrink-0 mr-2.5 stroke-[2.2]" />
                                        <Input
                                            value={heroSearch}
                                            onChange={(e) => {
                                                const nextValue = e.target.value
                                                setHeroSearch(nextValue)
                                                setSearchValue(nextValue)
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && heroSearch.trim()) {
                                                    navigate(`/food/user/search?q=${encodeURIComponent(heroSearch.trim())}`)
                                                }
                                            }}
                                            className="h-6 p-0 border-0 bg-transparent text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                                            placeholder="Search tiffin plans, kitchens, meals..."
                                        />
                                        {heroSearch && (
                                            <button
                                                type="button"
                                                className="h-4 w-4 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                                                onClick={() => setHeroSearch("")}
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* VEG MODE Toggle */}
                            <div className="flex items-center gap-2 shrink-0 px-2 py-1 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/20">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 leading-none">VEG</span>
                                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">MODE</span>
                                </div>
                                <Switch
                                    checked={vegMode}
                                    onCheckedChange={setVegMode}
                                    className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600 h-4 w-8"
                                />
                            </div>
                        </div>

                        {/* Right: Wallet & Cart Icons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Link to="/food/user/wallet">
                                <Button
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl p-0 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
                                    title="Wallet"
                                >
                                    <Wallet className="h-5 w-5 stroke-[2]" />
                                </Button>
                            </Link>

                            <Link to="/food/user/cart">
                                <Button
                                    variant="ghost"
                                    className="relative h-10 w-10 rounded-xl p-0 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
                                    title="Cart"
                                >
                                    <ShoppingCart className="h-5 w-5 stroke-[2]" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
                                            {cartCount > 99 ? "99+" : cartCount}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: The 5 Real Navigation Tabs (Home, Tiffin, Dietbox, Orders, Profile) */}
            <div className="w-full pt-1.5 pb-0.5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-6 lg:gap-10">
                            {/* 1. Home */}
                            <Link
                                to="/food/user/"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all relative group text-sm ${
                                    isHome
                                        ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40"
                                        : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-white font-semibold"
                                }`}
                            >
                                <HomeIcon className="h-4 w-4" strokeWidth={isHome ? 2.5 : 2} />
                                <span>Home</span>
                                {isHome && (
                                    <motion.div
                                        layoutId="desktopNavIndicator"
                                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                )}
                            </Link>

                            {/* 2. Tiffin */}
                            <Link
                                to="/food/user/tiffin"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all relative group text-sm ${
                                    isTiffin
                                        ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40"
                                        : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-white font-semibold"
                                }`}
                            >
                                <Package className="h-4 w-4" strokeWidth={isTiffin ? 2.5 : 2} />
                                <span>Tiffin</span>
                                {isTiffin && (
                                    <motion.div
                                        layoutId="desktopNavIndicator"
                                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                )}
                            </Link>

                            {/* 3. Dietbox */}
                            <Link
                                to="/food/user/under-250"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all relative group text-sm ${
                                    isDietbox
                                        ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40"
                                        : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-white font-semibold"
                                }`}
                            >
                                <Leaf className="h-4 w-4" strokeWidth={isDietbox ? 2.5 : 2} />
                                <span>Dietbox</span>
                                {isDietbox && (
                                    <motion.div
                                        layoutId="desktopNavIndicator"
                                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                )}
                            </Link>

                            {/* 4. Orders */}
                            <Link
                                to="/food/user/orders"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all relative group text-sm ${
                                    isOrders
                                        ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40"
                                        : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-white font-semibold"
                                }`}
                            >
                                <ShoppingBag className="h-4 w-4" strokeWidth={isOrders ? 2.5 : 2} />
                                <span>Orders</span>
                                {isOrders && (
                                    <motion.div
                                        layoutId="desktopNavIndicator"
                                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                )}
                            </Link>

                            {/* 5. Profile */}
                            <Link
                                to="/food/user/profile"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all relative group text-sm ${
                                    isProfile
                                        ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40"
                                        : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-white font-semibold"
                                }`}
                            >
                                <User className="h-4 w-4" strokeWidth={isProfile ? 2.5 : 2} />
                                <span>Profile</span>
                                {isProfile && (
                                    <motion.div
                                        layoutId="desktopNavIndicator"
                                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                )}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}
