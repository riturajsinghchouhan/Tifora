import React, { useState, useEffect } from 'react';
import { Utensils, Sun, Moon, TrendingUp, Users, RefreshCw, CalendarCheck, Clock, User, CheckCircle2 } from 'lucide-react';
import api from '@food/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';

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
            if (response.data.success) {
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

    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('en-US', dateOptions);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col space-y-6 font-sans bg-gray-50/50">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-indigo-200 border border-white/10 flex items-center gap-1.5">
                            <CalendarCheck className="w-3.5 h-3.5 text-indigo-300" /> {todayStr}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                        Tiffin Performance Dashboard
                    </h1>
                    <p className="text-sm text-indigo-100 max-w-xl">
                        Monitor today's kitchen prep requirements, active subscription base, and real-time revenue analytics.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-start md:justify-end">
                    <button 
                        onClick={fetchDashboardData} 
                        disabled={loading}
                        className="px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 transition backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <>
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Morning Prep */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition duration-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Morning Batch</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Deliveries by 1:00 PM</p>
                                </div>
                                <div className="w-10 h-10 bg-white rounded-xl text-orange-500 shadow-sm flex items-center justify-center">
                                    <Sun className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">{dashboardData.Morning} <span className="text-sm font-medium text-gray-500 tracking-normal">tiffins</span></h3>
                        </div>

                        {/* Evening Prep */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition duration-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Evening Batch</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Deliveries by 8:00 PM</p>
                                </div>
                                <div className="w-10 h-10 bg-white rounded-xl text-indigo-500 shadow-sm flex items-center justify-center">
                                    <Moon className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">{dashboardData.Evening} <span className="text-sm font-medium text-gray-500 tracking-normal">tiffins</span></h3>
                        </div>

                        {/* Active Subscribers */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition duration-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Base</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Current subscriptions</p>
                                </div>
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900">{dashboardData.activeSubscriptions} <span className="text-sm font-medium text-gray-500 tracking-normal">users</span></h3>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition duration-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Gross Revenue</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">From active plans</p>
                                </div>
                                <div className="w-10 h-10 bg-rose-50 rounded-xl text-rose-600 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900">₹{dashboardData.totalRevenue.toLocaleString('en-IN')}</h3>
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Utensils className="w-4 h-4 text-indigo-500" /> Recent Subscriptions
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Latest users who joined your tiffin service.</p>
                            </div>
                        </div>
                        
                        <div className="p-0">
                            {dashboardData.recentActivity.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                        <Clock className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">No recent activity</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">New subscriptions will appear here automatically.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Customer</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Plan Enrolled</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Amount Paid</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {dashboardData.recentActivity.map((sub) => (
                                                <tr key={sub._id} className="hover:bg-gray-50/50 transition duration-150">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-sm">
                                                                {sub.userId?.profileImage || sub.userId?.avatar ? (
                                                                    <img src={sub.userId.profileImage || sub.userId.avatar} alt="User" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{sub.userId?.name || 'Guest User'}</p>
                                                                <p className="text-[11px] text-gray-500">{sub.userId?.phone || 'No phone'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="text-sm font-semibold text-gray-900">{sub.planId?.name || 'Unknown Plan'}</p>
                                                        <p className="text-[11px] text-gray-500">{sub.planId?.durationDays} Days • {sub.planId?.mealType}</p>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            ₹{sub.amountPaid}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-600">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Active
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            {new Date(sub.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
