import React from "react";

export default function LandingTestimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Neha Sharma",
      role: "Software Engineer, Indore",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
      rating: "5.0",
      review: "Tifora tiffins are genuinely home-cooked and healthy. Delivery is always right on time, hot and fresh!",
    },
    {
      id: 2,
      name: "Aman Verma",
      role: "Business Traveler",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
      rating: "5.0",
      review: "Found verified hotels on Tifora at unbeatable rates. Instant confirmation with zero hassle!",
    },
    {
      id: 3,
      name: "Pooja Singh",
      role: "Student, Indore",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
      rating: "5.0",
      review: "The monthly subscription plan saved me tons of money and time. Super responsive support team!",
    },
  ];

  return (
    <section id="testimonials" className="py-12 sm:py-20 md:py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Section Heading */}
        <div className="text-center space-y-1.5 sm:space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Loved by Thousands <span className="text-rose-500">❤️</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Real reviews from daily subscribers and hotel guests.
          </p>
        </div>

        {/* 3 Testimonials Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 sm:p-7 border border-gray-100 shadow-sm sm:shadow-md hover:shadow-xl shadow-gray-200/60 hover:-translate-y-1.5 transition-all space-y-3 sm:space-y-4"
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{item.name}</h4>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">{item.role}</p>
                  <div className="flex items-center gap-0.5 text-amber-400 text-xs mt-0.5">
                    {"★".repeat(5)} <span className="text-gray-600 text-[10px] sm:text-[11px] ml-1 font-bold">{item.rating}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed italic">
                "{item.review}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
