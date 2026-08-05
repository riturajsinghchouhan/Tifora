import React from "react";
import { ArrowRight } from "lucide-react";

export default function LandingFooter({
  scrollToSection,
  newsletterEmail,
  setNewsletterEmail,
  newsletterSubscribed,
  handleNewsletterSubmit,
}) {
  return (
    <footer id="footer-section" className="bg-[#051110] text-gray-400 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Col 1: Brand & Socials (full width on mobile, 4 cols on desktop) */}
          <div className="col-span-2 md:col-span-3 lg:col-span-4 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D09C] to-[#059669] flex items-center justify-center">
                <span className="text-[#061211] font-black text-lg">T</span>
              </div>
              <span className="text-xl font-black text-white">Tifora</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Tifora is your one-stop platform for tiffin services, hotel booking and more — making your daily life simple and better.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              <a href="#social" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-[#00D09C] hover:text-[#061211] text-gray-400 flex items-center justify-center transition">
                <span className="text-[11px] sm:text-xs font-bold">𝕏</span>
              </a>
              <a href="#social" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-[#00D09C] hover:text-[#061211] text-gray-400 flex items-center justify-center transition">
                <span className="text-[11px] sm:text-xs font-bold">ig</span>
              </a>
              <a href="#social" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-[#00D09C] hover:text-[#061211] text-gray-400 flex items-center justify-center transition">
                <span className="text-[11px] sm:text-xs font-bold">yt</span>
              </a>
              <a href="#social" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-[#00D09C] hover:text-[#061211] text-gray-400 flex items-center justify-center transition">
                <span className="text-[11px] sm:text-xs font-bold">in</span>
              </a>
            </div>
          </div>

          {/* Col 2: Company */}
          <div className="col-span-1 lg:col-span-2 space-y-2 sm:space-y-3 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px] sm:text-xs">Company</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("why-tifora");
                  }}
                  className="hover:text-white transition"
                >
                  About Us
                </a>
              </li>
              <li><a href="#careers" className="hover:text-white transition">Careers</a></li>
              <li><a href="#press" className="hover:text-white transition">Press</a></li>
              <li><a href="#blog" className="hover:text-white transition">Blog</a></li>
            </ul>
          </div>

          {/* Col 3: Services */}
          <div className="col-span-1 lg:col-span-2 space-y-2 sm:space-y-3 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px] sm:text-xs">Services</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="/food/tiffin/plans" className="hover:text-white transition">Tiffin Services</a></li>
              <li><a href="/food" className="hover:text-white transition">Hotel Booking</a></li>
              <li><a href="/food/restaurant/join" className="hover:text-white transition">Partners</a></li>
              <li><a href="/food" className="hover:text-white transition">Offers</a></li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div className="col-span-1 lg:col-span-2 space-y-2 sm:space-y-3 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px] sm:text-xs">Support</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="#help" className="hover:text-white transition">Help Center</a></li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("footer-section");
                  }}
                  className="hover:text-white transition"
                >
                  Contact Us
                </a>
              </li>
              <li><a href="#terms" className="hover:text-white transition">Terms & Conditions</a></li>
              <li><a href="#privacy" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Col 5: Newsletter */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2 space-y-2 sm:space-y-3 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px] sm:text-xs">Newsletter</p>
            <p className="text-[11px] text-gray-400">Get updates, offers and more.</p>
            <form onSubmit={handleNewsletterSubmit} className="relative max-w-xs">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00D09C] transition pr-9"
                required
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#00D09C] text-[#061211] flex items-center justify-center shadow-sm"
                title="Subscribe"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {newsletterSubscribed && (
              <p className="text-[10px] text-[#00D09C] font-semibold">Thank you for subscribing! 🎉</p>
            )}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 sm:pt-8 border-t border-white/5 text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Tifora. All rights reserved. <span className="text-rose-500">❤️</span></p>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="#privacy" className="hover:text-gray-300">Privacy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-gray-300">Terms</a>
            <span>•</span>
            <a href="#cookies" className="hover:text-gray-300">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
