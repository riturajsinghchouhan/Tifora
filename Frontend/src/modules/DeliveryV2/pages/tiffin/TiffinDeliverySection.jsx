import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, 
    Navigation, 
    Phone, 
    CheckCircle2, 
    Clock, 
    Loader2, 
    AlertCircle, 
    Layers, 
    Sun, 
    Moon, 
    CheckSquare, 
    Square, 
    ShieldCheck, 
    Camera, 
    RefreshCw, 
    ChevronRight, 
    ExternalLink, 
    Sparkles, 
    Check, 
    X,
    Compass,
    FileText,
    ArrowUpRight,
    Send
} from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';

export default function TiffinDeliverySection() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'completed'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({
        totalAssigned: 0,
        completedCount: 0,
        pendingCount: 0,
        progressPercent: 0,
        activeSlot: 'Morning'
    });
    const [pendingDeliveries, setPendingDeliveries] = useState([]);
    const [completedDeliveries, setCompletedDeliveries] = useState([]);
    const [riderCoords, setRiderCoords] = useState(null);
    const [selectedDelivery, setSelectedDelivery] = useState(null); // Open drop-off modal

    // Modal state
    const [verifyMode, setVerifyMode] = useState('otp'); // 'otp' or 'photo'
    const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
    const [callConfirmed, setCallConfirmed] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');

    // Fetch live GPS location
    const updateRiderLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setRiderCoords({ lat: latitude, lng: longitude });
                    fetchTiffinRoster(latitude, longitude);
                },
                () => {
                    // Fallback to Indore default center if GPS permission denied
                    const defaultCoords = { lat: 22.7196, lng: 75.8577 };
                    setRiderCoords(defaultCoords);
                    fetchTiffinRoster(defaultCoords.lat, defaultCoords.lng);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            fetchTiffinRoster();
        }
    }, []);

    useEffect(() => {
        updateRiderLocation();
    }, [updateRiderLocation]);

    // Fetch assigned tiffin deliveries
    const fetchTiffinRoster = async (lat = riderCoords?.lat, lng = riderCoords?.lng) => {
        try {
            setRefreshing(true);
            const params = lat && lng ? { latitude: lat, longitude: lng } : {};
            
            const res = await api.get('/food/tiffin/delivery/my-route', { params, contextModule: 'delivery' })
                .catch(() => api.get('/delivery/tiffin/my-route', { params, contextModule: 'delivery' }))
                .catch(() => null);

            if (res?.data?.success && res.data.data) {
                setSummary(res.data.data.summary || {});
                setPendingDeliveries(res.data.data.pending || []);
                setCompletedDeliveries(res.data.data.completed || []);
            }
        } catch (error) {
            console.error('Error fetching tiffin roster:', error);
            toast?.error?.('Could not load assigned tiffins');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Open Drop-off Modal
    const handleStartDropoff = (delivery) => {
        setSelectedDelivery(delivery);
        setVerifyMode('otp');
        setOtpDigits(['', '', '', '']);
        setCallConfirmed(false);
        setPhotoPreview(null);
        setModalError('');
    };

    // Navigate to in-app map for this delivery
    const openInAppMap = (delivery) => {
        navigate(`/food/delivery/tiffin-nav/${delivery._id}`, { 
            state: { delivery, riderCoords } 
        });
    };

    // OTP Input handlers
    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newDigits = [...otpDigits];
        newDigits[index] = value;
        setOtpDigits(newDigits);

        // Auto-focus next input
        if (value && index < 3) {
            const nextEl = document.getElementById(`tiffin-otp-${index + 1}`);
            if (nextEl) nextEl.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const prevEl = document.getElementById(`tiffin-otp-${index - 1}`);
            if (prevEl) prevEl.focus();
        }
    };

    // Photo selection handler
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Submit Delivery Status Update
    const handleSubmitDelivery = async () => {
        if (!selectedDelivery) return;
        setModalError('');

        if (verifyMode === 'otp') {
            const fullOtp = otpDigits.join('');
            if (fullOtp.length < 4) {
                setModalError('Please enter the complete 4-digit customer OTP');
                return;
            }
        } else {
            if (!callConfirmed) {
                setModalError('Please confirm that you have called the customer before leaving the tiffin.');
                return;
            }
            if (!photoPreview) {
                setModalError('Please upload/take a photo proof of the unattended drop-off.');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const payload = verifyMode === 'otp'
                ? { status: 'delivered', otp: otpDigits.join('') }
                : { status: 'delivered_unattended', pictureUrl: photoPreview };

            const res = await api.put(`/food/tiffin/delivery/${selectedDelivery._id}/status`, payload, { contextModule: 'delivery' })
                .catch(() => api.put(`/delivery/tiffin/${selectedDelivery._id}/status`, payload, { contextModule: 'delivery' }));

            if (res?.data?.success) {
                toast?.success?.(`🍱 Tiffin delivered to ${selectedDelivery.deliveryAddress?.name || 'Customer'} successfully! 🚀`);
                
                // Update local lists immediately
                const deliveredItem = {
                    ...selectedDelivery,
                    status: verifyMode === 'otp' ? 'delivered' : 'delivered_unattended',
                    deliveredAt: new Date().toISOString(),
                    verification: {
                        isVerified: true,
                        otpProvided: verifyMode === 'otp' ? otpDigits.join('') : undefined,
                        pictureUrl: verifyMode === 'photo' ? photoPreview : undefined
                    }
                };

                setPendingDeliveries(prev => prev.filter(d => d._id !== selectedDelivery._id));
                setCompletedDeliveries(prev => [deliveredItem, ...prev]);
                setSummary(prev => ({
                    ...prev,
                    completedCount: prev.completedCount + 1,
                    pendingCount: Math.max(0, prev.pendingCount - 1),
                    progressPercent: prev.totalAssigned > 0 ? Math.round(((prev.completedCount + 1) / prev.totalAssigned) * 100) : 100
                }));

                setSelectedDelivery(null);

                // Dynamically re-fetch and re-sort remaining stops from current GPS location
                updateRiderLocation();
            } else {
                setModalError(res?.data?.message || 'Failed to complete delivery');
            }
        } catch (error) {
            console.error('Error submitting delivery:', error);
            setModalError(error?.response?.data?.message || 'Server error verifying delivery');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format distance for display
    const formatDistance = (delivery) => {
        const km = delivery.distanceKm;
        const meters = delivery.distanceMeters;
        if (km === null || km === undefined) return { text: 'Nearby', eta: '' };
        const kmNum = parseFloat(km);
        if (meters !== null && meters < 1000) {
            return { text: `${meters}m`, eta: `~${Math.max(1, Math.ceil(meters / 250))} min` };
        }
        return { text: `${kmNum} km`, eta: `~${Math.max(1, Math.ceil(kmNum * 3))} min` };
    };

    return (
        <div className="min-h-screen bg-white pb-28 pt-14 font-sans text-black">
            {/* Top Navigation & Status Header - White Background & Black Accents */}
            <div className="bg-white text-black p-5 sm:p-6 border-b-2 border-black">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* Header Top Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-md">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black tracking-tight text-black flex items-center gap-2">
                                    Tiffin Delivery Route
                                </h1>
                                <p className="text-[11px] text-zinc-600 font-bold">
                                    Nearest-drop auto-routing for your assigned batch
                                </p>
                            </div>
                        </div>

                        {/* GPS Location Refresh */}
                        <button
                            onClick={updateRiderLocation}
                            disabled={refreshing}
                            className="p-2.5 bg-black hover:bg-zinc-800 active:scale-95 transition rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
                            title="Refresh GPS Proximity"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh GPS</span>
                        </button>
                    </div>

                    {/* Live Progress Card - White with crisp Black border */}
                    <div className="bg-zinc-50 border-2 border-black rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-black uppercase tracking-wider text-[10px] font-black">
                                {summary.activeSlot === 'Morning' ? (
                                    <><Sun className="w-3.5 h-3.5 text-black" /> Lunch Batch</>
                                ) : (
                                    <><Moon className="w-3.5 h-3.5 text-black" /> Dinner Batch</>
                                )}
                            </span>
                            <span className="text-black text-sm font-black">
                                {summary.completedCount} of {summary.totalAssigned} Delivered ({summary.progressPercent}%)
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-300">
                            <div 
                                className="bg-black h-full rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${summary.progressPercent}%` }}
                            />
                        </div>

                        {/* 3 Metric Pills */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="bg-white border border-zinc-300 rounded-2xl p-2.5 text-center shadow-xs">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Total</span>
                                <span className="text-base font-black text-black">{summary.totalAssigned}</span>
                            </div>
                            <div className="bg-white border border-zinc-300 rounded-2xl p-2.5 text-center shadow-xs">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Pending</span>
                                <span className="text-base font-black text-black">{summary.pendingCount}</span>
                            </div>
                            <div className="bg-white border border-zinc-300 rounded-2xl p-2.5 text-center shadow-xs">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Delivered</span>
                                <span className="text-base font-black text-black">{summary.completedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
                {/* Tabs Switcher */}
                <div className="flex items-center p-1.5 bg-zinc-100 rounded-2xl border-2 border-black shadow-sm gap-1">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'pending'
                                ? 'bg-black text-white shadow-md scale-100'
                                : 'text-zinc-600 hover:text-black font-bold'
                        }`}
                    >
                        <Compass className="w-4 h-4" />
                        Pending Stops ({pendingDeliveries.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'completed'
                                ? 'bg-black text-white shadow-md scale-100'
                                : 'text-zinc-600 hover:text-black font-bold'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Delivered ({completedDeliveries.length})
                    </button>
                </div>

                {/* Tab 1: Pending Deliveries (Nearest to Farthest) */}
                {activeTab === 'pending' && (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border-2 border-black shadow-sm">
                                <Loader2 className="w-8 h-8 text-black animate-spin mx-auto" />
                                <p className="text-xs font-bold text-zinc-700">Calculating shortest route from your live GPS...</p>
                            </div>
                        ) : pendingDeliveries.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border-2 border-black shadow-sm">
                                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white mx-auto">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-base font-black text-black">All Tiffins Delivered!</h3>
                                <p className="text-xs text-zinc-600 max-w-sm mx-auto font-medium">
                                    You have completed all assigned tiffins in this batch. Great job on the quick route delivery!
                                </p>
                            </div>
                        ) : (
                            pendingDeliveries.map((delivery, idx) => {
                                const isNextStop = idx === 0;
                                const customerName = delivery.userId?.name || delivery.deliveryAddress?.name || 'Customer';
                                const phone = delivery.userId?.phone || delivery.deliveryAddress?.phone || '9876543210';
                                const address = delivery.deliveryAddress?.fullAddress || delivery.deliveryAddress?.street || 'Indore';
                                const landmark = delivery.deliveryAddress?.landmark;
                                const zone = delivery.deliveryAddress?.zone || delivery.deliveryAddress?.area || 'Indore Central';
                                const planName = delivery.subscriptionId?.planId?.name || 'Homestyle Tiffin Thali';
                                const dist = formatDistance(delivery);

                                return (
                                    <div
                                        key={delivery._id}
                                        className={`bg-white rounded-3xl p-5 border-2 transition-all duration-200 space-y-4 shadow-sm hover:shadow-md ${
                                            isNextStop 
                                                ? 'border-black ring-2 ring-black/15 shadow-lg' 
                                                : 'border-zinc-300'
                                        }`}
                                    >
                                        {/* Stop Header */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                    isNextStop 
                                                        ? 'bg-black text-white shadow-sm' 
                                                        : 'bg-zinc-100 text-black border border-zinc-300'
                                                }`}>
                                                    {isNextStop ? 'Next Stop #1' : `Stop #${idx + 1}`}
                                                </span>

                                                <span className="px-2 py-1 rounded-xl bg-zinc-100 border border-zinc-300 text-black text-[10px] font-black flex items-center gap-1">
                                                    <Navigation className="w-3 h-3 text-black" />
                                                    {dist.text}
                                                </span>

                                                {dist.eta && (
                                                    <span className="px-2 py-1 rounded-xl bg-zinc-100 border border-zinc-300 text-black text-[10px] font-bold">
                                                        ⏱ {dist.eta}
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-[9px] font-bold text-black bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-300 max-w-[100px] truncate">
                                                📍 {zone}
                                            </span>
                                        </div>

                                        {/* Customer Details & Call Button */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1 min-w-0">
                                                <h3 className="text-base font-black text-black truncate">
                                                    {customerName}
                                                </h3>
                                                <p className="text-xs font-bold text-zinc-700 truncate">
                                                    🍱 {planName}
                                                </p>
                                                <p className="text-xs text-zinc-700 flex items-start gap-1 leading-relaxed pt-0.5">
                                                    <MapPin className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2">{address}</span>
                                                </p>
                                                {landmark && (
                                                    <p className="text-[11px] font-bold text-black pl-4.5">
                                                        🏢 <span className="text-black">{landmark}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <a
                                                href={`tel:${phone}`}
                                                className="w-10 h-10 rounded-2xl bg-black text-white hover:bg-zinc-800 flex items-center justify-center shrink-0 active:scale-90 transition shadow-sm"
                                                title="Call Customer"
                                            >
                                                <Phone className="w-4 h-4 text-white" />
                                            </a>
                                        </div>

                                        {/* Action Buttons: Navigate Map + Deliver */}
                                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                                            <button
                                                onClick={() => openInAppMap(delivery)}
                                                className="py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 transition text-xs font-bold text-black flex items-center justify-center gap-1.5 border border-zinc-400"
                                            >
                                                <Navigation className="w-3.5 h-3.5 text-black" />
                                                Go to Map
                                            </button>

                                            <button
                                                onClick={() => handleStartDropoff(delivery)}
                                                className="py-3 px-4 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 bg-black text-white hover:bg-zinc-800"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5 text-white" />
                                                Deliver Tiffin
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Tab 2: Delivered Deliveries */}
                {activeTab === 'completed' && (
                    <div className="space-y-3">
                        {completedDeliveries.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center space-y-2 border-2 border-black shadow-sm">
                                <Clock className="w-8 h-8 text-black mx-auto" />
                                <h3 className="text-sm font-black text-black">No Tiffins Delivered Yet</h3>
                                <p className="text-xs text-zinc-600 font-medium">Delivered tiffins in this batch will appear here.</p>
                            </div>
                        ) : (
                            completedDeliveries.map((delivery, idx) => {
                                const customerName = delivery.userId?.name || delivery.deliveryAddress?.name || 'Customer';
                                const address = delivery.deliveryAddress?.fullAddress || delivery.deliveryAddress?.street || 'Indore';
                                const planName = delivery.subscriptionId?.planId?.name || 'Homestyle Tiffin Thali';
                                const deliveredTime = delivery.deliveredAt 
                                    ? new Date(delivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Recently';
                                const isOtp = delivery.status === 'delivered';

                                return (
                                    <div
                                        key={delivery._id || idx}
                                        className="bg-white rounded-3xl p-4.5 border-2 border-black shadow-sm flex items-start gap-3.5"
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-black truncate">
                                                    {customerName}
                                                </h4>
                                                <span className="text-[10px] font-bold text-zinc-600 shrink-0">
                                                    🕒 {deliveredTime}
                                                </span>
                                            </div>

                                            <p className="text-xs text-zinc-700 font-semibold truncate">
                                                🍱 {planName}
                                            </p>

                                            <p className="text-xs text-zinc-700 truncate">
                                                📍 {address}
                                            </p>

                                            <div className="pt-1 flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-zinc-100 text-black border border-zinc-300">
                                                    <ShieldCheck className="w-3 h-3 text-black" />
                                                    {isOtp ? 'OTP Verified Handover' : 'Photo Proof Drop-off'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* ─── INTERACTIVE DELIVERY DROP-OFF MODAL / BOTTOM SHEET (B&W THEME) ─── */}
            {selectedDelivery && (
                <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto border-2 border-black animate-in slide-in-from-bottom-5 duration-200 text-black">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                            <div>
                                <h3 className="text-lg font-black text-black flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-black" />
                                    Complete Tiffin Drop-off
                                </h3>
                                <p className="text-xs text-zinc-600 font-bold">
                                    {selectedDelivery.deliveryAddress?.name || 'Customer'} • {selectedDelivery.distanceText || 'Nearby'}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedDelivery(null)}
                                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-black hover:bg-zinc-200 border border-zinc-300 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Customer & Address Quick Card */}
                        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-300 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-black">
                                    {selectedDelivery.deliveryAddress?.name}
                                </span>
                                <a
                                    href={`tel:${selectedDelivery.deliveryAddress?.phone || selectedDelivery.userId?.phone}`}
                                    className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                                >
                                    <Phone className="w-3 h-3 text-white" /> Call Customer
                                </a>
                            </div>
                            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                                {selectedDelivery.deliveryAddress?.fullAddress || selectedDelivery.deliveryAddress?.street}
                            </p>
                            {selectedDelivery.deliveryAddress?.landmark && (
                                <p className="text-xs font-bold text-black">
                                    🏢 Landmark: {selectedDelivery.deliveryAddress?.landmark}
                                </p>
                            )}

                            {/* Navigate in-app */}
                            <button
                                onClick={() => openInAppMap(selectedDelivery)}
                                className="w-full py-2 bg-zinc-100 rounded-xl border border-zinc-300 text-xs font-bold text-black flex items-center justify-center gap-1.5 hover:bg-zinc-200 transition mt-1"
                            >
                                <Navigation className="w-3.5 h-3.5 text-black" /> Open In-App Route Map
                            </button>
                        </div>

                        {/* Delivery Guidelines / Policy Note */}
                        <div className="p-3 bg-zinc-100 rounded-2xl border border-zinc-300 text-[11px] text-black space-y-1">
                            <span className="font-black flex items-center gap-1 text-black">
                                <ShieldCheck className="w-3.5 h-3.5 text-black" /> Delivery Handover Guidelines:
                            </span>
                            <p className="text-zinc-700 leading-relaxed font-medium">
                                Hand over the tiffin container directly to the customer. If the customer is unreachable, contact them via phone before leaving at door/guard with photo proof.
                            </p>
                        </div>

                        {/* Verification Mode Switcher */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-black uppercase tracking-wider">
                                Verification Method:
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setVerifyMode('otp')}
                                    className={`py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 border-2 ${
                                        verifyMode === 'otp'
                                            ? 'bg-black text-white font-black shadow-sm border-black'
                                            : 'bg-white border-zinc-300 text-zinc-700 font-bold hover:bg-zinc-50'
                                    }`}
                                >
                                    <ShieldCheck className="w-4 h-4" /> Customer 4-Digit OTP
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVerifyMode('photo')}
                                    className={`py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 border-2 ${
                                        verifyMode === 'photo'
                                            ? 'bg-black text-white font-black shadow-sm border-black'
                                            : 'bg-white border-zinc-300 text-zinc-700 font-bold hover:bg-zinc-50'
                                    }`}
                                >
                                    <Camera className="w-4 h-4" /> Unattended Photo Drop
                                </button>
                            </div>
                        </div>

                        {/* Mode 1: OTP Input */}
                        {verifyMode === 'otp' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-zinc-700 font-medium text-center">
                                    Ask the customer for their 4-digit handover code (Default: <strong className="text-black font-black">1234</strong>)
                                </p>

                                <div className="flex items-center justify-center gap-3">
                                    {[0, 1, 2, 3].map(i => (
                                        <input
                                            key={i}
                                            id={`tiffin-otp-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={otpDigits[i]}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-xl font-black rounded-2xl border-2 border-zinc-400 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition bg-zinc-50 text-black hover:bg-white"
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Mode 2: Unattended Photo Drop */
                            <div className="space-y-3">
                                {/* Confirmation checkbox */}
                                <label className="flex items-start gap-2.5 cursor-pointer bg-zinc-50 p-3 rounded-2xl border border-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={callConfirmed}
                                        onChange={(e) => setCallConfirmed(e.target.checked)}
                                        className="mt-0.5 rounded text-black focus:ring-black"
                                    />
                                    <span className="text-xs text-black font-semibold leading-snug">
                                        I have called the customer to confirm placing the tiffin at their door/gate.
                                    </span>
                                </label>

                                {/* Photo capture */}
                                <div className="border-2 border-dashed border-zinc-400 rounded-2xl p-4 text-center space-y-2 hover:border-black transition bg-zinc-50">
                                    {photoPreview ? (
                                        <div className="space-y-2">
                                            <img
                                                src={photoPreview}
                                                alt="Drop-off Proof"
                                                className="w-full h-36 object-cover rounded-xl shadow-sm border border-zinc-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setPhotoPreview(null)}
                                                className="text-xs font-bold text-black hover:underline"
                                            >
                                                Retake Picture
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block space-y-1 py-3">
                                            <Camera className="w-8 h-8 text-black mx-auto" />
                                            <span className="text-xs font-bold text-black block">
                                                Take Photo Proof of Placed Tiffin
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-medium block">
                                                Click to capture using device camera
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handlePhotoSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {modalError && (
                            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5 font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {modalError}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDelivery(null)}
                                disabled={isSubmitting}
                                className="py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-bold text-black transition"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmitDelivery}
                                disabled={isSubmitting}
                                className="py-3.5 rounded-2xl bg-black hover:bg-zinc-800 text-white font-black text-xs shadow-xl active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 text-white" />
                                        Confirm Drop-off
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
