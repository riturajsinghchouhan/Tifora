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
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Tiffin Delivery Route</h1>
                        <p className="text-xs text-gray-500">Sorted by closest drop-off</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {deliveries[0]?.type || 'Morning'} Batch
                    </span>
                </div>

                {/* Progress Card */}
                <div className="bg-gray-100 rounded-xl p-3 flex justify-between items-center mt-2">
                    <div className="text-center flex-1 border-r border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">Total</span>
                        <p className="text-lg font-black text-gray-900">{deliveries.length}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-gray-200">
                        <span className="text-xs text-yellow-600 font-medium">Remaining</span>
                        <p className="text-lg font-black text-yellow-600">{remainingCount}</p>
                    </div>
                    <div className="text-center flex-1">
                        <span className="text-xs text-green-600 font-medium">Delivered</span>
                        <p className="text-lg font-black text-green-600">{completedCount}</p>
                    </div>
                </div>
            </div>

            {/* List of Orders */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-xl border border-gray-200">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-800">No Tiffins Assigned</h3>
                        <p className="text-sm text-gray-500 mt-1">Check back once the restaurant assigns your batch.</p>
                    </div>
                ) : (
                    deliveries.map((item, index) => {
                        const isDone = item.status === 'delivered' || item.status === 'delivered_unattended';
                        return (
                            <div
                                key={item._id}
                                onClick={() => !isDone && navigate(`/food/delivery/tiffin-dropoff/${item._id}`, { state: { delivery: item, index: index + 1 } })}
                                className={`bg-white rounded-2xl p-4 border transition-all ${
                                    isDone 
                                        ? 'border-green-200 opacity-60 bg-green-50/30' 
                                        : 'border-gray-200 shadow-sm hover:border-blue-500 active:scale-[0.99] cursor-pointer'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                            isDone ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'
                                        }`}>
                                            {isDone ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-base">{item.deliveryAddress?.name}</h3>
                                            <p className="text-xs text-gray-500">{item.distanceKm || 'Nearby'}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                                        isDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {isDone ? 'Delivered' : 'Pending'}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 text-xs">{item.deliveryAddress?.fullAddress}</span>
                                </div>

                                {!isDone && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-blue-600">
                                        <span>Tap to Start Delivery</span>
                                        <ArrowRight className="w-4 h-4" />
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
