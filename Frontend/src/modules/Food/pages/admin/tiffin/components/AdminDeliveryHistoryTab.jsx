import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Phone, Search, XCircle, User, ChefHat } from 'lucide-react';
import api from '@food/api';
import Loader from '@food/components/Loader';

export default function AdminDeliveryHistoryTab() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('today');
    const [statusFilter, setStatusFilter] = useState('all');
    const [restaurantFilter, setRestaurantFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [kitchens, setKitchens] = useState([]);

    useEffect(() => {
        fetchKitchens();
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [filter, statusFilter, restaurantFilter]);

    const fetchKitchens = async () => {
        try {
            const res = await api.get('/admin/tiffin/kitchen-partners', { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success) {
                setKitchens(res.data.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/tiffin/deliveries/history?filter=${filter}&status=${statusFilter}&restaurantId=${restaurantFilter}`, { contextModule: 'admin' }).catch(() => null);
            if (res?.data?.success) {
                setDeliveries(res.data.data);
            } else {
                setDeliveries([]);
            }
        } catch (error) {
            console.error('Error fetching admin delivery history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDeliveries = deliveries.filter(d => {
        const query = searchQuery.toLowerCase();
        const userName = (d.userId?.name || '').toLowerCase();
        const userPhone = (d.userId?.phone || '').toLowerCase();
        const restaurantName = (d.restaurantId?.restaurantName || d.restaurantId?.name || '').toLowerCase();
        const planName = (d.subscriptionId?.planId?.name || '').toLowerCase();
        return userName.includes(query) || userPhone.includes(query) || planName.includes(query) || restaurantName.includes(query);
    });

    const deliveredCount = deliveries.filter(d => d.derivedStatus === 'delivered' || d.derivedStatus === 'delivered_unattended').length;
    const missedCount = deliveries.filter(d => d.derivedStatus === 'missed').length;
    const pendingCount = deliveries.filter(d => d.derivedStatus === 'pending' || d.derivedStatus === 'assigned' || d.derivedStatus === 'out_for_delivery').length;

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Stats & Filters */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                
                <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg min-w-[100px]">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Total</p>
                        <p className="text-xl font-black text-gray-800">{deliveries.length}</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg min-w-[100px]">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Delivered</p>
                        <p className="text-xl font-black text-emerald-700">{deliveredCount}</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-lg min-w-[100px]">
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide">Pending</p>
                        <p className="text-xl font-black text-amber-700">{pendingCount}</p>
                    </div>
                    <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg min-w-[100px]">
                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wide">Missed</p>
                        <p className="text-xl font-black text-rose-700">{missedCount}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <div className="relative flex-grow xl:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#be123c] focus:bg-white transition"
                        />
                    </div>
                    <select
                        value={restaurantFilter}
                        onChange={(e) => setRestaurantFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#be123c] max-w-[150px] truncate"
                    >
                        <option value="all">All Kitchens</option>
                        {kitchens.map(k => (
                            <option key={k._id} value={k._id}>{k.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#be123c]"
                    >
                        <option value="all">All Status</option>
                        <option value="delivered">Delivered</option>
                        <option value="pending">Pending/Assigned</option>
                        <option value="missed">Missed/Failed</option>
                    </select>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#be123c]"
                    >
                        <option value="today">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader />
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm font-semibold">
                        No deliveries match the selected filters.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredDeliveries.map(d => {
                            const isMissed = d.isMissed;
                            const isDelivered = d.derivedStatus === 'delivered' || d.derivedStatus === 'delivered_unattended';
                            const planName = d.subscriptionId?.planId?.name || 'Tiffin Meal';
                            const dateStr = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const restaurantName = d.restaurantId?.restaurantName || d.restaurantId?.name || 'Unknown Kitchen';
                            
                            return (
                                <div key={d._id} className={`p-4 bg-white flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50/50 transition`}>
                                    
                                    {/* Status Icon */}
                                    <div className="shrink-0">
                                        {isMissed ? (
                                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                                <XCircle className="w-5 h-5 text-rose-600" />
                                            </div>
                                        ) : isDelivered ? (
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-amber-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                {d.userId?.name || 'Unknown Customer'}
                                            </h4>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                isMissed ? 'bg-rose-100 text-rose-700' : isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {isMissed ? 'MISSED' : isDelivered ? 'DELIVERED' : 'PENDING'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                {d.userId?.phone || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold text-gray-700">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {dateStr} ({d.type === 'Morning' ? 'Lunch' : 'Dinner'})
                                            </span>
                                        </div>

                                        <div className="mt-2 text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{planName}</span>
                                        </div>
                                    </div>

                                    {/* Kitchen & Rider */}
                                    <div className="md:w-56 shrink-0 text-xs font-medium text-gray-600 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                                        <div className="flex items-center gap-1.5">
                                            <ChefHat className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{restaurantName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{d.assignedTo ? `Rider: ${d.assignedTo.name}` : 'Direct/Unassigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
