import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LandingNavbar,
  LandingHero,
  LandingServices,
  LandingWhyTifora,
  LandingHowItWorks,
  LandingPopularPicks,
  LandingTestimonials,
  LandingAppDownload,
  LandingFooter,
} from "./landing/components";

export default function MasterLandingPage() {
  const navigate = useNavigate();
  const [activeHeroTab, setActiveHeroTab] = useState("tiffin"); // 'tiffin' | 'hotel'
  const [activeServicesTab, setActiveServicesTab] = useState("tiffin");
  const [activePicksTab, setActivePicksTab] = useState("tiffins"); // 'tiffins' | 'hotels'
  const [picksIndex, setPicksIndex] = useState(0);
  const [searchLocation, setSearchLocation] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeSection, setActiveSection] = useState("hero");

  const navLinks = [
    { id: "hero", label: "Home" },
    { id: "core-services", label: "Services" },
    { id: "why-tifora", label: "Why Tifora" },
    { id: "how-it-works", label: "How It Works" },
    { id: "popular-picks", label: "Popular Picks" },
    { id: "testimonials", label: "Reviews" },
    { id: "footer-section", label: "Contact" },
  ];

  // Scroll Spy logic to highlight active section in Navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;

      if (window.scrollY < 200) {
        setActiveSection("hero");
        return;
      }

      const sections = navLinks.map((link) => link.id);
      for (let i = sections.length - 1; i >= 0; i--) {
        const id = sections[i];
        if (id === "hero") continue;
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(id);
            return;
          }
        }
      }
      setActiveSection("hero");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Popular Picks Data
  const tiffinPicks = [
    {
      id: "t1",
      title: "Classic Veg Thali",
      rating: "4.8",
      reviews: "1.2k",
      price: "₹120",
      time: "25 mins",
      image: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80",
      tag: "Best Seller",
      link: "/food/tiffin/plans",
    },
    {
      id: "t2",
      title: "Paneer Special",
      rating: "4.7",
      reviews: "850",
      price: "₹140",
      time: "20 mins",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
      tag: "Chef Special",
      link: "/food/tiffin/plans",
    },
    {
      id: "t3",
      title: "Dal Khichdi",
      rating: "4.9",
      reviews: "2k",
      price: "₹100",
      time: "30 mins",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
      tag: "Comfort Food",
      link: "/food/tiffin/plans",
    },
    {
      id: "t4",
      title: "Fitness Meal",
      rating: "4.8",
      reviews: "890",
      price: "₹160",
      time: "25 mins",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      tag: "High Protein",
      link: "/food/tiffin/plans",
    },
  ];

  const hotelPicks = [
    {
      id: "h1",
      title: "The Park View",
      rating: "4.8",
      reviews: "940",
      price: "₹2,499",
      time: "Indore, MP",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      tag: "Popular Stay",
      link: "/food",
    },
    {
      id: "h2",
      title: "Grand Heritage",
      rating: "4.9",
      reviews: "1.1k",
      price: "₹3,800",
      time: "Indore, MP",
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
      tag: "Luxury Suite",
      link: "/food",
    },
    {
      id: "h3",
      title: "Regal Residency",
      rating: "4.6",
      reviews: "620",
      price: "₹1,899",
      time: "Indore, MP",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
      tag: "Budget Friendly",
      link: "/food",
    },
    {
      id: "h4",
      title: "Greenwood Suites",
      rating: "4.7",
      reviews: "750",
      price: "₹2,999",
      time: "Indore, MP",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
      tag: "Top Rated",
      link: "/food",
    },
  ];

  const currentPicks = activePicksTab === "tiffins" ? tiffinPicks : hotelPicks;

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (activeHeroTab === "tiffin") {
      navigate("/food/tiffin/plans");
    } else {
      navigate("/food");
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setNewsletterSubscribed(false), 4000);
    }
  };

  const scrollToSection = (id) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveSection("hero");
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setActiveSection(id);
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#00D09C] selection:text-[#061211]">
      {/* 1. NAVBAR */}
      <LandingNavbar
        activeSection={activeSection}
        navLinks={navLinks}
        scrollToSection={scrollToSection}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* 2. HERO SECTION */}
      <LandingHero
        isDarkMode={isDarkMode}
        activeHeroTab={activeHeroTab}
        setActiveHeroTab={setActiveHeroTab}
        searchLocation={searchLocation}
        setSearchLocation={setSearchLocation}
        handleSearchSubmit={handleSearchSubmit}
      />

      {/* 3. OUR CORE SERVICES */}
      <LandingServices
        activeServicesTab={activeServicesTab}
        setActiveServicesTab={setActiveServicesTab}
      />

      {/* 5. WHY TIFORA? */}
      <LandingWhyTifora />

      {/* 6. HOW IT WORKS */}
      <LandingHowItWorks />

      {/* 7. POPULAR PICKS */}
      <LandingPopularPicks
        activePicksTab={activePicksTab}
        setActivePicksTab={setActivePicksTab}
        currentPicks={currentPicks}
        picksIndex={picksIndex}
        setPicksIndex={setPicksIndex}
      />

      {/* 8. TESTIMONIALS */}
      <LandingTestimonials />

      {/* 9. APP DOWNLOAD CTA */}
      <LandingAppDownload />

      {/* 10. FOOTER */}
      <LandingFooter
        scrollToSection={scrollToSection}
        newsletterEmail={newsletterEmail}
        setNewsletterEmail={setNewsletterEmail}
        newsletterSubscribed={newsletterSubscribed}
        handleNewsletterSubmit={handleNewsletterSubmit}
      />
    </div>
  );
}
