import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { ArrowLeft, Clock, Phone, Home, Check, ShieldCheck, Soup, Bike, Star, Loader2, User } from 'lucide-react';
import api from '@food/api';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader';
import { useOrderLocationSubscription } from '@food/hooks/useOrderLocationSubscription';
import { subscribeLocationUpdates } from '@food/utils/userSocketManager';
import bikelogo from '@food/assets/bikelogo.png';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    inset: 0
};

// Clean map style
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
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    ]
};

export default function TiffinUserTrackingMap() {
    const { deliveryId } = useParams();
    const navigate = useNavigate();

    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapsReady, setMapsReady] = useState(isGoogleMapsLoaded());
    const [directions, setDirections] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [currentEta, setCurrentEta] = useState(null);
    
    // Coordinates
    const [restaurantCoords, setRestaurantCoords] = useState(null);
    const [customerCoords, setCustomerCoords] = useState(null);
    const [riderCoords, setRiderCoords] = useState(null);
    const [smoothLocation, setSmoothLocation] = useState(null);
    const directionsCalledRef = useRef(false);
    const mapRef = useRef(null);
    
    // Smooth animation refs (same as DeliveryTrackingMap)
    const interpStateRef = useRef({ lastPos: null, nextPos: null, startTime: 0, durationMs: 1500 });
    const lastUpdateAtRef = useRef(0);
    const lastSmoothSetRef = useRef(0);

    // Tracking IDs for socket subscription
    const trackingIds = useMemo(() => {
        return deliveryId ? [deliveryId] : [];
    }, [deliveryId]);

    // 1. Connect to socket for live location
    useOrderLocationSubscription(trackingIds, { enabled: trackingIds.length > 0 });

    useEffect(() => {
        if (!isGoogleMapsLoaded()) {
            loadGoogleMaps().then(() => setMapsReady(true));
        } else {
            setMapsReady(true);
        }
    }, []);

    useEffect(() => {
        const fetchDelivery = async () => {
            try {
                const res = await api.get('/food/tiffin/user/deliveries');
                if (res?.data?.success) {
                    const found = res.data.data.find(d => d._id === deliveryId);
                    if (found) {
                        setDelivery(found);
                        
                        // Set customer coords
                        const cCoords = found.deliveryAddress?.location?.coordinates;
                        if (cCoords && cCoords.length === 2) {
                            setCustomerCoords({ lat: cCoords[1], lng: cCoords[0] });
                        }
                        
                        // Set initial rider coords from delivery's current location if available
                        const rLoc = found.assignedTo?.currentLocation || found.riderLocation;
                        if (rLoc) {
                            const rLat = rLoc.lat || (rLoc.coordinates && rLoc.coordinates[1]);
                            const rLng = rLoc.lng || (rLoc.coordinates && rLoc.coordinates[0]);
                            if (rLat && rLng) {
                                setRiderCoords({ lat: Number(rLat), lng: Number(rLng), heading: rLoc.heading || 0 });
                            }
                        }
                        
                        // Fallback restaurant coords
                        setRestaurantCoords({ lat: 22.7196, lng: 75.8577 });
                    }
                }
            } catch (error) {
                console.error("Error fetching delivery", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDelivery();
    }, [deliveryId]);

    // 2. Listen for live location updates via Socket.IO
    useEffect(() => {
        if (!trackingIds.length) return undefined;

        const handleLocationUpdate = (data) => {
            const lat = Number(data?.lat ?? data?.boy_lat ?? data?.location?.lat ?? data?.location?.coordinates?.[1]);
            const lng = Number(data?.lng ?? data?.boy_lng ?? data?.location?.lng ?? data?.location?.coordinates?.[0]);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const nextPos = {
                lat,
                lng,
                heading: Number(data?.heading ?? data?.bearing ?? data?.location?.heading ?? 0),
            };
            const now = Date.now();
            const delta = Math.max(300, Math.min(now - (lastUpdateAtRef.current || now), 4000));
            lastUpdateAtRef.current = now;

            // Set up interpolation state for smooth glide
            interpStateRef.current = {
                lastPos: interpStateRef.current.nextPos || nextPos,
                nextPos,
                startTime: now,
                durationMs: delta,
            };

            setRiderCoords(nextPos);

            if (data?.eta) {
                setCurrentEta(data.eta);
            }
        };

        return subscribeLocationUpdates(handleLocationUpdate);
    }, [trackingIds]);

    // 3. Smooth Animation Loop (60 FPS Glide) — same as DeliveryTrackingMap
    useEffect(() => {
        let frame;
        const update = () => {
            const { lastPos, nextPos, startTime, durationMs } = interpStateRef.current;
            if (lastPos && nextPos) {
                const duration = Math.max(600, durationMs || 1500);
                const elapsed = Date.now() - startTime;
                const raw = Math.min(elapsed / duration, 1);
                const progress = raw * raw * (3 - 2 * raw); // easeInOut

                const lat = lastPos.lat + (nextPos.lat - lastPos.lat) * progress;
                const lng = lastPos.lng + (nextPos.lng - lastPos.lng) * progress;

                // Shortest-path heading interpolation
                let lastHead = lastPos.heading || 0;
                let nextHead = nextPos.heading || 0;
                if (Math.abs(nextHead - lastHead) > 180) {
                    if (nextHead > lastHead) lastHead += 360;
                    else nextHead += 360;
                }
                const heading = lastHead + (nextHead - lastHead) * progress;

                const now = Date.now();
                if (now - lastSmoothSetRef.current >= 33 || raw >= 1) {
                    lastSmoothSetRef.current = now;
                    setSmoothLocation({ lat, lng, heading: heading % 360 });
                }
            }
            frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, []);

    // Display location: prefer smooth interpolated, fallback to raw
    const displayRiderLocation = smoothLocation || riderCoords;

    // Calculate directions between rider and customer
    useEffect(() => {
        if (!mapsReady || !riderCoords || !customerCoords || directionsCalledRef.current) return;
        
        directionsCalledRef.current = true;
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
                    }
                    if (mapRef.current && result.routes?.[0]?.bounds) {
                        mapRef.current.fitBounds(result.routes[0].bounds, { top: 40, right: 20, bottom: 80, left: 20 });
                    }
                }
            }
        );
    }, [mapsReady, riderCoords, customerCoords]);

    const handleMapLoad = useCallback((mapInstance) => {
        mapRef.current = mapInstance;
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-gray-500 font-medium">Loading tracking details...</p>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white p-4 shadow-sm border-b">
                    <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-gray-700" /></button>
                </div>
                <div className="flex-1 flex justify-center items-center text-gray-500">
                    Delivery not found.
                </div>
            </div>
        );
    }

    const { restaurantId, assignedTo, status, type } = delivery;
    const isOutForDelivery = status === 'out_for_delivery';
    const isAssigned = status === 'assigned';
    const isDelivered = status === 'delivered';
    const ETA = currentEta || routeInfo?.duration || "15 mins";

    // Determine stepper state
    let currentStepIndex = 0;
    if (isAssigned) currentStepIndex = 1;
    if (isOutForDelivery) currentStepIndex = 1; 
    if (isDelivered) currentStepIndex = 3;

    const getStatusHeading = () => {
        if (isDelivered) return 'Tiffin Delivered';
        if (isOutForDelivery || isAssigned) return 'Preparing your Tiffin'; 
        return 'Preparing your Tiffin';
    };

    return (
        <div className="relative w-full h-screen bg-gray-100 overflow-hidden font-sans flex flex-col">
            {/* Header overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 p-5 flex items-start justify-between pointer-events-none">
                <button 
                    onClick={() => navigate('/food/user/orders')}
                    className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-gray-800 hover:bg-gray-50 transition-colors pointer-events-auto shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                {/* ETA Pill */}
                <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-3xl shadow-lg flex flex-col items-center flex-1 max-w-[240px] mx-4 pointer-events-auto border border-gray-100">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Clock className="w-5 h-5 text-[#ff6a00]" />
                        <span className="text-[17px] font-bold text-gray-900">Arriving in <span className="text-[#ff6a00]">{ETA}</span></span>
                    </div>
                    <span className="text-[12px] font-medium text-gray-400">Your tiffin is on the way</span>
                </div>

                <div className="w-12 h-12 shrink-0"></div> {/* Spacer for flex balance */}
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                {mapsReady && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        options={mapOptions}
                        onLoad={handleMapLoad}
                        center={riderCoords || { lat: 22.7196, lng: 75.8577 }}
                        zoom={15}
                    >
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: { strokeColor: '#0ea5e9', strokeOpacity: 0.9, strokeWeight: 5 }
                                }}
                            />
                        )}

                        {/* Customer Marker (Blue Pin matching Rider App) */}
                        {customerCoords && (
                            <Marker
                                position={customerCoords}
                                icon={{
                                    url: 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png',
                                    scaledSize: new window.google.maps.Size(36, 36),
                                    anchor: new window.google.maps.Point(18, 36)
                                }}
                            />
                        )}

                        {/* Animated Bike Marker (uses smooth interpolated position) */}
                        {displayRiderLocation && (
                            <OverlayView position={displayRiderLocation} mapPaneName={OverlayView.MARKER_LAYER}>
                                <div style={{ transform: `translate(-50%, -50%) rotate(${displayRiderLocation.heading || 0}deg)`, transition: 'transform 0.3s linear' }} className="relative w-[80px] h-[80px]">
                                    <img src={bikelogo} alt="Rider" className="w-full h-full object-contain drop-shadow-md" />
                                </div>
                            </OverlayView>
                        )}
                    </GoogleMap>
                )}
            </div>

            {/* Bottom Sheet UI (Restored Swiggy Style, Compacted) */}
            <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-20 overflow-hidden relative shrink-0">
                {/* Drag handle pill */}
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
                </div>

                <div className="px-5 pb-5 pt-1">
                    {/* Header */}
                    <div className="mb-5 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 leading-tight mb-0.5">
                                {getStatusHeading()}
                            </h2>
                            <p className="text-gray-500 text-sm font-medium">
                                {type} Meal • {restaurantId?.name || 'Tiffin Service'}
                            </p>
                        </div>
                        
                        {/* Handover OTP Badge */}
                        {(isOutForDelivery || isAssigned) && (
                            <div className="bg-gray-50 rounded-xl px-3 py-1.5 text-center border border-gray-200 shadow-sm shrink-0">
                                <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">OTP</span>
                                <span className="block text-lg font-black text-gray-900 tracking-[0.1em]">{delivery.otp || '1234'}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Custom Stepper */}
                    <div className="relative mb-6 px-1">
                        {/* Background Line */}
                        <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-10"></div>
                        {/* Active Progress Line */}
                        <div className="absolute top-4 left-6 h-0.5 bg-[#ff6a00] -z-10 transition-all duration-500" style={{ width: `${(currentStepIndex / 3) * 100}%`, maxWidth: 'calc(100% - 3rem)' }}></div>
                        
                        <div className="flex justify-between relative">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white ${currentStepIndex >= 0 ? 'border-2 border-[#ff6a00] text-[#ff6a00]' : 'border-2 border-gray-200 text-gray-400'}`}>
                                    <Soup className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-bold ${currentStepIndex >= 0 ? 'text-[#ff6a00]' : 'text-gray-400'}`}>Preparing</span>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white ${currentStepIndex >= 1 ? 'border-2 border-[#ff6a00] text-[#ff6a00]' : 'border-2 border-gray-200 text-gray-400'}`}>
                                    <Bike className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-bold ${currentStepIndex >= 1 ? 'text-[#ff6a00]' : 'text-gray-400'}`}>On the way</span>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white ${currentStepIndex >= 2 ? 'border-2 border-[#ff6a00] text-[#ff6a00]' : 'border-2 border-gray-200 text-gray-400'}`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-bold ${currentStepIndex >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>Arriving</span>
                            </div>

                            {/* Step 4 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white ${currentStepIndex >= 3 ? 'border-2 border-[#ff6a00] text-[#ff6a00]' : 'border-2 border-gray-200 text-gray-400'}`}>
                                    <Check className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-bold ${currentStepIndex >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>Delivered</span>
                            </div>
                        </div>
                    </div>

                    {/* Rider Info Card */}
                    {assignedTo ? (
                        <div className="flex items-center justify-between bg-[#fafafa] p-3 rounded-2xl border border-gray-100 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                                    {assignedTo.profileImage ? (
                                        <img src={assignedTo.profileImage} alt="rider" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="font-bold text-[15px] text-gray-900 leading-tight mb-0.5">{assignedTo.name || 'Delivery Partner'}</h4>
                                    <p className="text-[12px] text-gray-500 font-medium mb-1">is bringing your tiffin</p>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                                        <Star className="w-3 h-3 fill-[#ff9d00] text-[#ff9d00]" />
                                        4.7
                                    </div>
                                </div>
                            </div>
                            
                            {assignedTo.phone && (
                                <a 
                                    href={`tel:${assignedTo.phone}`} 
                                    className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-300 transition-colors shrink-0"
                                >
                                    <Phone className="w-4 h-4 fill-current" />
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-3">
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            <p className="text-gray-600 text-sm font-medium">Assigning a delivery partner...</p>
                        </div>
                    )}

                    {/* Footer Banner */}
                    <div className="bg-[#f7f7f7] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-gray-700" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Hygienic • Safe • On Time</span>
                            <span className="text-[10px] font-medium text-gray-500 leading-tight mt-0.5">We ensure hygienic packaging and timely delivery.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
