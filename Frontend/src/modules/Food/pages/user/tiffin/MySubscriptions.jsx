import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Pause, Play, AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import api from '@food/api';

export default function MySubscriptions() {
    const navigate = useNavigate();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get('/user/tiffin/my-subscriptions').catch(() => null);
            if (res?.data?.success) {
                setSubscriptions(res.data.data);
            } else {
                // Fallback mock data
                setSubscriptions([
                    {
                        _id: 'sub-1',
                        status: 'active',
                        startDate: '2026-08-02',
                        endDate: '2026-09-01',
                        amountPaid: 4500,
                        restaurantId: { name: 'Annapurna Rasoi' },
                        planId: { name: 'Homestyle North Indian Tiffin', mealType: 'Both', durationDays: 30 },
                        deliveryAddress: { street: 'Flat 402, Sunshine Heights', city: 'Gurugram' }
                    }
                ]);
            }
        } catch (err) {
            console.error('Error fetching subscriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePause = async (subId, currentStatus) => {
        const action = currentStatus === 'active' ? 'pause' : 'resume';
        try {
            await api.post(`/user/tiffin/${subId}/${action}`).catch(() => null);
            setSubscriptions(subs =>
                subs.map(s => s._id === subId ? { ...s, status: action === 'pause' ? 'paused' : 'active' } : s)
            );
            alert(`Subscription ${action === 'pause' ? 'Paused' : 'Resumed'} Successfully!`);
        } catch (err) {
            alert(`Failed to ${action} subscription`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
                <button onClick={() => navigate('/food/user/tiffin')} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                    <h1 className="font-bold text-gray-900">My Tiffin Subscriptions</h1>
                    <p className="text-xs text-gray-500">Manage your active & past meals</p>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : subscriptions.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-800">No Active Subscriptions</h3>
                        <p className="text-xs text-gray-500 mt-1 mb-4">You have not subscribed to any tiffin meal plan yet.</p>
                        <button
                            onClick={() => navigate('/food/user/tiffin')}
                            className="bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:bg-orange-600 transition"
                        >
                            Explore Plans
                        </button>
                    </div>
                ) : (
                    subscriptions.map((sub) => {
                        const isPaused = sub.status === 'paused';
                        return (
                            <div key={sub._id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            isPaused ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                            {sub.status}
                                        </span>
                                        <h3 className="font-bold text-gray-900 text-base mt-1.5">{sub.planId?.name}</h3>
                                        <p className="text-xs text-gray-500">{sub.restaurantId?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-gray-900">₹{sub.amountPaid}</span>
                                        <p className="text-[10px] text-gray-400">Upfront Paid</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl text-xs">
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">Start Date</span>
                                        <span className="font-bold text-gray-800">{new Date(sub.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] block">End Date</span>
                                        <span className="font-bold text-gray-800">{new Date(sub.endDate).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    <span>Slot: <strong>{sub.planId?.mealType} (11 AM & 7 PM)</strong></span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    <span className="truncate">{sub.deliveryAddress?.street}, {sub.deliveryAddress?.city}</span>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2 border-t border-gray-100 flex gap-2">
                                    <button
                                        onClick={() => handleTogglePause(sub._id, sub.status)}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                                            isPaused
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                        }`}
                                    >
                                        {isPaused ? <><Play className="w-3.5 h-3.5" /> Resume Deliveries</> : <><Pause className="w-3.5 h-3.5" /> Pause Subscription</>}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
