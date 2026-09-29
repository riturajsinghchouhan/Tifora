import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Clock, Search, MapPin, XCircle, CheckCircle2, User, Phone } from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';
import RestaurantPageShell from '@food/components/restaurant/RestaurantPageShell';
import Loader from '@food/components/Loader';

export default function TiffinDeliveryHistory() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('today'); // today, weekly, monthly
    const [searchQuery, setSearchQuery] = useState('');

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/restaurant/deliveries/history?filter=${filter}`);
            if (res.data?.success) {
                setDeliveries(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching delivery history:', error);
            toast.error('Failed to load delivery history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [filter]);

    const filteredDeliveries = deliveries.filter(d => {
        const query = searchQuery.toLowerCase();
        const userName = (d.userId?.name || '').toLowerCase();
        const userPhone = (d.userId?.phone || '').toLowerCase();
        const planName = (d.subscriptionId?.planId?.name || '').toLowerCase();
        return userName.includes(query) || userPhone.includes(query) || planName.includes(query);
    });

    const deliveredCount = deliveries.filter(d => !d.isMissed).length;
    const missedCount = deliveries.filter(d => d.isMissed).length;

    return (
        <RestaurantPageShell title="Delivery History" subtitle="Track your past tiffin deliveries">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                
                {/* Stats & Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Delivered</p>
                            <p className="text-xl font-bold text-emerald-700">{deliveredCount}</p>
                        </div>
                        <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg">
                            <p className="text-[10px] text-rose-600 font-semibold uppercase tracking-wide">Not Delivered</p>
                            <p className="text-xl font-bold text-rose-700">{missedCount}</p>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customer or plan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B80B3D] focus:bg-white transition"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B80B3D]"
                        >
                            <option value="today">Today</option>
                            <option value="weekly">This Week</option>
                            <option value="monthly">This Month</option>
                        </select>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <Loader />
                        </div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 text-sm">
                            No deliveries found for this period.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredDeliveries.map(d => {
                                const isMissed = d.isMissed;
                                const planName = d.subscriptionId?.planId?.name || 'Tiffin Meal';
                                const dateStr = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                
                                return (
                                    <div key={d._id} className={`p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50 transition ${isMissed ? 'bg-rose-50/30' : ''}`}>
                                        
                                        {/* Status Icon */}
                                        <div className="shrink-0">
                                            {isMissed ? (
                                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                                    <XCircle className="w-5 h-5 text-rose-600" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900 truncate">
                                                    {d.userId?.name || 'Unknown Customer'}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    isMissed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {isMissed ? 'NOT DELIVERED' : 'DELIVERED'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {d.userId?.phone || 'N/A'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {dateStr}
                                                </span>
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {d.type === 'Morning' ? 'Lunch' : 'Dinner'}
                                                </span>
                                            </div>

                                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                                                <span className="font-medium">Plan:</span> {planName}
                                            </div>
                                        </div>

                                        {/* Rider / Address */}
                                        <div className="md:w-48 shrink-0 text-xs text-gray-500 space-y-1.5 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                                            {d.assignedTo ? (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="truncate">Rider: {d.assignedTo.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Direct Delivery</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-start gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">{d.deliveryAddress?.street || d.deliveryAddress?.fullAddress || 'No Address'}</span>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </RestaurantPageShell>
    );
}
