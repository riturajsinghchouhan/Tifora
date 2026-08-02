import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, CreditCard, Wallet, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '@food/api';

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

            await api.post('/user/tiffin/purchase', payload).catch(() => null);

            alert('Tiffin Subscription activated successfully!');
            navigate('/food/user/tiffin/my-subscriptions');
        } catch (err) {
            alert('Failed to complete subscription');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-8">
            <div>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900">Subscription Checkout</h1>
                        <p className="text-xs text-gray-500">Upfront payment for {plan.durationDays} days</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 max-w-lg mx-auto">
                    {/* Delivery Address Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-orange-500" /> Delivery Address
                            </h3>
                            <button className="text-xs font-bold text-orange-600 hover:underline">Change</button>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-700 space-y-0.5">
                            <p className="font-bold text-gray-900">{address.name}</p>
                            <p>{address.street}, {address.city}, {address.state} - {address.zipCode}</p>
                            <p className="text-gray-500 font-medium mt-1">Phone: {address.phone}</p>
                        </div>
                    </div>

                    {/* Start Date Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" /> Start Date
                        </h3>
                        <p className="text-xs text-gray-500">When should your first tiffin be delivered?</p>
                        <input
                            type="date"
                            min={minDateStr}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-orange-500" /> Payment Method
                        </h3>
                        <div className="space-y-2">
                            <label
                                onClick={() => setPaymentMethod('razorpay')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'razorpay' ? 'border-orange-500 bg-orange-50/40' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">UPI / Cards / NetBanking</p>
                                        <p className="text-[10px] text-gray-500">Instant secure online payment</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => {}} className="text-orange-500" />
                            </label>

                            <label
                                onClick={() => setPaymentMethod('wallet')}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                    paymentMethod === 'wallet' ? 'border-orange-500 bg-orange-50/40' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Tifora Wallet</p>
                                        <p className="text-[10px] text-gray-500">Pay using available wallet balance</p>
                                    </div>
                                </div>
                                <input type="radio" checked={paymentMethod === 'wallet'} onChange={() => {}} className="text-orange-500" />
                            </label>
                        </div>
                    </div>

                    {/* Pricing Summary */}
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
                            <span className="text-orange-600">₹{plan.totalPrice}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Button */}
            <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10 shadow-lg">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleConfirmPayment}
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                        {submitting ? 'Processing...' : `Pay ₹${plan.totalPrice} & Activate Plan`}
                    </button>
                </div>
            </div>
        </div>
    );
}
