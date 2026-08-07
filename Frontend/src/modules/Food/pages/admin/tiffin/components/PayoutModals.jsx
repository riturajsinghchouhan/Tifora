import React from 'react';
import { CheckCircle2, XCircle, X, Plus } from 'lucide-react';

export const ApproveModal = ({
    isOpen,
    selectedPayout,
    actionTxnRef,
    setActionTxnRef,
    actionNote,
    setActionNote,
    submittingAction,
    onApprove,
    onClose
}) => {
    if (!isOpen || !selectedPayout) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Approve & Disburse Payout
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-neutral-800 text-xs sm:text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Kitchen:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {selectedPayout.restaurantId?.restaurantName || selectedPayout.restaurantId?.name || 'Tiffin Kitchen'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Payable Amount:</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                            ₹{(selectedPayout.amount || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Destination:</span>
                        <span className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">
                            {selectedPayout.bankDetails?.upiId 
                                ? `UPI: ${selectedPayout.bankDetails.upiId}` 
                                : `A/C: ${selectedPayout.bankDetails?.accountNumber || 'N/A'}`}
                        </span>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Transaction / UTR Reference ID *
                        </label>
                        <input
                            type="text"
                            value={actionTxnRef}
                            onChange={(e) => setActionTxnRef(e.target.value)}
                            placeholder="e.g. UTR-9821498129"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Admin Note (Optional)
                        </label>
                        <textarea
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            rows={2}
                            placeholder="Payment reference or settlement details..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 focus:outline-none text-slate-900 dark:text-white resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onApprove}
                        disabled={submittingAction || !actionTxnRef?.trim()}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {submittingAction ? 'Processing...' : 'Confirm Approval & Settle'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RejectModal = ({
    isOpen,
    selectedPayout,
    actionRejectReason,
    setActionRejectReason,
    submittingAction,
    onReject,
    onClose
}) => {
    if (!isOpen || !selectedPayout) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-xl">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Reject Payout Request
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-neutral-400 mb-4">
                    Rejecting request of <strong>₹{(selectedPayout.amount || 0).toLocaleString()}</strong> for{' '}
                    <strong>{selectedPayout.restaurantId?.restaurantName || selectedPayout.restaurantId?.name}</strong>.
                </p>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                        Rejection Reason *
                    </label>
                    <textarea
                        value={actionRejectReason}
                        onChange={(e) => setActionRejectReason(e.target.value)}
                        rows={3}
                        placeholder="e.g. Bank details mismatch or requested amount exceeds threshold..."
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-900 dark:text-white resize-none"
                    />
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onReject}
                        disabled={submittingAction || !actionRejectReason?.trim()}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {submittingAction ? 'Processing...' : 'Confirm Rejection'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DetailsModal = ({ isOpen, selectedPayout, onClose }) => {
    if (!isOpen || !selectedPayout) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-neutral-800">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payout Details</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedPayout._id}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3 mb-6 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                        <span className="text-slate-500">Kitchen Name</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {selectedPayout.restaurantId?.restaurantName || selectedPayout.restaurantId?.name || 'N/A'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                        <span className="text-slate-500">Requested Amount</span>
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                            ₹{(selectedPayout.amount || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                        <span className="text-slate-500">Bank / A/C</span>
                        <span className="font-mono text-slate-800 dark:text-neutral-200">
                            {selectedPayout.bankDetails?.bankName || ''} - {selectedPayout.bankDetails?.accountNumber || 'N/A'}
                        </span>
                    </div>
                    {selectedPayout.bankDetails?.upiId && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                            <span className="text-slate-500">UPI ID</span>
                            <span className="font-mono text-blue-600">{selectedPayout.bankDetails.upiId}</span>
                        </div>
                    )}
                    {selectedPayout.transactionReference && (
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                            <span className="text-slate-500">Transaction Ref</span>
                            <span className="font-mono font-bold text-emerald-600">{selectedPayout.transactionReference}</span>
                        </div>
                    )}
                    {selectedPayout.rejectionReason && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-700 dark:text-rose-400">
                            <strong>Rejection Reason:</strong> {selectedPayout.rejectionReason}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export const CreatePayoutModal = ({
    isOpen,
    kitchens,
    form,
    setForm,
    submitting,
    onSubmit,
    onClose
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-orange-100 dark:bg-orange-950 text-orange-600 rounded-xl">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Manual Payout</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Kitchen Partner *
                        </label>
                        <select
                            required
                            value={form.restaurantId}
                            onChange={(e) => {
                                const rId = e.target.value;
                                const k = kitchens.find(item => item._id === rId);
                                setForm(prev => ({
                                    ...prev,
                                    restaurantId: rId,
                                    bankName: k?.bankDetails?.bankName || '',
                                    accountNumber: k?.bankDetails?.accountNumber || '',
                                    ifsc: k?.bankDetails?.ifsc || '',
                                    upiId: k?.bankDetails?.upiId || ''
                                }));
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                        >
                            <option value="">-- Choose a Kitchen --</option>
                            {kitchens.map(k => (
                                <option key={k._id} value={k._id}>{k.restaurantName || k.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                Amount (₹) *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.amount}
                                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="5000"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                Payment Method
                            </label>
                            <select
                                value={form.paymentMethod}
                                onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                            >
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Submit Payout'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
