import React, { useState } from 'react';
import {
    Search,
    CheckCircle2,
    XCircle,
    Eye,
    MapPin,
    Phone,
    Calendar,
    Clock,
    Banknote,
    ChefHat,
    AlertCircle,
    ShieldAlert,
    RefreshCw
} from 'lucide-react';

export default function CodRequestsSection({
    requests = [],
    onApprove,
    onReject,
    onView,
    loading = false,
    onRefresh
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [actionSubId, setActionSubId] = useState(null);

    const filteredRequests = requests.filter(sub => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            sub.userId?.name?.toLowerCase().includes(q) ||
            sub.userId?.phone?.includes(q) ||
            sub.planId?.name?.toLowerCase().includes(q) ||
            (sub.restaurantId?.restaurantName || sub.restaurantId?.name || '').toLowerCase().includes(q) ||
            sub._id?.toLowerCase().includes(q)
        );
    });

    const handleAction = async (actionFn, subId) => {
        setActionSubId(subId);
        try {
            await actionFn(subId);
        } finally {
            setActionSubId(null);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                            <Clock className="w-5 h-5" />
                        </span>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                                COD Verification Requests
                                {requests.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                                        {requests.length} Pending
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-gray-500">
                                Customer cash-on-delivery subscriptions require admin review. Deliveries activate only after verification.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by customer, phone, plan or kitchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:bg-white focus:border-amber-500"
                />
            </div>

            {/* Requests Table / Cards */}
            {filteredRequests.length === 0 ? (
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-12 text-center space-y-3 border border-gray-100">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="font-black text-gray-900 text-base">No Pending COD Requests</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        All Cash on Delivery subscription orders have been reviewed and activated. New customer COD requests will appear here automatically.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-amber-50/70 text-amber-950 font-bold border-b border-amber-100">
                            <tr>
                                <th className="p-3.5">Customer</th>
                                <th className="p-3.5">Kitchen Partner</th>
                                <th className="p-3.5">Plan Details</th>
                                <th className="p-3.5">Delivery Address</th>
                                <th className="p-3.5">Amount to Collect</th>
                                <th className="p-3.5">Requested On</th>
                                <th className="p-3.5 text-right">Verification Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRequests.map(sub => {
                                const isProcessing = actionSubId === sub._id;
                                const addressStr = sub.deliveryAddress?.street || sub.deliveryAddress?.fullAddress || 'Address on file';
                                const cityStr = sub.deliveryAddress?.city ? `, ${sub.deliveryAddress.city}` : '';

                                return (
                                    <tr key={sub._id} className="hover:bg-amber-50/30 transition">
                                        <td className="p-3.5 font-bold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {(sub.userId?.name || 'C').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="block">{sub.userId?.name || 'Customer'}</span>
                                                    <span className="block text-[11px] font-normal text-gray-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-gray-400" />
                                                        {sub.userId?.phone || 'No phone'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-3.5 font-medium text-gray-800">
                                            <div className="flex items-center gap-1.5">
                                                <ChefHat className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                <span>{sub.restaurantId?.restaurantName || sub.restaurantId?.name || "Partner Kitchen"}</span>
                                            </div>
                                        </td>

                                        <td className="p-3.5">
                                            <div className="font-bold text-gray-900">{sub.planId?.name || 'Daily Tiffin'}</div>
                                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                                                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                    {sub.planId?.durationDays || 30} Days
                                                </span>
                                                <span>• {sub.planId?.mealType || 'Both'}</span>
                                            </div>
                                        </td>

                                        <td className="p-3.5 max-w-xs">
                                            <div className="flex items-start gap-1 text-[11px] text-gray-700">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2" title={`${addressStr}${cityStr}`}>
                                                    {addressStr}{cityStr}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-3.5">
                                            <div className="font-black text-gray-900 text-sm">₹{sub.amountPaid}</div>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                                <Banknote className="w-3 h-3 text-amber-700" />
                                                Cash On Delivery
                                            </span>
                                        </td>

                                        <td className="p-3.5 text-gray-500 text-[11px]">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                {new Date(sub.createdAt || sub.startDate).toLocaleDateString()}
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(sub.createdAt || sub.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>

                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onView(sub)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
                                                    title="View Full Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleAction(onApprove, sub._id)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                                                    title="Verify & Activate Plan"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>{isProcessing ? 'Verifying...' : 'Approve & Activate'}</span>
                                                </button>

                                                <button
                                                    onClick={() => handleAction(onReject, sub._id)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                                                    title="Reject Request"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
