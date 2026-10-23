import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, RefreshCw, Send, Loader2 } from 'lucide-react';
import api from '@food/api';

const WINDOWS = [
    { value: 0, label: 'Already ended' },
    { value: 3, label: 'Ended + ending in 3 days' },
    { value: 7, label: 'Ended + ending in 7 days' },
    { value: 15, label: 'Ended + ending in 15 days' }
];

export default function RenewalRemindersTab() {
    const [days, setDays] = useState(3);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/food/tiffin/admin/subscriptions/renewal-due', { params: { days }, contextModule: 'admin' });
            setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
            setSelected(new Set());
        } catch (e) {
            console.error('Error fetching renewal list', e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        load();
    }, [load]);

    const allSelected = rows.length > 0 && selected.size === rows.length;

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r._id)));

    const handleSend = async () => {
        if (!selected.size) return;
        setSending(true);
        try {
            const res = await api.post(
                '/food/tiffin/admin/subscriptions/notify-renewal',
                { subscriptionIds: [...selected], message: message.trim() },
                { contextModule: 'admin' }
            );
            alert(res?.data?.message || 'Reminders sent');
            load();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to send reminders');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-[#be123c]" /> Plan Renewal Reminders
                    </h3>
                    <p className="text-xs text-gray-500">Customers whose plan has ended or is about to end. Select and send a renewal notification.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none"
                    >
                        {WINDOWS.map((w) => (
                            <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                    </select>
                    <button onClick={load} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200" title="Refresh">
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-3.5 w-10">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                            </th>
                            <th className="p-3.5">Customer</th>
                            <th className="p-3.5">Plan</th>
                            <th className="p-3.5">Ends On</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5">Last Reminder</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                                    {loading ? 'Loading...' : 'No customers need a renewal reminder right now.'}
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r._id} className="hover:bg-gray-50/70 transition">
                                    <td className="p-3.5">
                                        <input type="checkbox" checked={selected.has(r._id)} onChange={() => toggle(r._id)} />
                                    </td>
                                    <td className="p-3.5 font-bold text-gray-900">
                                        {r.user?.name || 'Customer'}
                                        <span className="block text-[10px] font-normal text-gray-400">{r.user?.phone}</span>
                                    </td>
                                    <td className="p-3.5 font-semibold text-gray-800">{r.plan?.name || '—'}</td>
                                    <td className="p-3.5 text-gray-500">{new Date(r.endDate).toLocaleDateString()}</td>
                                    <td className="p-3.5">
                                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                            r.daysLeft < 0 || r.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {r.daysLeft < 0 || r.status === 'expired' ? 'Ended' : `${Math.max(r.daysLeft, 0)}d left`}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-gray-500">
                                        {r.renewalNotifiedAt ? new Date(r.renewalNotifiedAt).toLocaleString() : 'Never'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Custom message (optional) - default: 'Your plan has ended, renew to continue'"
                    className="flex-1 text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]"
                />
                <button
                    onClick={handleSend}
                    disabled={!selected.size || sending}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#be123c] px-4 py-3 rounded-xl disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Reminder ({selected.size})
                </button>
            </div>
        </div>
    );
}
