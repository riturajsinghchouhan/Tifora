import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Phone, CheckCircle2, AlertCircle, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import api from '@food/api';

export default function TiffinRouteList() {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        // Get current location for sorting
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCoords({ latitude, longitude });
                    fetchAssignedRoute(latitude, longitude);
                },
                () => {
                    fetchAssignedRoute();
                }
            );
        } else {
            fetchAssignedRoute();
        }
    }, []);

    const fetchAssignedRoute = async (lat, lng) => {
        try {
            const params = lat && lng ? { latitude: lat, longitude: lng } : {};
            const res = await api.get('/delivery/tiffin/my-route', { params }).catch(() => null);
            
            if (res?.data?.success) {
                setDeliveries(res.data.data);
            } else {
                // Fallback mock data if API not running yet
                setDeliveries([
                    {
                        _id: 'tif-1',
                        type: 'Morning',
                        status: 'assigned',
                        deliveryAddress: {
                            name: 'Aakash Sharma',
                            phone: '+91 98765 43210',
                            fullAddress: 'Flat 402, Sunshine Heights, Sector 18',
                            location: { coordinates: [77.3910, 28.5355] }
                        },
                        distanceKm: '0.8 km'
                    },
                    {
                        _id: 'tif-2',
                        type: 'Morning',
                        status: 'assigned',
                        deliveryAddress: {
                            name: 'Pooja Verma',
                            phone: '+91 98111 22334',
                            fullAddress: 'House 12, Block C, Green Glen Layout',
                            location: { coordinates: [77.3940, 28.5380] }
                        },
                        distanceKm: '1.4 km'
                    },
                    {
                        _id: 'tif-3',
                        type: 'Morning',
                        status: 'delivered',
                        deliveryAddress: {
                            name: 'Rohan Gupta',
                            phone: '+91 99887 76655',
                            fullAddress: 'Tower B, Cyber Greens, Phase 2',
                            location: { coordinates: [77.3990, 28.5410] }
                        },
                        distanceKm: '2.1 km'
                    }
                ]);
            }
        } catch (error) {
            console.error('Error fetching tiffin route:', error);
        } finally {
            setLoading(false);
        }
    };

    const completedCount = deliveries.filter(d => d.status === 'delivered' || d.status === 'delivered_unattended').length;
    const remainingCount = deliveries.length - completedCount;

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-black">
            {/* Top Bar - White Background & Black Accents */}
            <div className="bg-white text-black border-b-2 border-black px-4 py-4 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-xl font-black text-black">Tiffin Delivery Route</h1>
                        <p className="text-xs text-zinc-600 font-medium">Sorted by closest drop-off</p>
                    </div>
                    <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        {deliveries[0]?.type || 'Morning'} Batch
                    </span>
                </div>

                {/* Progress Card */}
                <div className="bg-zinc-50 border-2 border-black rounded-2xl p-3 flex justify-between items-center mt-2 shadow-sm">
                    <div className="text-center flex-1 border-r border-zinc-300">
                        <span className="text-xs text-zinc-600 font-bold">Total</span>
                        <p className="text-lg font-black text-black">{deliveries.length}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-zinc-300">
                        <span className="text-xs text-zinc-600 font-bold">Remaining</span>
                        <p className="text-lg font-black text-black">{remainingCount}</p>
                    </div>
                    <div className="text-center flex-1">
                        <span className="text-xs text-zinc-600 font-bold">Delivered</span>
                        <p className="text-lg font-black text-black">{completedCount}</p>
                    </div>
                </div>
            </div>

            {/* List of Orders */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-2xl border-2 border-black">
                        <Clock className="w-12 h-12 text-black mx-auto mb-3" />
                        <h3 className="font-black text-black">No Tiffins Assigned</h3>
                        <p className="text-sm text-zinc-600 mt-1">Check back once the restaurant assigns your batch.</p>
                    </div>
                ) : (
                    deliveries.map((item, index) => {
                        const isDone = item.status === 'delivered' || item.status === 'delivered_unattended';
                        return (
                            <div
                                key={item._id}
                                onClick={() => !isDone && navigate(`/food/delivery/tiffin-dropoff/${item._id}`, { state: { delivery: item, index: index + 1 } })}
                                className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                                    isDone 
                                        ? 'border-zinc-300 opacity-60 bg-zinc-50' 
                                        : 'border-zinc-300 shadow-sm hover:border-black active:scale-[0.99] cursor-pointer'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                            isDone ? 'bg-zinc-200 text-black' : 'bg-black text-white'
                                        }`}>
                                            {isDone ? <CheckCircle2 className="w-5 h-5 text-black" /> : index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-black text-base">{item.deliveryAddress?.name}</h3>
                                            <p className="text-xs text-zinc-600 font-bold">{item.distanceKm || 'Nearby'}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full capitalize ${
                                        isDone ? 'bg-zinc-100 text-black border border-zinc-300' : 'bg-black text-white'
                                    }`}>
                                        {isDone ? 'Delivered' : 'Pending'}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-start gap-2 text-sm text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                                    <MapPin className="w-4 h-4 text-black shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 text-xs font-medium">{item.deliveryAddress?.fullAddress}</span>
                                </div>

                                {!isDone && (
                                    <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between items-center text-xs font-black text-black">
                                        <span>Tap to Start Delivery</span>
                                        <ArrowRight className="w-4 h-4 text-black" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
