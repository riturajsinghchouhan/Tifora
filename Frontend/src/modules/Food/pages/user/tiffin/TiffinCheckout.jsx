import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, CreditCard, Wallet, Clock, Banknote } from 'lucide-react';
import api, { userAPI } from '@food/api';
import { initRazorpayPayment } from '@food/utils/razorpay';
import { useProfile } from '@food/context/ProfileContext';
import TiffinAddressModal from './components/TiffinAddressModal';

export default function TiffinCheckout() {
    const location = useLocation();
    const navigate = useNavigate();

    const plan = location.state?.plan || {
        _id: 'plan-1',
        name: 'Homestyle North Indian Tiffin',
        durationDays: 30,
        mealType: 'Both',
        totalPrice: 4500
    };

    // Tomorrow's date formatted YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(minDateStr);
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const { userProfile, getDefaultAddress, addresses, addAddress } = useProfile();
    const getAddressId = (addr) => addr?.id || addr?._id || "";
    
    // Default to the user's primary address, or the first address if available
    const initialAddressId = getAddressId(getDefaultAddress()) || (addresses.length > 0 ? getAddressId(addresses[0]) : "");
    const [selectedAddressId, setSelectedAddressId] = useState(initialAddressId);
    
    const selectedAddress = addresses.find(addr => getAddressId(addr) === selectedAddressId) || getDefaultAddress() || addresses[0];

    const [submitting, setSubmitting] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    // Fetch user wallet balance on component mount
    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const res = await userAPI.getWallet();
                if (res?.data?.success && res?.data?.data?.wallet) {
                    setWalletBalance(res.data.data.wallet.balance || 0);
                }
            } catch (err) {
                console.error("Failed to fetch wallet balance:", err);
            }
        };
        fetchWallet();
    }, []);

    const handleConfirmPayment = async () => {
        if (!selectedAddress) {
            alert('Please select or add a delivery address');
            return;
        }

        if (paymentMethod === 'wallet' && walletBalance < plan.totalPrice) {
            alert(`Insufficient wallet balance. Available: ₹${walletBalance}, Required: ₹${plan.totalPrice}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                planId: plan._id,
                restaurantId: plan.restaurantId || '651234567890123456789012',
                startDate,
                deliveryAddress: selectedAddress,
                amountPaid: plan.totalPrice,
                paymentMethod
            };

            const response = await api.post('/user/tiffin/purchase', payload);
            
            if (paymentMethod === 'razorpay' && response.data?.razorpay) {
                const rzData = response.data.razorpay;
                // Read key from backend response first, then fallback to env
                const razorpayKey = rzData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || window.__ENV__?.VITE_RAZORPAY_KEY_ID;

                if (!razorpayKey) {
                    alert('Payment gateway key is not configured. Please contact support.');
                    setSubmitting(false);
                    return;
                }

                const userName = userProfile?.name || selectedAddress?.name || 'Tifora User';
                const userEmail = userProfile?.email || 'user@tifora.in';
                const userPhone = (selectedAddress?.phone || userProfile?.phone || '').replace(/\D/g, '').slice(-10) || '9999999999';
                
                await initRazorpayPayment({
                    key: razorpayKey,
                    amount: rzData.amount,
                    currency: rzData.currency || 'INR',
                    name: 'Tifora Tiffin',
                    description: `Subscription for ${plan.name}`,
                    order_id: rzData.orderId,
                    prefill: {
                        name: userName,
                        email: userEmail,
                        contact: userPhone
                    },
                    theme: {
                        color: '#0cb884'
                    },
                    handler: async function (paymentResponse) {
                        try {
                            const verifyPayload = {
                                razorpayOrderId: paymentResponse.razorpay_order_id,
                                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                                razorpaySignature: paymentResponse.razorpay_signature,
                                subscriptionTemp: response.data.subscriptionTemp
                            };
                            
                            const verifyRes = await api.post('/user/tiffin/purchase/verify', verifyPayload);
                            if (verifyRes.data.success) {
                                alert('Tiffin Subscription activated successfully!');
                                navigate('/food/user/tiffin/my-subscriptions');
                            } else {
                                alert(verifyRes.data?.message || 'Payment verification failed');
                            }
                        } catch (verifyErr) {
                            console.error('Verification failed', verifyErr);
                            alert(verifyErr.response?.data?.message || 'Payment verification failed');
                        } finally {
                            setSubmitting(false);
                        }
                    },
                    onError: function (err) {
                        console.error('Razorpay Error:', err);
                        alert(err?.description || err?.message || 'Payment cancelled or failed');
                        setSubmitting(false);
                    },
                    onClose: function () {
                        setSubmitting(false);
                    }
                });
            } else {
                alert('Tiffin Subscription activated successfully!');
                navigate('/food/user/tiffin/my-subscriptions');
            }
        } catch (err) {
            console.error('Checkout failed', err);
            alert(err.response?.data?.message || 'Failed to complete subscription');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-32">
            <div>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900 text-base sm:text-lg">Checkout & Confirmation</h1>
                        <p className="text-xs text-gray-500">Tiffin Subscription Activation</p>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 max-w-lg mx-auto">
                    {/* Plan Summary Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold text-[#0cb884] bg-[#0cb884]/10 px-2.5 py-0.5 rounded-lg border border-[#0cb884]/20">
                                    {plan.mealType === 'Both' ? 'Morning + Evening' : `${plan.mealType} Only`}
                                </span>
                                <h2 className="text-lg font-bold text-gray-900 mt-1.5">{plan.name}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{plan.restaurantName || 'Featured Kitchen'}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-black text-gray-900">₹{plan.totalPrice}</span>
                                <p className="text-[10px] text-gray-500">for {plan.durationDays} Days</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-[#0cb884]" />
                                <span>Starts: <strong>{startDate}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#0cb884]" />
                                <span>Daily Fresh Prep</span>
                            </div>
                        </div>
                    </div>

                    {/* Start Date Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#0cb884]" /> Select Subscription Start Date
                        </h3>
                        <p className="text-xs text-gray-500">When should your daily tiffin service begin?</p>
                        <input
                            type="date"
                            min={minDateStr}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-800 outline-none focus:border-[#0cb884] focus:ring-1 focus:ring-[#0cb884]"
                        />
                    </div>

                    {/* Delivery Address */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#0cb884]" /> Delivery Address
                            </h3>
                            <button
                                onClick={() => setShowAddressModal(true)}
                                className="text-xs font-semibold text-[#0cb884] hover:underline"
                            >
                                + Add New
                            </button>
                        </div>
                        
                        {addresses.length > 0 ? (
                            <div className="space-y-3">
                                {addresses.map((addr) => {
                                    const addrId = getAddressId(addr);
                                    const isSelected = selectedAddressId === addrId;
                                    
                                    return (
                                        <div
                                            key={addrId}
                                            onClick={() => setSelectedAddressId(addrId)}
                                            className={`border-2 rounded-xl p-3.5 cursor-pointer transition-colors ${
                                                isSelected ? 'border-[#0cb884] bg-[#0cb884]/5' : 'border-gray-100 hover:border-[#0cb884]/30'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className={`mt-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected ? 'border-[#0cb884]' : 'border-gray-300'
                                                }`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#0cb884]" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                            Delivery Destination
                                                        </span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                                            {addr.label || addr.name || 'Home'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-800 mt-1">
                                                        {addr.street}
                                                        {addr.area ? `, ${addr.area}` : ''}
                                                        {addr.landmark ? ` (Near ${addr.landmark})` : ''}
                                                        {addr.city ? `, ${addr.city}` : ''}
                                                    </p>
                                                    {addr.phone && (
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                            Phone: {addr.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
                                <p className="text-sm font-bold text-orange-800 mb-2">No Address Saved</p>
                                <button
                                    onClick={() => setShowAddressModal(true)}
                                    className="text-xs px-4 py-2 bg-white text-orange-600 font-bold rounded-lg shadow-sm border border-orange-200"
                                >
                                    Add Delivery Address
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Payment Method Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">Choose Payment Method</h3>

                        <div className="space-y-2.5">
                            {/* Razorpay (UPI / Card / NetBanking) */}
                            <label
                                onClick={() => setPaymentMethod('razorpay')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'razorpay' ? 'border-[#0cb884] bg-[#0cb884]/10' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-[#0cb884]" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">UPI / Card / NetBanking</p>
                                        <p className="text-[10px] text-gray-500">Pay securely via Razorpay Online Gateway</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => {}} className="text-[#0cb884]" />
                            </label>

                            {/* Tifora Wallet */}
                            <label
                                onClick={() => setPaymentMethod('wallet')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'wallet' ? 'border-[#0cb884] bg-[#0cb884]/10' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Tifora Wallet</p>
                                        <p className="text-[10px] text-gray-500">
                                            Available Balance: <strong className={walletBalance < plan.totalPrice ? 'text-red-500' : 'text-green-600'}>₹{walletBalance}</strong>
                                        </p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'wallet'} onChange={() => {}} className="text-[#0cb884]" />
                            </label>

                            {/* Cash on Delivery */}
                            <label
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'cash' ? 'border-[#0cb884] bg-[#0cb884]/10' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Banknote className="w-5 h-5 text-amber-600" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Pay on Delivery (Cash)</p>
                                        <p className="text-[10px] text-gray-500">Pay cash upon tiffin delivery start</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'cash'} onChange={() => {}} className="text-[#0cb884]" />
                            </label>
                        </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2 text-xs">
                        <h3 className="font-bold text-gray-900 mb-2">Price Breakdown</h3>
                        <div className="flex justify-between text-gray-600">
                            <span>Plan Duration</span>
                            <span className="font-bold text-gray-900">{plan.durationDays} Days</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Meal Slots</span>
                            <span className="font-bold text-gray-900">{plan.mealType}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Daily Delivery Fee</span>
                            <span className="font-bold text-green-600">FREE</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-black text-gray-900">
                            <span>Total Upfront Amount</span>
                            <span className="text-[#0cb884]">₹{plan.totalPrice}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Fixed Sticky Button */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleConfirmPayment}
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-[#088c64] via-[#0cb884] to-[#20d49f] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#0cb884]/25 hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? 'Processing...' : `Pay ₹${plan.totalPrice} & Activate Plan`}
                    </button>
                </div>
            </div>

            {/* Address Modal */}
            <TiffinAddressModal
                show={showAddressModal}
                onClose={() => setShowAddressModal(false)}
                addAddress={addAddress}
                getAddressId={getAddressId}
                setSelectedAddressId={setSelectedAddressId}
            />
        </div>
    );
}
