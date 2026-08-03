import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, CreditCard, Wallet, ShieldCheck, Clock } from 'lucide-react';
import api from '@food/api';
import { initRazorpayPayment } from '@food/utils/razorpay';

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
    const [submitting, setSubmitting] = useState(false);
    const [address, setAddress] = useState({
        name: 'My Home',
        street: 'Flat 402, Sunshine Heights, Sector 18',
        city: 'Gurugram',
        state: 'Haryana',
        zipCode: '122001',
        phone: '+91 98765 43210'
    });

    const handleConfirmPayment = async () => {
        setSubmitting(true);
        try {
            const payload = {
                planId: plan._id,
                restaurantId: plan.restaurantId || '651234567890123456789012',
                startDate,
                deliveryAddress: address,
                amountPaid: plan.totalPrice,
                paymentMethod
            };

            const response = await api.post('/user/tiffin/purchase', payload);
            
            if (paymentMethod === 'razorpay' && response.data?.razorpay) {
                const rzData = response.data.razorpay;
                const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
                
                initRazorpayPayment({
                    key: razorpayKey,
                    amount: rzData.amount,
                    currency: rzData.currency,
                    name: 'Tifora Tiffin',
                    description: `Subscription for ${plan.name}`,
                    order_id: rzData.orderId,
                    prefill: {
                        name: 'Foodelo User',
                        email: 'user@example.com',
                        contact: '9999999999'
                    },
                    theme: {
                        color: '#be123c'
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
                            }
                        } catch (verifyErr) {
                            console.error('Verification failed', verifyErr);
                            alert('Payment verification failed');
                        }
                    }
                });
            } else {
                alert('Tiffin Subscription activated successfully!');
                navigate('/food/user/tiffin/my-subscriptions');
            }
        } catch (err) {
            console.error('Checkout failed', err);
            alert('Failed to complete subscription');
        } finally {
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
                                <span className="text-[11px] font-bold text-[#be123c] bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
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
                                <Calendar className="w-4 h-4 text-[#be123c]" />
                                <span>Starts: <strong>{startDate}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#be123c]" />
                                <span>Daily Fresh Prep</span>
                            </div>
                        </div>
                    </div>

                    {/* Start Date Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#be123c]" /> Select Subscription Start Date
                        </h3>
                        <p className="text-xs text-gray-500">When should your daily tiffin service begin?</p>
                        <input
                            type="date"
                            min={minDateStr}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-800 outline-none focus:border-[#be123c] focus:ring-1 focus:ring-[#be123c]"
                        />
                    </div>

                    {/* Delivery Address */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#be123c]" /> Delivery Address
                            </h3>
                            <button
                                onClick={() => navigate('/food/user/profile')}
                                className="text-xs font-semibold text-[#be123c] hover:underline"
                            >
                                Change
                            </button>
                        </div>
                        <div className="bg-gray-50 p-3.5 rounded-xl text-xs text-gray-700 space-y-1 border border-gray-100">
                            <p className="font-bold text-gray-900">{address.name}</p>
                            <p>{address.street}, {address.city}, {address.state} - {address.zipCode}</p>
                            <p className="text-gray-500 font-medium pt-1">Phone: {address.phone}</p>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">Choose Payment Method</h3>

                        <div className="space-y-2.5">
                            <label
                                onClick={() => setPaymentMethod('razorpay')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'razorpay' ? 'border-[#be123c] bg-rose-50/50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-[#be123c]" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">UPI / Card / NetBanking</p>
                                        <p className="text-[10px] text-gray-500">Pay securely via Razorpay</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => {}} className="text-[#be123c]" />
                            </label>

                            <label
                                onClick={() => setPaymentMethod('wallet')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'wallet' ? 'border-[#be123c] bg-rose-50/50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Tifora Wallet</p>
                                        <p className="text-[10px] text-gray-500">Pay using available wallet balance</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'wallet'} onChange={() => {}} className="text-[#be123c]" />
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
                            <span className="text-[#be123c]">₹{plan.totalPrice}</span>
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
                        className="w-full bg-gradient-to-r from-[#9f1239] via-[#be123c] to-[#e11d48] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#be123c]/25 hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                        {submitting ? 'Processing...' : `Pay ₹${plan.totalPrice} & Activate Plan`}
                    </button>
                </div>
            </div>
        </div>
    );
}
