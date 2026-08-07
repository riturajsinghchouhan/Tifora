import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UtensilsCrossed,
    DollarSign,
    TrendingUp,
    Truck,
    Building2,
    ArrowUpRight,
    RefreshCw,
    Users,
    ChevronRight,
    Sparkles,
    CreditCard,
    CheckCircle2,
    Clock,
    Sun,
    Moon
} from 'lucide-react';
import api from '@/services/api';

const INR_SYMBOL = '\u20B9';

function formatCurrency(amount, options = {}) {
    const numericAmount = Number(amount || 0);
    return `${INR_SYMBOL}${numericAmount.toLocaleString('en-IN', options)}`;
}

export default function TiffinAdminDashboardSection() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [overviewData, setOverviewData] = useState({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        pausedSubscriptions: 0,
        totalRevenue: 0,
        activeKitchens: 0,
        todayDeliveries: { total: 0, morning: 0, evening: 0, delivered: 0, pending: 0 }
    });

    const [commissionData, setCommissionData] = useState({
        totalCommission: 0,
        totalGst: 0,
        netAdminEarnings: 0,
        globalCommissionPercentage: 10,
        totalKitchens: 0
    });

    const [payoutData, setPayoutData] = useState({
        totalRequested: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        pendingCount: 0,
        approvedCount: 0
    });

    const [salaryData, setSalaryData] = useState({
        totalSalaryEarned: 0,
        totalSalaryDisbursed: 0,
        totalPendingSalary: 0,
        totalMealsDelivered: 0,
        activeRidersCount: 0
    });

    const fetchAllTiffinStats = async () => {
        try {
            const [overviewRes, commRes, payoutRes, salaryRes] = await Promise.allSettled([
                api.get('/food/tiffin/admin/overview', { contextModule: 'admin' }).catch(() => null)
                    || api.get('/admin/tiffin/overview', { contextModule: 'admin' }).catch(() => null),
                api.get('/food/tiffin/admin/commission-settings', { contextModule: 'admin' }).catch(() => null)
                    || api.get('/admin/tiffin/commission-settings', { contextModule: 'admin' }).catch(() => null),
                api.get('/food/tiffin/admin/restaurant-payouts', { contextModule: 'admin' }).catch(() => null)
                    || api.get('/admin/tiffin/restaurant-payouts', { contextModule: 'admin' }).catch(() => null),
                api.get('/food/tiffin/admin/delivery-salaries', { contextModule: 'admin' }).catch(() => null)
                    || api.get('/admin/tiffin/delivery-salaries', { contextModule: 'admin' }).catch(() => null)
            ]);

            if (overviewRes.status === 'fulfilled' && overviewRes.value?.data?.data) {
                setOverviewData(overviewRes.value.data.data);
            }
            if (commRes.status === 'fulfilled' && commRes.value?.data?.data?.stats) {
                setCommissionData(commRes.value.data.data.stats);
            }
            if (payoutRes.status === 'fulfilled' && payoutRes.value?.data?.stats) {
                setPayoutData(payoutRes.value.data.stats);
            }
            if (salaryRes.status === 'fulfilled' && salaryRes.value?.data?.data?.stats) {
                setSalaryData(salaryRes.value.data.data.stats);
            }
        } catch (e) {
            console.error('Error fetching tiffin stats:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllTiffinStats();
    }, []);

    const handleRefresh = (e) => {
        e.stopPropagation();
        setRefreshing(true);
        fetchAllTiffinStats();
    };

    // Real dynamic financial calculations from actual database state
    const grossRevenue = Number(overviewData.totalRevenue || 0);
    const adminCommissionProfit = Number(commissionData.totalCommission || 0);
    const adminNetProfit = Number(commissionData.netAdminEarnings || (adminCommissionProfit + Number(commissionData.totalGst || 0)));

    return (
        <div className="rounded-3xl border border-amber-200/80 bg-linear-to-br from-amber-500/5 via-orange-500/5 to-amber-500/10 p-5 lg:p-6 relative overflow-hidden shadow-xs">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-amber-200/60">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
                        <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Tiffin Service Financials & Earnings</h2>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300/60">
                                <Sparkles className="h-3 w-3 text-amber-600" />
                                Dedicated Hub
                            </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            Real-time subscription revenue, platform profit from restaurants, and rider delivery payouts
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="Refresh Tiffin Statistics"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 text-neutral-500 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-management')}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                        <span>Full Tiffin Manager</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* 4 Main Financial Metrics Cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                {/* 1. Tiffin Gross Revenue */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-management?tab=subscriptions')}
                    className="group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white/90 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-amber-300 cursor-pointer backdrop-blur-xs"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Gross Subscription Earning</span>
                            <h3 className="text-2xl font-black text-neutral-900 mt-1">
                                {formatCurrency(grossRevenue)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Users className="h-3.5 w-3.5 text-amber-600" />
                                <span>{overviewData.activeSubscriptions} active subs ({overviewData.totalSubscriptions} total)</span>
                            </div>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs group-hover:scale-110 transition-transform">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                            {overviewData.pausedSubscriptions} paused
                        </span>
                        <span className="text-neutral-500 group-hover:text-amber-700 flex items-center gap-0.5 font-medium transition-colors">
                            View Plans <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 2. Admin Net Profit (Tiffin Commission) */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-restaurant-commission')}
                    className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white/90 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 cursor-pointer backdrop-blur-xs"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Admin Tiffin Profit</span>
                            <h3 className="text-2xl font-black text-neutral-900 mt-1">
                                {formatCurrency(adminNetProfit)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Comm: {formatCurrency(adminCommissionProfit)} + GST</span>
                            </div>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                            {commissionData.globalCommissionPercentage}% Global Rate
                        </span>
                        <span className="text-neutral-500 group-hover:text-emerald-700 flex items-center gap-0.5 font-medium transition-colors">
                            Kitchen Rates <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 3. Delivery Boy Salaries Disbursed */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-delivery-salary')}
                    className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-white/90 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer backdrop-blur-xs"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Delivery Boy Salaries</span>
                            <h3 className="text-2xl font-black text-neutral-900 mt-1">
                                {formatCurrency(salaryData.totalSalaryDisbursed)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Truck className="h-3.5 w-3.5 text-blue-600" />
                                <span>{salaryData.totalMealsDelivered} drops completed</span>
                            </div>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs group-hover:scale-110 transition-transform">
                            <Truck className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                            Pending: {formatCurrency(salaryData.totalPendingSalary)}
                        </span>
                        <span className="text-neutral-500 group-hover:text-blue-700 flex items-center gap-0.5 font-medium transition-colors">
                            Rider Roster <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 4. Restaurant Payouts */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-restaurant-payouts')}
                    className="group relative overflow-hidden rounded-2xl border border-purple-200/80 bg-white/90 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-purple-300 cursor-pointer backdrop-blur-xs"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Kitchen Payouts Settle</span>
                            <h3 className="text-2xl font-black text-neutral-900 mt-1">
                                {formatCurrency(payoutData.approvedAmount)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                                <span>{payoutData.approvedCount} payouts settled</span>
                            </div>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-2xs group-hover:scale-110 transition-transform">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className={`font-medium px-2 py-0.5 rounded-md ${payoutData.pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>
                            {payoutData.pendingCount} pending ({formatCurrency(payoutData.pendingAmount)})
                        </span>
                        <span className="text-neutral-500 group-hover:text-purple-700 flex items-center gap-0.5 font-medium transition-colors">
                            Requests <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Operations Bar */}
            <div className="relative z-10 mt-4 rounded-2xl bg-white/80 border border-amber-200/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-700 font-bold">
                            🍱
                        </span>
                        <span className="text-neutral-600 font-medium">Today's Meals:</span>
                        <span className="font-bold text-neutral-900">{overviewData.todayDeliveries?.total || 0} scheduled</span>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            {overviewData.todayDeliveries?.delivered || 0} Delivered
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-3 text-neutral-500">
                        <span className="flex items-center gap-1">
                            <Sun className="h-3.5 w-3.5 text-amber-500" />
                            Morning: <b>{overviewData.todayDeliveries?.morning || 0}</b>
                        </span>
                        <span className="flex items-center gap-1">
                            <Moon className="h-3.5 w-3.5 text-indigo-500" />
                            Evening: <b>{overviewData.todayDeliveries?.evening || 0}</b>
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-restaurant-payouts')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
                    >
                        💳 Payout Requests
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-restaurant-commission')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
                    >
                        💼 Kitchen Commission
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-delivery-salary')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
                    >
                        🚴 Delivery Salary
                    </button>
                </div>
            </div>
        </div>
    );
}
