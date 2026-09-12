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
    CreditCard,
    Sun,
    Moon,
    CheckCircle2,
    Calendar
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
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs transition-all">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                        <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
                                Tiffin Service Financials & Earnings
                            </h2>
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/70">
                                Live Overview
                            </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            Subscription revenue, platform commission, kitchen settlements, and rider delivery payouts
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 transition-all cursor-pointer"
                        title="Sync statistics"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 text-neutral-500 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-management')}
                        className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
                    >
                        <span>Tiffin Hub</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* 4 Financial Metrics Cards with Light Color Tints */}
            <div className="grid grid-cols-1 gap-3.5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Tiffin Gross Revenue */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-management?tab=subscriptions')}
                    className="group relative overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 transition-all duration-200 hover:bg-amber-50/70 hover:border-amber-300 hover:shadow-sm cursor-pointer"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                                Gross Subscription
                            </span>
                            <h3 className="text-xl font-bold text-neutral-900 mt-1">
                                {formatCurrency(grossRevenue)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Users className="h-3.5 w-3.5 text-amber-700" />
                                <span className="truncate">{overviewData.activeSubscriptions} active ({overviewData.totalSubscriptions} total)</span>
                            </div>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-amber-200/50 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded">
                            {overviewData.pausedSubscriptions} paused
                        </span>
                        <span className="text-neutral-500 group-hover:text-amber-800 inline-flex items-center gap-0.5 font-medium transition-colors">
                            View Plans <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 2. Admin Net Profit */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-restaurant-commission')}
                    className="group relative overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4 transition-all duration-200 hover:bg-emerald-50/70 hover:border-emerald-300 hover:shadow-sm cursor-pointer"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                                Admin Tiffin Profit
                            </span>
                            <h3 className="text-xl font-bold text-neutral-900 mt-1">
                                {formatCurrency(adminNetProfit)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
                                <span className="truncate">Comm: {formatCurrency(adminCommissionProfit)} + GST</span>
                            </div>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-emerald-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded">
                            {commissionData.globalCommissionPercentage}% Global Rate
                        </span>
                        <span className="text-neutral-500 group-hover:text-emerald-800 inline-flex items-center gap-0.5 font-medium transition-colors">
                            Rates <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 3. Delivery Boy Salaries */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-delivery-salary')}
                    className="group relative overflow-hidden rounded-xl border border-sky-200/60 bg-sky-50/40 p-4 transition-all duration-200 hover:bg-sky-50/70 hover:border-sky-300 hover:shadow-sm cursor-pointer"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">
                                Rider Salaries
                            </span>
                            <h3 className="text-xl font-bold text-neutral-900 mt-1">
                                {formatCurrency(salaryData.totalSalaryDisbursed)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Truck className="h-3.5 w-3.5 text-sky-700" />
                                <span className="truncate">{salaryData.totalMealsDelivered} drops completed</span>
                            </div>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-sky-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <Truck className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-sky-200/50 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-neutral-700 bg-sky-100/60 px-2 py-0.5 rounded">
                            Pending: {formatCurrency(salaryData.totalPendingSalary)}
                        </span>
                        <span className="text-neutral-500 group-hover:text-sky-800 inline-flex items-center gap-0.5 font-medium transition-colors">
                            Roster <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>

                {/* 4. Kitchen Payouts */}
                <div
                    onClick={() => navigate('/admin/food/tiffin-restaurant-payouts')}
                    className="group relative overflow-hidden rounded-xl border border-violet-200/60 bg-violet-50/40 p-4 transition-all duration-200 hover:bg-violet-50/70 hover:border-violet-300 hover:shadow-sm cursor-pointer"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">
                                Kitchen Payouts
                            </span>
                            <h3 className="text-xl font-bold text-neutral-900 mt-1">
                                {formatCurrency(payoutData.approvedAmount)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-1">
                                <Building2 className="h-3.5 w-3.5 text-violet-700" />
                                <span className="truncate">{payoutData.approvedCount} payouts settled</span>
                            </div>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 ring-1 ring-violet-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                            <CreditCard className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-violet-200/50 flex items-center justify-between text-[11px]">
                        <span className={`font-medium px-2 py-0.5 rounded ${payoutData.pendingCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-violet-100/60 text-violet-800'}`}>
                            {payoutData.pendingCount} pending ({formatCurrency(payoutData.pendingAmount)})
                        </span>
                        <span className="text-neutral-500 group-hover:text-violet-800 inline-flex items-center gap-0.5 font-medium transition-colors">
                            Requests <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Operations Bar */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 px-4 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100/70 text-amber-800">
                            <Calendar className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium text-neutral-600">Today's Meals:</span>
                        <span className="font-semibold text-neutral-900">
                            {overviewData.todayDeliveries?.total || 0} scheduled
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3" />
                            {overviewData.todayDeliveries?.delivered || 0} Delivered
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-3 text-neutral-500 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                            <Sun className="h-3.5 w-3.5 text-amber-500" />
                            Morning: <strong className="text-neutral-700">{overviewData.todayDeliveries?.morning || 0}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Moon className="h-3.5 w-3.5 text-indigo-500" />
                            Evening: <strong className="text-neutral-700">{overviewData.todayDeliveries?.evening || 0}</strong>
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-restaurant-payouts')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                        <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Payout Requests</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-restaurant-commission')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                        <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Kitchen Commission</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/food/tiffin-delivery-salary')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                        <Truck className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Rider Salaries</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
