import React, { useState, useEffect } from 'react';
import { 
    Utensils, 
    Sun, 
    Moon, 
    TrendingUp, 
    Users, 
    RefreshCw, 
    Calendar, 
    Clock, 
    User, 
    CheckCircle2, 
    ArrowRight,
    IndianRupee,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@food/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import RestaurantPageShell from '@food/components/restaurant/RestaurantPageShell';

export default function TiffinPrepDashboard() {
    const [dashboardData, setDashboardData] = useState({
        Morning: 0,
        Evening: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/food/tiffin/restaurant/prep-dashboard', { contextModule: 'restaurant' });
            if (response.data?.success && response.data?.data) {
                setDashboardData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        const token = localStorage.getItem('token');
        let socket = null;
        if (token) {
            socket = io(API_BASE_URL, {
                auth: { token },
                transports: ['websocket']
            });
            
            socket.on('new-tiffin-subscription', () => {
                fetchDashboardData();
            });
        }
        
        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('en-US', dateOptions);

    return (
        <RestaurantPageShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tiffin Prep Dashboard</h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                {todayStr}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Daily kitchen preparation schedule, subscriber counts, and active revenue.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            to="/food/restaurant/tiffin-dispatch"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#B80B3D] text-white hover:bg-[#9a0933] shadow-sm transition"
                        >
                            <span>Open Dispatch Panel</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button 
                            onClick={fetchDashboardData} 
                            disabled={loading}
                            title="Refresh data"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#B80B3D] rounded-full animate-spin"></div>
                        <p className="text-xs text-gray-500 font-medium">Loading tiffin prep data...</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Morning Batch */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Lunch Batch
                                    </span>
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Sun className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-extrabold text-gray-900">
                                            {dashboardData.Morning}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">boxes today</span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        Deliveries by 1:00 PM
                                    </p>
                                </div>
                            </div>

                            {/* Evening Batch */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Dinner Batch
                                    </span>
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Moon className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-extrabold text-gray-900">
                                            {dashboardData.Evening}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">boxes today</span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        Deliveries by 8:00 PM
                                    </p>
                                </div>
                            </div>

                            {/* Active Subscriptions */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Active Subscribers
                                    </span>
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-extrabold text-gray-900">
                                            {dashboardData.activeSubscriptions}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">active plans</span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        Ongoing customers
                                    </p>
                                </div>
                            </div>

                            {/* Total Revenue */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Active Revenue
                                    </span>
                                    <div className="w-9 h-9 rounded-lg bg-rose-50 text-[#B80B3D] flex items-center justify-center">
                                        <IndianRupee className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-extrabold text-gray-900">
                                            ₹{Number(dashboardData.totalRevenue || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                        Total paid subscription value
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dispatch Helper Banner */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-rose-50 text-[#B80B3D] flex items-center justify-center shrink-0">
                                    <Utensils className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Ready to route and dispatch today's tiffins?</p>
                                    <p className="text-xs text-gray-500">Group deliveries by micro-zones and assign batches to riders in 1-click.</p>
                                </div>
                            </div>
                            <Link
                                to="/food/restaurant/tiffin-dispatch"
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#B80B3D] bg-rose-50 hover:bg-rose-100 border border-rose-200 transition shrink-0"
                            >
                                <span>Go to Dispatch Panel</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Recent Activity Table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Recent Subscriptions</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Latest users who enrolled in your tiffin service.</p>
                                </div>
                                <span className="text-xs font-medium text-gray-500">
                                    {dashboardData.recentActivity.length} recent
                                </span>
                            </div>
                            
                            {dashboardData.recentActivity.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800">No subscriptions yet</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                                        New customer subscriptions will appear here automatically.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                                                <th className="px-5 py-3">Customer</th>
                                                <th className="px-5 py-3">Plan Enrolled</th>
                                                <th className="px-5 py-3">Meal Slot</th>
                                                <th className="px-5 py-3">Amount</th>
                                                <th className="px-5 py-3">Subscribed On</th>
                                                <th className="px-5 py-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dashboardData.recentActivity.map((sub) => {
                                                const userName = sub.userId?.name || 'Guest User';
                                                const userPhone = sub.userId?.phone || '—';
                                                const planName = sub.planId?.name || 'Standard Tiffin Plan';
                                                const duration = sub.planId?.durationDays ? `${sub.planId.durationDays} Days` : 'Monthly';
                                                const mealType = sub.planId?.mealType || 'Both';
                                                const dateStr = sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                }) : '—';

                                                return (
                                                    <tr key={sub._id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden shrink-0">
                                                                    {sub.userId?.profileImage || sub.userId?.avatar ? (
                                                                        <img 
                                                                            src={sub.userId.profileImage || sub.userId.avatar} 
                                                                            alt={userName} 
                                                                            className="w-full h-full object-cover" 
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs">{userName.charAt(0).toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{userName}</p>
                                                                    <p className="text-[11px] text-gray-500">{userPhone}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <p className="font-medium text-gray-900">{planName}</p>
                                                            <p className="text-[11px] text-gray-500">{duration}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                                                                mealType === 'Morning' 
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                                    : mealType === 'Evening'
                                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            }`}>
                                                                {mealType === 'Morning' ? <Sun className="w-3 h-3" /> : mealType === 'Evening' ? <Moon className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                                                                {mealType === 'Morning' ? 'Lunch Only' : mealType === 'Evening' ? 'Dinner Only' : 'Lunch & Dinner'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-gray-900">
                                                            ₹{Number(sub.amountPaid || 0).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap text-gray-500">
                                                            {dateStr}
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </RestaurantPageShell>
    );
}
