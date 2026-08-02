import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Sparkles, CheckCircle2, ChevronRight, UtensilsCrossed } from 'lucide-react';
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
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white px-6 py-8 rounded-b-3xl shadow-lg shadow-orange-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" /> Daily Meal Subscriptions
                    </span>
                    <button 
                        onClick={() => navigate('/food/user/tiffin/my-subscriptions')}
                        className="text-xs bg-white text-orange-600 font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-orange-50 transition"
                    >
                        My Plans
                    </button>
                </div>
                <h1 className="text-2xl font-black mt-2">Homestyle Tiffin Service</h1>
                <p className="text-white/90 text-sm mt-1">Freshly cooked meals delivered to your door every morning (11 AM) & evening (7 PM).</p>
            </div>

            {/* Why Tiffin Highlight */}
            <div className="grid grid-cols-3 gap-3 p-4 -mt-4">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-gray-800">Fixed Timings</p>
                    <p className="text-[10px] text-gray-500">11 AM & 7 PM</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <Calendar className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-gray-800">Flexible Plans</p>
                    <p className="text-[10px] text-gray-500">Pause anytime</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-gray-800">Zero Surge</p>
                    <p className="text-[10px] text-gray-500">Flat pricing</p>
                </div>
            </div>

            {/* Plan List */}
            <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Available Subscription Plans</h2>

                {loading ? (
                    <div className="flex justify-center p-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div
                            key={plan._id}
                            onClick={() => navigate(`/food/user/tiffin/plan/${plan._id}`, { state: { plan } })}
                            className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:border-orange-500 transition-all cursor-pointer active:scale-[0.99]"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${plan.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-xs font-semibold text-gray-500">{plan.restaurantName || 'Featured Kitchen'}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-base mt-1">{plan.name}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-gray-900">₹{plan.price}</span>
                                    <p className="text-xs text-gray-500">/{plan.durationDays} Days</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-600 mt-2.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                {plan.itemsDescription}
                            </p>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                                    {plan.mealType === 'Both' ? 'Morning (11 AM) & Evening (7 PM)' : `${plan.mealType} Only`}
                                </span>
                                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                    View Details <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
