import React from 'react';
import { Send, Sliders, X } from 'lucide-react';

export const DisburseSalaryModal = ({
    isOpen,
    selectedRider,
    form,
    setForm,
    submitting,
    onSubmit,
    onClose
}) => {
    if (!isOpen || !selectedRider) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                            <Send className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Disburse Rider Salary</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-neutral-800 text-xs sm:text-sm space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Rider:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{selectedRider.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Completed Drops:</span>
                        <span className="font-bold">{selectedRider.totalDeliveries} meals</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="font-bold text-slate-600">Pending Balance:</span>
                        <span className="text-base font-extrabold text-amber-600">₹{(selectedRider.pendingSalary || 0).toLocaleString()}</span>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                Disbursal Amount (₹) *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.amount}
                                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full px-3.5 py-2 rounded-xl text-sm font-extrabold bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                Payment Method
                            </label>
                            <select
                                value={form.paymentMethod}
                                onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                            >
                                <option value="UPI">UPI Transfer</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Transaction / Ref ID
                        </label>
                        <input
                            type="text"
                            value={form.transactionReference}
                            onChange={(e) => setForm(prev => ({ ...prev, transactionReference: e.target.value }))}
                            placeholder="e.g. UPI-TXN-839218"
                            className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Notes / Memo
                        </label>
                        <textarea
                            value={form.adminNote}
                            onChange={(e) => setForm(prev => ({ ...prev, adminNote: e.target.value }))}
                            rows={2}
                            placeholder="Salary settlement notes..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? 'Recording...' : 'Disburse Salary'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const PayRateConfigModal = ({
    isOpen,
    baseRate,
    setBaseRate,
    isSaving,
    onSave,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pay Rate Configuration</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Payout Rate (₹ / Completed Meal Drop) *
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="1"
                                value={baseRate}
                                onChange={(e) => setBaseRate(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl text-base font-extrabold bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                            Every meal delivery drop by a rider will earn this fixed fee.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95"
                        >
                            {isSaving ? 'Saving...' : 'Save Rate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
