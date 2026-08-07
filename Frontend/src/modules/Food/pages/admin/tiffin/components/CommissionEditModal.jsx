import React from 'react';
import { Percent, X } from 'lucide-react';

export const CommissionEditModal = ({
    isOpen,
    selectedKitchen,
    form,
    setForm,
    globalCommission,
    saving,
    onSave,
    onClose
}) => {
    if (!isOpen || !selectedKitchen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                            <Percent className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configure Commission Rate</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-neutral-800">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedKitchen.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Sales: ₹{(selectedKitchen.totalRevenue || 0).toLocaleString()}</div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700">
                        <div>
                            <div className="text-xs font-bold">Enable Custom Rate</div>
                            <div className="text-[11px] text-slate-400">Overrides global {globalCommission}% rate</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={form.isCustom}
                            onChange={(e) => setForm(prev => ({ ...prev, isCustom: e.target.checked }))}
                            className="w-5 h-5 rounded text-emerald-600 cursor-pointer"
                        />
                    </div>

                    {form.isCustom && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                Custom Rate (%) *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    required
                                    value={form.commissionRate}
                                    onChange={(e) => setForm(prev => ({ ...prev, commissionRate: e.target.value }))}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                            Notes / Memo
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            placeholder="Special partnership terms..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95"
                    >
                        {saving ? 'Saving...' : 'Save Rate'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default CommissionEditModal;
