import { Link } from "react-router-dom"
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings"
import { useCompanyName } from "@food/hooks/useCompanyName"

export default function Footer() {
  const companyName = useCompanyName()
  const currentYear = new Date().getFullYear()
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadLogo = async () => {
      try {
        const cached = getCachedSettings()
        const cachedLogo = cached?.logo?.url || null
        if (cachedLogo) {
          if (isMounted) setLogoUrl(cachedLogo)
          return
        }

        const settings = await loadBusinessSettings()
        if (isMounted) {
          setLogoUrl(settings?.logo?.url || null)
        }
      } catch (error) {
        if (isMounted) setLogoUrl(null)
      }
    }

    loadLogo()

    const handleSettingsUpdate = () => {
      const cached = getCachedSettings()
      setLogoUrl(cached?.logo?.url || null)
    }

    window.addEventListener("businessSettingsUpdated", handleSettingsUpdate)

    return () => {
      isMounted = false
      window.removeEventListener("businessSettingsUpdated", handleSettingsUpdate)
    }
  }, [])

  const footerLinks = {
    discover: [
      { name: "About Us", href: "/user/help" },
      { name: "Careers", href: "/user/help" },
      { name: "Blog", href: "/user/help" },
      { name: "Press", href: "/user/help" },
    ],
    support: [
      { name: "Help Center", href: "/user/help" },
      { name: "Contact Us", href: "/user/help" },
      { name: "Privacy Policy", href: "/profile/privacy" },
      { name: "Terms of Service", href: "/profile/terms" },
    ],
    account: [
      { name: "My Account", href: "/user/profile" },
      { name: "My Orders", href: "/user/orders" },
      { name: "Favorites", href: "/user/profile/favorites" },
      { name: "Offers", href: "/user/offers" },
    ],
    partners: [
      { name: "Partner With Us", href: "/user/help" },
      { name: "Restaurant Login", href: "/restaurant" },
      { name: "Delivery Login", href: "/delivery" },
    ],
  }

  return (
    <footer className="mt-12 border-t border-white/10 bg-[#0c0c10] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10"
                  crossOrigin="anonymous"
                  onError={(event) => {
                    event.currentTarget.style.display = "none"
                  }}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a18] to-[#ff3d77] text-base font-black text-white">
                  {String(companyName || "F").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ff9f43]">Food by {companyName}</p>
                <h2 className="text-2xl font-black tracking-tight">Fast, fresh, and local.</h2>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-6 text-white/70">
              Order from nearby favorites, explore tiffin plans, and discover budget-friendly meals in one place.
            </p>

            <div className="grid gap-3 text-sm text-white/75 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#ff9f43]" />
                <span>+91 00000 00000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#ff9f43]" />
                <span>support@{String(companyName || "tifora").toLowerCase().replace(/\s+/g, "")}.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#ff9f43]" />
                <span>Available in your city</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a href="#" className="rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:border-white/20 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:border-white/20 hover:text-white">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:border-white/20 hover:text-white">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#ff9f43]">Discover</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {footerLinks.discover.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="transition hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#ff9f43]">Support</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="transition hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#ff9f43]">For You</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {footerLinks.account.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="transition hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#ff9f43]">Partners</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {footerLinks.partners.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="transition hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} {companyName}. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span>Made with</span>
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              <span>for food lovers</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
