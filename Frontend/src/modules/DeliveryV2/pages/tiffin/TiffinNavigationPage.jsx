import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    GoogleMap,
    Marker,
    DirectionsRenderer,
    OverlayView
} from '@react-google-maps/api';
import {
    ArrowLeft, Phone, CheckSquare, MapPin, Navigation,
    Loader2, ShieldCheck, Camera, Check, X, AlertCircle,
    Layers, Clock, Package, Target, Play, Plus, Minus
} from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader';
import { useDeliveryNotificationContext } from '@food/context/DeliveryNotificationContext';
import bikelogo from '@food/assets/bikelogo.png';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    inset: 0
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
        { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
        { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f5e0' }] },
    ]
};

export default function TiffinNavigationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    // Delivery data from navigation state, or fetch it
    const [delivery, setDelivery] = useState(location.state?.delivery || null);
    const [riderCoords, setRiderCoords] = useState(location.state?.riderCoords || null);
    const [loadingDelivery, setLoadingDelivery] = useState(!location.state?.delivery);

    // Map state
    const [mapsReady, setMapsReady] = useState(isGoogleMapsLoaded());
    const [mapsError, setMapsError] = useState(false);
    const [directions, setDirections] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const mapRef = useRef(null);
    const directionsCalledRef = useRef(false);

    // Simulation state
    const [isSimMode, setIsSimMode] = useState(false);
    const [simPath, setSimPath] = useState([]);
    const [simIndex, setSimIndex] = useState(0);

    // Dropoff modal state
    const [showDropoff, setShowDropoff] = useState(false);
    const [verifyMode, setVerifyMode] = useState('otp');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
    const [callConfirmed, setCallConfirmed] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [modalError, setModalError] = useState('');

    // Load Google Maps using singleton loader (won't conflict with LiveMap)
    useEffect(() => {
        if (isGoogleMapsLoaded()) {
            setMapsReady(true);
            return;
        }

        loadGoogleMaps().then(() => {
            setMapsReady(true);
        }).catch(() => {
            setMapsError(true);
        });
    }, []);

    // Fetch delivery if not passed via state
    useEffect(() => {
        if (delivery) { setLoadingDelivery(false); return; }
        const fetchDelivery = async () => {
            try {
                const res = await api.get(`/food/tiffin/delivery/${id}`, { contextModule: 'delivery' })
                    .catch(() => api.get(`/delivery/tiffin/${id}`, { contextModule: 'delivery' }));
                if (res?.data?.success && res.data.data) {
                    setDelivery(res.data.data);
                }
            } catch (e) {
                console.error('Error fetching delivery', e);
            } finally {
                setLoadingDelivery(false);
            }
        };
        fetchDelivery();
    }, [id, delivery]);

    // Get delivery notification context for live location emission
    const { emitLocation } = useDeliveryNotificationContext();
    const watchIdRef = useRef(null);
    const lastEmitRef = useRef(0);
    const boundsFittedRef = useRef(false);

    // Get rider GPS — use watchPosition for continuous tracking
    useEffect(() => {
        if (!navigator.geolocation) {
            setRiderCoords({ lat: 22.7196, lng: 75.8577 });
            return;
        }

        // Get initial position quickly
        if (!riderCoords) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setRiderCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0 }),
                () => setRiderCoords({ lat: 22.7196, lng: 75.8577 }),
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }

        // Continuous watch for live tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    heading: pos.coords.heading || 0,
                    speed: pos.coords.speed || 0,
                    accuracy: pos.coords.accuracy || null,
                };
                setRiderCoords(newCoords);

                // Emit location via socket every 3 seconds (for faster local testing feedback)
                const now = Date.now();
                if (now - lastEmitRef.current >= 3000 && id) {
                    lastEmitRef.current = now;
                    console.log('📡 [TiffinNav] Emitting live location:', newCoords);
                    emitLocation({
                        orderId: id, // deliveryId is the tracking room ID
                        lat: newCoords.lat,
                        lng: newCoords.lng,
                        heading: newCoords.heading,
                        speed: newCoords.speed,
                        accuracy: newCoords.accuracy,
                        status: 'on_the_way',
                    });
                }
            },
            (err) => console.warn('[TiffinNav] watchPosition error:', err.message),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // Force emit every 3 seconds to ensure socket is pulsing even if stationary
        const forceInterval = setInterval(() => {
            if (id) {
                setRiderCoords(prev => {
                    if (prev) {
                        const now = Date.now();
                        if (now - lastEmitRef.current >= 3000) {
                            lastEmitRef.current = now;
                            console.log('📡 [TiffinNav] Forced pulse emitting live location:', prev);
                            emitLocation({
                                orderId: id,
                                lat: prev.lat,
                                lng: prev.lng,
                                heading: prev.heading,
                                speed: prev.speed,
                                accuracy: prev.accuracy,
                                status: 'on_the_way',
                            });
                        }
                    }
                    return prev;
                });
            }
        }, 3000);

        return () => {
            clearInterval(forceInterval);
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [id, emitLocation]);

    // Parse customer coordinates
    const customerCoords = React.useMemo(() => {
        if (!delivery) return null;
        const coords = delivery.deliveryAddress?.location?.coordinates;
        if (coords && coords.length === 2) {
            return { lat: coords[1], lng: coords[0] };
        }
        return null;
    }, [delivery]);

    // Fetch driving directions
    const lastDirectionsFetchRef = useRef(0);
    
    useEffect(() => {
        if (!riderCoords || !customerCoords || !mapsReady) return;
        
        const now = Date.now();
        // Only calculate directions if we haven't done it yet, or 5 seconds have passed (for fast testing feedback)
        if (directionsCalledRef.current && now - lastDirectionsFetchRef.current < 5000) return;
        
        directionsCalledRef.current = true;
        lastDirectionsFetchRef.current = now;

        const service = new window.google.maps.DirectionsService();
        service.route(
            {
                origin: riderCoords,
                destination: customerCoords,
                travelMode: window.google.maps.TravelMode.DRIVING
            },
            (result, status) => {
                if (status === 'OK' && result) {
                    setDirections(result);
                    const leg = result.routes?.[0]?.legs?.[0];
                    if (leg) {
                        setRouteInfo({ distance: leg.distance?.text, duration: leg.duration?.text });
                        const path = result.routes[0].overview_path.map(p => ({
                            lat: typeof p.lat === 'function' ? p.lat() : p.lat,
                            lng: typeof p.lng === 'function' ? p.lng() : p.lng
                        }));
                        setSimPath(path);
                    }
                    // Auto-fit the map only on first load
                    if (mapRef.current && result.routes?.[0]?.bounds && !boundsFittedRef.current) {
                        mapRef.current.fitBounds(result.routes[0].bounds, { top: 140, right: 40, bottom: 160, left: 40 });
                        boundsFittedRef.current = true; // Mark that we've fitted bounds once
                    }
                } else {
                    console.warn('[TiffinNav] Directions failed:', status);
                }
            }
        );
    }, [riderCoords, customerCoords, mapsReady]);

    const handleSendOtp = async () => {
        setSendingOtp(true);
        setModalError('');
        try {
            const res = await api.post(`/food/tiffin/delivery/${id}/send-otp`, {}, { contextModule: 'delivery' });
            if (res.data?.success) {
                // Not using toast directly since it might not be imported, or maybe it is? I'll just clear errors.
            } else {
                setModalError(res.data?.message || 'Failed to send OTP');
            }
        } catch (err) {
            setModalError(err.response?.data?.message || 'Error sending OTP');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleMapLoad = useCallback((mapInstance) => {
        mapRef.current = mapInstance;
    }, []);

    // Simulation Tick
    useEffect(() => {
        if (!isSimMode || !simPath || simPath.length < 2) return;
        const interval = setInterval(() => {
            setSimIndex(prev => {
                if (prev >= simPath.length - 1) {
                    setIsSimMode(false);
                    return prev;
                }
                const currentPoint = simPath[prev];
                const nextPoint = simPath[prev + 1];
                let heading = riderCoords?.heading || 0;
                
                if (window.google?.maps?.geometry) {
                    try {
                        const p1 = new window.google.maps.LatLng(currentPoint.lat, currentPoint.lng);
                        const p2 = new window.google.maps.LatLng(nextPoint.lat, nextPoint.lng);
                        heading = window.google.maps.geometry.spherical.computeHeading(p1, p2);
                    } catch(e) {}
                }
                
                setRiderCoords({ lat: nextPoint.lat, lng: nextPoint.lng, heading });
                if (mapRef.current) mapRef.current.panTo(nextPoint);
                return prev + 1;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [isSimMode, simPath, riderCoords]);

    // OTP handlers
    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newDigits = [...otpDigits];
        newDigits[index] = value;
        setOtpDigits(newDigits);
        if (value && index < 3) {
            document.getElementById(`tnav-otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            document.getElementById(`tnav-otp-${index - 1}`)?.focus();
        }
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitDelivery = async () => {
        if (!delivery) return;
        setModalError('');
        if (verifyMode === 'otp') {
            if (otpDigits.join('').length < 4) {
                setModalError('Please enter the complete 4-digit customer OTP');
                return;
            }
        } else {
            if (!callConfirmed) { setModalError('Please confirm you called the customer before leaving the tiffin.'); return; }
            if (!photoPreview) { setModalError('Please upload a photo proof of the drop-off.'); return; }
        }

        try {
            setIsSubmitting(true);
            const payload = verifyMode === 'otp'
                ? { status: 'delivered', otp: otpDigits.join('') }
                : { status: 'delivered_unattended', pictureUrl: photoPreview };

            const res = await api.put(`/food/tiffin/delivery/${delivery._id}/status`, payload, { contextModule: 'delivery' })
                .catch(() => api.put(`/delivery/tiffin/${delivery._id}/status`, payload, { contextModule: 'delivery' }));

            if (res?.data?.success) {
                toast.success(`🍱 Tiffin delivered to ${delivery.deliveryAddress?.name || 'Customer'} successfully!`);
                navigate('/food/delivery/tiffin', { replace: true });
            } else {
                setModalError(res?.data?.message || 'Failed to complete delivery');
            }
        } catch (error) {
            setModalError(error?.response?.data?.message || 'Server error verifying delivery');
        } finally {
            setIsSubmitting(false);
        }
    };

    const customerName = delivery?.deliveryAddress?.name || delivery?.userId?.name || 'Customer';
    const customerAddress = delivery?.deliveryAddress?.fullAddress || delivery?.deliveryAddress?.street || '';
    const customerLandmark = delivery?.deliveryAddress?.landmark || '';
    const customerPhone = delivery?.deliveryAddress?.phone || delivery?.userId?.phone || '';
    const planName = delivery?.subscriptionId?.planId?.name || 'Tiffin';

    if (loadingDelivery) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-400" />
                    <p className="text-sm font-bold">Loading delivery...</p>
                </div>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                    <h2 className="text-lg font-black text-gray-900">Delivery Not Found</h2>
                    <button onClick={() => navigate('/food/delivery/tiffin')} className="px-6 py-3 bg-[#0ea5e9] text-white rounded-2xl font-bold text-sm">
                        Back to Route
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950 flex flex-col z-[100]">
            {/* Full-screen Map area */}
            <div className="relative flex-1">
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={() => navigate('/food/delivery/tiffin')}
                            className="pointer-events-auto w-11 h-11 rounded-2xl bg-white shadow-lg flex items-center justify-center text-gray-800 active:scale-95 transition shrink-0 mt-0.5"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="pointer-events-auto flex-1 bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-3.5 border border-gray-100">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-wider flex items-center gap-1">
                                        <Navigation className="w-3 h-3" /> Navigating to
                                    </p>
                                    <h2 className="text-base font-black text-gray-900 truncate leading-tight mt-0.5">{customerName}</h2>
                                    <p className="text-[11px] text-gray-500 truncate mt-0.5">🍱 {planName}</p>
                                    {customerAddress && (
                                        <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {customerAddress}
                                        </p>
                                    )}
                                </div>

                                {routeInfo && (
                                    <div className="text-right shrink-0 bg-sky-50 rounded-xl p-2 border border-sky-100">
                                        <p className="text-xs font-black text-gray-900">{routeInfo.distance}</p>
                                        <p className="text-[10px] text-sky-600 font-bold flex items-center gap-0.5 justify-end">
                                            <Clock className="w-3 h-3" /> {routeInfo.duration}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {customerPhone && (
                                <a
                                    href={`tel:${customerPhone}`}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold active:scale-95 transition"
                                >
                                    <Phone className="w-3.5 h-3.5" /> Call Customer
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Map */}
                {mapsReady ? (
                    mapsError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <p className="text-red-600 font-bold text-sm">Failed to load map</p>
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={riderCoords || customerCoords || { lat: 22.7196, lng: 75.8577 }}
                            zoom={18}
                            tilt={60}
                            heading={riderCoords?.heading || 0}
                            options={{
                                ...mapOptions,
                                tiltInteractionEnabled: false,
                                rotateControl: false
                            }}
                            onLoad={handleMapLoad}
                        >
                            {directions && (
                                <DirectionsRenderer
                                    directions={directions}
                                    options={{
                                        suppressMarkers: true,
                                        polylineOptions: {
                                            strokeColor: '#0ea5e9',
                                            strokeWeight: 5,
                                            strokeOpacity: 0.85
                                        }
                                    }}
                                />
                            )}

                            {riderCoords && (
                                <OverlayView position={riderCoords} mapPaneName={OverlayView.MARKER_LAYER}>
                                    <div style={{ transform: `translate(-50%, -50%) rotate(${riderCoords.heading || 0}deg)`, transition: 'transform 0.5s linear' }} className="relative w-[80px] h-[80px]">
                                        <img src={bikelogo} alt="Rider" className="w-full h-full object-contain drop-shadow-md" />
                                    </div>
                                </OverlayView>
                            )}

                            {customerCoords && (
                                <Marker
                                    position={customerCoords}
                                    icon={{
                                        url: 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png',
                                        scaledSize: new window.google.maps.Size(36, 36),
                                        anchor: new window.google.maps.Point(18, 36)
                                    }}
                                    title={customerName}
                                />
                            )}
                        </GoogleMap>
                    )
                ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <Loader2 className="w-8 h-8 animate-spin text-[#0ea5e9] mx-auto" />
                            <p className="text-sm font-bold text-gray-600">Loading Map...</p>
                        </div>
                    </div>
                )}

                {/* Map Action Buttons */}
                {mapsReady && !mapsError && (
                    <div className="absolute right-4 bottom-8 flex flex-col gap-4 z-[50]">
                        <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) + 1)} className="p-3 hover:bg-gray-50 border-b border-gray-100 text-gray-900 active:scale-90 transition-all"><Plus className="w-5 h-5" /></button>
                            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) - 1)} className="p-3 hover:bg-gray-50 text-gray-900 active:scale-90 transition-all"><Minus className="w-5 h-5" /></button>
                        </div>
                        <button 
                            onClick={() => {
                                if (!isSimMode && simPath.length > 0) {
                                    setSimIndex(0);
                                    if (simPath[0]) setRiderCoords({ ...simPath[0], heading: 0 });
                                }
                                setIsSimMode(!isSimMode);
                            }}
                            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center border border-gray-100 transition-all ${isSimMode ? 'bg-orange-500 text-white' : 'bg-white text-emerald-500'}`}
                        >
                            <Play className={`w-6 h-6 fill-current ${isSimMode ? 'animate-pulse' : ''} ml-1`} />
                        </button>
                        <button 
                            onClick={() => {
                                if (mapRef.current && riderCoords) {
                                    mapRef.current.panTo(riderCoords);
                                    mapRef.current.setZoom(16);
                                }
                            }}
                            className="w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-900 border border-gray-100 active:scale-90 transition-all"
                        >
                            <Target className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Landmark Pill */}
                {customerLandmark && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-700">🏢 {customerLandmark}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-white text-black shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 pt-4 pb-8 space-y-3 z-20 border-t-2 border-black">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shrink-0">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-black truncate">{customerName}</p>
                        <p className="text-[11px] text-zinc-600 truncate">{customerAddress || 'Check address above'}</p>
                    </div>
                    {customerPhone && (
                        <a href={`tel:${customerPhone}`} className="w-10 h-10 rounded-2xl bg-black text-white hover:bg-zinc-800 flex items-center justify-center shrink-0 active:scale-90 transition shadow-sm">
                            <Phone className="w-4 h-4 text-white" />
                        </a>
                    )}
                </div>

                <button
                    onClick={() => setShowDropoff(true)}
                    className="w-full py-4 rounded-2xl bg-black text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition hover:bg-zinc-800"
                >
                    <CheckSquare className="w-5 h-5 text-white" />
                    Deliver Tiffin
                </button>
            </div>

            {/* ─── DROP-OFF MODAL ─── */}
            {showDropoff && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200 border-t-2 border-black text-black">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                            <div>
                                <h3 className="text-lg font-black text-black flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-black" /> Complete Tiffin Drop-off
                                </h3>
                                <p className="text-xs text-zinc-600 font-bold">{customerName}</p>
                            </div>
                            <button onClick={() => setShowDropoff(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-black hover:bg-zinc-200 border border-zinc-300 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-300 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-black">{customerName}</span>
                                {customerPhone && (
                                    <a href={`tel:${customerPhone}`} className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                                        <Phone className="w-3 h-3 text-white" /> Call
                                    </a>
                                )}
                            </div>
                            <p className="text-xs text-zinc-700 leading-relaxed font-medium">{customerAddress}</p>
                            {customerLandmark && <p className="text-xs font-bold text-black">🏢 {customerLandmark}</p>}
                        </div>

                        <div className="p-3 bg-zinc-100 rounded-2xl border border-zinc-300 text-[11px] text-black space-y-1">
                            <span className="font-black flex items-center gap-1 text-black">
                                <ShieldCheck className="w-3.5 h-3.5 text-black" /> Delivery Handover Guidelines:
                            </span>
                            <p className="text-zinc-700 leading-relaxed font-medium">
                                Hand over the tiffin directly to the customer. If unreachable, call them first. If still unreachable, leave at door/gate with photo proof.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-black uppercase tracking-wider">Verification Method:</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[['otp', ShieldCheck, 'Customer OTP'], ['photo', Camera, 'Photo Drop']].map(([mode, Icon, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setVerifyMode(mode)}
                                        className={`py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 border-2 ${
                                            verifyMode === mode 
                                                ? 'bg-black text-white font-black shadow-sm border-black' 
                                                : 'bg-white border-zinc-300 text-zinc-700 font-bold hover:bg-zinc-50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {verifyMode === 'otp' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-zinc-600 font-medium text-center">Ask the customer for their 4-digit handover OTP</p>
                                <div className="flex items-center justify-center gap-3">
                                    {[0, 1, 2, 3].map(i => (
                                        <input
                                            key={i}
                                            id={`tnav-otp-${i}`}
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
                                <div className="flex justify-center pt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleSendOtp} 
                                        disabled={sendingOtp}
                                        className="py-2 px-4 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 w-full max-w-[200px] shadow-sm"
                                    >
                                        {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                                        {sendingOtp ? 'Sending...' : 'Send OTP to Customer'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="flex items-start gap-2.5 cursor-pointer bg-zinc-50 p-3 rounded-2xl border border-zinc-300">
                                    <input type="checkbox" checked={callConfirmed} onChange={(e) => setCallConfirmed(e.target.checked)} className="mt-0.5 rounded text-black focus:ring-black" />
                                    <span className="text-xs text-black font-semibold leading-snug">I have called the customer to confirm placing the tiffin at their door/gate.</span>
                                </label>
                                <div className="border-2 border-dashed border-zinc-400 rounded-2xl p-4 text-center space-y-2 hover:border-black transition bg-zinc-50">
                                    {photoPreview ? (
                                        <div className="space-y-2">
                                            <img src={photoPreview} alt="Drop-off Proof" className="w-full h-36 object-cover rounded-xl shadow-sm border border-zinc-300" />
                                            <button type="button" onClick={() => setPhotoPreview(null)} className="text-xs font-bold text-black hover:underline">Retake Picture</button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block space-y-1 py-3">
                                            <Camera className="w-8 h-8 text-black mx-auto" />
                                            <span className="text-xs font-bold text-black block">Take Photo Proof</span>
                                            <span className="text-[10px] text-zinc-500 font-medium block">Click to capture using camera</span>
                                            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {modalError && (
                            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5 font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button type="button" onClick={() => setShowDropoff(false)} disabled={isSubmitting} className="py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-bold text-black transition">
                                Cancel
                            </button>
                            <button type="button" onClick={handleSubmitDelivery} disabled={isSubmitting} className="py-3.5 rounded-2xl bg-black hover:bg-zinc-800 text-white font-black text-xs shadow-xl active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin text-white" /> Verifying...</> : <><Check className="w-4 h-4 text-white" /> Confirm Drop-off</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
