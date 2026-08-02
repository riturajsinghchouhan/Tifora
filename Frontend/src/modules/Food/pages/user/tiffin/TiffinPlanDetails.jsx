import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Calendar, ShieldCheck } from 'lucide-react';

export default function TiffinPlanDetails() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const plan = location.state?.plan || {
        _id: id,
        name: 'Homestyle North Indian Tiffin',
        restaurantName: 'Annapurna Rasoi',
        mealType: 'Both',
        durationDays: 30,
        price: 4500,
        isVegetarian: true,
        itemsDescription: '4 Butter Rotis, Dal Tadka, Seasonal Sabzi, Jeera Rice, Salad, Pickle'
    };

    const [selectedDuration, setSelectedDuration] = useState(plan.durationDays || 30);
    const [selectedTiming, setSelectedTiming] = useState(plan.mealType || 'Both');

    // Calculate price adjustments
    const baseDailyPrice = plan.price / (plan.durationDays || 30);
    const calculatedPrice = Math.round(baseDailyPrice * selectedDuration * (selectedTiming === 'Both' ? 1 : 0.6));

    const handleProceedToCheckout = () => {
        navigate('/food/user/tiffin/checkout', {
            state: {
                plan: {
                    ...plan,
                    durationDays: selectedDuration,
                    mealType: selectedTiming,
                    totalPrice: calculatedPrice
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-8">
            <div>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900">Customize Subscription</h1>
                        <p className="text-xs text-gray-500">{plan.restaurantName}</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 max-w-lg mx-auto">
                    {/* Plan Summary Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${plan.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs font-bold text-gray-500">{plan.isVegetarian ? 'Pure Vegetarian' : 'Non-Vegetarian'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                        
                        <div className="mt-3 bg-orange-50/60 border border-orange-100 rounded-xl p-3">
                            <p className="text-xs font-bold text-orange-900 mb-1">What's in the Box:</p>
                            <p className="text-xs text-orange-800 leading-relaxed">{plan.itemsDescription}</p>
                        </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" /> Select Subscription Duration
                        </h3>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { days: 7, label: '1 Week' },
                                { days: 15, label: '15 Days' },
                                { days: 30, label: '1 Month' },
                            ].map((d) => (
                                <button
                                    key={d.days}
                                    onClick={() => setSelectedDuration(d.days)}
                                    className={`py-3 px-2 rounded-xl text-center border-2 transition font-bold text-xs ${
                                        selectedDuration === d.days
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                                >
                                    <div>{d.label}</div>
                                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">{d.days} Days</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Meal Timing Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" /> Meal Timings
                        </h3>
                        <div className="space-y-2">
                            {[
                                { type: 'Both', label: 'Morning (11 AM) & Evening (7 PM)', tag: 'Recommended' },
                                { type: 'Morning', label: 'Morning Only (11:00 AM)', tag: 'Lunch' },
                                { type: 'Evening', label: 'Evening Only (7:00 PM)', tag: 'Dinner' }
                            ].map((timing) => (
                                <label
                                    key={timing.type}
                                    onClick={() => setSelectedTiming(timing.type)}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                        selectedTiming === timing.type
                                            ? 'border-orange-500 bg-orange-50/50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="timing"
                                            checked={selectedTiming === timing.type}
                                            onChange={() => setSelectedTiming(timing.type)}
                                            className="text-orange-500 focus:ring-orange-500"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{timing.label}</p>
                                            <span className="text-[10px] font-semibold text-orange-600 bg-orange-100/60 px-1.5 py-0.5 rounded">
                                                {timing.tag}
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Assurance Card */}
                    <div className="flex items-center gap-3 p-3.5 bg-green-50/80 rounded-2xl border border-green-200 text-green-900 text-xs">
                        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                        <span><strong>Pause anytime</strong> with 1-click in your account if you go out of station.</span>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10 shadow-lg">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
                    <div>
                        <span className="text-xs text-gray-500">Total Upfront Amount</span>
                        <div className="text-2xl font-black text-gray-900">₹{calculatedPrice}</div>
                    </div>
                    <button
                        onClick={handleProceedToCheckout}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition text-center"
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}
