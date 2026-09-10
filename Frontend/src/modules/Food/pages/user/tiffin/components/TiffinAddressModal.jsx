import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@food/utils/googleMapsLoader.js';

export default function TiffinAddressModal({ show, onClose, addAddress, getAddressId, setSelectedAddressId }) {
    const [addingAddress, setAddingAddress] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const autocompleteInputRef = useRef(null);
    const autocompleteRef = useRef(null);

    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        street: '',
        area: '',
        city: 'Gurugram',
        state: 'Haryana',
        zipCode: '',
        phone: ''
    });

    useEffect(() => {
        if (!show) return;

        const initGoogleMaps = async () => {
            if (!isGoogleMapsLoaded()) {
                try {
                    await loadGoogleMaps({ libraries: ['places', 'geometry'] });
                } catch (error) {
                    console.error("Failed to load Google Maps API", error);
                    return;
                }
            }

            if (autocompleteInputRef.current && window.google?.maps?.places) {
                autocompleteRef.current = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
                    componentRestrictions: { country: 'in' },
                    fields: ['address_components', 'formatted_address', 'geometry', 'name']
                });

                autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current.getPlace();
                    if (!place.geometry) return;

                    let city = '';
                    let zipCode = '';
                    let state = '';

                    place.address_components?.forEach(component => {
                        const types = component.types;
                        if (types.includes('locality')) city = component.long_name;
                        if (types.includes('postal_code')) zipCode = component.long_name;
                        if (types.includes('administrative_area_level_1')) state = component.long_name;
                    });

                    setNewAddress(prev => ({
                        ...prev,
                        street: place.name && place.formatted_address.startsWith(place.name) 
                            ? place.formatted_address 
                            : `${place.name ? place.name + ', ' : ''}${place.formatted_address}`,
                        city: city || prev.city,
                        state: state || prev.state,
                        zipCode: zipCode || prev.zipCode,
                        location: {
                            type: 'Point',
                            coordinates: [place.geometry.location.lng(), place.geometry.location.lat()]
                        }
                    }));
                });
            }
        };

        initGoogleMaps();
    }, [show]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                if (window.google?.maps?.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            const place = results[0];
                            let city = '';
                            let zipCode = '';
                            let state = '';

                            place.address_components?.forEach(component => {
                                const types = component.types;
                                if (types.includes('locality')) city = component.long_name;
                                if (types.includes('postal_code')) zipCode = component.long_name;
                                if (types.includes('administrative_area_level_1')) state = component.long_name;
                            });

                            setNewAddress(prev => ({
                                ...prev,
                                street: place.formatted_address,
                                city: city || prev.city,
                                state: state || prev.state,
                                zipCode: zipCode || prev.zipCode,
                                location: {
                                    type: 'Point',
                                    coordinates: [longitude, latitude]
                                }
                            }));
                        }
                        setGettingLocation(false);
                    });
                } else {
                    setGettingLocation(false);
                }
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Failed to get current location");
                setGettingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newAddress.street || !newAddress.phone || !newAddress.zipCode) {
            alert('Please fill required fields (Street, Phone, ZIP Code)');
            return;
        }
        setAddingAddress(true);
        try {
            let normalizedLabel = newAddress.label || 'Home';
            if (normalizedLabel.toLowerCase().includes('work')) normalizedLabel = 'Office';
            if (!['Home', 'Office', 'Other'].includes(normalizedLabel)) normalizedLabel = 'Other';

            const payload = {
                label: normalizedLabel,
                street: newAddress.street,
                additionalDetails: `Phone: ${newAddress.phone}`,
                city: newAddress.city || 'Indore',
                state: newAddress.state || 'Madhya Pradesh',
                zipCode: newAddress.zipCode,
                latitude: newAddress.location?.coordinates[1] || 22.7196,
                longitude: newAddress.location?.coordinates[0] || 75.8577
            };

            const added = await addAddress(payload);
            if (added) {
                setSelectedAddressId(getAddressId(added));
                onClose();
            } else {
                onClose();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save address');
        } finally {
            setAddingAddress(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-900 text-lg">Add New Address</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                        ✕
                    </button>
                </div>
                
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full bg-[#0cb884]/10 hover:bg-[#0cb884]/20 border border-[#0cb884]/30 text-[#0cb884] p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors disabled:opacity-50"
                >
                    {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                    {gettingLocation ? 'Detecting Location...' : 'Use Current GPS Location'}
                </button>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Complete Street / Flat No.</label>
                            <input 
                                ref={autocompleteInputRef}
                                type="text" 
                                placeholder="Search your area or building"
                                value={newAddress.street} 
                                onChange={(e) => setNewAddress({...newAddress, street: e.target.value})} 
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:border-[#0cb884] focus:ring-1 focus:ring-[#0cb884]" 
                                required 
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Start typing to see Google Maps suggestions</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">City</label>
                                <input type="text" value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:border-[#0cb884]" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">ZIP / PIN Code</label>
                                <input type="text" value={newAddress.zipCode} onChange={(e) => setNewAddress({...newAddress, zipCode: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:border-[#0cb884]" required />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number for Delivery</label>
                            <input type="tel" value={newAddress.phone} onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:border-[#0cb884]" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Label (e.g. Home, Office)</label>
                            <input type="text" value={newAddress.label} onChange={(e) => setNewAddress({...newAddress, label: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:border-[#0cb884]" required />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={addingAddress}
                        className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition"
                    >
                        {addingAddress ? 'Saving...' : 'Save & Select Address'}
                    </button>
                </form>
            </div>
        </div>
    );
}
