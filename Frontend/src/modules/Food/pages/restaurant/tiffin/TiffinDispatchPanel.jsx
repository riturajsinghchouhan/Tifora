import React, { useState, useEffect, useMemo } from 'react';
import { 
    MapPin, 
    Search, 
    CheckCircle, 
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
    Sparkles, 
    RefreshCw, 
    ChevronDown, 
    ChevronUp,
    Filter
} from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';

export default function TiffinDispatchPanel() {
    const [deliveries, setDeliveries] = useState([]);
    const [zonesSummary, setZonesSummary] = useState([]);
    const [partners, setPartners] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedPartner, setSelectedPartner] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedZone, setSelectedZone] = useState('all'); // 'all' or zoneName
    const [selectedSlot, setSelectedSlot] = useState('all'); // 'all', 'Morning', 'Evening'
    const [collapsedZones, setCollapsedZones] = useState({});
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        fetchDispatchData();
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
                setPartners(res.data.data.partners || []);
            }
        } catch (error) {
            console.error('Fetch dispatch error:', error);
            toast?.error?.('Failed to load dispatch roster');
        } finally {
            setLoading(false);
        }
    };

    // Filter deliveries based on search, zone, and slot
    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchesSlot = selectedSlot === 'all' || d.type === selectedSlot;
            const itemZone = d.zone || d.deliveryAddress?.zone || 'General City Zone';
            const matchesZone = selectedZone === 'all' || itemZone === selectedZone;

            const q = searchQuery.toLowerCase().trim();
            if (!q) return matchesSlot && matchesZone;

            const name = (d?.userId?.name || d?.name || '').toLowerCase();
            const phone = (d?.userId?.phone || d?.deliveryAddress?.phone || '').toLowerCase();
            const address = (d?.deliveryAddress?.fullAddress || d?.deliveryAddress?.street || d?.address || '').toLowerCase();
            const landmark = (d?.deliveryAddress?.landmark || '').toLowerCase();
            const area = (d?.deliveryAddress?.area || '').toLowerCase();
            const planName = (d?.subscriptionId?.planId?.name || '').toLowerCase();

            const matchesSearch = name.includes(q) || phone.includes(q) || address.includes(q) || landmark.includes(q) || area.includes(q) || planName.includes(q) || itemZone.toLowerCase().includes(q);

            return matchesSlot && matchesZone && matchesSearch;
        });
    }, [deliveries, selectedSlot, selectedZone, searchQuery]);

    // Group filtered deliveries by Zone
    const groupedByZone = useMemo(() => {
        const groups = {};
        filteredDeliveries.forEach(d => {
            const zName = d.zone || d.deliveryAddress?.zone || 'General City Zone';
            if (!groups[zName]) {
                groups[zName] = [];
            }
            groups[zName].push(d);
        });
        return groups;
    }, [filteredDeliveries]);

    // Zone list with dynamic counts
    const zonePills = useMemo(() => {
        const counts = {};
        deliveries.forEach(d => {
            const zName = d.zone || d.deliveryAddress?.zone || 'General City Zone';
            counts[zName] = (counts[zName] || 0) + 1;
        });
        return Object.keys(counts).map(name => ({
            name,
            count: counts[name]
        }));
    }, [deliveries]);

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
            if (toast?.error) toast.error('Please select at least one delivery and an active rider');
            else alert('Please select at least one delivery and an active rider');
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
                const msg = res.data.message || `Successfully dispatched ${selectedIds.size} tiffins to ${riderObj?.name || 'Rider'}! 🚀`;
                if (toast?.success) toast.success(msg);
                else alert(msg);

                setDeliveries(prev => prev.filter(d => !selectedIds.has(d._id)));
                setSelectedIds(new Set());
                setSelectedPartner('');
                fetchDispatchData();
            } else {
                if (toast?.error) toast.error(res?.data?.message || 'Assignment failed');
                else alert(res?.data?.message || 'Assignment failed');
            }
        } catch (error) {
            console.error('Error assigning deliveries:', error);
            if (toast?.error) toast.error(error?.response?.data?.message || 'Failed to assign deliveries');
            else alert('Failed to assign deliveries');
        } finally {
            setIsAssigning(false);
        }
    };

    // Calculate selected count breakdown
    const selectedBreakdown = useMemo(() => {
        const zoneCounts = {};
        deliveries.forEach(d => {
            if (selectedIds.has(d._id)) {
                const z = d.zone || d.deliveryAddress?.zone || 'General City Zone';
                zoneCounts[z] = (zoneCounts[z] || 0) + 1;
            }
        });
        return zoneCounts;
    }, [deliveries, selectedIds]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col space-y-6 font-sans">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-rose-900 via-[#be123c] to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-rose-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-amber-200 border border-white/10 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-300" /> Micro-Zone Batch Dispatch
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                        Tiffin Dispatch & Route Panel
                    </h1>
                    <p className="text-sm text-rose-100 max-w-xl">
                        Organize daily lunch & dinner tiffin boxes by local micro-zones, select batches in 1-click, and dispatch to route riders.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-start md:justify-end">
                    <button 
                        onClick={fetchDispatchData} 
                        disabled={loading}
                        className="px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 transition backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Roster
                    </button>
                    <div className="px-4 py-2.5 bg-white text-gray-900 rounded-2xl font-black text-sm shadow-md flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        {deliveries.length} Tiffins Pending
                    </div>
                </div>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Pending</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{deliveries.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#be123c] flex items-center justify-center font-bold">
                        <Navigation className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Zones</p>
                        <p className="text-2xl font-black text-blue-600 mt-0.5">{zonePills.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lunch (Morning)</p>
                        <p className="text-2xl font-black text-amber-600 mt-0.5">
                            {deliveries.filter(d => d.type === 'Morning').length}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Sun className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dinner (Evening)</p>
                        <p className="text-2xl font-black text-indigo-600 mt-0.5">
                            {deliveries.filter(d => d.type === 'Evening').length}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Moon className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter & Micro-Zone Pill Selector Bar */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
                {/* Top filter row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Meal Slot Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl self-start">
                        <button
                            onClick={() => setSelectedSlot('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                selectedSlot === 'all' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            All Slots ({deliveries.length})
                        </button>
                        <button
                            onClick={() => setSelectedSlot('Morning')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                selectedSlot === 'Morning' 
                                    ? 'bg-amber-500 text-white shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Sun className="w-3.5 h-3.5" /> Lunch ({deliveries.filter(d => d.type === 'Morning').length})
                        </button>
                        <button
                            onClick={() => setSelectedSlot('Evening')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                selectedSlot === 'Evening' 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Moon className="w-3.5 h-3.5" /> Dinner ({deliveries.filter(d => d.type === 'Evening').length})
                        </button>
                    </div>

                    {/* Search box */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search customer, street, landmark..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-[#be123c] outline-none bg-gray-50/50 hover:bg-white transition"
                        />
                    </div>
                </div>

                {/* Micro-Zones Horizontal Pill Bar */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap flex items-center gap-1 pr-1">
                        <Filter className="w-3.5 h-3.5 text-[#be123c]" /> Zones:
                    </span>
                    
                    <button
                        onClick={() => setSelectedZone('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                            selectedZone === 'all'
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All Zones ({deliveries.length})
                    </button>

                    {zonePills.map(zp => (
                        <button
                            key={zp.name}
                            onClick={() => setSelectedZone(zp.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                                selectedZone === zp.name
                                    ? 'bg-rose-50 border-[#be123c] text-[#be123c] shadow-sm font-black'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <MapPin className="w-3 h-3 text-[#be123c]" />
                            {zp.name}
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                selectedZone === zp.name ? 'bg-[#be123c] text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {zp.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Left Zone-Grouped Orders + Right Dispatch Panel */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* Left Area: Zone Groups */}
                <div className="flex-1 space-y-4">
                    {/* Top Selection & Action Bar */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSelectAllGlobal}
                                className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 transition"
                            >
                                {filteredDeliveries.length > 0 && selectedIds.size === filteredDeliveries.length ? (
                                    <CheckSquare className="w-4 h-4 text-[#be123c]" />
                                ) : (
                                    <Square className="w-4 h-4 text-gray-400" />
                                )}
                                <span>Select All Visible ({filteredDeliveries.length})</span>
                            </button>

                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-xs font-bold text-rose-600 hover:underline"
                                >
                                    Clear Selection
                                </button>
                            )}
                        </div>

                        <div className="text-xs font-bold text-gray-500">
                            Showing <span className="text-gray-900">{filteredDeliveries.length}</span> of {deliveries.length} tiffins
                        </div>
                    </div>

                    {/* Deliveries by Micro-Zone */}
                    {loading ? (
                        <div className="bg-white rounded-3xl p-16 border border-gray-200 text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-[#be123c] animate-spin mx-auto" />
                            <p className="text-sm font-bold text-gray-600">Loading today's delivery route roster...</p>
                        </div>
                    ) : Object.keys(groupedByZone).length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 border border-gray-200 text-center space-y-3 shadow-sm">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                            <h3 className="text-base font-extrabold text-gray-900">All Tiffins Dispatched!</h3>
                            <p className="text-xs text-gray-400 max-w-md mx-auto">
                                No pending unassigned deliveries match your active filter. Great job!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedByZone).map(([zoneName, zoneItems]) => {
                                const isCollapsed = collapsedZones[zoneName];
                                const zoneIds = zoneItems.map(d => d._id);
                                const allZoneSelected = zoneIds.every(id => selectedIds.has(id));
                                const someZoneSelected = zoneIds.some(id => selectedIds.has(id)) && !allZoneSelected;
                                const morningCount = zoneItems.filter(d => d.type === 'Morning').length;
                                const eveningCount = zoneItems.filter(d => d.type === 'Evening').length;

                                return (
                                    <div 
                                        key={zoneName} 
                                        className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                                    >
                                        {/* Zone Header Banner */}
                                        <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 via-rose-50/30 to-amber-50/20 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleToggleZoneSelection(zoneName, zoneItems)}
                                                    className="p-1 text-gray-400 hover:text-gray-700 transition"
                                                    title={allZoneSelected ? 'Deselect Zone' : 'Select entire zone'}
                                                >
                                                    {allZoneSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[#be123c]" />
                                                    ) : someZoneSelected ? (
                                                        <div className="w-5 h-5 rounded border-2 border-[#be123c] flex items-center justify-center bg-rose-100">
                                                            <div className="w-2.5 h-2.5 bg-[#be123c] rounded-sm" />
                                                        </div>
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                                                    )}
                                                </button>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5">
                                                            <MapPin className="w-4 h-4 text-[#be123c]" />
                                                            {zoneName}
                                                        </h3>
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#be123c] text-white">
                                                            {zoneItems.length} Tiffins
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                                                        {morningCount > 0 && <span>☀️ {morningCount} Lunch</span>}
                                                        {morningCount > 0 && eveningCount > 0 && <span className="mx-1.5">•</span>}
                                                        {eveningCount > 0 && <span>🌙 {eveningCount} Dinner</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <button
                                                    onClick={() => handleToggleZoneSelection(zoneName, zoneItems)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                                                        allZoneSelected
                                                            ? 'bg-rose-100 border-rose-200 text-[#be123c]'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {allZoneSelected ? 'Deselect Zone' : `Select All in Zone (${zoneItems.length})`}
                                                </button>

                                                <button
                                                    onClick={() => toggleCollapse(zoneName)}
                                                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                                                >
                                                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Orders in this Zone */}
                                        {!isCollapsed && (
                                            <div className="p-3.5 sm:p-4 space-y-2.5 divide-y divide-gray-50">
                                                {zoneItems.map(d => {
                                                    const isSelected = selectedIds.has(d._id);
                                                    const customerName = d?.userId?.name || d?.name || 'Valued Subscriber';
                                                    const phone = d?.userId?.phone || d?.deliveryAddress?.phone || '9876543210';
                                                    const street = d?.deliveryAddress?.fullAddress || d?.deliveryAddress?.street || d?.address || 'Indore';
                                                    const landmark = d?.deliveryAddress?.landmark;
                                                    const planName = d?.subscriptionId?.planId?.name || 'Homestyle Tiffin Thali';

                                                    return (
                                                        <div
                                                            key={d._id}
                                                            onClick={() => handleSelectSingle(d._id)}
                                                            className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition flex items-start gap-3.5 border ${
                                                                isSelected
                                                                    ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                                                                    : 'bg-gray-50/40 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                                                            }`}
                                                        >
                                                            <div className="pt-0.5">
                                                                {isSelected ? (
                                                                    <CheckSquare className="w-4 h-4 text-[#be123c]" />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-gray-300" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                                {/* Top Row: Customer & Slot */}
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <span className="font-bold text-sm text-gray-900 truncate">
                                                                            {customerName}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 font-normal flex items-center gap-1">
                                                                            <Phone className="w-3 h-3" /> {phone}
                                                                        </span>
                                                                    </div>

                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                                                                        d.type === 'Morning'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-indigo-100 text-indigo-800'
                                                                    }`}>
                                                                        {d.type === 'Morning' ? '☀️ Lunch' : '🌙 Dinner'}
                                                                    </span>
                                                                </div>

                                                                {/* Plan Name */}
                                                                <p className="text-xs font-semibold text-rose-800/80 truncate">
                                                                    🍱 {planName}
                                                                </p>

                                                                {/* Address & Landmark */}
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                                                    <span className="flex items-center gap-1 truncate text-gray-700">
                                                                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        <span className="truncate">{street}</span>
                                                                    </span>
                                                                    {landmark && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-500">
                                                                            🏢 {landmark}
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

                {/* Right Sticky Sidebar: Dispatch Action */}
                <div className="w-full lg:w-88 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-5 sticky top-6">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="font-black text-gray-900 flex items-center gap-2 text-base">
                                <Bike className="w-5 h-5 text-[#be123c]" />
                                Dispatch to Partner
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                Live Riders
                            </span>
                        </div>

                        {/* Selected Counter & Zone Breakdown */}
                        <div className="bg-gradient-to-br from-rose-50 to-amber-50/50 p-4 rounded-2xl border border-rose-100 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                <span>Selected Tiffins:</span>
                                <span className="text-xl font-black text-[#be123c]">{selectedIds.size}</span>
                            </div>

                            {selectedIds.size > 0 && (
                                <div className="pt-2 border-t border-rose-100/80 space-y-1">
                                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                                        Zone Breakdown:
                                    </span>
                                    {Object.entries(selectedBreakdown).map(([zName, count]) => (
                                        <div key={zName} className="flex items-center justify-between text-xs text-gray-700 font-semibold">
                                            <span className="truncate pr-2">• {zName}</span>
                                            <span className="font-bold text-[#be123c] shrink-0">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rider Selection */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                Choose Delivery Rider:
                            </label>

                            <div className="space-y-2">
                                {partners.map(p => {
                                    const isSelected = selectedPartner === p._id;
                                    return (
                                        <div
                                            key={p._id}
                                            onClick={() => setSelectedPartner(p._id)}
                                            className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-rose-50 border-[#be123c] ring-1 ring-[#be123c]'
                                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                                                    isSelected ? 'bg-[#be123c] text-white' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{p.vehicleType || 'Bike'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                                                <input
                                                    type="radio"
                                                    name="selectedRiderRadio"
                                                    checked={isSelected}
                                                    onChange={() => setSelectedPartner(p._id)}
                                                    className="text-[#be123c] focus:ring-[#be123c]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {partners.length === 0 && !loading && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    No riders online right now.
                                </p>
                            )}
                        </div>

                        {/* Dispatch Action Button */}
                        <button
                            onClick={handleAssign}
                            disabled={selectedIds.size === 0 || !selectedPartner || isAssigning}
                            className={`w-full py-4 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-lg ${
                                selectedIds.size > 0 && selectedPartner && !isAssigning
                                    ? 'bg-gradient-to-r from-[#be123c] to-amber-600 text-white shadow-rose-900/20 hover:from-rose-800 hover:to-amber-700 active:scale-98'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isAssigning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Assigning & Notifying Rider...
                                </>
                            ) : (
                                <>
                                    <Navigation className="w-4 h-4" />
                                    {selectedIds.size > 0 
                                        ? `Dispatch ${selectedIds.size} Tiffins Now` 
                                        : 'Select Tiffins & Rider'
                                    }
                                </>
                            )}
                        </button>

                        {/* Route optimization tip */}
                        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] text-gray-500 space-y-1">
                            <span className="font-bold text-gray-700 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Route Batching Tip:
                            </span>
                            <p>
                                Select all tiffins of a single micro-zone (e.g. <em>Silicon City</em>) and assign them to one rider for the fastest delivery turnaround.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
