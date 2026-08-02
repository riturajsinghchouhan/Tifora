import React, { useState, useEffect } from 'react';
import { Users, MapPin, Search, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';

export default function TiffinDispatchPanel() {
    const [deliveries, setDeliveries] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        fetchDispatchData();
    }, []);

    const fetchDispatchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/food/tiffin/restaurant/unassigned-deliveries').catch(() => null);
            if (res?.data?.success) {
                setDeliveries(res.data.data.deliveries || []);
                setPartners(res.data.data.partners || []);
            }
        } catch (error) {
            console.error('Fetch dispatch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredDeliveries.map(d => d._id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleAssign = async () => {
        if (selectedIds.size === 0 || !selectedPartner) {
            toast.error('Please select at least one delivery and a rider');
            return;
        }
        
        try {
            setIsAssigning(true);
            const res = await api.post('/food/tiffin/restaurant/assign', { 
                deliveryIds: Array.from(selectedIds), 
                partnerId: selectedPartner 
            });

            if (res?.data?.success) {
                toast.success(res.data.message || `Successfully assigned ${selectedIds.size} tiffins! 🎉`);
                setDeliveries(deliveries.filter(d => !selectedIds.has(d._id)));
                setSelectedIds(new Set());
                setSelectedPartner('');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to assign deliveries');
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredDeliveries = deliveries.filter(d => {
        const nameMatch = (d?.userId?.name || d?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const addressMatch = (d?.deliveryAddress?.address || d?.address || '').toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || addressMatch;
    });

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen flex flex-col space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manual Dispatch Panel</h1>
                    <p className="text-sm text-gray-500">Assign unassigned daily tiffin batches to available delivery partners</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                        {deliveries.length} Pending Dispatch
                    </span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* Left: Unassigned List */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200/80 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-gray-50/60">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                onChange={handleSelectAll}
                                checked={filteredDeliveries.length > 0 && selectedIds.size === filteredDeliveries.length}
                            />
                            <span className="text-sm font-bold text-gray-700">
                                Select All ({filteredDeliveries.length})
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Search by customer name or address..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none w-full sm:w-64 bg-white"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-3">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                <span className="text-sm text-gray-500 font-medium">Checking today's orders...</span>
                            </div>
                        ) : filteredDeliveries.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 space-y-2">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
                                <div className="text-base font-bold text-gray-700">All Tiffins Dispatched!</div>
                                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                    No pending unassigned tiffin deliveries found for today's batch.
                                </p>
                            </div>
                        ) : (
                            filteredDeliveries.map(d => {
                                const customerName = d?.userId?.name || d?.name || 'Customer';
                                const customerAddress = d?.deliveryAddress?.address || d?.address || 'Address on file';
                                const isSelected = selectedIds.has(d._id);

                                return (
                                    <label 
                                        key={d._id} 
                                        className={`flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition border ${
                                            isSelected 
                                                ? 'bg-orange-50/70 border-orange-300 shadow-sm' 
                                                : 'hover:bg-gray-50 border-gray-100 bg-white'
                                        }`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                            checked={isSelected}
                                            onChange={() => handleSelect(d._id)}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-900 text-sm">{customerName}</span>
                                                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                                    d.type === 'Morning' 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-indigo-100 text-indigo-800'
                                                }`}>
                                                    {d.type || 'Lunch'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="truncate">{customerAddress}</span>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Assignment Card */}
                <div className="w-full lg:w-80 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                        <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-base">
                            <Users className="w-5 h-5 text-orange-500" />
                            Dispatch to Rider
                        </h3>
                        
                        <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">Selected Tiffins:</span>
                            <span className="font-extrabold text-orange-600 text-base">{selectedIds.size}</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                Select Delivery Partner
                            </label>
                            <select 
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                                value={selectedPartner}
                                onChange={(e) => setSelectedPartner(e.target.value)}
                            >
                                <option value="">-- Choose Online Rider --</option>
                                {partners.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.vehicleType || 'Bike'})
                                    </option>
                                ))}
                            </select>
                            {partners.length === 0 && !loading && (
                                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> No online riders in your zone right now.
                                </p>
                            )}
                        </div>

                        <button 
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                                selectedIds.size > 0 && selectedPartner 
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 active:scale-95' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={handleAssign}
                            disabled={selectedIds.size === 0 || !selectedPartner || isAssigning}
                        >
                            {isAssigning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                `Assign ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''} Deliveries`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
