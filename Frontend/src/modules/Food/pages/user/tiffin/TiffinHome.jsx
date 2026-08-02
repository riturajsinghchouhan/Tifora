import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, ChevronRight, UtensilsCrossed } from 'lucide-react';
import api from '@food/api';

export default function TiffinHome() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await api.get('/user/tiffin/plans/available').catch(() => null);
                if (res?.data?.success) {
                    setPlans(res.data.data);
                } else {
                    // Fallback demo plans
                    setPlans([
                        {
                            _id: 'plan-1',
                            name: 'Homestyle North Indian Tiffin',
                            restaurantName: 'Annapurna Rasoi',
                            mealType: 'Both',
                            durationDays: 30,
                            price: 4500,
                            isVegetarian: true,
                            itemsDescription: '4 Butter Rotis, Dal Tadka, Seasonal Sabzi, Jeera Rice, Salad, Pickle'
                        },
                        {
                            _id: 'plan-2',
                            name: 'Weekly Student Budget Meal',
                            restaurantName: 'Campus Dabbawala',
                            mealType: 'Morning',
                            durationDays: 7,
                            price: 899,
                            isVegetarian: true,
                            itemsDescription: '3 Phulkas, Paneer/Veg Curry, Rice, Raita'
                        },
                        {
                            _id: 'plan-3',
                            name: 'Executive Deluxe Meal Box',
                            restaurantName: 'Royal Spoon Kitchen',
                            mealType: 'Both',
                            durationDays: 15,
                            price: 2999,
                            isVegetarian: false,
                            itemsDescription: 'Special Gravy (Chicken/Paneer), 4 Chapatis, Pulao, Sweet of the Day'
                        }
                    ]);
                }
            } catch (err) {
                console.error('Error fetching tiffin plans', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-[#9f1239] via-[#be123c] to-[#e11d48] text-white px-4 sm:px-6 py-8 rounded-b-3xl shadow-lg shadow-[#be123c]/20">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Daily Meal Subscriptions
                        </span>
                        <button 
                            onClick={() => navigate('/food/user/tiffin/my-subscriptions')}
                            className="text-xs bg-white text-[#be123c] font-bold px-3.5 py-1.5 rounded-full shadow-sm hover:bg-rose-50 transition active:scale-95"
                        >
                            My Plans
                        </button>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Homestyle Tiffin Service</h1>
                    <p className="text-white/90 text-xs sm:text-sm mt-1">Freshly cooked meals delivered to your door every morning (11 AM) & evening (7 PM).</p>
                </div>
            </div>

            {/* Why Tiffin Highlight */}
            <div className="max-w-5xl mx-auto px-4 mt-6 mb-8">
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#be123c] mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-gray-800">Fixed Timings</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">11 AM & 7 PM</p>
                    </div>
                    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#be123c] mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-gray-800">Flexible Plans</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Pause anytime</p>
                    </div>
                    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#be123c] mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-bold text-gray-800">Zero Surge</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Flat pricing</p>
                    </div>
                </div>
            </div>

            {/* Plan List */}
            <div className="max-w-5xl mx-auto px-4 space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Available Subscription Plans</h2>

                {loading ? (
                    <div className="flex justify-center p-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#be123c]"></div>
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div
                            key={plan._id}
                            onClick={() => navigate(`/food/user/tiffin/plan/${plan._id}`, { state: { plan } })}
                            className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:border-[#be123c] hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group"
                        >
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                                <div className="w-full sm:w-28 h-36 sm:h-28 rounded-2xl overflow-hidden bg-gray-900 shrink-0 relative shadow-sm">
                                    <img
                                        src={plan.image || '/food/tiffin/tiffin_box_default.png'}
                                        alt={plan.name}
                                        onError={(e) => {
                                            e.target.src = '/food/tiffin/tiffin_box_default.png';
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${
                                        plan.isVegetarian ? 'bg-green-600' : 'bg-red-600'
                                    }`}>
                                        {plan.isVegetarian ? 'Pure Veg' : 'Non-Veg'}
                                    </span>
                                </div>

                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500">{plan.restaurantName || 'Featured Kitchen'}</span>
                                            <h3 className="font-bold text-gray-900 text-base group-hover:text-[#be123c] transition-colors">{plan.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-gray-900">₹{plan.price}</span>
                                            <p className="text-xs text-gray-500">/{plan.durationDays} Days</p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 line-clamp-2">
                                        {plan.itemsDescription}
                                    </p>

                                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                                        <span className="text-xs font-bold text-[#be123c] bg-rose-50 px-2.5 py-1 rounded-lg">
                                            {plan.mealType === 'Both' ? 'Morning (11 AM) & Evening (7 PM)' : `${plan.mealType} Only`}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 group-hover:text-[#be123c] transition-colors">
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
