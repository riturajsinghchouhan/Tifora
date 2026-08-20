import React, { useState, useEffect, useMemo } from 'react';
import { 
    MapPin, 
    Search, 
    CheckCircle2, 
    Loader2, 
    AlertCircle, 
    Layers, 
    Navigation, 
    Sun, 
    Moon, 
    CheckSquare, 
    Square, 
    Bike, 
    Phone, 
    RefreshCw, 
    ChevronDown, 
    ChevronUp,
    Filter,
    Send,
    X,
    Info
} from 'lucide-react';
import api from '@food/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import { toast } from 'sonner';
import RestaurantPageShell from '@food/components/restaurant/RestaurantPageShell';

export default function TiffinDispatchPanel() {
    const [deliveries, setDeliveries] = useState([]);
    const [zonesSummary, setZonesSummary] = useState([]);
    const [activeZones, setActiveZones] = useState([]);
    const [partners, setPartners] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedPartner, setSelectedPartner] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedZone, setSelectedZone] = useState('all');
    const [selectedSlot, setSelectedSlot] = useState('all');
    const [collapsedZones, setCollapsedZones] = useState({});
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        fetchDispatchData();

        const token = localStorage.getItem('token');
        if (!token) return undefined;

        const socket = io(API_BASE_URL, {
            auth: { token },
            transports: ['websocket']
        });

        const refreshDispatchPanel = () => {
            fetchDispatchData();
        };

        socket.on('new-tiffin-subscription', refreshDispatchPanel);
        socket.on('tiffin_dispatch_updated', refreshDispatchPanel);

        return () => {
            socket.off('new-tiffin-subscription', refreshDispatchPanel);
            socket.off('tiffin_dispatch_updated', refreshDispatchPanel);
            socket.disconnect();
        };
    }, []);

    const fetchDispatchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/food/tiffin/restaurant/unassigned-deliveries', { contextModule: 'restaurant' })
                .catch(() => api.get('/food/restaurant/tiffin/unassigned-deliveries', { contextModule: 'restaurant' }))
                .catch(() => null);

            if (res?.data?.success && res.data.data) {
                setDeliveries(res.data.data.deliveries || []);
                setZonesSummary(res.data.data.zonesSummary || []);
                setActiveZones(res.data.data.activeZones || []);
                setPartners(res.data.data.partners || []);
            }
        } catch (error) {
            console.error('Fetch dispatch error:', error);
            if (toast?.error) toast.error('Failed to load dispatch roster');
        } finally {
            setLoading(false);
        }
    };

    // Filter deliveries based on search, zone, and slot
    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchesSlot = selectedSlot === 'all' || d.type === selectedSlot;
            const itemZoneId = d.zoneMeta?.id || (d.deliveryAddress?.zoneId ? String(d.deliveryAddress.zoneId) : 'unassigned');
            const itemZoneName = d.zoneMeta?.name || d.zone || d.deliveryAddress?.zone || 'Unassigned Zone';
            const matchesZone = selectedZone === 'all' || itemZoneId === selectedZone;

            const q = searchQuery.toLowerCase().trim();
            if (!q) return matchesSlot && matchesZone;

            const name = (d?.userId?.name || d?.name || '').toLowerCase();
            const phone = (d?.userId?.phone || d?.deliveryAddress?.phone || '').toLowerCase();
            const address = (
                d?.deliveryAddress?.fullAddress ||
                [d?.deliveryAddress?.street, d?.deliveryAddress?.area, d?.deliveryAddress?.city]
                    .filter(Boolean)
                    .join(', ') ||
                d?.address ||
                ''
            ).toLowerCase();
            const landmark = (d?.deliveryAddress?.landmark || '').toLowerCase();
            const area = (d?.deliveryAddress?.area || '').toLowerCase();
            const planName = (d?.subscriptionId?.planId?.name || '').toLowerCase();

            const matchesSearch = name.includes(q) || phone.includes(q) || address.includes(q) || landmark.includes(q) || area.includes(q) || planName.includes(q) || itemZoneName.toLowerCase().includes(q);

            return matchesSlot && matchesZone && matchesSearch;
        });
    }, [deliveries, selectedSlot, selectedZone, searchQuery]);

    // Group filtered deliveries by Zone
    const groupedByZone = useMemo(() => {
        const groups = {};
        filteredDeliveries.forEach(d => {
            const zName = d.zoneMeta?.name || d.zone || d.deliveryAddress?.zone || 'Unassigned Zone';
            if (!groups[zName]) {
                groups[zName] = [];
            }
            groups[zName].push(d);
        });
        return groups;
    }, [filteredDeliveries]);

    // Selection handlers
    const handleSelectSingle = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAllGlobal = () => {
        if (selectedIds.size === filteredDeliveries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDeliveries.map(d => d._id)));
        }
    };

    const handleToggleZoneSelection = (zoneName, zoneItems) => {
        const zoneIds = zoneItems.map(d => d._id);
        const allZoneSelected = zoneIds.every(id => selectedIds.has(id));
        const newSet = new Set(selectedIds);

        if (allZoneSelected) {
            zoneIds.forEach(id => newSet.delete(id));
        } else {
            zoneIds.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    };

    const toggleCollapse = (zoneName) => {
        setCollapsedZones(prev => ({
            ...prev,
            [zoneName]: !prev[zoneName]
        }));
    };

    // Dispatch assignment action
    const handleAssign = async () => {
        if (selectedIds.size === 0 || !selectedPartner) {
            if (toast?.error) toast.error('Please select at least one delivery and a rider');
            return;
        }

        try {
            setIsAssigning(true);
            const res = await api.post('/food/tiffin/restaurant/assign', {
                deliveryIds: Array.from(selectedIds),
                partnerId: selectedPartner
            }, { contextModule: 'restaurant' });

            if (res?.data?.success) {
                const riderObj = partners.find(p => p._id === selectedPartner);
                const msg = res.data.message || `Dispatched ${selectedIds.size} tiffins to ${riderObj?.name || 'Rider'}`;
                if (toast?.success) toast.success(msg);

                setDeliveries(prev => prev.filter(d => !selectedIds.has(d._id)));
                setSelectedIds(new Set());
                setSelectedPartner('');
                fetchDispatchData();
            } else {
                if (toast?.error) toast.error(res?.data?.message || 'Assignment failed');
            }
        } catch (error) {
            console.error('Error assigning deliveries:', error);
            if (toast?.error) toast.error(error?.response?.data?.message || 'Failed to assign deliveries');
        } finally {
            setIsAssigning(false);
        }
    };

    // Calculate selected count breakdown
    const selectedBreakdown = useMemo(() => {
        const zoneCounts = {};
        deliveries.forEach(d => {
            if (selectedIds.has(d._id)) {
                const z = d.zoneMeta?.name || d.zone || d.deliveryAddress?.zone || 'Unassigned Zone';
                zoneCounts[z] = (zoneCounts[z] || 0) + 1;
            }
        });
        return zoneCounts;
    }, [deliveries, selectedIds]);

    const morningCount = deliveries.filter(d => d.type === 'Morning').length;
    const eveningCount = deliveries.filter(d => d.type === 'Evening').length;

    return (
        <RestaurantPageShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tiffin Dispatch & Routes</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {deliveries.length} Pending Dispatch
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Group today's orders by delivery zones, select batches, and assign to riders.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchDispatchData} 
                            disabled={loading}
                            title="Refresh roster"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh List</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-xs font-medium text-gray-500">Total Pending</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{deliveries.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-xs font-medium text-gray-500">Lunch Batch</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{morningCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-xs font-medium text-gray-500">Dinner Batch</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{eveningCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-xs font-medium text-gray-500">Active Zones</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{activeZones.filter(z => z.id !== 'unassigned').length}</p>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Slot Selector Tabs */}
                        <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-medium self-start">
                            <button
                                onClick={() => setSelectedSlot('all')}
                                className={`px-3 py-1.5 rounded-md transition ${
                                    selectedSlot === 'all' 
                                        ? 'bg-white text-gray-900 font-semibold shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All Slots ({deliveries.length})
                            </button>
                            <button
                                onClick={() => setSelectedSlot('Morning')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                                    selectedSlot === 'Morning' 
                                        ? 'bg-amber-500 text-white font-semibold shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Sun className="w-3.5 h-3.5" />
                                Lunch ({morningCount})
                            </button>
                            <button
                                onClick={() => setSelectedSlot('Evening')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                                    selectedSlot === 'Evening' 
                                        ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Moon className="w-3.5 h-3.5" />
                                Dinner ({eveningCount})
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search customer, phone, address..."
                                className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#B80B3D] focus:ring-1 focus:ring-[#B80B3D] transition bg-gray-50/50 hover:bg-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Admin Zones Dropdown */}
                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
                        <span className="font-semibold text-gray-500 whitespace-nowrap pr-1 flex items-center gap-1">
                            <Filter className="w-3 h-3 text-gray-400" />
                            Zones:
                        </span>
                        <div className="relative w-full sm:w-80">
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-xs font-medium text-gray-700 outline-none transition focus:border-[#B80B3D] focus:ring-1 focus:ring-[#B80B3D]"
                            >
                                <option value="all">All Zones ({deliveries.length})</option>
                                {activeZones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.name} ({zone.total || 0})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid: Zone Deliveries (Left) + Rider Assignment (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Zone Grouped Deliveries */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Global Selection Toolbar */}
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSelectAllGlobal}
                                    className="inline-flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 transition"
                                >
                                    {filteredDeliveries.length > 0 && selectedIds.size === filteredDeliveries.length ? (
                                        <CheckSquare className="w-4 h-4 text-[#B80B3D]" />
                                    ) : (
                                        <Square className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span>Select All Visible ({filteredDeliveries.length})</span>
                                </button>

                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="font-medium text-[#B80B3D] hover:underline"
                                    >
                                        Clear Selection
                                    </button>
                                )}
                            </div>

                            <div className="text-gray-500 font-medium">
                                Showing <strong className="text-gray-900">{filteredDeliveries.length}</strong> of {deliveries.length}
                            </div>
                        </div>

                        {/* Deliveries Content */}
                        {loading ? (
                            <div className="bg-white rounded-xl p-16 border border-gray-200 text-center space-y-2">
                                <Loader2 className="w-6 h-6 text-[#B80B3D] animate-spin mx-auto" />
                                <p className="text-xs text-gray-500 font-medium">Loading tiffin route roster...</p>
                            </div>
                        ) : Object.keys(groupedByZone).length === 0 ? (
                            <div className="bg-white rounded-xl p-16 border border-gray-200 text-center space-y-2 shadow-sm">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                <h3 className="text-base font-bold text-gray-900">All Tiffins Dispatched</h3>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    No unassigned tiffin deliveries matching the current filter.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedByZone).map(([zoneName, zoneItems]) => {
                                    const isCollapsed = collapsedZones[zoneName];
                                    const zoneIds = zoneItems.map(d => d._id);
                                    const allZoneSelected = zoneIds.every(id => selectedIds.has(id));
                                    const someZoneSelected = zoneIds.some(id => selectedIds.has(id)) && !allZoneSelected;
                                    const zoneMorning = zoneItems.filter(d => d.type === 'Morning').length;
                                    const zoneEvening = zoneItems.filter(d => d.type === 'Evening').length;

                                    return (
                                        <div 
                                            key={zoneName} 
                                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                                        >
                                            {/* Zone Header */}
                                            <div className="px-4 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <button
                                                        onClick={() => handleToggleZoneSelection(zoneName, zoneItems)}
                                                        className="text-gray-400 hover:text-gray-600 transition shrink-0"
                                                        title={allZoneSelected ? 'Deselect Zone' : 'Select entire zone'}
                                                    >
                                                        {allZoneSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-[#B80B3D]" />
                                                        ) : someZoneSelected ? (
                                                            <div className="w-4 h-4 rounded border border-[#B80B3D] flex items-center justify-center bg-rose-50">
                                                                <div className="w-2 h-2 bg-[#B80B3D] rounded-xs" />
                                                            </div>
                                                        ) : (
                                                            <Square className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </button>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 truncate">
                                                                <MapPin className="w-3.5 h-3.5 text-[#B80B3D] shrink-0" />
                                                                <span className="truncate">{zoneName}</span>
                                                            </h3>
                                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-200 text-gray-700">
                                                                {zoneItems.length} orders
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            {zoneMorning > 0 && <span>{zoneMorning} Lunch</span>}
                                                            {zoneMorning > 0 && zoneEvening > 0 && <span className="mx-1.5">•</span>}
                                                            {zoneEvening > 0 && <span>{zoneEvening} Dinner</span>}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleToggleZoneSelection(zoneName, zoneItems)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition border ${
                                                            allZoneSelected
                                                                ? 'bg-rose-50 border-rose-200 text-[#B80B3D]'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {allZoneSelected ? 'Deselect' : `Select All (${zoneItems.length})`}
                                                    </button>

                                                    <button
                                                        onClick={() => toggleCollapse(zoneName)}
                                                        className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200/60 transition"
                                                    >
                                                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Deliveries in this Zone */}
                                            {!isCollapsed && (
                                                <div className="divide-y divide-gray-100 p-2 sm:p-3 space-y-1.5">
                                                    {zoneItems.map(d => {
                                                        const isSelected = selectedIds.has(d._id);
                                                        const customerName = d?.userId?.name || d?.name || 'Customer';
                                                        const phone = d?.userId?.phone || d?.deliveryAddress?.phone || '—';
                                                        const street =
                                                            d?.deliveryAddress?.fullAddress ||
                                                            [d?.deliveryAddress?.street, d?.deliveryAddress?.area, d?.deliveryAddress?.city]
                                                                .filter(Boolean)
                                                                .join(', ') ||
                                                            d?.address ||
                                                            'Address not available';
                                                        const landmark = d?.deliveryAddress?.landmark;
                                                        const planName = d?.subscriptionId?.planId?.name || 'Standard Tiffin Meal';

                                                        return (
                                                            <div
                                                                key={d._id}
                                                                onClick={() => handleSelectSingle(d._id)}
                                                                className={`p-3 rounded-lg cursor-pointer transition flex items-start gap-3 border ${
                                                                    isSelected
                                                                        ? 'bg-rose-50/60 border-rose-200 shadow-xs'
                                                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                                                                }`}
                                                            >
                                                                <div className="pt-0.5 shrink-0">
                                                                    {isSelected ? (
                                                                        <CheckSquare className="w-4 h-4 text-[#B80B3D]" />
                                                                    ) : (
                                                                        <Square className="w-4 h-4 text-gray-300" />
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                    {/* Row 1: Customer Name, Phone & Slot */}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <span className="font-semibold text-xs text-gray-900 truncate">
                                                                                {customerName}
                                                                            </span>
                                                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                                <Phone className="w-3 h-3 text-gray-400" />
                                                                                {phone}
                                                                            </span>
                                                                        </div>

                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                                                                            d.type === 'Morning'
                                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                        }`}>
                                                                            {d.type === 'Morning' ? 'Lunch' : 'Dinner'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Row 2: Plan Name */}
                                                                    <p className="text-xs text-gray-600 font-medium truncate">
                                                                        {planName}
                                                                    </p>

                                                                    {/* Row 3: Address and Landmark */}
                                                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                                                                        <span className="truncate max-w-md">{street}</span>
                                                                        {landmark && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-gray-100 text-[10px] text-gray-600 font-medium">
                                                                                Near {landmark}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sticky Dispatch Action Box */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 sticky top-6">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                    <Bike className="w-4 h-4 text-[#B80B3D]" />
                                    Assign Delivery Rider
                                </h3>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Active Riders
                                </span>
                            </div>

                            {/* Selection Summary */}
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 font-medium">Selected Tiffins:</span>
                                    <span className="text-lg font-bold text-gray-900">{selectedIds.size}</span>
                                </div>

                                {selectedIds.size > 0 ? (
                                    <div className="pt-2 border-t border-gray-200/60 space-y-1">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            Zone Breakdown:
                                        </p>
                                        {Object.entries(selectedBreakdown).map(([zName, count]) => (
                                            <div key={zName} className="flex items-center justify-between text-xs text-gray-700">
                                                <span className="truncate pr-2">• {zName}</span>
                                                <span className="font-semibold text-gray-900 shrink-0">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-gray-500">
                                        Select orders from the list on the left to assign a batch.
                                    </p>
                                )}
                            </div>

                            {/* Rider Selection List */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Available Riders ({partners.length}):
                                </label>

                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                    {partners.map(p => {
                                        const isSelected = selectedPartner === p._id;
                                        return (
                                            <div
                                                key={p._id}
                                                onClick={() => setSelectedPartner(p._id)}
                                                className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                                                    isSelected
                                                        ? 'bg-rose-50/70 border-[#B80B3D] ring-1 ring-[#B80B3D]'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                                        isSelected ? 'bg-[#B80B3D] text-white' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                                                        <p className="text-[11px] text-gray-500 truncate">{p.vehicleType || 'Motorcycle'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input
                                                        type="radio"
                                                        name="selectedRiderRadio"
                                                        checked={isSelected}
                                                        onChange={() => setSelectedPartner(p._id)}
                                                        className="text-[#B80B3D] focus:ring-[#B80B3D]"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {partners.length === 0 && !loading && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                        <span>No approved riders are online currently.</span>
                                    </div>
                                )}
                            </div>

                            {/* Dispatch Action Button */}
                            <button
                                onClick={handleAssign}
                                disabled={selectedIds.size === 0 || !selectedPartner || isAssigning}
                                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm ${
                                    selectedIds.size > 0 && selectedPartner && !isAssigning
                                        ? 'bg-[#B80B3D] text-white hover:bg-[#9a0933] active:scale-[0.99]'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Dispatching to Rider...</span>
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span>
                                            {selectedIds.size > 0 
                                                ? `Dispatch ${selectedIds.size} Tiffins` 
                                                : 'Select Orders & Rider'}
                                        </span>
                                    </>
                                )}
                            </button>

                            {/* Route optimization note */}
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/60 text-[11px] text-gray-500 flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                <span>
                                    Tip: Selecting all orders in a single zone (e.g. <em>Silicon City</em>) and assigning to one rider keeps delivery routes fast and organized.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RestaurantPageShell>
    );
}
