import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { ArrowLeft, Clock, Phone, Home, Check, ShieldCheck, Soup, Bike, Star, Loader2, User } from 'lucide-react';
import api from '@food/api';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader';
import { useOrderLocationSubscription } from '@food/hooks/useOrderLocationSubscription';
import { subscribeLocationUpdates, getUserSocket } from '@food/utils/userSocketManager';
import bikelogo from '@food/assets/bikelogo.png';

import { motion, AnimatePresence } from 'framer-motion';
import { Share2, RefreshCw, Receipt, ChevronRight, X, MessageSquare, Calendar } from 'lucide-react';
import { RIDER_BIKE_SVG, CUSTOMER_PIN_SVG, RESTAURANT_PIN_SVG } from '@food/constants/mapIcons';

const DEFAULT_CUSTOMER_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_CUSTOMER_PIN = typeof CUSTOMER_PIN_SVG !== 'undefined' ? CUSTOMER_PIN_SVG : DEFAULT_CUSTOMER_PIN;
const DEFAULT_RESTAURANT_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_RESTAURANT_PIN = typeof RESTAURANT_PIN_SVG !== 'undefined' ? RESTAURANT_PIN_SVG : DEFAULT_RESTAURANT_PIN;

// Reusable Section Item Component
const SectionItem = ({ icon: Icon, iconNode, title, subtitle, showArrow = true, onClick }) => (
  <div 
    className={`flex items-start gap-4 p-4 border-b border-gray-100 dark:border-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors' : ''}`}
    onClick={onClick}
  >
    <div className="mt-1 shrink-0">
      {iconNode ? iconNode : <Icon className="w-6 h-6 text-gray-400" />}
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-1">{subtitle}</p>
    </div>
    {showArrow && (
      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
    )}
  </div>
);



const mapContainerStyle = {
    width: '100vw',
    height: '100vh',
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
    const [showSuccess, setShowSuccess] = useState(false);
    const [directions, setDirections] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [currentEta, setCurrentEta] = useState(null);
    
    // Coordinates
    const [restaurantCoords, setRestaurantCoords] = useState(null);
    const [customerCoords, setCustomerCoords] = useState(null);
    const [riderCoords, setRiderCoords] = useState(null);
    const [smoothLocation, setSmoothLocation] = useState(null);
    const [isSheetExpanded, setIsSheetExpanded] = useState(true);
    const [customerDeliveryOtp, setCustomerDeliveryOtp] = useState(null);
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
                        
                        // Auto-set OTP if it was already generated
                        if (found.verification?.otpExpected) {
                            setCustomerDeliveryOtp(found.verification.otpExpected);
                        }
                        
                        // Set customer coords
                        const cCoords = found.deliveryAddress?.location?.coordinates;
                        if (cCoords && cCoords.length === 2) {
                            setCustomerCoords({ lat: cCoords[1], lng: cCoords[0] });
                        } else {
                            setCustomerCoords({ lat: 22.7296, lng: 75.8677 }); 
                        }
                        
                        // Set initial rider coords from delivery's current location if available
                        const rLoc = found.assignedTo?.currentLocation || found.assignedTo?.location || found.riderLocation;
                        
                        // Extract restaurant coords for fallback
                        let restCoords = { lat: 22.7196, lng: 75.8577 };
                        const rstCoordsArr = found.restaurantId?.location?.coordinates || found.restaurantId?.address?.location?.coordinates;
                        if (rstCoordsArr && rstCoordsArr.length === 2) {
                            restCoords = { lat: rstCoordsArr[1], lng: rstCoordsArr[0] };
                        }
                        setRestaurantCoords(restCoords);

                        if (rLoc) {
                            const rLat = rLoc.lat || (rLoc.coordinates && rLoc.coordinates[1]);
                            const rLng = rLoc.lng || (rLoc.coordinates && rLoc.coordinates[0]);
                            if (rLat && rLng) {
                                setRiderCoords({ lat: Number(rLat), lng: Number(rLng), heading: rLoc.heading || 0 });
                            } else {
                                setRiderCoords(restCoords); // Fallback if rLoc exists but empty
                            }
                        } else if (found.status === 'assigned' || found.status === 'out_for_delivery') {
                            // If active delivery but no rider location yet, show rider at restaurant
                            setRiderCoords(restCoords);
                        }
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

    // Check for delivered status to trigger success animation and redirect
    useEffect(() => {
        if (delivery?.status === 'delivered') {
            setShowSuccess(true);
            const timer = setTimeout(() => {
                navigate('/food');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [delivery?.status, navigate]);

    // 2. Listen for live location updates via Socket.IO
    useEffect(() => {
        if (!trackingIds.length) return undefined;

        const handleLocationUpdate = (data) => {
            console.log('📍 [TiffinTracking] Location update received via socket:', data);
            
            // Only process updates for this specific delivery
            if (data.orderId && data.orderId !== deliveryId) return;

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

    // Listen for OTP trigger
    useEffect(() => {
        const sock = getUserSocket();
        if (!sock) return;

        const handleOtp = (data) => {
            if (data?.deliveryId === deliveryId && data?.otp) {
                setCustomerDeliveryOtp(data.otp);
                setIsSheetExpanded(true); // Auto expand to show OTP
            }
        };

        sock.on('tiffin_handover_otp', handleOtp);
        return () => sock.off('tiffin_handover_otp', handleOtp);
    }, [deliveryId, trackingIds]);

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
        const originCoords = riderCoords || restaurantCoords;
        if (!mapsReady || !originCoords || !customerCoords || directionsCalledRef.current) return;
        
        directionsCalledRef.current = true;
        const service = new window.google.maps.DirectionsService();
        
        service.route(
            {
                origin: originCoords,
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
    }, [mapsReady, riderCoords, customerCoords, restaurantCoords]);

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


    const handleShare = () => {
      if (navigator.share) {
        navigator.share({
          title: 'Track my Tiffin Order',
          url: window.location.href,
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(window.location.href);
      }
    };

    const handleRefresh = () => {
      window.location.reload();
    };

    return (
        <div className="h-screen w-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-[#0a0a0a]">
            
            {/* Green Header */}
            <motion.div
                className={`bg-green-600 text-white z-20 flex-shrink-0 relative shadow-md`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Navigation bar */}
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        className="w-10 h-10 flex items-center justify-center cursor-pointer"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="font-semibold text-lg">{restaurantId?.name || 'Tiffin Service'}</h2>
                    <motion.button
                        className="w-10 h-10 flex items-center justify-center cursor-pointer"
                        whileTap={{ scale: 0.9 }}
                        onClick={handleShare}
                    >
                        <Share2 className="w-5 h-5" />
                    </motion.button>
                </div>

                <div className="px-4 pb-4 text-center">
                    <motion.h1
                        className="text-2xl font-bold mb-3"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {getStatusHeading()}
                    </motion.h1>

                    {/* Status pill */}
                    <motion.div
                        className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-2"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="text-sm">{isDelivered ? "Delivered" : "Waiting for restaurant to accept"}</span>
                        <motion.button
                            onClick={handleRefresh}
                            className="ml-1"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>

            {/* Map Section */}
            <div className="absolute inset-0 z-0">
                {mapsReady && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        options={mapOptions}
                        onLoad={handleMapLoad}
                        center={riderCoords || restaurantCoords || { lat: 22.7196, lng: 75.8577 }}
                        zoom={15}
                    >
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: { strokeColor: '#22c55e', strokeOpacity: 0.9, strokeWeight: 5 }
                                }}
                            />
                        )}

                        {/* Customer Marker (Blinking Green Pin) */}
                        {customerCoords && (
                            <OverlayView position={customerCoords} mapPaneName={OverlayView.MARKER_LAYER}>
                                <div className="relative -translate-x-1/2 -translate-y-full mb-1 group">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <motion.div
                                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-16 h-16 rounded-full border-4 border-green-500/50"
                                        />
                                    </div>
                                    <div className="relative w-11 h-11 rounded-full p-1 bg-white shadow-xl border-2 border-green-500 overflow-hidden group-hover:scale-110 transition-transform">
                                        <img
                                            src={delivery?.userId?.profileImage || delivery?.userId?.avatar || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SAFE_CUSTOMER_PIN)}`}
                                            alt="Me"
                                            className="w-full h-full object-contain rounded-full bg-gray-50"
                                            onError={(e) => { e.target.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SAFE_CUSTOMER_PIN)}`; }}
                                        />
                                    </div>
                                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 -mt-1 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                                </div>
                            </OverlayView>
                        )}

                        {/* Restaurant Marker (Orange Pin) */}
                        {restaurantCoords && (
                            <OverlayView position={restaurantCoords} mapPaneName={OverlayView.MARKER_LAYER}>
                                <div className="relative -translate-x-1/2 -translate-y-full mb-1 group">
                                    {!isOutForDelivery && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <motion.div
                                                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="w-16 h-16 rounded-full border-4 border-orange-500/50"
                                            />
                                        </div>
                                    )}
                                    <div className="relative w-11 h-11 rounded-full p-1 bg-white shadow-xl border-2 border-orange-500 overflow-hidden group-hover:scale-110 transition-transform">
                                        <img
                                            src={delivery?.restaurantId?.logo || delivery?.restaurantId?.profileImage || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SAFE_RESTAURANT_PIN)}`}
                                            alt="Restaurant"
                                            className="w-full h-full object-contain rounded-full bg-gray-50"
                                            onError={(e) => { e.target.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SAFE_RESTAURANT_PIN)}`; }}
                                        />
                                    </div>
                                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 -mt-1 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                                </div>
                            </OverlayView>
                        )}

                        {/* Animated Bike Marker */}
                        {displayRiderLocation && (
                            <OverlayView position={displayRiderLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div style={{ transform: `translate(-50%, -50%) rotate(${displayRiderLocation.heading || 0}deg)`, transition: 'transform 0.3s linear', zIndex: 100 }} className="relative w-[70px] h-[70px]">
                                    <img src={bikelogo} alt="Rider" className="w-full h-full object-contain drop-shadow-2xl" />
                                </div>
                            </OverlayView>
                        )}
                    </GoogleMap>
                )}
            </div>

            {/* Scrollable Content (Bottom Sheet) */}
            <motion.div 
                className="absolute bottom-0 left-0 right-0 z-20 bg-gray-50 dark:bg-[#141414] rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] flex flex-col max-h-[45vh]"
                initial={false}
                animate={{ y: isSheetExpanded ? 0 : 'calc(100% - 48px)' }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
            >
                {/* Drag handle pill */}
                <div 
                    className="w-full flex justify-center pt-4 pb-3 shrink-0 bg-transparent cursor-pointer"
                    onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 space-y-4 md:space-y-6 pb-24">
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                        
                        {/* Customer Delivery OTP */}
                        {customerDeliveryOtp && (
                            <motion.div
                                className="bg-sky-50 dark:bg-sky-900/10 rounded-xl p-4 shadow-sm border border-sky-100 dark:border-sky-800"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-sky-900 dark:text-sky-100 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-sky-500" /> Handover OTP
                                        </p>
                                        <p className="text-xs text-sky-700/80 dark:text-sky-300">Share this with the delivery partner</p>
                                    </div>
                                    <div className="bg-white dark:bg-black/20 px-4 py-2 rounded-lg border border-sky-200 dark:border-sky-700 shadow-inner">
                                        <span className="text-2xl font-black tracking-widest text-sky-600 dark:text-sky-400">{customerDeliveryOtp}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Dynamic Status Card */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-orange-100 bg-orange-50 text-orange-500">
                                    <Receipt className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{getStatusHeading()}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">Waiting for restaurant to accept</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Delivery Details Banner */}
                        <motion.div
                            className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 text-center border border-yellow-100 dark:border-yellow-900/30"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <p className="text-yellow-800 dark:text-yellow-400 font-medium text-sm">
                                All your delivery details in one place 🥡
                            </p>
                        </motion.div>

                        {/* Contact & Address Section */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm overflow-hidden border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <SectionItem
                                icon={User}
                                title={delivery?.userId?.name || delivery?.userId?.fullName || 'Customer'}
                                subtitle={delivery?.userId?.phone || 'Phone number not available'}
                                showArrow={false}
                            />
                            <SectionItem
                                iconNode={
                                    <div
                                        dangerouslySetInnerHTML={{ __html: SAFE_CUSTOMER_PIN }}
                                        className="w-6 h-6 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                                    />
                                }
                                title="Delivery at Location"
                                subtitle={delivery?.deliveryAddress?.formattedAddress || 'Address not available'}
                                showArrow={false}
                            />
                            <SectionItem
                                icon={MessageSquare}
                                title="Add delivery instructions"
                                subtitle=""
                                onClick={() => {}}
                            />
                        </motion.div>

                        {/* Restaurant Section */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm overflow-hidden border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="flex items-center gap-3 p-4 border-b border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: SAFE_RESTAURANT_PIN }}
                                        className="w-7 h-7 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{restaurantId?.name || 'Tiffin Service'}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{restaurantId?.address?.formattedAddress || 'Restaurant location'}</p>
                                </div>
                                <motion.button
                                    className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => window.location.href = `tel:${restaurantId?.phone || ''}`}
                                >
                                    <Phone className="w-5 h-5 text-orange-500" />
                                </motion.button>
                            </div>

                            {/* Order Items */}
                            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <Receipt className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="mt-1 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="w-4 h-4 rounded border border-green-600 flex items-center justify-center">
                                                    <span className="w-2 h-2 rounded-full bg-green-600" />
                                                </span>
                                                <span>1 x {type || 'Special'} Meal / Dinner Tiffin</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </motion.div>
            
            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-green-600 flex flex-col justify-center items-center text-white"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="bg-white rounded-full p-4 mb-6 shadow-2xl"
                        >
                            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold mb-2"
                        >
                            Order Received!
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-green-100 font-medium"
                        >
                            Taking you to home screen...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
