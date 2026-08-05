import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import api from '@food/api';

const DEFAULT_TIFFIN_ITEMS = [
    {
        name: '4 Fresh Butter Rotis',
        quantity: '4 Pcs',
        image: '/food/tiffin/roti.png',
        description: 'Soft, hot homestyle whole wheat phulkas with pure butter'
    },
    {
        name: 'Homestyle Dal Tadka',
        quantity: '1 Bowl (250ml)',
        image: '/food/tiffin/dal.png',
        description: 'Authentic yellow lentils tempered with garlic & cumin'
    },
    {
        name: 'Seasonal Special Sabzi',
        quantity: '1 Bowl (250ml)',
        image: '/food/tiffin/sabzi.png',
        description: 'Fresh market vegetables / paneer in homestyle gravy'
    },
    {
        name: 'Steamed Jeera Rice',
        quantity: '1 Portion (200g)',
        image: '/food/tiffin/rice.png',
        description: 'Fluffy long-grain basmati rice with aromatic cumin'
    },
    {
        name: 'Fresh Salad & Curd / Raita',
        quantity: '1 Container',
        image: '/food/tiffin/salad.png',
        description: 'Crisp cucumber, carrot slices, lemon wedge & fresh curd'
    }
];

const getItemImage = (item) => {
    if (item.image) return item.image;
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('roti') || nameLower.includes('chapati') || nameLower.includes('phulka')) {
        return '/food/tiffin/roti.png';
    }
    if (nameLower.includes('dal') || nameLower.includes('curry') || nameLower.includes('tadka')) {
        return '/food/tiffin/dal.png';
    }
    if (nameLower.includes('sabzi') || nameLower.includes('paneer') || nameLower.includes('veg') || nameLower.includes('vegetable')) {
        return '/food/tiffin/sabzi.png';
    }
    if (nameLower.includes('rice') || nameLower.includes('pulao') || nameLower.includes('jeera')) {
        return '/food/tiffin/rice.png';
    }
    if (nameLower.includes('salad') || nameLower.includes('raita') || nameLower.includes('curd') || nameLower.includes('pickle')) {
        return '/food/tiffin/salad.png';
    }
    return '/food/tiffin/tiffin_box_default.png';
};

export default function TiffinPlanDetails() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [plan, setPlan] = useState(location.state?.plan || {
        _id: id,
        name: 'Homestyle North Indian Tiffin',
        restaurantName: 'Annapurna Rasoi',
        mealType: 'Both',
        durationDays: 30,
        price: 4500,
        isVegetarian: true,
        image: '/food/tiffin/tiffin_box_default.png',
        itemsDescription: '4 Butter Rotis, Dal Tadka, Seasonal Sabzi, Jeera Rice, Salad, Pickle'
    });

    const [selectedDuration, setSelectedDuration] = useState(plan.durationDays || 30);
    const [selectedTiming, setSelectedTiming] = useState(plan.mealType || 'Both');

    useEffect(() => {
        if (id && (!location.state?.plan || !location.state?.plan?.name)) {
            api.get(`/user/tiffin/plan/${id}`)
                .then((res) => {
                    if (res.data?.success && res.data?.data) {
                        const fetched = res.data.data;
                        setPlan({
                            ...fetched,
                            restaurantName: fetched.restaurantId?.restaurantName || fetched.restaurantId?.name || fetched.restaurantName || "Renuka's Kitchen"
                        });
                        if (fetched.durationDays) setSelectedDuration(fetched.durationDays);
                        if (fetched.mealType) setSelectedTiming(fetched.mealType);
                    }
                })
                .catch(() => {});
        }
    }, [id, location.state]);

    // Calculate price adjustments
    const baseDailyPrice = (plan.price || 4500) / (plan.durationDays || 30);
    const calculatedPrice = Math.round(baseDailyPrice * selectedDuration * (selectedTiming === 'Both' ? 1 : 0.6));

    const getParsedItems = () => {
        if (plan.items && Array.isArray(plan.items) && plan.items.length > 0) {
            return plan.items.map(item => ({
                name: item.name,
                quantity: item.quantity || '',
                image: getItemImage(item),
                description: item.description || 'Prepared fresh daily'
            }));
        }

        if (plan.itemsDescription) {
            const parts = plan.itemsDescription.split(/[,+•&]/).map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) {
                return parts.map(part => ({
                    name: part,
                    quantity: part.match(/\d+\s*(?:Pcs|Pieces|Rotis|Chapatis|ml|g|Bowl)?/i)?.[0] || '',
                    image: getItemImage({ name: part }),
                    description: 'Homestyle freshly prepared recipe'
                }));
            }
        }

        return DEFAULT_TIFFIN_ITEMS;
    };

    const mealItems = getParsedItems();

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
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-32">
            <div>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900 text-base sm:text-lg">Subscription Details</h1>
                        <p className="text-xs text-gray-500">{plan.restaurantName || 'Featured Kitchen'}</p>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
                    {/* Plan Hero Card with Image */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            <div className="relative w-full sm:w-44 h-48 sm:h-44 rounded-2xl overflow-hidden bg-gray-900 shrink-0 shadow-md">
                                <img
                                    src={plan.image || '/food/tiffin/tiffin_box_default.png'}
                                    alt={plan.name}
                                    onError={(e) => {
                                        e.target.src = '/food/tiffin/tiffin_box_default.png';
                                    }}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2.5 left-2.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md ${
                                        plan.isVegetarian ? 'bg-green-600' : 'bg-red-600'
                                    }`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        {plan.isVegetarian ? 'Pure Veg' : 'Non-Veg'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 w-full text-left">
                                <span className="text-[11px] font-bold text-[#0cb884] bg-[#0cb884]/10 border border-[#0cb884]/20 px-2.5 py-1 rounded-full">
                                    Homestyle Daily Tiffin
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">{plan.name}</h2>
                                <p className="text-xs text-gray-500 mt-1">Kitchen: <span className="font-semibold text-gray-700">{plan.restaurantName || 'Annapurna Rasoi'}</span></p>

                                <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                                    Taste our delicious homestyle cooking for {selectedDuration} days. Freshly prepared with wholesome ingredients and delivered on time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What's Inside the Tiffin Box (Visual Items Section) */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-[#0cb884]/10 text-[#0cb884] rounded-xl">
                                    <UtensilsCrossed className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900">What's in the Box</h3>
                                    <p className="text-[11px] text-gray-500">Items included in every single meal</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-[#0cb884] bg-[#0cb884]/10 px-2.5 py-1 rounded-lg">
                                {mealItems.length} Fresh Items
                            </span>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {mealItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-rose-200 transition-all group"
                                >
                                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            onError={(e) => {
                                                e.target.src = '/food/tiffin/tiffin_box_default.png';
                                            }}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                                        </div>
                                        {item.quantity && (
                                            <span className="inline-block text-[10px] font-bold text-[#0cb884] bg-[#0cb884]/20 px-2 py-0.5 rounded mt-0.5">
                                                {item.quantity}
                                            </span>
                                        )}
                                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#0cb884]" /> Select Subscription Duration
                        </h3>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { days: 7, label: '1 Week', sub: 'Trial Plan' },
                                { days: 15, label: '15 Days', sub: 'Popular' },
                                { days: 30, label: '1 Month', sub: 'Best Value' },
                            ].map((d) => (
                                <button
                                    key={d.days}
                                    onClick={() => setSelectedDuration(d.days)}
                                    className={`py-3.5 px-2 rounded-2xl text-center border-2 transition-all font-bold text-xs active:scale-95 ${
                                        selectedDuration === d.days
                                            ? 'border-[#0cb884] bg-[#0cb884]/10 text-[#0cb884] shadow-sm'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                                    }`}
                                >
                                    <div className="font-extrabold text-sm">{d.label}</div>
                                    <div className="text-[10px] font-normal mt-0.5 opacity-80">{d.days} Days • {d.sub}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Meal Timing Selector */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#0cb884]" /> Meal Timings
                        </h3>
                        <div className="space-y-2.5">
                            {[
                                { type: 'Both', label: 'Morning (11 AM) & Evening (7 PM)', tag: 'Lunch + Dinner' },
                                { type: 'Morning', label: 'Morning Slot (11:00 AM)', tag: 'Lunch Only' },
                                { type: 'Evening', label: 'Evening Slot (7:00 PM)', tag: 'Dinner Only' }
                            ].map((timing) => (
                                <label
                                    key={timing.type}
                                    onClick={() => setSelectedTiming(timing.type)}
                                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                        selectedTiming === timing.type
                                            ? 'border-[#0cb884] bg-[#0cb884]/10 shadow-sm'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="timing"
                                            checked={selectedTiming === timing.type}
                                            onChange={() => setSelectedTiming(timing.type)}
                                            className="text-[#0cb884] focus:ring-[#0cb884] h-4 w-4"
                                        />
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-gray-900">{timing.label}</p>
                                            <span className="text-[10px] font-semibold text-[#0cb884] bg-[#0cb884]/20 px-2 py-0.5 rounded">
                                                {timing.tag}
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Assurance Card */}
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200 text-green-900 text-xs">
                        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                        <span><strong>Pause anytime</strong> with 1-click in your account if you go out of town. Unused meals stay credited.</span>
                    </div>
                </div>
            </div>

            {/* Bottom Fixed Sticky Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <span className="text-[11px] text-gray-500 font-medium block">Total Subscription Price</span>
                        <div className="text-2xl font-black text-gray-900">
                            ₹{calculatedPrice}
                            <span className="text-xs font-normal text-gray-500 ml-1">/{selectedDuration} Days</span>
                        </div>
                    </div>
                    <button
                        onClick={handleProceedToCheckout}
                        className="flex-1 max-w-xs bg-gradient-to-r from-[#088c64] via-[#0cb884] to-[#20d49f] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#0cb884]/25 hover:opacity-95 active:scale-95 transition text-center"
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}
