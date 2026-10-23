import React, { useState } from 'react';
import { X, Search, UserCheck, Banknote, CreditCard, Loader2 } from 'lucide-react';
import api from '@food/api';

const todayStr = () => new Date().toISOString().slice(0, 10);

const errorMessage = (e, fallback) => e?.response?.data?.message || fallback;

export default function AssignPlanModal({ plans = [], onClose, onAssigned }) {
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [looking, setLooking] = useState(false);

    const [planId, setPlanId] = useState('');
    const [startDate, setStartDate] = useState(todayStr());
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const [address, setAddress] = useState({ street: '', city: '', state: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const selectedPlan = plans.find((p) => p._id === planId);
    const hasSavedAddress = (customer?.addresses || []).length > 0;

    const handleLookup = async (e) => {
        e?.preventDefault();
        setLookupError('');
        setCustomer(null);
        setLooking(true);
        try {
            const res = await api.get('/food/tiffin/admin/users/lookup', { params: { phone }, contextModule: 'admin' });
            setCustomer(res?.data?.data || null);
        } catch (err) {
            setLookupError(errorMessage(err, 'Could not look up customer'));
        } finally {
            setLooking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!customer || !planId) {
            setError('Select a customer and a plan');
            return;
        }
        setSubmitting(true);
        try {
            const body = {
                userId: customer._id,
                planId,
                startDate,
                paymentMethod,
                paymentStatus: paymentMethod === 'cod' ? paymentStatus : 'paid'
            };
            if (!hasSavedAddress) body.deliveryAddress = address;
            const res = await api.post('/food/tiffin/admin/subscriptions/assign', body, { contextModule: 'admin' });
            if (res?.data?.success) {
                alert(res.data.message || 'Plan assigned successfully');
                onAssigned?.(res.data.data);
            } else {
                setError(res?.data?.message || 'Failed to assign plan');
            }
        } catch (err) {
            setError(errorMessage(err, 'Failed to assign plan'));
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 outline-none focus:border-[#be123c]';

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="font-black text-gray-900 text-base">Assign Plan to Customer</h3>
                        <p className="text-xs text-gray-500">Find the registered customer by phone number and activate a plan</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Step 1: customer lookup */}
                <form onSubmit={handleLookup} className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Customer Phone Number</label>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            inputMode="numeric"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setCustomer(null); setLookupError(''); }}
                            placeholder="10 digit mobile number"
                            className={inputCls}
                        />
                        <button
                            type="submit"
                            disabled={looking || phone.replace(/\D/g, '').length < 10}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-gray-900 px-4 rounded-xl disabled:opacity-50"
                        >
                            {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Find
                        </button>
                    </div>
                    {lookupError && <p className="text-xs font-semibold text-red-600">{lookupError}</p>}
                    {customer && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                            <div className="text-xs">
                                <p className="font-bold text-gray-900">{customer.name || 'Customer'}</p>
                                <p className="text-gray-500">{customer.phone}{customer.email ? ` • ${customer.email}` : ''}</p>
                            </div>
                        </div>
                    )}
                </form>

                {/* Step 2: plan details */}
                {customer && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Plan</label>
                            <select value={planId} onChange={(e) => setPlanId(e.target.value)} required className={inputCls}>
                                <option value="">Select a plan</option>
                                {plans.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} • {p.durationDays}d • {p.mealType} • ₹{p.price}
                                        {p.restaurantId?.restaurantName || p.restaurantId?.name ? ` • ${p.restaurantId.restaurantName || p.restaurantId.name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Start Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputCls} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Amount</label>
                                <div className={`${inputCls} bg-gray-50`}>₹{selectedPlan?.price ?? '—'}</div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Payment Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'online', label: 'Online', icon: CreditCard },
                                    { id: 'cod', label: 'COD / Cash', icon: Banknote }
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setPaymentMethod(id)}
                                        className={`flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition ${
                                            paymentMethod === id
                                                ? 'bg-rose-50 border-[#be123c] text-[#be123c]'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" /> {label}
                                    </button>
                                ))}
                            </div>
                            {paymentMethod === 'cod' && (
                                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={`${inputCls} mt-2`}>
                                    <option value="paid">Cash collected (Paid)</option>
                                    <option value="pending">Cash pending (collect later)</option>
                                </select>
                            )}
                        </div>

                        {hasSavedAddress ? (
                            <p className="text-[11px] text-gray-500">Delivery will use the customer's saved default address.</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold text-amber-700">This customer has no saved address. Enter delivery address:</p>
                                <input required placeholder="Street / flat / area" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className={inputCls} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input required placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={inputCls} />
                                    <input required placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                        )}

                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                            <button type="button" onClick={onClose} className="text-xs font-bold text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#be123c] px-5 py-2.5 rounded-xl disabled:opacity-60"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Assign & Activate
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
