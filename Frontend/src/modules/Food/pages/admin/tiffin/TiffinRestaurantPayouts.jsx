import React, { useState, useEffect, useMemo } from 'react';
import {
    CreditCard,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    RefreshCw,
    Download,
    Eye,
    Plus,
    Building2,
    Check,
    X,
    Copy
} from 'lucide-react';
import api from '@/services/api';
import {
    ApproveModal,
    RejectModal,
    DetailsModal,
    CreatePayoutModal
} from './components/PayoutModals';

const TiffinRestaurantPayouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [stats, setStats] = useState({
        totalRequested: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
        rejectedCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeStatusTab, setActiveStatusTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [copiedField, setCopiedField] = useState('');

    // Modals
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form inputs for actions
    const [actionTxnRef, setActionTxnRef] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [actionRejectReason, setActionRejectReason] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    // New payout form state
    const [kitchens, setKitchens] = useState([]);
    const [newPayoutForm, setNewPayoutForm] = useState({
        restaurantId: '',
        amount: '',
        paymentMethod: 'Bank Transfer',
        adminNote: '',
        bankName: '',
        accountNumber: '',
        ifsc: '',
        accountHolder: '',
        upiId: ''
    });

    const fetchPayouts = async () => {
        try {
            setRefreshing(true);
            const params = {};
            if (activeStatusTab !== 'all') params.status = activeStatusTab;
            if (searchQuery) params.search = searchQuery;

            const res = await api.get('/food/tiffin/admin/restaurant-payouts', {
                params,
                contextModule: 'admin'
            }).catch(() => null) || await api.get('/admin/tiffin/restaurant-payouts', {
                params,
                contextModule: 'admin'
            }).catch(() => null);

            if (res?.data?.success) {
                setPayouts(res.data.data || []);
                if (res.data.stats) setStats(res.data.stats);
            } else {
                setPayouts([]);
            }
        } catch (error) {
            console.error('Error fetching tiffin restaurant payouts:', error);
            setPayouts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchKitchens = async () => {
        try {
            const res = await api.get('/food/tiffin/admin/kitchen-partners', { contextModule: 'admin' }).catch(() => null)
                || await api.get('/admin/tiffin/kitchen-partners', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setKitchens(res.data.data);
            }
        } catch (e) {
            console.error('Error fetching kitchens for payout dropdown', e);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [activeStatusTab]);

    useEffect(() => {
        fetchKitchens();
    }, []);

    const handleCopy = (text, fieldId) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const filteredPayouts = useMemo(() => {
        return payouts.filter(p => {
            if (activeStatusTab !== 'all' && p.status !== activeStatusTab) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const restName = (p.restaurantId?.restaurantName || p.restaurantId?.name || '').toLowerCase();
            const holder = (p.bankDetails?.accountHolder || '').toLowerCase();
            const accNum = (p.bankDetails?.accountNumber || '');
            const upi = (p.bankDetails?.upiId || '').toLowerCase();
            const txn = (p.transactionReference || '').toLowerCase();
            return restName.includes(q) || holder.includes(q) || accNum.includes(q) || upi.includes(q) || txn.includes(q);
        });
    }, [payouts, activeStatusTab, searchQuery]);

    const handleApprovePayout = async () => {
        if (!selectedPayout) return;
        try {
            setSubmittingAction(true);
            const res = await api.patch(`/food/tiffin/admin/restaurant-payouts/${selectedPayout._id}/status`, {
                status: 'approved',
                transactionReference: actionTxnRef || `TXN-${Date.now().toString().slice(-8)}`,
                adminNote: actionNote
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsApproveModalOpen(false);
                setSelectedPayout(null);
                setActionTxnRef('');
                fetchPayouts();
            } else {
                alert(res?.data?.message || 'Failed to approve payout');
            }
        } catch (error) {
            alert('Failed to process approval');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleRejectPayout = async () => {
        if (!selectedPayout) return;
        if (!actionRejectReason.trim()) return alert('Please enter rejection reason');
        try {
            setSubmittingAction(true);
            const res = await api.patch(`/food/tiffin/admin/restaurant-payouts/${selectedPayout._id}/status`, {
                status: 'rejected',
                rejectionReason: actionRejectReason,
                adminNote: actionNote
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsRejectModalOpen(false);
                setSelectedPayout(null);
                setActionRejectReason('');
                fetchPayouts();
            } else {
                alert(res?.data?.message || 'Failed to reject payout');
            }
        } catch (error) {
            alert('Failed to process rejection');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleCreatePayout = async (e) => {
        e.preventDefault();
        if (!newPayoutForm.restaurantId || !newPayoutForm.amount) return alert('Select kitchen and amount');
        try {
            setSubmittingAction(true);
            const res = await api.post('/food/tiffin/admin/restaurant-payouts', {
                ...newPayoutForm,
                amount: Number(newPayoutForm.amount),
                bankDetails: {
                    bankName: newPayoutForm.bankName,
                    accountNumber: newPayoutForm.accountNumber,
                    ifsc: newPayoutForm.ifsc,
                    upiId: newPayoutForm.upiId
                }
            }, { contextModule: 'admin' }).catch(() => null);

            if (res?.data?.success) {
                setIsCreateModalOpen(false);
                setNewPayoutForm({ restaurantId: '', amount: '', paymentMethod: 'Bank Transfer' });
                fetchPayouts();
            } else {
                alert(res?.data?.message || 'Failed to create payout');
            }
        } catch (e) {
            alert('Error creating payout');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleExportCSV = () => {
        if (!filteredPayouts.length) return alert('No records to export');
        const headers = ['ID', 'Kitchen', 'Amount', 'Status', 'Txn Ref', 'Requested Date'];
        const rows = filteredPayouts.map(p => [
            p._id,
            `"${p.restaurantId?.restaurantName || p.restaurantId?.name || 'N/A'}"`,
            p.amount || 0,
            p.status,
            `"${p.transactionReference || 'N/A'}"`,
            p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : 'N/A'
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.download = `tiffin_payouts_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-neutral-950 min-h-screen text-slate-900 dark:text-neutral-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl text-white shadow-lg">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Restaurant Payout Requests</h1>
                        <p className="text-sm text-slate-500 dark:text-neutral-400">Review, approve, and settle withdrawal requests</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button onClick={fetchPayouts} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={handleExportCSV} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span>Export CSV</span>
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Manual Payout</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Total Requested</span>
                    <div className="text-2xl font-extrabold mt-2">₹{(stats.totalRequested || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Pending Approval
                    </span>
                    <div className="text-2xl font-extrabold text-amber-600 mt-2">₹{(stats.pendingAmount || 0).toLocaleString()} ({stats.pendingCount || 0})</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Disbursed / Paid</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-2">₹{(stats.approvedAmount || 0).toLocaleString()} ({stats.approvedCount || 0})</div>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">Rejected Requests</span>
                    <div className="text-2xl font-extrabold text-rose-600 mt-2">{stats.rejectedCount || 0}</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-neutral-800/60 rounded-xl">
                    {['all', 'pending', 'approved', 'rejected'].map(key => (
                        <button key={key} onClick={() => setActiveStatusTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${activeStatusTab === key ? 'bg-white dark:bg-neutral-900 text-orange-600 shadow-sm' : 'text-slate-600'}`}>
                            {key}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search kitchen, A/C, or Txn..." className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase text-slate-500">
                                <th className="py-3.5 px-4">#SI</th>
                                <th className="py-3.5 px-4">Kitchen Partner</th>
                                <th className="py-3.5 px-4">Bank / UPI</th>
                                <th className="py-3.5 px-4">Amount</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Disbursed Info</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                            {filteredPayouts.map((payout, idx) => (
                                <tr key={payout._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                    <td className="py-4 px-4 font-mono text-slate-400">{(idx + 1).toString().padStart(2, '0')}</td>
                                    <td className="py-4 px-4 font-bold">{payout.restaurantId?.restaurantName || payout.restaurantId?.name || 'Tiffin Partner'}</td>
                                    <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-neutral-300">{payout.bankDetails?.upiId || payout.bankDetails?.accountNumber || 'N/A'}</td>
                                    <td className="py-4 px-4 font-extrabold text-base">₹{(payout.amount || 0).toLocaleString()}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${payout.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : payout.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {payout.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-xs font-mono">{payout.transactionReference || 'Awaiting'}</td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => { setSelectedPayout(payout); setIsDetailsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-slate-800">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {payout.status === 'pending' && (
                                                <>
                                                    <button onClick={() => { setSelectedPayout(payout); setActionTxnRef(`TXN-${Date.now().toString().slice(-8)}`); setIsApproveModalOpen(true); }} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white">
                                                        Approve
                                                    </button>
                                                    <button onClick={() => { setSelectedPayout(payout); setIsRejectModalOpen(true); }} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modular Modals */}
            <ApproveModal isOpen={isApproveModalOpen} selectedPayout={selectedPayout} actionTxnRef={actionTxnRef} setActionTxnRef={setActionTxnRef} actionNote={actionNote} setActionNote={setActionNote} submittingAction={submittingAction} onApprove={handleApprovePayout} onClose={() => setIsApproveModalOpen(false)} />
            <RejectModal isOpen={isRejectModalOpen} selectedPayout={selectedPayout} actionRejectReason={actionRejectReason} setActionRejectReason={setActionRejectReason} submittingAction={submittingAction} onReject={handleRejectPayout} onClose={() => setIsRejectModalOpen(false)} />
            <DetailsModal isOpen={isDetailsModalOpen} selectedPayout={selectedPayout} onClose={() => setIsDetailsModalOpen(false)} />
            <CreatePayoutModal isOpen={isCreateModalOpen} kitchens={kitchens} form={newPayoutForm} setForm={setNewPayoutForm} submitting={submittingAction} onSubmit={handleCreatePayout} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

export default TiffinRestaurantPayouts;
