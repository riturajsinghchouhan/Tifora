import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    DollarSign,
    Calendar,
    Search,
    Filter,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    PauseCircle,
    PlayCircle,
    Truck,
    Clock,
    Utensils,
    UtensilsCrossed,
    Building2,
    X,
    Eye,
    ShieldCheck,
    ChefHat,
    AlertCircle,
    ChevronRight,
    MapPin,
    Phone,
    RefreshCw
} from 'lucide-react';
import api from '@food/api';

const DEFAULT_ITEM_PRESETS = [
    { name: '4 Fresh Butter Rotis', quantity: '4 Pcs', image: '/food/tiffin/roti.png', description: 'Freshly puffed whole wheat rotis' },
    { name: 'Homestyle Dal Tadka', quantity: '1 Bowl', image: '/food/tiffin/dal.png', description: 'Slow cooked yellow dal with cumin ghee tadka' },
    { name: 'Seasonal Special Sabzi', quantity: '1 Bowl', image: '/food/tiffin/sabzi.png', description: 'Fresh daily cooked seasonal mixed vegetables' },
    { name: 'Jeera Basmati Rice', quantity: '1 Bowl', image: '/food/tiffin/rice.png', description: 'Aromatic long grain steamed jeera rice' },
    { name: 'Fresh Salad & Pickle', quantity: '1 Portion', image: '/food/tiffin/salad.png', description: 'Crisp cucumber, carrot, lemon & house pickle' }
];

export default function AdminTiffinManagement() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const activeTab = searchParams.get('tab') || 'overview';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data States
    const [overview, setOverview] = useState({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        pausedSubscriptions: 0,
        totalRevenue: 0,
        totalPlans: 0,
        activeKitchens: 0,
        todayDeliveries: { total: 0, morning: 0, evening: 0, delivered: 0, pending: 0 }
    });

    const [plans, setPlans] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [kitchens, setKitchens] = useState([]);
    const [payouts, setPayouts] = useState([]);

    // Filters & Search
    const [subFilterStatus, setSubFilterStatus] = useState('all');
    const [subSearchQuery, setSubSearchQuery] = useState('');
    const [planMealFilter, setPlanMealFilter] = useState('all');

    // Modals
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [viewSubModal, setViewSubModal] = useState(null);

    // Plan Form State
    const [planForm, setPlanForm] = useState({
        name: '',
        durationDays: 30,
        mealType: 'Both',
        price: 4500,
        itemsDescription: '',
        image: '/food/tiffin/tiffin_box_default.png',
        isVegetarian: true,
        isActive: true,
        imageFile: null,
        items: [...DEFAULT_ITEM_PRESETS]
    });

    useEffect(() => {
        fetchAllData();
    }, [activeTab]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.allSettled([
                fetchOverview(),
                fetchPlans(),
                fetchSubscriptions(),
                fetchDeliveries(),
                fetchKitchens(),
                fetchPayouts()
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    const setTab = (tab) => {
        setSearchParams({ tab });
    };

    // --- API Calls ---
    const fetchOverview = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/overview', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/overview', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && res.data.data) {
                setOverview(res.data.data);
            } else {
                setOverview({
                    totalSubscriptions: 0,
                    activeSubscriptions: 0,
                    pausedSubscriptions: 0,
                    totalRevenue: 0,
                    totalPlans: 0,
                    activeKitchens: 0,
                    todayDeliveries: { total: 0, morning: 0, evening: 0, delivered: 0, pending: 0 }
                });
            }
        } catch (e) {
            console.error('Error fetching overview', e);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/plans', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/plans', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setPlans(res.data.data);
            } else {
                setPlans([]);
            }
        } catch (e) {
            console.error('Error fetching plans', e);
            setPlans([]);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/subscriptions', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/subscriptions', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setSubscriptions(res.data.data);
            } else {
                setSubscriptions([]);
            }
        } catch (e) {
            console.error('Error fetching subscriptions', e);
            setSubscriptions([]);
        }
    };

    const fetchDeliveries = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/deliveries/today', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/deliveries/today', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setDeliveries(res.data.data);
            } else {
                setDeliveries([]);
            }
        } catch (e) {
            console.error('Error fetching deliveries', e);
            setDeliveries([]);
        }
    };

    const fetchKitchens = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/kitchen-partners', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/kitchen-partners', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setKitchens(res.data.data);
            } else {
                setKitchens([]);
            }
        } catch (e) {
            console.error('Error fetching kitchens', e);
            setKitchens([]);
        }
    };

    const fetchPayouts = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/payout-logs', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/payout-logs', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setPayouts(res.data.data);
            } else {
                setPayouts([]);
            }
        } catch (e) {
            console.error('Error fetching payouts', e);
            setPayouts([]);
        }
    };

    // --- Actions ---
    const handleToggleSubStatus = async (subId, currentStatus) => {
        const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const res = await api.patch(`/admin/tiffin/subscriptions/${subId}/status`, { status: nextStatus }).catch(() => null);
            setSubscriptions(prev => prev.map(s => s._id === subId ? { ...s, status: nextStatus } : s));
            alert(`Subscription has been ${nextStatus === 'active' ? 'resumed' : 'paused'} successfully.`);
        } catch (e) {
            alert('Failed to update subscription status');
        }
    };

    const handleOpenPlanModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setPlanForm({
                name: plan.name || '',
                durationDays: plan.durationDays || 30,
                mealType: plan.mealType || 'Both',
                price: plan.price || 0,
                itemsDescription: plan.itemsDescription || '',
                image: plan.image || '/food/tiffin/tiffin_box_default.png',
                imageFile: null,
                isVegetarian: plan.isVegetarian !== undefined ? plan.isVegetarian : true,
                isActive: plan.isActive !== undefined ? plan.isActive : true,
                items: plan.items?.length > 0 ? plan.items.map(item => ({ ...item, imageFile: null, imageUrl: item.image })) : [...DEFAULT_ITEM_PRESETS]
            });
        } else {
            setEditingPlan(null);
            setPlanForm({
                name: '',
                durationDays: 30,
                mealType: 'Both',
                price: 4500,
                itemsDescription: '4 Fresh Rotis, Dal, Sabzi, Rice & Salad',
                image: '/food/tiffin/tiffin_box_default.png',
                imageFile: null,
                isVegetarian: true,
                isActive: true,
                items: [...DEFAULT_ITEM_PRESETS]
            });
        }
        setIsPlanModalOpen(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        try {
            const submitData = new FormData();
            submitData.append('name', planForm.name);
            submitData.append('durationDays', Number(planForm.durationDays));
            submitData.append('mealType', planForm.mealType);
            submitData.append('price', Number(planForm.price));
            submitData.append('itemsDescription', planForm.itemsDescription);
            submitData.append('isVegetarian', Boolean(planForm.isVegetarian));
            submitData.append('isActive', Boolean(planForm.isActive));
            
            if (planForm.imageFile) {
                submitData.append('imageFile', planForm.imageFile);
            }

            const itemsToSave = planForm.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                image: item.imageUrl || ''
            }));
            submitData.append('items', JSON.stringify(itemsToSave));

            planForm.items.forEach((item, index) => {
                if (item.imageFile) {
                    submitData.append(`items[${index}][imageFile]`, item.imageFile);
                }
            });

            if (editingPlan) {
                const res = await api.put(`/food/tiffin/admin/plans/${editingPlan._id}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' }, contextModule: 'admin' }).catch(() => null)
                    || await api.put(`/admin/tiffin/plans/${editingPlan._id}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' }, contextModule: 'admin' }).catch(() => null);
                if (res?.data?.success) {
                    setPlans(prev => prev.map(p => p._id === editingPlan._id ? res.data.data : p));
                    alert('Plan updated successfully in database!');
                    fetchOverview();
                } else {
                    alert(res?.data?.message || 'Failed to update plan');
                }
            } else {
                const res = await api.post('/food/tiffin/admin/plans', submitData, { headers: { 'Content-Type': 'multipart/form-data' }, contextModule: 'admin' }).catch(() => null)
                    || await api.post('/admin/tiffin/plans', submitData, { headers: { 'Content-Type': 'multipart/form-data' }, contextModule: 'admin' }).catch(() => null);
                if (res?.data?.success) {
                    setPlans(prev => [res.data.data, ...prev]);
                    alert('Plan created successfully in database!');
                    fetchOverview();
                } else {
                    alert(res?.data?.message || 'Failed to create plan');
                }
            }
            setIsPlanModalOpen(false);
        } catch (e) {
            alert('Failed to save plan to database');
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!window.confirm('Are you sure you want to delete this tiffin plan from database?')) return;
        try {
            const res = await api.delete(`/food/tiffin/admin/plans/${planId}`, { contextModule: 'admin' }).catch(() => null)
                || await api.delete(`/admin/tiffin/plans/${planId}`, { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success) {
                setPlans(prev => prev.filter(p => p._id !== planId));
                alert('Plan deleted successfully from database');
                fetchOverview();
            } else {
                alert(res?.data?.message || 'Failed to delete plan');
            }
        } catch (e) {
            alert('Failed to delete plan');
        }
    };

    // Filtered lists
    const filteredSubscriptions = subscriptions.filter(sub => {
        const matchesStatus = subFilterStatus === 'all' || sub.status === subFilterStatus;
        const q = subSearchQuery.toLowerCase();
        const matchesSearch = !q ||
            sub.userId?.name?.toLowerCase().includes(q) ||
            sub.userId?.phone?.includes(q) ||
            sub._id?.toLowerCase().includes(q) ||
            sub.restaurantId?.name?.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });

    const filteredPlans = plans.filter(plan => {
        if (planMealFilter === 'all') return true;
        return plan.mealType === planMealFilter;
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-rose-100/70 text-[#be123c] rounded-xl">
                            <UtensilsCrossed className="w-6 h-6" />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            Tiffin Service Management
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 pl-11">
                        Control platform-wide subscription plans, user subscriptions, daily dispatches, kitchen partners & payouts.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto pl-11 sm:pl-0">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 rounded-xl transition active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => handleOpenPlanModal()}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#9f1239] via-[#be123c] to-[#e11d48] px-4 py-2.5 rounded-xl shadow-md shadow-[#be123c]/20 hover:opacity-95 active:scale-95 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Plan
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 scrollbar-none">
                {[
                    { id: 'overview', label: 'Overview & Stats', icon: LayoutDashboard },
                    { id: 'plans', label: 'Subscription Plans', count: plans.length, icon: Package },
                    { id: 'subscriptions', label: 'Customer Subscriptions', count: subscriptions.length, icon: Users },
                    { id: 'deliveries', label: 'Daily Meal Dispatch', count: deliveries.length, icon: Truck },
                    { id: 'kitchens', label: 'Kitchen Partners', count: kitchens.length, icon: ChefHat },
                    { id: 'payouts', label: 'Rider Payouts', count: payouts.length, icon: DollarSign }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-[#be123c] text-white shadow-md shadow-[#be123c]/20'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW & STATS */}
            {/* ========================================================================= */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Subscribers</p>
                                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{overview.activeSubscriptions}</p>
                                <span className="text-[11px] text-green-600 font-semibold mt-1 inline-block">
                                    {overview.totalSubscriptions} Total All-Time
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#be123c] flex items-center justify-center border border-rose-100">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Upfront Revenue</p>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">₹{overview.totalRevenue.toLocaleString('en-IN')}</p>
                                <span className="text-[11px] text-gray-400 font-semibold mt-1 inline-block">Zero Daily Surge</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Today's Meals</p>
                                <p className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">{overview.todayDeliveries?.total || 0}</p>
                                <span className="text-[11px] text-orange-600 font-semibold mt-1 inline-block">
                                    {overview.todayDeliveries?.morning || 0} Lunch • {overview.todayDeliveries?.evening || 0} Dinner
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                                <Truck className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Kitchens</p>
                                <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{overview.activeKitchens}</p>
                                <span className="text-[11px] text-blue-600 font-semibold mt-1 inline-block">
                                    {overview.totalPlans} Active Plans
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                <Building2 className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Quick Overview Panels */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Today's Delivery Pulse */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#be123c]" /> Today's Delivery Pulse
                                </h3>
                                <button onClick={() => setTab('deliveries')} className="text-xs font-bold text-[#be123c] hover:underline">
                                    View Roster
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-orange-950">Morning Slot (11:30 AM - 1:00 PM)</p>
                                        <p className="text-[11px] text-orange-700">Lunch Dispatch</p>
                                    </div>
                                    <span className="text-sm font-black text-orange-900">{overview.todayDeliveries?.morning || 0} Meals</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-indigo-950">Evening Slot (7:30 PM - 9:00 PM)</p>
                                        <p className="text-[11px] text-indigo-700">Dinner Dispatch</p>
                                    </div>
                                    <span className="text-sm font-black text-indigo-900">{overview.todayDeliveries?.evening || 0} Meals</span>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex items-center justify-between border border-gray-100">
                                <span>Completed Deliveries Today</span>
                                <span className="font-bold text-green-600">{overview.todayDeliveries?.delivered || 0} / {overview.todayDeliveries?.total || 0}</span>
                            </div>
                        </div>

                        {/* Popular Tiffin Plans Preview */}
                        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#be123c]" /> Active Subscription Plans
                                </h3>
                                <button onClick={() => setTab('plans')} className="text-xs font-bold text-[#be123c] hover:underline">
                                    Manage All Plans ({plans.length})
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {plans.slice(0, 4).map(p => (
                                    <div key={p._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                                        <img
                                            src={p.image || '/food/tiffin/tiffin_box_default.png'}
                                            alt={p.name}
                                            onError={(e) => { e.target.src = '/food/tiffin/tiffin_box_default.png'; }}
                                            className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0 bg-white"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-gray-900 truncate">{p.name}</h4>
                                            <p className="text-[10px] text-gray-500 truncate">{p.restaurantId?.restaurantName || p.restaurantId?.name || "Renuka's kitchen"}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs font-black text-gray-900">₹{p.price} <span className="text-[10px] font-normal text-gray-400">/{p.durationDays}d</span></span>
                                                <span className="text-[10px] font-bold text-[#be123c] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                    {p.mealType}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: SUBSCRIPTION PLANS */}
            {/* ========================================================================= */}
            {activeTab === 'plans' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
                    {/* Filter & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">Filter Meal Slot:</span>
                            <select
                                value={planMealFilter}
                                onChange={(e) => setPlanMealFilter(e.target.value)}
                                className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none"
                            >
                                <option value="all">All Meal Slots</option>
                                <option value="Both">Morning + Evening (Both)</option>
                                <option value="Morning">Morning (Lunch Only)</option>
                                <option value="Evening">Evening (Dinner Only)</option>
                            </select>
                        </div>
                        <button
                            onClick={() => handleOpenPlanModal()}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#be123c] px-4 py-2.5 rounded-xl hover:opacity-95 active:scale-95 transition"
                        >
                            <Plus className="w-4 h-4" /> Create New Plan
                        </button>
                    </div>

                    {/* Plans Grid */}
                    {filteredPlans.length === 0 ? (
                        <div className="bg-gray-50 rounded-2xl p-12 text-center space-y-2 border border-gray-100">
                            <Utensils className="w-10 h-10 text-gray-300 mx-auto" />
                            <h4 className="font-bold text-gray-700 text-sm">No Tiffin Plans Found</h4>
                            <p className="text-xs text-gray-400">Click "Create New Plan" above to add your first subscription meal plan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {filteredPlans.map(plan => (
                                <div
                                    key={plan._id}
                                    className="rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={plan.image || '/food/tiffin/tiffin_box_default.png'}
                                                alt={plan.name}
                                                onError={(e) => { e.target.src = '/food/tiffin/tiffin_box_default.png'; }}
                                                className="w-18 h-18 rounded-xl object-cover border border-gray-200 shrink-0 bg-gray-50 shadow-sm"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                        plan.isVegetarian ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {plan.isVegetarian ? '🟢 Pure Veg' : '🔴 Non-Veg'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-[#be123c] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                        {plan.mealType}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">{plan.name}</h3>
                                                <p className="text-[11px] text-gray-500 truncate">{plan.restaurantId?.restaurantName || plan.restaurantId?.name || "Renuka's kitchen"}</p>
                                            </div>
                                        </div>

                                        {/* Items Preview */}
                                        <div className="bg-gray-50 p-2.5 rounded-xl text-[11px] text-gray-600 space-y-1 border border-gray-100">
                                            <span className="font-bold text-gray-800 block text-[10px] uppercase">Box Items:</span>
                                            <p className="line-clamp-2">{plan.itemsDescription || '4 Rotis, Dal Tadka, Seasonal Sabzi, Jeera Rice, Salad'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-base font-black text-gray-900">₹{plan.price}</span>
                                            <span className="text-xs text-gray-400 ml-1">/{plan.durationDays} Days</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenPlanModal(plan)}
                                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition"
                                                title="Edit Plan"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlan(plan._id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition"
                                                title="Delete Plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: CUSTOMER SUBSCRIPTIONS */}
            {/* ========================================================================= */}
            {activeTab === 'subscriptions' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by customer name, phone, or sub ID..."
                                value={subSearchQuery}
                                onChange={(e) => setSubSearchQuery(e.target.value)}
                                className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:bg-white focus:border-[#be123c]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">Status:</span>
                            <select
                                value={subFilterStatus}
                                onChange={(e) => setSubFilterStatus(e.target.value)}
                                className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left text-xs text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-3.5">Customer</th>
                                    <th className="p-3.5">Kitchen</th>
                                    <th className="p-3.5">Plan / Slot</th>
                                    <th className="p-3.5">Dates</th>
                                    <th className="p-3.5">Amount Paid</th>
                                    <th className="p-3.5">Status</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSubscriptions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-10 text-gray-400 font-medium">
                                            No active or recorded subscriptions found in the database.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSubscriptions.map(sub => (
                                        <tr key={sub._id} className="hover:bg-gray-50/70 transition">
                                            <td className="p-3.5 font-bold text-gray-900">
                                                {sub.userId?.name || 'Customer'}
                                                <span className="block text-[10px] font-normal text-gray-400">{sub.userId?.phone}</span>
                                            </td>
                                            <td className="p-3.5 font-medium text-gray-800">
                                                {sub.restaurantId?.restaurantName || sub.restaurantId?.name || "Renuka's kitchen"}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-semibold text-gray-900">{sub.planId?.name}</div>
                                                <span className="text-[10px] text-gray-400">{sub.planId?.durationDays} Days • {sub.planId?.mealType}</span>
                                            </td>
                                            <td className="p-3.5 text-gray-500">
                                                {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-3.5 font-bold text-gray-900">₹{sub.amountPaid}</td>
                                            <td className="p-3.5">
                                                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                                    sub.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    sub.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewSubModal(sub)}
                                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleSubStatus(sub._id, sub.status)}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                                            sub.status === 'active'
                                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                                                        }`}
                                                    >
                                                        {sub.status === 'active' ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                                        {sub.status === 'active' ? 'Pause' : 'Resume'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: DAILY MEAL DISPATCH */}
            {/* ========================================================================= */}
            {activeTab === 'deliveries' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-[#be123c]" /> Today's Live Meal Dispatches
                            </h3>
                            <p className="text-xs text-gray-500">Morning & Evening scheduled tiffin drops with assigned riders</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left text-xs text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-3.5">Slot / Time</th>
                                    <th className="p-3.5">Customer & Phone</th>
                                    <th className="p-3.5">Delivery Address</th>
                                    <th className="p-3.5">Kitchen Prep</th>
                                    <th className="p-3.5">Assigned Rider</th>
                                    <th className="p-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {deliveries.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                                            No dispatches scheduled for today.
                                        </td>
                                    </tr>
                                ) : (
                                    deliveries.map(del => (
                                        <tr key={del._id} className="hover:bg-gray-50/70 transition">
                                            <td className="p-3.5">
                                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                    del.type === 'Morning' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
                                                }`}>
                                                    {del.type === 'Morning' ? '☀️ Lunch' : '🌙 Dinner'}
                                                </span>
                                                <span className="block text-[10px] text-gray-400 mt-0.5">{del.timeSlot || '11:30 AM - 1:00 PM'}</span>
                                            </td>
                                            <td className="p-3.5 font-bold text-gray-900">
                                                {del.userId?.name}
                                                <span className="block text-[10px] font-normal text-gray-400">{del.userId?.phone}</span>
                                            </td>
                                            <td className="p-3.5 max-w-xs truncate text-gray-600">
                                                {del.deliveryAddress?.fullAddress || del.deliveryAddress?.street || 'Indore'}
                                            </td>
                                            <td className="p-3.5 font-medium text-gray-800">
                                                {del.restaurantId?.restaurantName || del.restaurantId?.name || "Renuka's kitchen"}
                                            </td>
                                            <td className="p-3.5">
                                                {del.assignedTo ? (
                                                    <div>
                                                        <span className="font-bold text-gray-900">{del.assignedTo.name}</span>
                                                        <span className="block text-[10px] text-gray-400">{del.assignedTo.phone}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="p-3.5">
                                                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                                    del.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    del.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {del.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: KITCHEN PARTNERS */}
            {/* ========================================================================= */}
            {activeTab === 'kitchens' && (
                <div>
                    {kitchens.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-2">
                            <Utensils className="w-10 h-10 text-gray-300 mx-auto" />
                            <h4 className="font-bold text-gray-700 text-sm">No Kitchen Partners Found</h4>
                            <p className="text-xs text-gray-400">Approved restaurants will be listed here with their tiffin subscriptions count.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {kitchens.map(k => (
                                <div key={k._id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-[#be123c] flex items-center justify-center font-black text-lg">
                                            {(k.restaurantName || k.name)?.charAt(0) || 'K'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">{k.restaurantName || k.name}</h4>
                                            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 text-gray-400" /> {k.address || 'Vijay Nagar, Indore'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-center">
                                        <div className="bg-gray-50 p-2.5 rounded-xl">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold block">Tiffin Plans</span>
                                            <span className="text-base font-black text-gray-900">{k.tiffinPlansCount || 0}</span>
                                        </div>
                                        <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                                            <span className="text-[10px] text-[#be123c] uppercase font-bold block">Active Subs</span>
                                            <span className="text-base font-black text-[#be123c]">{k.activeSubscribersCount || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: RIDER PAYOUTS */}
            {/* ========================================================================= */}
            {activeTab === 'payouts' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#be123c]" /> Delivery Rider Payout Logs
                            </h3>
                            <p className="text-xs text-gray-500">Per-delivery earnings credited to partner wallets</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left text-xs text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-3.5">Rider Name</th>
                                    <th className="p-3.5">Phone Number</th>
                                    <th className="p-3.5">Completed Tiffin Drops</th>
                                    <th className="p-3.5">Total Earnings</th>
                                    <th className="p-3.5 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-10 text-gray-400 font-medium">
                                            No rider payouts logged yet. Payouts will calculate automatically upon order delivery.
                                        </td>
                                    </tr>
                                ) : (
                                    payouts.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/70 transition">
                                            <td className="p-3.5 font-bold text-gray-900">{p.partnerName || 'Delivery Partner'}</td>
                                            <td className="p-3.5 text-gray-500">{p.partnerPhone || '—'}</td>
                                            <td className="p-3.5 font-bold text-gray-800">{p.totalDeliveries} Drops</td>
                                            <td className="p-3.5 font-black text-emerald-600 text-sm">₹{p.totalEarnings}</td>
                                            <td className="p-3.5 text-right">
                                                <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-green-100 text-green-700 uppercase">
                                                    Credited
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* PLAN CREATION / EDIT MODAL */}
            {/* ========================================================================= */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="font-black text-gray-900 text-base">
                                    {editingPlan ? 'Edit Tiffin Plan' : 'Create New Tiffin Plan'}
                                </h3>
                                <p className="text-xs text-gray-500">Configure menu, pricing, duration, and food items</p>
                            </div>
                            <button onClick={() => setIsPlanModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={planForm.name}
                                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                    placeholder="e.g. Homestyle North Indian Tiffin"
                                    className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Duration (Days)</label>
                                    <select
                                        value={planForm.durationDays}
                                        onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                                        className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                    >
                                        <option value={7}>7 Days (1 Week)</option>
                                        <option value={15}>15 Days</option>
                                        <option value={30}>30 Days (1 Month)</option>
                                        <option value={90}>90 Days (Quarterly)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Meal Slot</label>
                                    <select
                                        value={planForm.mealType}
                                        onChange={(e) => setPlanForm({ ...planForm, mealType: e.target.value })}
                                        className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                    >
                                        <option value="Both">Morning + Evening (Both)</option>
                                        <option value="Morning">Morning (Lunch Only)</option>
                                        <option value="Evening">Evening (Dinner Only)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Total Upfront Price (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={planForm.price}
                                        onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                                        className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Food Preference</label>
                                    <select
                                        value={planForm.isVegetarian ? 'veg' : 'non-veg'}
                                        onChange={(e) => setPlanForm({ ...planForm, isVegetarian: e.target.value === 'veg' })}
                                        className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                    >
                                        <option value="veg">🟢 Pure Vegetarian</option>
                                        <option value="non-veg">🔴 Non-Vegetarian</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Overview Description</label>
                                <textarea
                                    rows={2}
                                    value={planForm.itemsDescription}
                                    onChange={(e) => setPlanForm({ ...planForm, itemsDescription: e.target.value })}
                                    placeholder="e.g. 4 Fresh Butter Rotis, Dal Tadka, Sabzi, Jeera Rice & Salad"
                                    className="w-full text-xs font-medium p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                />
                            </div>

                            {/* Plan Image */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Plan Thumbnail Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setPlanForm({ ...planForm, imageFile: e.target.files[0] })}
                                        className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-[#be123c]/10 file:text-[#be123c]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Or Image URL</label>
                                    <input
                                        type="text"
                                        value={planForm.image}
                                        onChange={(e) => setPlanForm({ ...planForm, image: e.target.value })}
                                        placeholder="/food/tiffin/tiffin_box_default.png"
                                        className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Items Array */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-gray-700">Individual Meal Items (Dynamic)</label>
                                    <button
                                        type="button"
                                        onClick={() => setPlanForm({
                                            ...planForm, 
                                            items: [...planForm.items, { name: '', quantity: '', imageFile: null, imageUrl: '' }]
                                        })}
                                        className="inline-flex items-center gap-1 bg-white border border-gray-300 px-2.5 py-1 rounded text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                                    >
                                        <Plus className="w-3 h-3" /> Add Item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {planForm.items.length === 0 ? (
                                        <div className="text-center py-3 text-xs text-gray-400 border border-dashed rounded-lg">No items. Click Add Item.</div>
                                    ) : planForm.items.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                                            <input
                                                type="text"
                                                placeholder="Item Name"
                                                value={item.name}
                                                onChange={(e) => {
                                                    const newItems = [...planForm.items];
                                                    newItems[index].name = e.target.value;
                                                    setPlanForm({ ...planForm, items: newItems });
                                                }}
                                                className="w-full sm:flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...planForm.items];
                                                    newItems[index].quantity = e.target.value;
                                                    setPlanForm({ ...planForm, items: newItems });
                                                }}
                                                className="w-full sm:w-20 text-xs px-2 py-1.5 border border-gray-300 rounded outline-none"
                                            />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const newItems = [...planForm.items];
                                                    newItems[index].imageFile = e.target.files[0];
                                                    setPlanForm({ ...planForm, items: newItems });
                                                }}
                                                className="w-full sm:w-40 text-[10px] file:mr-1 file:py-1 file:px-1.5 file:rounded file:border-0 file:bg-gray-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newItems = [...planForm.items];
                                                    newItems.splice(index, 1);
                                                    setPlanForm({ ...planForm, items: newItems });
                                                }}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPlanModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#9f1239] via-[#be123c] to-[#e11d48] shadow-md shadow-[#be123c]/20 hover:opacity-95"
                                >
                                    {editingPlan ? 'Save Changes' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW SUBSCRIPTION DETAILS MODAL */}
            {/* ========================================================================= */}
            {viewSubModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="font-black text-gray-900 text-base">Subscription Details</h3>
                                <p className="text-[11px] text-gray-400">ID: {viewSubModal._id}</p>
                            </div>
                            <button onClick={() => setViewSubModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="bg-gray-50 p-3.5 rounded-2xl space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Customer</span>
                                <p className="font-bold text-gray-900 text-sm">{viewSubModal.userId?.name}</p>
                                <p className="text-gray-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {viewSubModal.userId?.phone}</p>
                            </div>

                            <div className="bg-gray-50 p-3.5 rounded-2xl space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Plan & Kitchen</span>
                                <p className="font-bold text-gray-900">{viewSubModal.planId?.name}</p>
                                <p className="text-gray-600">Kitchen: {viewSubModal.restaurantId?.restaurantName || viewSubModal.restaurantId?.name || "Renuka's kitchen"} • ₹{viewSubModal.amountPaid}</p>
                            </div>

                            <div className="bg-gray-50 p-3.5 rounded-2xl space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Delivery Address</span>
                                <p className="text-gray-800">{viewSubModal.deliveryAddress?.street || viewSubModal.deliveryAddress?.fullAddress}, {viewSubModal.deliveryAddress?.city}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 p-3 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Start Date</span>
                                    <span className="font-bold text-gray-900">{new Date(viewSubModal.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">End Date</span>
                                    <span className="font-bold text-gray-900">{new Date(viewSubModal.endDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setViewSubModal(null)}
                                className="w-full py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
