import React, { useState, useEffect, useMemo } from 'react';
import {
    Wallet,
    Truck,
    Search,
    RefreshCw,
    Download,
    CheckCircle2,
    Clock,
    DollarSign,
    Sun,
    Moon,
    User,
    Sliders,
    History,
    Check,
    Send
} from 'lucide-react';
import api from '@/services/api';
import { DisburseSalaryModal, PayRateConfigModal } from './components/SalaryModals';

const TiffinDeliverySalary = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('roster');
    const [searchQuery, setSearchQuery] = useState('');
    const [roster, setRoster] = useState([]);
    const [disbursements, setDisbursements] = useState([]);
    const [stats, setStats] = useState({
        activeRidersCount: 0,
        totalMealsDelivered: 0,
        totalSalaryEarned: 0,
        totalSalaryDisbursed: 0,
        totalPendingSalary: 0,
        baseDropRate: 25
    });

    const [baseRate, setBaseRate] = useState(25);
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);

    const [selectedRider, setSelectedRider] = useState(null);
    const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
    const [disburseForm, setDisburseForm] = useState({
        amount: '',
        paymentMethod: 'UPI',
        transactionReference: '',
        adminNote: ''
    });
    const [submittingDisburse, setSubmittingDisburse] = useState(false);

    const fetchSalaryData = async () => {
        try {
            setRefreshing(true);
            const res = await api.get('/food/tiffin/admin/delivery-salaries', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && res.data.data) {
                const { roster: rData, disbursements: dData, stats: sData } = res.data.data;
                if (rData) setRoster(rData);
                if (dData) setDisbursements(dData);
                if (sData) {
                    setStats(sData);
                    setBaseRate(sData.baseDropRate || 25);
                }
            }
        } catch (error) {
            console.error('Error fetching delivery salaries:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSalaryData();
    }, []);

    const handleSaveRateConfig = async (e) => {
        e.preventDefault();
        try {
            setIsSavingRate(true);
            const res = await api.put('/food/tiffin/admin/delivery-salaries/settings', {
                perDeliveryRate: Number(baseRate)
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsRateModalOpen(false);
                fetchSalaryData();
            } else {
                alert(res?.data?.message || 'Failed to update rate');
            }
        } catch (e) {
            alert('Failed to save rate');
        } finally {
            setIsSavingRate(false);
        }
    };

    const handleOpenDisburseModal = (rider) => {
        setSelectedRider(rider);
        setDisburseForm({
            amount: rider.pendingSalary > 0 ? String(rider.pendingSalary) : '0',
            paymentMethod: 'UPI',
            transactionReference: `SAL-${Date.now().toString().slice(-6)}`,
            adminNote: `Tiffin delivery salary payout (${rider.totalDeliveries} drops)`
        });
        setIsDisburseModalOpen(true);
    };

    const handleSubmitDisburse = async (e) => {
        e.preventDefault();
        if (!selectedRider || !disburseForm.amount || Number(disburseForm.amount) <= 0) {
            return alert('Enter a valid amount');
        }
        try {
            setSubmittingDisburse(true);
            const res = await api.post('/food/tiffin/admin/delivery-salaries/disburse', {
                deliveryPartnerId: selectedRider._id,
                amount: Number(disburseForm.amount),
                paymentMethod: disburseForm.paymentMethod,
                transactionReference: disburseForm.transactionReference,
                deliveriesCount: selectedRider.totalDeliveries || 0,
                adminNote: disburseForm.adminNote
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsDisburseModalOpen(false);
                setSelectedRider(null);
                fetchSalaryData();
            } else {
                alert(res?.data?.message || 'Failed to disburse salary');
            }
        } catch (e) {
            alert('Error disbursing salary');
        } finally {
            setSubmittingDisburse(false);
        }
    };

    const filteredRoster = useMemo(() => {
        if (!searchQuery.trim()) return roster;
        const q = searchQuery.toLowerCase();
        return roster.filter(r => (r.name || '').toLowerCase().includes(q) || (r.phone || '').includes(q));
    }, [roster, searchQuery]);

    const handleExportCSV = () => {
        if (!filteredRoster.length) return alert('No data to export');
        const headers = ['Rider Name', 'Phone', 'Total Drops', 'Rate', 'Earned', 'Paid', 'Pending'];
        const rows = filteredRoster.map(r => [
            `"${r.name}"`, `"${r.phone}"`, r.totalDeliveries || 0, r.ratePerDrop || baseRate, r.totalEarned || 0, r.paidAmount || 0, r.pendingSalary || 0
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.download = `tiffin_delivery_salaries_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-neutral-950 min-h-screen text-slate-900 dark:text-neutral-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Delivery Boy Salary Payout</h1>
                        <p className="text-sm text-slate-500 dark:text-neutral-400">Track meal drops, drop rates, and disburse delivery salaries</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button onClick={fetchSalaryData} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} /> <span>Refresh</span>
                    </button>
                    <button onClick={handleExportCSV} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-500" /> <span>Export CSV</span>
                    </button>
                    <button onClick={() => setIsRateModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex items-center gap-2">
                        <Sliders className="w-4 h-4" /> <span>Pay Rate (₹{baseRate}/drop)</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Active Riders</span>
                    <div className="text-2xl font-extrabold mt-2">{stats.activeRidersCount || 0}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Meals Delivered</span>
                    <div className="text-2xl font-extrabold mt-2">{(stats.totalMealsDelivered || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-amber-600">Pending Salary</span>
                    <div className="text-2xl font-extrabold text-amber-600 mt-2">₹{(stats.totalPendingSalary || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Total Disbursed</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-2">₹{(stats.totalSalaryDisbursed || 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-neutral-800/60 rounded-xl">
                    <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'roster' ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-sm' : 'text-slate-600'}`}>
                        Rider Roster ({roster.length})
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'history' ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-sm' : 'text-slate-600'}`}>
                        Disbursal History ({disbursements.length})
                    </button>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search rider..." className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700" />
                </div>
            </div>

            {/* Table */}
            {activeTab === 'roster' ? (
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">Rider</th>
                                    <th className="py-3 px-4">Morning / Evening</th>
                                    <th className="py-3 px-4">Total Drops</th>
                                    <th className="py-3 px-4">Rate</th>
                                    <th className="py-3 px-4">Total Earned</th>
                                    <th className="py-3 px-4">Pending Payout</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                                {filteredRoster.map((r) => (
                                    <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                        <td className="py-4 px-4 font-bold">{r.name} <span className="text-[11px] text-slate-400 block font-normal">{r.phone}</span></td>
                                        <td className="py-4 px-4">{r.morningDeliveries || 0} ☀️ / {r.eveningDeliveries || 0} 🌙</td>
                                        <td className="py-4 px-4 font-bold">{r.totalDeliveries || 0} meals</td>
                                        <td className="py-4 px-4 font-mono">₹{r.ratePerDrop || baseRate}</td>
                                        <td className="py-4 px-4 font-extrabold">₹{(r.totalEarned || 0).toLocaleString()}</td>
                                        <td className="py-4 px-4">
                                            {r.pendingSalary > 0 ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">₹{(r.pendingSalary || 0).toLocaleString()}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Settled</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button onClick={() => handleOpenDisburseModal(r)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white flex items-center gap-1 ml-auto">
                                                <Send className="w-3 h-3" /> <span>Pay</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">Txn Ref</th>
                                    <th className="py-3 px-4">Rider</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Mode</th>
                                    <th className="py-3 px-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                                {disbursements.map((d) => (
                                    <tr key={d._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{d.transactionReference || 'N/A'}</td>
                                        <td className="py-3.5 px-4 font-bold">{d.deliveryPartnerId?.name || 'Rider'}</td>
                                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">₹{(d.amount || 0).toLocaleString()}</td>
                                        <td className="py-3.5 px-4">{d.paymentMethod}</td>
                                        <td className="py-3.5 px-4 text-slate-500">{d.processedAt ? new Date(d.processedAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <DisburseSalaryModal isOpen={isDisburseModalOpen} selectedRider={selectedRider} form={disburseForm} setForm={setDisburseForm} submitting={submittingDisburse} onSubmit={handleSubmitDisburse} onClose={() => setIsDisburseModalOpen(false)} />
            <PayRateConfigModal isOpen={isRateModalOpen} baseRate={baseRate} setBaseRate={setBaseRate} isSaving={isSavingRate} onSave={handleSaveRateConfig} onClose={() => setIsRateModalOpen(false)} />
        </div>
    );
};

export default TiffinDeliverySalary;
