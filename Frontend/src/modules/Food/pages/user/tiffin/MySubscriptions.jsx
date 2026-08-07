import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Edit3, 
    CheckCircle2, AlertCircle, Sparkles, Plus, 
    CalendarX, Utensils, Phone, ChevronRight, ChevronLeft, X, 
    RefreshCw, Flame, Check, Info, Truck, ShieldCheck,
    Sliders, PauseCircle, PlayCircle, Copy, AlertTriangle,
    Navigation, Search, Loader2, Compass, Home, Briefcase, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@food/api';
import { toast } from 'sonner';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader.js';
import { getGoogleMapsApiKey } from '@food/utils/googleMapsApiKey.js';

export default function MySubscriptions() {
    const navigate = useNavigate();
    const matrixSliderRef = useRef(null);
    const searchContainerRef = useRef(null);
    const justSelectedRef = useRef(false);

    const [subscriptions, setSubscriptions] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calendar' | 'history'

    // Selected subscription for multi-plan accounts
    const [selectedSubIndex, setSelectedSubIndex] = useState(0);

    // Modal States
    const [selectedSubForAddress, setSelectedSubForAddress] = useState(null);
    const [selectedSubForSkip, setSelectedSubForSkip] = useState(null);
    const [selectedSubForPrefs, setSelectedSubForPrefs] = useState(null);
    const [confirmPauseSub, setConfirmPauseSub] = useState(null);

    // Forms
    const [addressForm, setAddressForm] = useState({
        street: '',
        area: '',
        landmark: '',
        city: 'Indore',
        state: 'Madhya Pradesh',
        zipCode: '',
        phone: '',
        label: 'Home',
        location: { type: 'Point', coordinates: [75.8577, 22.7196] }
    });

    // Address Search & Geolocation States
    const [addressSearchQuery, setAddressSearchQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [userSavedAddresses, setUserSavedAddresses] = useState([]);
    const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
    const [googleMapsReady, setGoogleMapsReady] = useState(false);
    const [googleApiKey, setGoogleApiKey] = useState('');

    const [skipDate, setSkipDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [skipMealSlot, setSkipMealSlot] = useState('Both');
    const [skipReason, setSkipReason] = useState('Out of station / Personal requirement');

    const [prefsForm, setPrefsForm] = useState({
        spiceLevel: 'Medium',
        specialNotes: '',
        deliveryInstructions: ''
    });

    const [actionLoading, setActionLoading] = useState(false);

    // Click outside listener to dismiss address suggestions dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowAddressSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize Google Maps API
    useEffect(() => {
        getGoogleMapsApiKey().then((key) => {
            if (key) setGoogleApiKey(key);
        });

        loadGoogleMaps({ libraries: ['places', 'geometry'] })
            .then(() => {
                setGoogleMapsReady(true);
            })
            .catch((err) => {
                console.warn('Google Maps API initialization note:', err?.message || err);
            });
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [subsRes, delivRes] = await Promise.allSettled([
                api.get('/user/tiffin/my-subscriptions'),
                api.get('/user/tiffin/user/deliveries')
            ]);

            if (subsRes.status === 'fulfilled' && subsRes.value?.data?.success) {
                setSubscriptions(subsRes.value.data.data || []);
            }
            if (delivRes.status === 'fulfilled' && delivRes.value?.data?.success) {
                setDeliveries(delivRes.value.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching tiffin subscriptions:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const currentSub = subscriptions[selectedSubIndex] || subscriptions[0];

    // Helper to check if rider is assigned for today's delivery for a subscription
    const isRiderAssignedForSub = (subId) => {
        if (!subId || !deliveries?.length) return false;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        return deliveries.some((d) => {
            const dSubId = d.subscriptionId?._id || d.subscriptionId;
            if (dSubId?.toString() !== subId?.toString()) return false;
            const dDate = new Date(d.date);
            const isToday = dDate >= todayStart && dDate < todayEnd;
            const isAssignedOrEnRoute = d.status === 'assigned' || d.status === 'out_for_delivery';
            return isToday && isAssignedOrEnRoute && Boolean(d.assignedTo);
        });
    };

    const handleTogglePause = async (sub) => {
        const action = sub.status === 'active' ? 'pause' : 'resume';
        try {
            setActionLoading(true);
            const res = await api.post(`/user/tiffin/${sub._id}/${action}`);
            if (res?.data?.success) {
                toast.success(sub.status === 'active' ? 'Subscription paused successfully' : 'Subscription resumed successfully');
                setConfirmPauseSub(null);
                fetchData();
            } else {
                toast.error(res?.data?.message || 'Failed to update status');
            }
        } catch (err) {
            toast.error('Network error updating subscription status');
        } finally {
            setActionLoading(false);
        }
    };

    // Open Address Modal
    const openAddressModal = async (sub) => {
        if (isRiderAssignedForSub(sub?._id)) {
            toast.error('Aaj ke tiffin ke liye delivery rider assign ho chuka hai. Delivery complete hone ke baad hi address change kar sakte hain.');
            return;
        }

        setSelectedSubForAddress(sub);
        const initialStreet = sub.deliveryAddress?.street || '';
        setAddressForm({
            street: initialStreet,
            area: sub.deliveryAddress?.area || '',
            landmark: sub.deliveryAddress?.landmark || '',
            city: sub.deliveryAddress?.city || 'Indore',
            state: sub.deliveryAddress?.state || 'Madhya Pradesh',
            zipCode: sub.deliveryAddress?.zipCode || '',
            phone: sub.deliveryAddress?.phone || '',
            label: sub.deliveryAddress?.label || 'Home',
            location: sub.deliveryAddress?.location || { type: 'Point', coordinates: [75.8577, 22.7196] }
        });
        justSelectedRef.current = true;
        setAddressSearchQuery(initialStreet);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);

        // Ensure Google Maps is loaded
        if (!isGoogleMapsLoaded()) {
            loadGoogleMaps({ libraries: ['places', 'geometry'] })
                .then(() => setGoogleMapsReady(true))
                .catch(() => {});
        }

        // Load saved addresses for quick selection
        try {
            setLoadingSavedAddresses(true);
            const res = await api.get('/user/addresses').catch(() => api.get('/food/user/addresses'));
            if (res?.data?.success) {
                setUserSavedAddresses(res.data.data || []);
            }
        } catch (e) {
            // ignore
        } finally {
            setLoadingSavedAddresses(false);
        }
    };

    // Live Debounced Address Autocomplete Search (Google Places API Primary)
    useEffect(() => {
        if (!selectedSubForAddress) return;

        // If this query was set due to a selection / current location click, don't trigger search
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            setIsSearchingAddress(false);
            return;
        }

        const q = (addressSearchQuery || '').trim();
        if (q.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            setIsSearchingAddress(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (justSelectedRef.current) return;
            setIsSearchingAddress(true);

            // 1. Primary: Google Places AutocompleteService
            if (window.google?.maps?.places?.AutocompleteService) {
                try {
                    const service = new window.google.maps.places.AutocompleteService();
                    service.getPlacePredictions(
                        {
                            input: q,
                            componentRestrictions: { country: 'in' },
                        },
                        (predictions, status) => {
                            if (justSelectedRef.current) return;
                            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length > 0) {
                                const mapped = predictions.map((p) => ({
                                    id: p.place_id,
                                    mainTitle: p.structured_formatting?.main_text || p.description.split(',')[0],
                                    secondaryTitle: p.structured_formatting?.secondary_text || p.description.split(',').slice(1).join(', ').trim(),
                                    fullDisplay: p.description,
                                    isGoogle: true,
                                }));
                                setAddressSuggestions(mapped);
                                setShowAddressSuggestions(true);
                                setIsSearchingAddress(false);
                            } else {
                                // Fallback if Google returns ZERO_RESULTS or error
                                fallbackNominatimSearch(q);
                            }
                        }
                    );
                    return;
                } catch (e) {
                    console.warn('Google Places Autocomplete failed, using fallback:', e);
                }
            }

            // Fallback: If Google Maps JS is not yet ready
            fallbackNominatimSearch(q);
        }, 300);

        const fallbackNominatimSearch = async (queryText) => {
            if (justSelectedRef.current) return;
            try {
                const query = encodeURIComponent(queryText);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=in&q=${query}`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'Tifora-Food-App' } }
                );
                const list = await res.json();
                if (justSelectedRef.current) return;
                if (Array.isArray(list) && list.length > 0) {
                    const mapped = list.map((item) => {
                        const a = item.address || {};
                        const mainTitle = [
                            a.building || a.house_number || a.road || a.pedestrian,
                            a.suburb || a.neighbourhood || a.residential || a.subdistrict
                        ].filter(Boolean).join(', ') || item.display_name.split(',')[0];

                        const secondaryTitle = [
                            a.city || a.town || a.village || a.county,
                            a.state,
                            a.postcode
                        ].filter(Boolean).join(', ') || item.display_name.split(',').slice(1, 4).join(', ');

                        return {
                            id: item.place_id,
                            mainTitle,
                            secondaryTitle,
                            fullDisplay: item.display_name,
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon),
                            street: [a.house_number, a.road].filter(Boolean).join(' ') || mainTitle,
                            area: a.suburb || a.neighbourhood || a.residential || a.subdistrict || '',
                            city: a.city || a.town || a.village || a.county || 'Indore',
                            state: a.state || 'Madhya Pradesh',
                            zipCode: a.postcode || '',
                            landmark: a.amenity || a.building || '',
                            isGoogle: false,
                        };
                    });
                    setAddressSuggestions(mapped);
                    setShowAddressSuggestions(true);
                } else {
                    setAddressSuggestions([]);
                    setShowAddressSuggestions(false);
                }
            } catch (err) {
                setAddressSuggestions([]);
                setShowAddressSuggestions(false);
            } finally {
                setIsSearchingAddress(false);
            }
        };

        return () => clearTimeout(timer);
    }, [addressSearchQuery, selectedSubForAddress]);

    // Handle Selection from Suggestions (Google Geocoder / Places)
    const handleSelectSuggestion = (item) => {
        justSelectedRef.current = true;
        setShowAddressSuggestions(false);
        setAddressSuggestions([]);

        if (item.isGoogle && window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ placeId: item.id }, (results, status) => {
                justSelectedRef.current = true;
                setShowAddressSuggestions(false);
                setAddressSuggestions([]);

                if (status === 'OK' && results?.[0]) {
                    const res = results[0];
                    const comp = res.address_components || [];
                    const getPart = (type) => comp.find((c) => c.types.includes(type))?.long_name || '';

                    const streetNum = getPart('street_number');
                    const route = getPart('route');
                    const subpremise = getPart('subpremise') || getPart('premise');
                    const subLocality = getPart('sublocality_level_1') || getPart('sublocality') || getPart('neighborhood');
                    const city = getPart('locality') || getPart('administrative_area_level_2') || 'Indore';
                    const state = getPart('administrative_area_level_1') || 'Madhya Pradesh';
                    const zipCode = getPart('postal_code') || '';
                    const landmark = getPart('point_of_interest') || getPart('establishment') || '';

                    const streetLine = [subpremise, streetNum, route].filter(Boolean).join(' ') 
                        || item.mainTitle 
                        || res.formatted_address.split(',')[0];

                    const lat = res.geometry?.location?.lat() || 22.7196;
                    const lng = res.geometry?.location?.lng() || 75.8577;

                    setAddressForm((prev) => ({
                        ...prev,
                        street: streetLine,
                        area: subLocality || prev.area,
                        city: city,
                        state: state,
                        zipCode: zipCode || prev.zipCode,
                        landmark: landmark || prev.landmark,
                        location: { type: 'Point', coordinates: [lng, lat] },
                    }));
                    setAddressSearchQuery(streetLine);
                    toast.success(`Google Places: ${item.mainTitle}`);
                    return;
                }
            });
            return;
        }

        // Standard assignment
        setAddressForm((prev) => ({
            ...prev,
            street: item.street || item.mainTitle,
            area: item.area || prev.area,
            city: item.city || prev.city,
            state: item.state || prev.state,
            zipCode: item.zipCode || prev.zipCode,
            landmark: item.landmark || prev.landmark,
            location: { type: 'Point', coordinates: [item.lng || 75.8577, item.lat || 22.7196] },
        }));
        setAddressSearchQuery(item.street || item.mainTitle);
        toast.success(`Address selected: ${item.mainTitle}`);
    };

    // Handle Selection from User Saved Addresses
    const handleSelectSavedAddress = (saved) => {
        justSelectedRef.current = true;
        setShowAddressSuggestions(false);
        setAddressSuggestions([]);

        const streetVal = saved.street || saved.addressLine1 || saved.address || '';
        setAddressForm({
            street: streetVal,
            area: saved.area || saved.sublocality || '',
            landmark: saved.landmark || '',
            city: saved.city || 'Indore',
            state: saved.state || 'Madhya Pradesh',
            zipCode: saved.zipCode || saved.pincode || '',
            phone: saved.phone || addressForm.phone || '',
            label: saved.label || saved.addressType || 'Home',
            location: saved.location || { type: 'Point', coordinates: [75.8577, 22.7196] },
        });
        setAddressSearchQuery(streetVal);
        toast.success(`Selected saved ${saved.label || 'address'}`);
    };

    // Google Maps GPS Current Location Detection & Reverse Geocoding
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        justSelectedRef.current = true;
        setShowAddressSuggestions(false);
        setAddressSuggestions([]);
        setDetectingLocation(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // 1. Primary: Use Google Maps Geocoder
                if (window.google?.maps?.Geocoder) {
                    try {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                            justSelectedRef.current = true;
                            setShowAddressSuggestions(false);
                            setAddressSuggestions([]);

                            if (status === 'OK' && results?.[0]) {
                                const res = results[0];
                                const comp = res.address_components || [];
                                const getPart = (type) => comp.find((c) => c.types.includes(type))?.long_name || '';

                                const streetNum = getPart('street_number');
                                const route = getPart('route');
                                const subpremise = getPart('subpremise') || getPart('premise');
                                const subLocality = getPart('sublocality_level_1') || getPart('sublocality') || getPart('neighborhood');
                                const city = getPart('locality') || getPart('administrative_area_level_2') || 'Indore';
                                const state = getPart('administrative_area_level_1') || 'Madhya Pradesh';
                                const zipCode = getPart('postal_code') || '';
                                const landmark = getPart('point_of_interest') || getPart('establishment') || '';

                                const streetLine = [subpremise, streetNum, route].filter(Boolean).join(' ') 
                                    || subLocality 
                                    || res.formatted_address.split(',')[0];

                                setAddressForm((prev) => ({
                                    ...prev,
                                    street: streetLine,
                                    area: subLocality || prev.area,
                                    city: city,
                                    state: state,
                                    zipCode: zipCode || prev.zipCode,
                                    landmark: landmark || prev.landmark,
                                    location: { type: 'Point', coordinates: [longitude, latitude] },
                                }));
                                setAddressSearchQuery(streetLine);
                                setDetectingLocation(false);
                                toast.success(`📍 Google GPS: ${subLocality ? subLocality + ', ' : ''}${city}`);
                                return;
                            }
                            // If Google geocoder status not OK, try fallback
                            fallbackReverseGeocode(latitude, longitude);
                        });
                        return;
                    } catch (err) {
                        console.warn('Google Maps Geocoder error, using fallback:', err);
                    }
                }

                // Fallback: BigDataCloud + Nominatim
                fallbackReverseGeocode(latitude, longitude);
            },
            (error) => {
                setDetectingLocation(false);
                if (error.code === 1) {
                    toast.error('Location permission was denied. Please allow GPS permission in your browser.');
                } else if (error.code === 2) {
                    toast.error('Location unavailable. Please check GPS settings.');
                } else {
                    toast.error('Location detection timed out.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );

        const fallbackReverseGeocode = async (latitude, longitude) => {
            try {
                const bdcRes = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                const bdcData = await bdcRes.json();

                let nomData = null;
                try {
                    const nomRes = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en', 'User-Agent': 'Tifora-Food-App' } }
                    );
                    nomData = await nomRes.json();
                } catch (e) {}

                const addr = nomData?.address || {};
                const road = addr.road || addr.street || bdcData.localityInfo?.administrative?.[3]?.name || '';
                const suburb = addr.suburb || addr.neighbourhood || addr.residential || bdcData.localityInfo?.administrative?.[2]?.name || '';
                const city = addr.city || addr.town || addr.village || bdcData.city || bdcData.locality || 'Indore';
                const state = addr.state || bdcData.principalSubdivision || 'Madhya Pradesh';
                const zipCode = addr.postcode || bdcData.postcode || '';

                const streetLine = [road, suburb].filter(Boolean).join(', ') 
                    || nomData?.display_name?.split(',').slice(0, 2).join(', ') 
                    || bdcData.locality 
                    || `Near ${city}`;

                const newAddressData = {
                    street: streetLine,
                    area: suburb || road || '',
                    city: city,
                    state: state,
                    zipCode: zipCode,
                    landmark: addr.building || addr.amenity || '',
                    location: { type: 'Point', coordinates: [longitude, latitude] },
                };

                justSelectedRef.current = true;
                setAddressForm((prev) => ({
                    ...prev,
                    ...newAddressData,
                }));
                setAddressSearchQuery(streetLine);
                setShowAddressSuggestions(false);
                setAddressSuggestions([]);
                toast.success(`📍 Location detected: ${newAddressData.area ? newAddressData.area + ', ' : ''}${city}`);
            } catch (error) {
                console.error('Error in reverse geocoding:', error);
                toast.error('Failed to resolve address details from current location');
            } finally {
                setDetectingLocation(false);
            }
        };
    };

    // Save Address
    const handleSaveAddress = async (e) => {
        e.preventDefault();
        if (isRiderAssignedForSub(selectedSubForAddress?._id)) {
            toast.error('Aaj ke tiffin ke liye delivery rider assign ho chuka hai. Delivery complete hone ke baad hi address update karein.');
            return;
        }

        if (!addressForm.street || !addressForm.city) {
            toast.error('Street and City fields are mandatory');
            return;
        }

        try {
            setActionLoading(true);
            const res = await api.put(`/user/tiffin/${selectedSubForAddress._id}/address`, addressForm);
            if (res?.data?.success) {
                toast.success('Delivery address updated successfully');
                setSelectedSubForAddress(null);
                fetchData();
            } else {
                toast.error(res?.data?.message || 'Failed to update address');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error updating address';
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    // Open Skip Modal
    const openSkipModal = (sub, prefillDate) => {
        setSelectedSubForSkip(sub);
        if (prefillDate) {
            setSkipDate(prefillDate);
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSkipDate(tomorrow.toISOString().split('T')[0]);
        }
        setSkipMealSlot(sub.planId?.mealType || 'Both');
        setSkipReason('Out of town / Personal schedule');
    };

    // Skip Day Submit (Auto-Extension)
    const handleSkipDaySubmit = async (e) => {
        e.preventDefault();
        if (!skipDate) {
            toast.error('Please select a date');
            return;
        }

        try {
            setActionLoading(true);
            const res = await api.post(`/user/tiffin/${selectedSubForSkip._id}/skip-day`, {
                date: skipDate,
                mealSlot: skipMealSlot,
                reason: skipReason
            });

            if (res?.data?.success) {
                toast.success(`Date ${skipDate} marked as OFF. Validity extended by +1 Day.`, {
                    duration: 5000
                });
                setSelectedSubForSkip(null);
                fetchData();
            } else {
                toast.error(res?.data?.message || 'Could not schedule off date');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update schedule');
        } finally {
            setActionLoading(false);
        }
    };

    // Unskip Day
    const handleUnskipDay = async (subId, dateStr) => {
        try {
            setActionLoading(true);
            const res = await api.post(`/user/tiffin/${subId}/unskip-day`, { date: dateStr });
            if (res?.data?.success) {
                toast.success(`Meal schedule reinstated for ${dateStr}`);
                fetchData();
            } else {
                toast.error(res?.data?.message || 'Failed to reinstate meal');
            }
        } catch (err) {
            toast.error('Failed to update meal status');
        } finally {
            setActionLoading(false);
        }
    };

    // Open Preferences Modal
    const openPrefsModal = (sub) => {
        setSelectedSubForPrefs(sub);
        setPrefsForm({
            spiceLevel: sub.customPreferences?.spiceLevel || 'Medium',
            specialNotes: sub.customPreferences?.specialNotes || '',
            deliveryInstructions: sub.deliveryInstructions || ''
        });
    };

    // Save Preferences
    const handleSavePrefs = async (e) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            const res = await api.patch(`/user/tiffin/${selectedSubForPrefs._id}/preferences`, prefsForm);
            if (res?.data?.success) {
                toast.success('Kitchen instructions and preferences saved');
                setSelectedSubForPrefs(null);
                fetchData();
            } else {
                toast.error(res?.data?.message || 'Failed to save preferences');
            }
        } catch (err) {
            toast.error('Failed to save preferences');
        } finally {
            setActionLoading(false);
        }
    };

    const getTodayDateStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayDateStr();

    // Dynamic Real Calculation of Subscription Timeline & Delivery Status for Each Day
    const subscriptionTimeline = useMemo(() => {
        if (!currentSub) return [];

        const start = currentSub.startDate ? new Date(currentSub.startDate) : new Date();
        const end = currentSub.endDate ? new Date(currentSub.endDate) : new Date();
        
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Filter deliveries strictly for this subscription
        const subDeliveries = deliveries.filter(d => {
            const subId = d.subscriptionId?._id || d.subscriptionId;
            return String(subId) === String(currentSub._id);
        });

        const days = [];
        let curr = new Date(start);
        let dayCounter = 1;
        let maxIterations = 60; // safety boundary

        while (curr <= end && maxIterations > 0) {
            maxIterations--;
            const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
            
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isFuture = dateStr > todayStr;
            
            const skippedItem = currentSub.skippedDates?.find(sk => sk.date === dateStr);
            const isSkipped = !!skippedItem;

            // Find real delivery records from DB for this exact date
            const dayDeliveries = subDeliveries.filter(del => {
                if (!del.date) return false;
                const delDateStr = new Date(del.date).toISOString().split('T')[0];
                return delDateStr === dateStr;
            });

            let statusBadge = 'ACTIVE';
            let statusLabel = 'Scheduled';
            let statusSub = 'Meal Active';
            let statusTheme = 'scheduled';

            if (isSkipped) {
                statusBadge = 'OFF DAY';
                statusLabel = 'Skipped Off';
                statusSub = '+1 Day Extended';
                statusTheme = 'skipped';
            } else if (currentSub.status === 'paused' && !isPast) {
                statusBadge = 'PAUSED';
                statusLabel = 'Plan Paused';
                statusSub = 'Resume anytime';
                statusTheme = 'paused';
            } else if (dayDeliveries.length > 0) {
                const hasDelivered = dayDeliveries.some(d => d.status === 'delivered' || d.status === 'delivered_unattended');
                const hasOutForDelivery = dayDeliveries.some(d => d.status === 'out_for_delivery');
                const hasPreparing = dayDeliveries.some(d => d.status === 'pending' || d.status === 'assigned');
                const hasFailed = dayDeliveries.some(d => d.status === 'failed' || d.status === 'cancelled');

                if (hasDelivered) {
                    statusBadge = 'DELIVERED';
                    statusLabel = dayDeliveries[0].type === 'Morning' ? 'Lunch Delivered' : 'Dinner Delivered';
                    statusSub = dayDeliveries[0].deliveredAt 
                        ? new Date(dayDeliveries[0].deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : 'Completed';
                    statusTheme = 'delivered';
                } else if (hasOutForDelivery) {
                    statusBadge = 'ON THE WAY';
                    statusLabel = 'Out for Delivery';
                    statusSub = dayDeliveries[0].assignedTo?.name ? `Partner: ${dayDeliveries[0].assignedTo.name}` : 'Live in transit';
                    statusTheme = 'out_for_delivery';
                } else if (hasPreparing) {
                    statusBadge = isToday ? 'PREPARING' : 'ORDER PLACED';
                    statusLabel = dayDeliveries[0].type === 'Morning' ? 'Lunch Order' : 'Dinner Order';
                    statusSub = isToday ? 'Kitchen cooking' : 'Queued';
                    statusTheme = isToday ? 'preparing' : 'scheduled';
                } else if (hasFailed) {
                    statusBadge = 'CANCELLED';
                    statusLabel = 'Order Cancelled';
                    statusSub = 'Refund / Skip';
                    statusTheme = 'failed';
                }
            } else {
                if (isPast) {
                    statusBadge = 'SERVED';
                    statusLabel = 'Past Meal';
                    statusSub = 'Completed';
                    statusTheme = 'past';
                } else if (isToday) {
                    statusBadge = 'TODAY';
                    statusLabel = 'Live Today';
                    statusSub = currentSub.planId?.mealType === 'Both' ? 'Lunch & Dinner' : (currentSub.planId?.mealType || 'Meal');
                    statusTheme = 'today';
                } else {
                    statusBadge = 'SCHEDULED';
                    statusLabel = `Day ${dayCounter}`;
                    statusSub = currentSub.planId?.mealType === 'Both' ? 'Lunch & Dinner' : (currentSub.planId?.mealType || 'Active');
                    statusTheme = 'scheduled';
                }
            }

            days.push({
                dayIndex: dayCounter,
                dateObj: new Date(curr),
                dateStr,
                isToday,
                isPast,
                isFuture,
                isSkipped,
                skippedItem,
                dayDeliveries,
                statusBadge,
                statusLabel,
                statusSub,
                statusTheme,
                dayName: isToday ? 'Today' : (curr.getTime() - new Date().setHours(0,0,0,0) === 86400000) ? 'Tomorrow' : curr.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNum: curr.getDate(),
                monthName: curr.toLocaleDateString('en-US', { month: 'short' }),
                fullDate: curr.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
            });

            if (!isSkipped) {
                dayCounter++;
            }
            curr.setDate(curr.getDate() + 1);
        }

        return days;
    }, [currentSub, deliveries, todayStr]);

    // Summary Real Metrics
    const timelineStats = useMemo(() => {
        if (!currentSub) return { totalDays: 0, deliveredCount: 0, remainingDays: 0, skippedCount: 0 };
        const totalDays = currentSub.planId?.durationDays || 7;
        const skippedCount = currentSub.skippedDates?.length || 0;
        const deliveredCount = subscriptionTimeline.filter(d => d.statusTheme === 'delivered' || (d.isPast && !d.isSkipped)).length;
        const remainingDays = Math.max(0, totalDays - deliveredCount);
        return { totalDays, deliveredCount, remainingDays, skippedCount };
    }, [currentSub, subscriptionTimeline]);

    // Auto-scroll to today's card
    useEffect(() => {
        if (matrixSliderRef.current) {
            const todayEl = matrixSliderRef.current.querySelector('#active-today-card');
            if (todayEl) {
                setTimeout(() => {
                    todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }, 150);
            }
        }
    }, [selectedSubIndex, currentSub?._id, subscriptionTimeline.length]);

    const scrollMatrix = (direction) => {
        if (matrixSliderRef.current) {
            const scrollAmount = direction === 'left' ? -280 : 280;
            matrixSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const copyOTP = (otp) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(otp);
            toast.success('OTP copied to clipboard');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans antialiased pb-24">
            
            {/* Executive Top Navigation Bar */}
            <nav className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/food/user/profile')} 
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
                            aria-label="Back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                                    Meal Subscriptions
                                </h1>
                                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                                    Active Management
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure daily deliveries, off-days & address preferences
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all shadow-xs"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
                            <span className="hidden sm:inline">Sync</span>
                        </button>

                        <button
                            onClick={() => navigate('/food/user/tiffin')}
                            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Browse Plans</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

                {/* Subscriptions Tab Pills (If user has multiple subscriptions) */}
                {subscriptions.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {subscriptions.map((sub, idx) => (
                            <button
                                key={sub._id}
                                onClick={() => setSelectedSubIndex(idx)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border ${
                                    selectedSubIndex === idx
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Utensils className="w-3.5 h-3.5" />
                                <span>{sub.planId?.name || `Subscription #${idx + 1}`}</span>
                                <span className={`w-2 h-2 rounded-full ${sub.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            </button>
                        ))}
                    </div>
                )}

                {/* State: Loading */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                        <p className="text-xs font-medium text-slate-500">Loading subscription details...</p>
                    </div>
                ) : subscriptions.length === 0 ? (
                    /* State: Empty */
                    <div className="text-center p-12 sm:p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto">
                            <Utensils className="w-6 h-6" />
                        </div>
                        <div className="max-w-md mx-auto">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">No Active Subscriptions Found</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Subscribe to curated corporate and home-style meal plans with automated schedule management and zero-wastage off-day extension.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/food/user/tiffin')}
                            className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            Explore Tiffin Plans
                        </button>
                    </div>
                ) : (
                    currentSub && (
                        <div className="space-y-6">

                            {/* 1. HERO PLAN OVERVIEW CARD (Compact with Soothing Pastel Gradient) */}
                            {(() => {
                                const startDate = new Date(currentSub.startDate);
                                const endDate = new Date(currentSub.endDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const totalDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
                                const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((today - startDate) / (1000 * 60 * 60 * 24))));
                                const remainingDays = Math.max(0, Math.round((endDate - today) / (1000 * 60 * 60 * 24)));
                                const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

                                return (
                                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fef8ee] via-[#ecfdf5] to-[#f0f9ff] dark:from-[#131b28] dark:via-[#0e231b] dark:to-[#151c2a] text-slate-900 dark:text-white p-4 sm:p-5 border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs">
                                        {/* Soft Pastel Ambient Glow */}
                                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 rounded-full bg-emerald-200/40 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-40 h-40 rounded-full bg-amber-200/30 dark:bg-amber-500/10 blur-3xl pointer-events-none" />

                                        <div className="relative z-10 space-y-3.5">
                                            {/* Top Row: Plan Title & Price Badge */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                            currentSub.status === 'active'
                                                                ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : currentSub.status === 'paused'
                                                                ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${currentSub.status === 'active' ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-amber-600'}`} />
                                                            {currentSub.status === 'active' ? 'Delivering Daily' : currentSub.status.toUpperCase()}
                                                        </span>

                                                        {currentSub.skippedDates?.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-100/80 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                                                +{currentSub.skippedDates.length} Days Rolled Forward
                                                            </span>
                                                        )}

                                                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                                            Kitchen: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{currentSub.restaurantId?.name || 'Partner Kitchen'}</strong>
                                                        </span>
                                                    </div>

                                                    <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                                                        {currentSub.planId?.name || "Renuka's 7-Day Starter Homestyle Tiffin"}
                                                    </h2>
                                                </div>

                                                {/* Compact Price Badge */}
                                                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center bg-white/70 dark:bg-slate-900/60 px-3 py-1.5 sm:p-0 rounded-xl border border-emerald-100 dark:border-slate-800 sm:border-none">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            ₹{currentSub.amountPaid}
                                                        </span>
                                                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                                            ({currentSub.planId?.durationDays || 7} Days)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle Compact Row: Metrics & Progress in a Single Unified Strip */}
                                            <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs rounded-xl p-3 border border-emerald-100/80 dark:border-slate-700/60 space-y-2 shadow-2xs">
                                                <div className="flex flex-wrap justify-between items-center text-[11px] text-slate-600 dark:text-slate-300 font-medium gap-2">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span>Start: <strong className="text-slate-900 dark:text-white">{startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></span>
                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                        <span>Valid Till: <strong className="text-emerald-700 dark:text-emerald-400">{endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></span>
                                                        <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                                                        <span className="hidden sm:inline">Slot: <strong className="text-slate-900 dark:text-white">{currentSub.planId?.mealType === 'Both' ? 'Lunch & Dinner' : `${currentSub.planId?.mealType || 'Lunch'}`}</strong></span>
                                                    </div>
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                                        {remainingDays > 0 ? `${remainingDays} Days Left` : 'Completed'}
                                                    </span>
                                                </div>

                                                {/* Sleek Gradient Progress Bar */}
                                                <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Bottom Compact Action Buttons */}
                                            <div className="grid grid-cols-3 gap-2 pt-0.5">
                                                <button
                                                    onClick={() => openSkipModal(currentSub)}
                                                    className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                                                >
                                                    <CalendarX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                    <span className="truncate">Skip / Off Day</span>
                                                </button>

                                                <button
                                                    onClick={() => openPrefsModal(currentSub)}
                                                    className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                                                >
                                                    <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    <span className="truncate">Taste & Notes</span>
                                                </button>

                                                <button
                                                    onClick={() => handleTogglePause(currentSub)}
                                                    disabled={actionLoading}
                                                    className={`h-8 sm:h-9 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                                                        currentSub.status === 'paused'
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                                                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {currentSub.status === 'paused' ? (
                                                        <><PlayCircle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Resume</span></>
                                                    ) : (
                                                        <><PauseCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" /> <span className="truncate">Pause</span></>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 2. TODAY'S LIVE DISPATCH & DELIVERY CARD (Compact Pastel Gradient) */}
                            {(() => {
                                const todayDeliveries = deliveries.filter(d => 
                                    (d.subscriptionId?._id === currentSub._id || d.subscriptionId === currentSub._id) &&
                                    new Date(d.date).toISOString().split('T')[0] === todayStr
                                );

                                if (todayDeliveries.length === 0) return null;

                                return (
                                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0fdf4] via-[#f8fafc] to-[#f0fdfa] dark:from-[#11221b] dark:via-[#131b26] dark:to-[#102022] text-slate-900 dark:text-white p-4 sm:p-5 border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs space-y-3">
                                        {/* Subtle Ambient Glow */}
                                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-emerald-200/30 dark:bg-emerald-500/10 blur-2xl pointer-events-none" />

                                        <div className="relative z-10 flex items-center justify-between border-b border-emerald-100/80 dark:border-slate-800 pb-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center">
                                                    <Truck className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                                                        Today's Meal Dispatch Status
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                                                Live Tracker ●
                                            </span>
                                        </div>

                                        <div className="relative z-10 space-y-2">
                                            {todayDeliveries.map((del) => (
                                                <div 
                                                    key={del._id}
                                                    className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs rounded-xl p-3 border border-emerald-100/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                                >
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                                {del.type === 'Morning' ? 'Lunch Meal Service' : 'Dinner Meal Service'}
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                                del.status === 'delivered'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                                    : del.status === 'out_for_delivery'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                                            }`}>
                                                                {del.status.replace('_', ' ')}
                                                            </span>
                                                        </div>

                                                        {del.assignedTo ? (
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium flex-wrap">
                                                                <span>Partner: <strong className="text-slate-900 dark:text-white">{del.assignedTo.name}</strong></span>
                                                                {del.assignedTo.phone && (
                                                                    <a 
                                                                        href={`tel:${del.assignedTo.phone}`} 
                                                                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                                                                    >
                                                                        <Phone className="w-3 h-3" /> Call
                                                                    </a>
                                                                )}
                                                            </p>
                                                        ) : (
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                Kitchen is preparing and packaging your meal freshly
                                                            </p>
                                                        )}
                                                    </div>

                                                    {del.verification?.otpExpected && del.status !== 'delivered' && (
                                                        <div 
                                                            onClick={() => copyOTP(del.verification.otpExpected)}
                                                            className="cursor-pointer self-start sm:self-center bg-emerald-50/60 dark:bg-slate-950 border border-emerald-200/80 dark:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2.5 hover:border-emerald-400 transition-all shadow-2xs"
                                                            title="Click to copy delivery verification OTP"
                                                        >
                                                            <div>
                                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                                                    Delivery OTP
                                                                </span>
                                                                <span className="text-sm font-extrabold tracking-widest text-emerald-800 dark:text-emerald-300">
                                                                    {del.verification.otpExpected}
                                                                </span>
                                                            </div>
                                                            <Copy className="w-3.5 h-3.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 3. DYNAMIC SUBSCRIPTION TIMELINE SLIDER (Real-Time Calculated Delivery Matrix) */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>Real Plan Delivery Schedule</span>
                                            </h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
                                                {timelineStats.deliveredCount} / {timelineStats.totalDays} Days Served
                                            </span>
                                            {timelineStats.skippedCount > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
                                                    +{timelineStats.skippedCount} Days Extended
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Real order statuses synced live. Tap any active date to schedule an off-day (+1 day auto-extension).
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => openSkipModal(currentSub)}
                                            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline mr-2"
                                        >
                                            + Custom Off-Day
                                        </button>

                                        {/* Slider Navigation Buttons */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => scrollMatrix('left')}
                                                aria-label="Scroll Left"
                                                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all shadow-2xs"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => scrollMatrix('right')}
                                                aria-label="Scroll Right"
                                                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all shadow-2xs"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Timeline Slider Track */}
                                <div 
                                    ref={matrixSliderRef}
                                    className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1 px-0.5 select-none snap-x"
                                >
                                    {subscriptionTimeline.map((day) => {
                                        const cardBgStyle = 
                                            day.statusTheme === 'today'
                                                ? 'bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-[#0f241c] dark:to-[#0f172a] border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/20 shadow-xs'
                                                : day.statusTheme === 'delivered'
                                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 shadow-2xs'
                                                : day.statusTheme === 'out_for_delivery'
                                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-100 shadow-2xs'
                                                : day.statusTheme === 'preparing'
                                                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                                                : day.statusTheme === 'skipped'
                                                ? 'bg-amber-50/90 border-amber-200/90 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-2xs'
                                                : day.statusTheme === 'paused'
                                                ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                : day.statusTheme === 'past'
                                                ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-80'
                                                : 'bg-slate-50/70 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-300 text-slate-900 dark:text-white';

                                        const badgeBgStyle =
                                            day.statusTheme === 'today'
                                                ? 'bg-emerald-600 text-white font-bold animate-pulse'
                                                : day.statusTheme === 'delivered'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                : day.statusTheme === 'out_for_delivery'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 animate-pulse'
                                                : day.statusTheme === 'preparing'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                                : day.statusTheme === 'skipped'
                                                ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100 font-bold'
                                                : day.statusTheme === 'paused'
                                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                                : day.statusTheme === 'past'
                                                ? 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400'
                                                : 'bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

                                        return (
                                            <button
                                                key={day.dateStr}
                                                id={day.isToday ? 'active-today-card' : undefined}
                                                onClick={() => {
                                                    if (day.isSkipped) {
                                                        handleUnskipDay(currentSub._id, day.dateStr);
                                                    } else if (!day.isPast) {
                                                        openSkipModal(currentSub, day.dateStr);
                                                    } else {
                                                        toast.info(`Meal for ${day.fullDate} is past`);
                                                    }
                                                }}
                                                className={`w-[136px] sm:w-[148px] shrink-0 snap-start p-3 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[94px] hover:-translate-y-0.5 ${cardBgStyle}`}
                                            >
                                                <div className="flex justify-between items-start gap-1">
                                                    <span className="text-[11px] font-bold opacity-90 truncate">
                                                        {day.isSkipped ? `Day ${day.dayIndex} (Off)` : day.dayName}
                                                    </span>
                                                    <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${badgeBgStyle}`}>
                                                        {day.statusBadge}
                                                    </span>
                                                </div>

                                                <div className="mt-2">
                                                    <span className="text-base font-extrabold block leading-none tracking-tight">
                                                        {day.dayNum} {day.monthName}
                                                    </span>
                                                    <span className="text-[10px] block mt-1 font-medium truncate opacity-85">
                                                        {day.statusSub}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active Skipped Dates List */}
                                {currentSub.skippedDates?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <CalendarX className="w-3.5 h-3.5 text-amber-600" />
                                            Active Off-Days ({currentSub.skippedDates.length} Days Rolled Over)
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {currentSub.skippedDates.map((sk) => (
                                                <div 
                                                    key={sk.date}
                                                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs"
                                                >
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{sk.date}</span>
                                                    <span className="text-[10px] text-slate-500">({sk.mealSlot || 'Both'})</span>
                                                    <button
                                                        onClick={() => handleUnskipDay(currentSub._id, sk.date)}
                                                        disabled={actionLoading}
                                                        className="text-slate-400 hover:text-red-500 p-0.5 rounded-sm transition-colors"
                                                        title="Reinstate Delivery"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. DELIVERY ADDRESS & DESTINATION CARD */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                Delivery Destination
                                            </span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {currentSub.deliveryAddress?.label || 'Home'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                                            {currentSub.deliveryAddress?.street}
                                            {currentSub.deliveryAddress?.area ? `, ${currentSub.deliveryAddress.area}` : ''}
                                            {currentSub.deliveryAddress?.landmark ? ` (Near ${currentSub.deliveryAddress.landmark})` : ''}
                                            {currentSub.deliveryAddress?.city ? `, ${currentSub.deliveryAddress.city}` : ''}
                                        </p>
                                        {currentSub.deliveryInstructions && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                                                Note: "{currentSub.deliveryInstructions}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isRiderAssignedForSub(currentSub?._id) ? (
                                    <div 
                                        onClick={() => toast.error('Aaj ke tiffin ke liye delivery rider assign ho chuka hai. Delivery complete hone ke baad hi address change kar sakte hain.')}
                                        className="h-10 px-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed shrink-0 self-start sm:self-center"
                                        title="Address is locked because rider is already assigned for today's delivery"
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <span>Rider Assigned (Locked)</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => openAddressModal(currentSub)}
                                        className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-2xs self-start sm:self-center"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Update Address</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                )}
            </main>

            {/* MODAL 1: UPDATE DELIVERY ADDRESS */}
            <AnimatePresence>
                {selectedSubForAddress && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-200/90 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Update Delivery Destination
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Auto-detect via GPS or search your location
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSubForAddress(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 1. CURRENT GPS LOCATION QUICK ACTION */}
                            <div className="bg-linear-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 dark:from-emerald-950/30 dark:via-slate-850 dark:to-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        {detectingLocation ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Crosshair className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Use Current GPS Location
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Auto-detect your precise building & street
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    disabled={detectingLocation}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-xs shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {detectingLocation ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Locating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Navigation className="w-3.5 h-3.5" />
                                            <span>Detect Location</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* 2. LIVE ADDRESS AUTOCOMPLETE SEARCH BAR */}
                            <div ref={searchContainerRef} className="relative">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Search Address / Colony / Landmark
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        {isSearchingAddress ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                        ) : (
                                            <Search className="w-4 h-4" />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={addressSearchQuery}
                                        onChange={(e) => {
                                            justSelectedRef.current = false;
                                            setAddressSearchQuery(e.target.value);
                                            setShowAddressSuggestions(true);
                                            setAddressForm(prev => ({ ...prev, street: e.target.value }));
                                        }}
                                        onFocus={() => {
                                            if (addressSuggestions.length > 0) {
                                                setShowAddressSuggestions(true);
                                            }
                                        }}
                                        placeholder="Type colony, area, building or road (e.g. Vijay Nagar, Scheme 54)..."
                                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                                    />
                                    {addressSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                justSelectedRef.current = true;
                                                setAddressSearchQuery('');
                                                setAddressSuggestions([]);
                                                setShowAddressSuggestions(false);
                                            }}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                                <AnimatePresence>
                                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="absolute z-20 left-0 right-0 mt-1.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto"
                                        >
                                            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <span>Address Suggestions</span>
                                                <span>Select to auto-fill</span>
                                            </div>
                                            {addressSuggestions.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleSelectSuggestion(item)}
                                                    className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors group"
                                                >
                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 truncate">
                                                            {item.mainTitle}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                                            {item.secondaryTitle}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 3. SAVED ADDRESSES QUICK PICKER CHIPS */}
                            {userSavedAddresses.length > 0 && (
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Or Pick From Saved Addresses
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {userSavedAddresses.map((saved, idx) => (
                                            <button
                                                key={saved._id || idx}
                                                type="button"
                                                onClick={() => handleSelectSavedAddress(saved)}
                                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 text-left flex items-center gap-2 transition-all group"
                                            >
                                                {saved.label?.toLowerCase() === 'work' ? (
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600" />
                                                ) : (
                                                    <Home className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600" />
                                                )}
                                                <div className="text-xs">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 mr-1.5">
                                                        {saved.label || 'Saved'}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                        {saved.street ? `${saved.street.substring(0, 18)}...` : saved.city}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 4. FORM FIELDS (FINE-TUNING & CONFIRMATION) */}
                            <form onSubmit={handleSaveAddress} className="space-y-3.5 pt-1">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        House / Flat / Street Address *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={addressForm.street}
                                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                                        placeholder="e.g. Flat 302, Royal Residency, 12 Main Road"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Colony / Area
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.area}
                                            onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                                            placeholder="e.g. Vijay Nagar"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Landmark
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.landmark}
                                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                                            placeholder="e.g. Near C21 Mall"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.city}
                                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                            placeholder="Indore"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={addressForm.zipCode}
                                            onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                                            placeholder="452010"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={addressForm.phone}
                                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                            placeholder="9876543210"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Address Tag
                                        </label>
                                        <div className="flex gap-1.5 pt-0.5">
                                            {['Home', 'Work', 'Other'].map((tag) => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => setAddressForm({ ...addressForm, label: tag })}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                                        addressForm.label === tag
                                                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSubForAddress(null)}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {actionLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Saving Address...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Save & Update Destination</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: SCHEDULE OFF-DAY (+1 DAY EXTENSION) */}
            <AnimatePresence>
                {selectedSubForSkip && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                        Schedule Off-Day
                                    </h3>
                                    <p className="text-xs text-slate-500">Automated validity extension will be applied to your account</p>
                                </div>
                                <button
                                    onClick={() => setSelectedSubForSkip(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Extension Guarantee Note */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-700 dark:text-slate-300">
                                    <strong className="block text-slate-900 dark:text-white font-semibold">
                                        Automated Expiration Roll-Forward
                                    </strong>
                                    <span>
                                        Marking a date as OFF prevents kitchen preparation on that day and extends your subscription end date by 24 hours.
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleSkipDaySubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        Select Date to Skip *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={todayStr}
                                        value={skipDate}
                                        onChange={(e) => setSkipDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Meal Slot Selection
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'Both', label: 'Full Day' },
                                            { id: 'Morning', label: 'Lunch Only' },
                                            { id: 'Evening', label: 'Dinner Only' }
                                        ].map((slot) => (
                                            <button
                                                type="button"
                                                key={slot.id}
                                                onClick={() => setSkipMealSlot(slot.id)}
                                                className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                                                    skipMealSlot === slot.id
                                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-2xs'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {slot.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        Reason (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={skipReason}
                                        onChange={(e) => setSkipReason(e.target.value)}
                                        placeholder="e.g. Travel / Business trip"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSubForSkip(null)}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-all shadow-xs"
                                    >
                                        {actionLoading ? 'Scheduling...' : 'Confirm Off-Day (+1 Day Extension)'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 3: KITCHEN PREFERENCES & FLAVOR */}
            <AnimatePresence>
                {selectedSubForPrefs && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                        Kitchen Instructions & Taste Preferences
                                    </h3>
                                    <p className="text-xs text-slate-500">Configure cooking and delivery preferences for upcoming meals</p>
                                </div>
                                <button
                                    onClick={() => setSelectedSubForPrefs(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSavePrefs} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Spice Level
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'Mild', label: 'Mild', desc: 'Low Spice' },
                                            { id: 'Medium', label: 'Medium', desc: 'Balanced Flavor' },
                                            { id: 'Spicy', label: 'Spicy', desc: 'Zesty & Robust' }
                                        ].map((sp) => (
                                            <button
                                                type="button"
                                                key={sp.id}
                                                onClick={() => setPrefsForm({ ...prefsForm, spiceLevel: sp.id })}
                                                className={`p-3 rounded-xl text-center border transition-all ${
                                                    prefsForm.spiceLevel === sp.id
                                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <span className="text-xs font-bold block">{sp.label}</span>
                                                <span className={`text-[10px] block mt-0.5 ${prefsForm.spiceLevel === sp.id ? 'opacity-80' : 'text-slate-400'}`}>
                                                    {sp.desc}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        Kitchen Instructions (Dietary Notes)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={prefsForm.specialNotes}
                                        onChange={(e) => setPrefsForm({ ...prefsForm, specialNotes: e.target.value })}
                                        placeholder="e.g. Less oil in preparation, soft rotis, no onion in salad"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        Drop-off Instructions (For Delivery Rider)
                                    </label>
                                    <input
                                        type="text"
                                        value={prefsForm.deliveryInstructions}
                                        onChange={(e) => setPrefsForm({ ...prefsForm, deliveryInstructions: e.target.value })}
                                        placeholder="e.g. Ring doorbell twice, deliver at front desk"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSubForPrefs(null)}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-all shadow-xs"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Instructions'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
