import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryClient } from '@food/api/axios';
import { toast } from 'sonner';
import {
    ChevronDown, ChevronUp, MapPin, Package, Phone, CheckCircle2,
    Navigation, RefreshCw, Copy, KeyRound, Store, IndianRupee
} from 'lucide-react';
import { useDeliveryNotificationContext } from '@food/context/DeliveryNotificationContext';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import '../deliveryTheme.css';

const DELIVERED_STATUSES = ['delivered', 'completed'];
const SETTLED_PAYMENT_STATUSES = new Set(['paid', 'captured', 'authorized', 'success']);
const COLLECTION_METHODS = new Set(['cash', 'cod', 'cash_on_delivery', 'razorpay_qr']);

const token = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Payment state for ONE order. Every order in a batch is settled separately,
 * so this must never fall back to a batch-wide or method-only assumption.
 */
const readPayment = (order) => {
    const status = token(order?.payment?.status ?? order?.paymentStatus);
    const method = token(order?.paymentMethod ?? order?.payment?.method);
    const amount = [
        order?.payment?.amountDue,
        order?.pricing?.total,
        order?.amounts?.totalCustomerPaid,
    ].map(Number).find((n) => Number.isFinite(n) && n > 0);

    return {
        amount,
        settled: SETTLED_PAYMENT_STATUSES.has(status),
        mustCollect: !SETTLED_PAYMENT_STATUSES.has(status) && COLLECTION_METHODS.has(method),
    };
};

/** Same coordinate probing the feed uses, so the normal flow gets the shape it expects. */
const readLocation = (ref, latKeys = ['latitude', 'lat'], lngKeys = ['longitude', 'lng']) => {
    if (!ref) return null;
    if (ref.location) {
        const coords = ref.location.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
            return { lat: coords[1], lng: coords[0] };
        }
        return {
            lat: ref.location.latitude ?? ref.location.lat,
            lng: ref.location.longitude ?? ref.location.lng,
        };
    }
    for (let i = 0; i < latKeys.length; i += 1) {
        if (ref[latKeys[i]] != null) return { lat: ref[latKeys[i]], lng: ref[lngKeys[i]] };
    }
    return null;
};

const MultiOrdersV2 = ({ embedded = false }) => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [activeBatchId, setActiveBatchId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [requestingOtp, setRequestingOtp] = useState(false);

    const notificationContext = useDeliveryNotificationContext();
    const socket = notificationContext?.socket;
    const setActiveOrder = useDeliveryStore((state) => state.setActiveOrder);
    const activeOrderId = useDeliveryStore((state) => state.activeOrderId);

    const fetchMultiOrders = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const res = await deliveryClient.get('/food/delivery/multi-orders');
            if (res.data?.success) setBatches(res.data.data || []);
        } catch (error) {
            console.error('[MultiOrders] fetch failed', error);
            if (!silent) toast.error('Failed to load your batches');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchMultiOrders();
    }, [fetchMultiOrders]);

    useEffect(() => {
        if (!socket) return undefined;

        const onAssigned = () => {
            toast.info('A new multi-order batch has been assigned to you');
            void fetchMultiOrders({ silent: true });
        };
        const onStatusUpdate = () => void fetchMultiOrders({ silent: true });

        socket.on('multi_order_assigned', onAssigned);
        socket.on('order_status_update', onStatusUpdate);

        return () => {
            socket.off('multi_order_assigned', onAssigned);
            socket.off('order_status_update', onStatusUpdate);
        };
    }, [socket, fetchMultiOrders]);

    // Keeps the screen fresh even if the socket is down.
    useEffect(() => {
        const poller = window.setInterval(() => {
            if (!document.hidden) void fetchMultiOrders({ silent: true });
        }, 30000);
        return () => window.clearInterval(poller);
    }, [fetchMultiOrders]);

    const toggleExpand = (batchId) => {
        setExpandedBatch((prev) => (prev === batchId ? null : batchId));
    };

    const handleRequestOtp = async (batchId) => {
        try {
            setRequestingOtp(true);
            const res = await deliveryClient.post('/food/delivery/multi-orders/request-otp', { batchId });
            if (res.data?.success) {
                toast.success('Restaurant notified — ask them for the batch OTP');
                setActiveBatchId(batchId);
                setShowOtpModal(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not request the OTP');
        } finally {
            setRequestingOtp(false);
        }
    };

    const handleVerifyPickup = async () => {
        if (!otpInput) {
            toast.warning('Enter the OTP the restaurant gave you');
            return;
        }
        try {
            setSubmitting(true);
            const res = await deliveryClient.post('/food/delivery/multi-orders/verify-pickup', {
                batchId: activeBatchId,
                otp: otpInput,
            });
            if (res.data?.success) {
                toast.success(res.data.message || 'Batch picked up');
                setShowOtpModal(false);
                setOtpInput('');
                await fetchMultiOrders();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Hand this one order to the existing single-order delivery flow.
     *
     * No stage is forced here: the store derives it from this order's own
     * state, so an order the rider already arrived at reopens at "reached
     * drop" instead of being reset to "picked up".
     */
    const deliverThisOrder = (batch, order) => {
        setActiveOrder({
            ...order,
            _id: order._id,
            orderId: order.orderId || order.order_id || order._id,
            restaurantLocation: readLocation(order.restaurantId) || readLocation(batch.restaurant),
            customerLocation: readLocation(order.deliveryAddress),
        });
        navigate('/food/delivery/feed');
    };

    return (
        <div className={`bg-white font-sans text-black ${embedded ? 'pb-4' : 'min-h-screen pb-28 pt-14'}`}>
            <div className="bg-white text-black p-5 sm:p-6 border-b-2 border-black">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-md">
                            <Copy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-black">
                                Multi-Order Batches
                            </h1>
                            <p className="text-[11px] text-zinc-600 font-bold">
                                One pickup OTP · separate OTP per customer
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchMultiOrders()}
                        disabled={loading}
                        className="p-2.5 bg-black hover:bg-zinc-800 active:scale-95 transition rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
                        title="Refresh batches"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 sm:p-6 mt-2">
                {loading ? (
                    <div className="text-center text-black font-bold py-10">Loading your batches...</div>
                ) : batches.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10 border-2 border-dashed border-zinc-200 rounded-3xl m-4">
                        <Package className="mx-auto h-12 w-12 text-zinc-300 mb-3" />
                        <h3 className="text-base font-black text-black">No batches assigned</h3>
                        <p className="text-sm font-medium mt-1">You have no active multi-orders right now.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {batches.map((batch) => {
                            const isExpanded = expandedBatch === batch.batchId;
                            const isPickedUp = batch.pickupVerified;
                            const delivered = batch.deliveredCount ?? 0;
                            const total = batch.totalOrders ?? 0;
                            const remaining = batch.remainingCount ?? Math.max(0, total - delivered);
                            const percent = batch.progressPercent ?? (total ? Math.round((delivered / total) * 100) : 0);

                            return (
                                <div key={batch.batchId} className="bg-zinc-50 rounded-3xl shadow-sm border-2 border-black overflow-hidden mb-4">
                                    <div
                                        className="bg-white p-4 sm:p-5 border-b-2 border-black cursor-pointer hover:bg-zinc-50 transition"
                                        onClick={() => toggleExpand(batch.batchId)}
                                    >
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="min-w-0">
                                                <h2 className="font-black text-lg text-black uppercase tracking-wider truncate flex items-center gap-2">
                                                    <Store className="w-4 h-4 shrink-0" />
                                                    {batch.restaurant?.restaurantName || batch.restaurant?.name || 'Restaurant'}
                                                </h2>
                                                <p className="text-[11px] text-zinc-600 font-bold uppercase mt-1">
                                                    {total} orders · {remaining} left to deliver
                                                </p>
                                            </div>
                                            <div className="text-black shrink-0">
                                                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                            </div>
                                        </div>

                                        {/* Batch progress */}
                                        <div className="mt-3">
                                            <div className="flex justify-between items-baseline mb-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    {delivered} of {total} delivered
                                                </span>
                                                <span className="text-[11px] font-black text-black tabular-nums">{percent}%</span>
                                            </div>
                                            <div
                                                className="h-2.5 w-full rounded-full bg-zinc-200 overflow-hidden border border-zinc-300"
                                                role="progressbar"
                                                aria-valuenow={percent}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-label={`Batch progress: ${delivered} of ${total} orders delivered`}
                                            >
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        percent === 100 ? 'bg-green-600' : 'bg-black'
                                                    }`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white border-b-2 border-black space-y-3">
                                        {!isPickedUp ? (
                                            <>
                                                <button
                                                    onClick={() => handleRequestOtp(batch.batchId)}
                                                    disabled={requestingOtp}
                                                    className="w-full border-2 border-black text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-zinc-100 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    <KeyRound className="w-4 h-4" />
                                                    Ask restaurant for batch OTP
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActiveBatchId(batch.batchId);
                                                        setShowOtpModal(true);
                                                    }}
                                                    className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-zinc-800 active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Verify batch pickup (one OTP)
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full bg-green-50 border-2 border-green-600 text-green-700 py-3.5 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm">
                                                <CheckCircle2 className="w-5 h-5" />
                                                Batch picked up
                                            </div>
                                        )}
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t-2 border-black divide-y-2 divide-black bg-white">
                                            {batch.orders.map((order, index) => {
                                                const isDone = DELIVERED_STATUSES.includes(order.orderStatus);
                                                const pay = readPayment(order);
                                                const isCurrent = activeOrderId && String(order._id) === String(activeOrderId);

                                                return (
                                                    <div
                                                        key={order._id}
                                                        className={`p-4 sm:p-5 ${
                                                            isDone ? 'bg-zinc-50 opacity-60' : isCurrent ? 'bg-blue-50' : 'bg-white'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2 gap-2">
                                                            <div className="min-w-0">
                                                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                                                                    Order {index + 1}
                                                                    {isCurrent && !isDone && (
                                                                        <span className="ml-2 text-blue-700">· currently delivering</span>
                                                                    )}
                                                                </span>
                                                                <h3 className="font-black text-black text-base mt-0.5 truncate">
                                                                    #{order.order_id || order.orderId || String(order._id).slice(-6)}
                                                                </h3>
                                                            </div>
                                                            <span className={`text-[11px] px-3 py-1 rounded-full font-black uppercase tracking-wider border-2 shrink-0 ${
                                                                isDone ? 'bg-green-100 border-green-600 text-green-800'
                                                                    : ['picked_up', 'reached_drop'].includes(order.orderStatus) ? 'bg-blue-100 border-blue-600 text-blue-800'
                                                                        : 'bg-orange-100 border-orange-600 text-orange-800'
                                                            }`}>
                                                                {String(order.orderStatus || '').replace(/_/g, ' ')}
                                                            </span>
                                                        </div>

                                                        <div className="text-xs font-bold text-zinc-700 space-y-1.5 mb-4 mt-2">
                                                            <div className="flex items-start gap-1.5">
                                                                <MapPin className="w-4 h-4 text-black shrink-0 mt-0.5" />
                                                                <span>
                                                                    <strong className="text-black">To:</strong>{' '}
                                                                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                                                                </span>
                                                            </div>
                                                            {(order.userId?.phone || order.deliveryAddress?.phone) && (
                                                                <a
                                                                    href={`tel:${order.userId?.phone || order.deliveryAddress?.phone}`}
                                                                    className="flex items-center gap-1.5 text-black underline"
                                                                >
                                                                    <Phone className="w-4 h-4 shrink-0" />
                                                                    {order.userId?.name || order.deliveryAddress?.name || 'Customer'} ·{' '}
                                                                    {order.userId?.phone || order.deliveryAddress?.phone}
                                                                </a>
                                                            )}
                                                            {pay.amount != null && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <IndianRupee className="w-4 h-4 text-black shrink-0" />
                                                                    <span>
                                                                        {pay.amount.toFixed(2)}{' '}
                                                                        {pay.settled ? (
                                                                            <span className="text-green-700">(Paid — nothing to collect)</span>
                                                                        ) : pay.mustCollect ? (
                                                                            <span className="text-red-600">(Collect from this customer)</span>
                                                                        ) : (
                                                                            <span className="text-green-700">(Prepaid)</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isDone && (
                                                            <div className="w-full flex items-center justify-center gap-2 text-green-700 py-2 font-black text-xs uppercase tracking-wider">
                                                                <CheckCircle2 size={16} />
                                                                Delivered
                                                            </div>
                                                        )}
                                                        {isPickedUp && !isDone && (
                                                            <button
                                                                onClick={() => deliverThisOrder(batch, order)}
                                                                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-95 transition shadow-sm"
                                                            >
                                                                <Navigation size={16} />
                                                                Deliver this order
                                                            </button>
                                                        )}
                                                        {!isPickedUp && !isDone && (
                                                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                                                                Verify the batch pickup to start delivering
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showOtpModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm border-2 border-black shadow-xl">
                        <h2 className="text-xl font-black text-black mb-2 uppercase tracking-wide">Restaurant OTP</h2>
                        <p className="text-zinc-600 text-sm font-bold mb-6">
                            One code releases every order in this batch. Each customer will give you their own OTP at drop-off.
                        </p>

                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter OTP"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full border-2 border-zinc-300 focus:border-black rounded-xl p-4 text-center text-2xl font-black tracking-[0.5em] mb-6 outline-none transition"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowOtpModal(false);
                                    setOtpInput('');
                                }}
                                className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition uppercase text-sm tracking-wide"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerifyPickup}
                                disabled={submitting}
                                className="flex-1 bg-black text-white font-bold py-3.5 rounded-xl hover:bg-zinc-800 transition uppercase text-sm tracking-wide disabled:opacity-50"
                            >
                                {submitting ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiOrdersV2;
