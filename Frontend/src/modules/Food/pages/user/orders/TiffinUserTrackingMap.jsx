import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { ArrowLeft, Share2, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@food/api';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader';
import { useOrderLocationSubscription } from '@food/hooks/useOrderLocationSubscription';
import { subscribeLocationUpdates, getUserSocket } from '@food/utils/userSocketManager';
import bikelogo from '@food/assets/bikelogo.png';
import { CUSTOMER_PIN_SVG, RESTAURANT_PIN_SVG } from '@food/constants/mapIcons';
import TiffinTrackingDetailsSheet from './components/TiffinTrackingDetailsSheet';

const DEFAULT_CUSTOMER_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_CUSTOMER_PIN = typeof CUSTOMER_PIN_SVG !== 'undefined' ? CUSTOMER_PIN_SVG : DEFAULT_CUSTOMER_PIN;
const DEFAULT_RESTAURANT_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_RESTAURANT_PIN = typeof RESTAURANT_PIN_SVG !== 'undefined' ? RESTAURANT_PIN_SVG : DEFAULT_RESTAURANT_PIN;

const mapContainerStyle = {
    width: '100vw',
    height: '100vh',
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
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    ]
};

// Calculate straight-line distance in meters between two lat/lng points
const getDistanceMeters = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const R = 6371e3;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
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

    const mapRef = useRef(null);
    const lastRouteKeyRef = useRef('');
    const interpStateRef = useRef({ lastPos: null, nextPos: null, startTime: 0, durationMs: 1500 });
    const lastUpdateAtRef = useRef(0);
    const lastSmoothSetRef = useRef(0);

    const trackingIds = useMemo(() => (deliveryId ? [deliveryId] : []), [deliveryId]);
    useOrderLocationSubscription(trackingIds, { enabled: trackingIds.length > 0 });

    useEffect(() => {
        if (!isGoogleMapsLoaded()) {
            loadGoogleMaps().then(() => setMapsReady(true));
        } else {
            setMapsReady(true);
        }
    }, []);

    const extractCoordinates = useCallback((deliv) => {
        if (!deliv) return;

        // 1. Restaurant Coords
        let rest = null;
        const restArr = deliv.restaurantId?.location?.coordinates || deliv.restaurantId?.address?.location?.coordinates;
        if (Array.isArray(restArr) && restArr.length === 2 && Number.isFinite(restArr[0])) {
            rest = { lat: Number(restArr[1]), lng: Number(restArr[0]) };
        } else if (deliv.restaurantId?.location?.latitude && deliv.restaurantId?.location?.longitude) {
            rest = { lat: Number(deliv.restaurantId.location.latitude), lng: Number(deliv.restaurantId.location.longitude) };
        }
        if (!rest) rest = { lat: 22.7176, lng: 75.8719 };
        setRestaurantCoords(rest);

        // 2. Customer Coords
        let cust = null;
        const custArr = deliv.deliveryAddress?.location?.coordinates || deliv.subscriptionId?.deliveryAddress?.location?.coordinates;
        if (Array.isArray(custArr) && custArr.length === 2 && Number.isFinite(custArr[0]) && (custArr[1] !== 22.7196 || custArr[0] !== 75.8577)) {
            cust = { lat: Number(custArr[1]), lng: Number(custArr[0]) };
        } else if (deliv.userId?.addresses?.length) {
            const def = deliv.userId.addresses.find(a => a.isDefault) || deliv.userId.addresses[0];
            if (Array.isArray(def?.location?.coordinates) && def.location.coordinates.length === 2) {
                cust = { lat: Number(def.location.coordinates[1]), lng: Number(def.location.coordinates[0]) };
            }
        }
        if (!cust && Array.isArray(custArr) && custArr.length === 2) {
            cust = { lat: Number(custArr[1]), lng: Number(custArr[0]) };
        }
        if (!cust) cust = rest;
        setCustomerCoords(cust);

        // 3. Rider Coords
        const partner = deliv.assignedTo;
        let rider = null;
        if (partner?.lastLat && partner?.lastLng) {
            rider = { lat: Number(partner.lastLat), lng: Number(partner.lastLng), heading: 0 };
        } else if (Array.isArray(partner?.lastLocation?.coordinates) && partner.lastLocation.coordinates.length === 2) {
            rider = { lat: Number(partner.lastLocation.coordinates[1]), lng: Number(partner.lastLocation.coordinates[0]), heading: 0 };
        } else if (deliv.riderLocation?.lat && deliv.riderLocation?.lng) {
            rider = { lat: Number(deliv.riderLocation.lat), lng: Number(deliv.riderLocation.lng), heading: 0 };
        }

        if (rider) {
            setRiderCoords(rider);
        } else if (deliv.status === 'assigned' || deliv.status === 'out_for_delivery') {
            setRiderCoords(rest);
        }
    }, []);

    const fetchDelivery = useCallback(async () => {
        try {
            const res = await api.get('/food/tiffin/user/deliveries');
            if (res?.data?.success) {
                const found = res.data.data.find(d => d._id === deliveryId);
                if (found) {
                    setDelivery(found);
                    if (found.verification?.otpExpected) {
                        setCustomerDeliveryOtp(found.verification.otpExpected);
                    }
                    extractCoordinates(found);
                }
            }
        } catch (error) {
            console.error("Error fetching delivery:", error);
        } finally {
            setLoading(false);
        }
    }, [deliveryId, extractCoordinates]);

    // Initial fetch and auto-polling until delivered
    useEffect(() => {
        fetchDelivery();
        const isCompleted = delivery?.status === 'delivered' || delivery?.status === 'delivered_unattended';
        if (isCompleted) return;

        const interval = setInterval(() => {
            fetchDelivery();
        }, 4000);

        return () => clearInterval(interval);
    }, [fetchDelivery, delivery?.status]);

    // Check for delivered status to trigger success animation and redirect
    useEffect(() => {
        if (delivery?.status === 'delivered' || delivery?.status === 'delivered_unattended') {
            setShowSuccess(true);
            const timer = setTimeout(() => navigate('/food'), 3000);
            return () => clearTimeout(timer);
        }
    }, [delivery?.status, navigate]);

    // Socket: Live Rider Location
    useEffect(() => {
        if (!trackingIds.length) return undefined;
        const handleLocationUpdate = (data) => {
            if (data.orderId && data.orderId !== deliveryId) return;
            const lat = Number(data?.lat ?? data?.boy_lat ?? data?.location?.lat ?? data?.location?.coordinates?.[1]);
            const lng = Number(data?.lng ?? data?.boy_lng ?? data?.location?.lng ?? data?.location?.coordinates?.[0]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const nextPos = { lat, lng, heading: Number(data?.heading ?? data?.bearing ?? 0) };
            const now = Date.now();
            const delta = Math.max(300, Math.min(now - (lastUpdateAtRef.current || now), 4000));
            lastUpdateAtRef.current = now;

            interpStateRef.current = {
                lastPos: interpStateRef.current.nextPos || nextPos,
                nextPos,
                startTime: now,
                durationMs: delta,
            };
            setRiderCoords(nextPos);
            if (data?.eta) setCurrentEta(data.eta);
        };
        return subscribeLocationUpdates(handleLocationUpdate);
    }, [trackingIds, deliveryId]);

    // Socket: Handover OTP & Realtime Status Updates
    useEffect(() => {
        const sock = getUserSocket();
        if (!sock) return;

        const handleOtp = (data) => {
            if ((data?.deliveryId === deliveryId || data?._id === deliveryId) && data?.otp) {
                setCustomerDeliveryOtp(data.otp);
                setIsSheetExpanded(true);
            }
        };

        const handleStatusUpdate = (data) => {
            if (data?.deliveryId === deliveryId || data?._id === deliveryId || data?.orderId === deliveryId) {
                if (data.status) {
                    setDelivery(prev => prev ? { ...prev, status: data.status, deliveredAt: data.deliveredAt } : prev);
                    if (data.status === 'delivered' || data.status === 'delivered_unattended') {
                        setShowSuccess(true);
                    }
                }
            }
        };

        sock.on('tiffin_handover_otp', handleOtp);
        sock.on('tiffin_status_update', handleStatusUpdate);
        sock.on('delivery_status_update', handleStatusUpdate);

        return () => {
            sock.off('tiffin_handover_otp', handleOtp);
            sock.off('tiffin_status_update', handleStatusUpdate);
            sock.off('delivery_status_update', handleStatusUpdate);
        };
    }, [deliveryId]);

    // 60 FPS Glide animation
    useEffect(() => {
        let frame;
        const update = () => {
            const { lastPos, nextPos, startTime, durationMs } = interpStateRef.current;
            if (lastPos && nextPos) {
                const duration = Math.max(600, durationMs || 1500);
                const elapsed = Date.now() - startTime;
                const raw = Math.min(elapsed / duration, 1);
                const progress = raw * raw * (3 - 2 * raw);

                const lat = lastPos.lat + (nextPos.lat - lastPos.lat) * progress;
                const lng = lastPos.lng + (nextPos.lng - lastPos.lng) * progress;

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

    const displayRiderLocation = smoothLocation || riderCoords;

    // Calculate Directions and accurate distance
    useEffect(() => {
        const originCoords = riderCoords || restaurantCoords;
        if (!mapsReady || !originCoords || !customerCoords || !window.google?.maps) return;

        const distanceM = getDistanceMeters(originCoords, customerCoords);
        if (distanceM < 80) {
            setRouteInfo({ distance: '< 100 m', duration: '1-2 mins' });
            setDirections(null);
            if (mapRef.current) {
                mapRef.current.panTo(customerCoords);
                mapRef.current.setZoom(17);
            }
            return;
        }

        const routeKey = `${originCoords.lat.toFixed(4)},${originCoords.lng.toFixed(4)}->${customerCoords.lat.toFixed(4)},${customerCoords.lng.toFixed(4)}`;
        if (lastRouteKeyRef.current === routeKey) return;
        lastRouteKeyRef.current = routeKey;

        const service = new window.google.maps.DirectionsService();
        service.route(
            { origin: originCoords, destination: customerCoords, travelMode: window.google.maps.TravelMode.DRIVING },
            (result, status) => {
                if (status === 'OK' && result) {
                    setDirections(result);
                    const leg = result.routes?.[0]?.legs?.[0];
                    if (leg) {
                        setRouteInfo({ distance: leg.distance?.text, duration: leg.duration?.text });
                    }
                    if (mapRef.current && result.routes?.[0]?.bounds) {
                        mapRef.current.fitBounds(result.routes[0].bounds, { top: 60, right: 30, bottom: 120, left: 30 });
                    }
                }
            }
        );
    }, [mapsReady, riderCoords, customerCoords, restaurantCoords]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: 'Track my Tiffin Order', url: window.location.href }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const handleRefresh = () => {
        fetchDelivery();
    };

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

    const { restaurantId, status } = delivery;
    const isOutForDelivery = status === 'out_for_delivery';
    const isAssigned = status === 'assigned';
    const isDelivered = status === 'delivered';

    const getStatusHeading = () => {
        if (isDelivered) return 'Tiffin Delivered';
        if (isOutForDelivery || isAssigned) return 'Preparing your Tiffin';
        return 'Preparing your Tiffin';
    };

    return (
        <div className="h-screen w-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-[#0a0a0a]">
            {/* Green Header */}
            <motion.div
                className="bg-green-600 text-white z-20 flex-shrink-0 relative shadow-md"
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
                        onLoad={(map) => { mapRef.current = map; }}
                        center={riderCoords || restaurantCoords || { lat: 22.7176, lng: 75.8719 }}
                        zoom={16}
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
            <TiffinTrackingDetailsSheet
                delivery={delivery}
                isSheetExpanded={isSheetExpanded}
                setIsSheetExpanded={setIsSheetExpanded}
                customerDeliveryOtp={customerDeliveryOtp}
                getStatusHeading={getStatusHeading}
                showSuccess={showSuccess}
            />
        </div>
    );
}
