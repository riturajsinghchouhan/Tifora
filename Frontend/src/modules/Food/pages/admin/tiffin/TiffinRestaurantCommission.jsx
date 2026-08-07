import React, { useState, useEffect, useMemo } from 'react';
import {
    Percent,
    Building2,
    Search,
    Save,
    RefreshCw,
    ShieldCheck,
    TrendingUp,
    Edit3,
    Sliders
} from 'lucide-react';
import api from '@/services/api';
import CommissionEditModal from './components/CommissionEditModal';

const TiffinRestaurantCommission = () => {
    const [loading, setLoading] = useState(true);
    const [savingGlobal, setSavingGlobal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [kitchens, setKitchens] = useState([]);
    const [stats, setStats] = useState({
        globalCommissionPercentage: 10,
        gstOnCommission: 18,
        customRateKitchensCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
        totalGst: 0
    });

    const [globalCommission, setGlobalCommission] = useState(10);
    const [gstPercentage, setGstPercentage] = useState(18);
    const [perDeliveryRate, setPerDeliveryRate] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedKitchen, setSelectedKitchen] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [customRateForm, setCustomRateForm] = useState({ isCustom: false, commissionRate: 10, notes: '' });
    const [savingKitchenRate, setSavingKitchenRate] = useState(false);

    const fetchCommissionData = async () => {
        try {
            setRefreshing(true);
            const res = await api.get('/food/tiffin/admin/commission-settings', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && res.data.data) {
                const { settings, kitchens: kList, stats: sStats } = res.data.data;
                if (settings) {
                    setGlobalCommission(settings.globalCommissionPercentage ?? 10);
                    setGstPercentage(settings.gstOnCommission ?? 18);
                    setPerDeliveryRate(settings.perDeliveryRate ?? 25);
                }
                if (kList) setKitchens(kList);
                if (sStats) setStats(sStats);
            }
        } catch (error) {
            console.error('Error fetching commission settings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCommissionData();
    }, []);

    const handleSaveGlobalSettings = async (e) => {
        e.preventDefault();
        try {
            setSavingGlobal(true);
            const res = await api.put('/food/tiffin/admin/commission-settings', {
                globalCommissionPercentage: Number(globalCommission),
                gstOnCommission: Number(gstPercentage),
                perDeliveryRate: Number(perDeliveryRate)
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                alert('Global settings saved successfully!');
                fetchCommissionData();
            } else {
                alert(res?.data?.message || 'Failed to update settings');
            }
        } catch (error) {
            alert('Failed to save global settings');
        } finally {
            setSavingGlobal(false);
        }
    };

    const handleOpenEditModal = (kitchen) => {
        setSelectedKitchen(kitchen);
        setCustomRateForm({
            isCustom: kitchen.hasCustomRate,
            commissionRate: kitchen.hasCustomRate ? kitchen.commissionRate : globalCommission,
            notes: kitchen.notes || ''
        });
        setIsEditModalOpen(true);
    };

    const handleSaveKitchenCustomRate = async () => {
        if (!selectedKitchen) return;
        try {
            setSavingKitchenRate(true);
            const res = await api.post('/food/tiffin/admin/commission-settings/custom-rate', {
                restaurantId: selectedKitchen._id,
                commissionRate: Number(customRateForm.commissionRate),
                isActive: customRateForm.isCustom,
                notes: customRateForm.notes
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsEditModalOpen(false);
                setSelectedKitchen(null);
                fetchCommissionData();
            } else {
                alert(res?.data?.message || 'Failed to update rate');
            }
        } catch (error) {
            alert('Failed to update rate');
        } finally {
            setSavingKitchenRate(false);
        }
    };

    const filteredKitchens = useMemo(() => {
        if (!searchQuery.trim()) return kitchens;
        const q = searchQuery.toLowerCase();
        return kitchens.filter(k => (k.name || '').toLowerCase().includes(q) || (k.phone || '').includes(q));
    }, [kitchens, searchQuery]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-neutral-950 min-h-screen text-slate-900 dark:text-neutral-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg">
                        <Percent className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tiffin Restaurant Commission</h1>
                        <p className="text-sm text-slate-500 dark:text-neutral-400">Manage global commission %, GST, and kitchen rate tiers</p>
                    </div>
                </div>
                <button onClick={fetchCommissionData} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Global Rate</span>
                    <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">{globalCommission}%</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-emerald-600">Total Commission</span>
                    <div className="text-3xl font-extrabold text-emerald-600 mt-2">₹{(stats.totalCommission || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">GST on Commission ({gstPercentage}%)</span>
                    <div className="text-3xl font-extrabold text-blue-600 mt-2">₹{(stats.totalGst || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Custom Rate Kitchens</span>
                    <div className="text-3xl font-extrabold text-purple-600 mt-2">{stats.customRateKitchensCount || 0}</div>
                </div>
            </div>

            {/* Global Settings Bar */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 mb-8 shadow-sm">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" /> Global Commission Settings
                </h2>
                <form onSubmit={handleSaveGlobalSettings} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">Commission (%)</label>
                        <input type="number" min="0" max="100" step="0.5" value={globalCommission} onChange={(e) => setGlobalCommission(e.target.value)} className="w-full px-3.5 py-2 rounded-xl text-sm font-bold bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">GST (%)</label>
                        <input type="number" min="0" max="100" value={gstPercentage} onChange={(e) => setGstPercentage(e.target.value)} className="w-full px-3.5 py-2 rounded-xl text-sm font-bold bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">Base Drop Fee (₹)</label>
                        <input type="number" min="0" value={perDeliveryRate} onChange={(e) => setPerDeliveryRate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl text-sm font-bold bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700" />
                    </div>
                    <button type="submit" disabled={savingGlobal} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> <span>{savingGlobal ? 'Saving...' : 'Save Global Rates'}</span>
                    </button>
                </form>
            </div>

            {/* Kitchen Table */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h3 className="text-base font-bold">Kitchen Partner Rates ({kitchens.length})</h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search kitchen..." className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase text-slate-500">
                                <th className="py-3 px-4">Kitchen</th>
                                <th className="py-3 px-4">Active Subs</th>
                                <th className="py-3 px-4">Total Sales</th>
                                <th className="py-3 px-4">Rate Tier</th>
                                <th className="py-3 px-4">Commission (₹)</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                            {filteredKitchens.map((k) => (
                                <tr key={k._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                    <td className="py-3.5 px-4 font-bold">{k.name}</td>
                                    <td className="py-3.5 px-4">{k.activeSubscriptions || 0} active</td>
                                    <td className="py-3.5 px-4 font-bold">₹{(k.totalRevenue || 0).toLocaleString()}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${k.hasCustomRate ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {k.hasCustomRate ? `Custom: ${k.commissionRate}%` : `Global (${k.commissionRate}%)`}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-extrabold text-emerald-600">₹{(k.estimatedCommission || 0).toLocaleString()}</td>
                                    <td className="py-3.5 px-4 text-right">
                                        <button onClick={() => handleOpenEditModal(k)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 flex items-center gap-1 ml-auto">
                                            <Edit3 className="w-3.5 h-3.5" /> <span>Set Rate</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <CommissionEditModal isOpen={isEditModalOpen} selectedKitchen={selectedKitchen} form={customRateForm} setForm={setCustomRateForm} globalCommission={globalCommission} saving={savingKitchenRate} onSave={handleSaveKitchenCustomRate} onClose={() => setIsEditModalOpen(false)} />
        </div>
    );
};

export default TiffinRestaurantCommission;
