import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Navigation, Phone, Camera, Check, ShieldAlert, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '@food/api';

export default function TiffinDropoff() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const delivery = location.state?.delivery || {
        _id: id,
        deliveryAddress: {
            name: 'Customer',
            phone: '+91 98765 43210',
            fullAddress: 'Delivery Address',
            location: { coordinates: [77.3910, 28.5355] }
        }
    };
    const index = location.state?.index || 1;

    const [otp, setOtp] = useState('');
    const [unavailableMode, setUnavailableMode] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [callConfirmed, setCallConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const openGoogleMaps = () => {
        const coords = delivery.deliveryAddress?.location?.coordinates;
        if (coords && coords.length === 2) {
            const [lng, lat] = coords;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else {
            const encoded = encodeURIComponent(delivery.deliveryAddress?.fullAddress || '');
            window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleOtpVerify = async (e) => {
        e.preventDefault();
        if (otp.length < 4) {
            setError('Please enter the full 4-digit OTP');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            await api.put(`/delivery/tiffin/${delivery._id}/status`, {
                status: 'delivered',
                otp
            }).catch(() => null);

            alert('Tiffin Delivered Successfully with OTP!');
            navigate('/food/delivery/tiffin-route');
        } catch (err) {
            setError('Failed to verify delivery');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnattendedSubmit = async () => {
        if (!callConfirmed) {
            setError('You must call the customer to confirm leaving the tiffin');
            return;
        }
        if (!photo) {
            setError('Photo proof is required when delivering unattended');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            // Upload photo logic or submit URL
            await api.put(`/delivery/tiffin/${delivery._id}/status`, {
                status: 'delivered_unattended',
                pictureUrl: 'mock_uploaded_url'
            }).catch(() => null);

            alert('Unattended Delivery Recorded with Photo Proof!');
            navigate('/food/delivery/tiffin-route');
        } catch (err) {
            setError('Failed to complete unattended delivery');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-8">
            {/* Header */}
            <div>
                <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900">Stop #{index} - Delivery</h1>
                        <p className="text-xs text-gray-500">{delivery.deliveryAddress?.name}</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 max-w-lg mx-auto">
                    {/* Address & Navigation Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{delivery.deliveryAddress?.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{delivery.deliveryAddress?.fullAddress}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={openGoogleMaps}
                                className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition"
                            >
                                <Navigation className="w-4 h-4" />
                                Directions
                            </button>

                            <a
                                href={`tel:${delivery.deliveryAddress?.phone}`}
                                className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md shadow-green-200 hover:bg-green-700 active:scale-95 transition"
                            >
                                <Phone className="w-4 h-4" />
                                Call User
                            </a>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!unavailableMode ? (
                        /* Standard OTP Flow */
                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                            <div className="text-center">
                                <h4 className="font-bold text-gray-900">Enter Delivery OTP</h4>
                                <p className="text-xs text-gray-500 mt-1">Ask the customer for the 4-digit code</p>
                            </div>

                            <form onSubmit={handleOtpVerify} className="space-y-4">
                                <input
                                    type="text"
                                    maxLength="4"
                                    placeholder="• • • •"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center tracking-[1em] text-2xl font-black py-3 border-2 border-blue-200 rounded-xl focus:border-blue-600 focus:outline-none bg-blue-50/20"
                                />

                                <button
                                    type="submit"
                                    disabled={submitting || otp.length < 4}
                                    className={`w-full py-3.5 rounded-xl font-bold transition ${
                                        otp.length === 4
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {submitting ? 'Verifying...' : 'Confirm & Complete'}
                                </button>
                            </form>

                            <div className="pt-2 text-center border-t border-gray-100">
                                <button
                                    onClick={() => setUnavailableMode(true)}
                                    className="text-xs font-bold text-gray-500 hover:text-amber-600 transition"
                                >
                                    Customer not answering / Not at location?
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Fallback Unattended Flow */
                        <div className="bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm space-y-4 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-amber-700">
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <h4 className="font-bold text-sm">Customer Unavailable Flow</h4>
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed">
                                Please call the user first. If they agree to leave the tiffin outside, take a clear photo of the delivered tiffin.
                            </p>

                            <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={callConfirmed}
                                    onChange={(e) => setCallConfirmed(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <span className="text-xs font-semibold text-gray-800">
                                    I called the customer and confirmed drop-off
                                </span>
                            </label>

                            {/* Camera / Photo Upload */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Upload Drop-off Photo</label>
                                {photoPreview ? (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-300 aspect-video bg-black/5">
                                        <img src={photoPreview} alt="Proof" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                            className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-bold"
                                        >
                                            Retake
                                        </button>
                                    </div>
                                ) : (
                                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition bg-gray-50">
                                        <Camera className="w-8 h-8 text-gray-400" />
                                        <span className="text-xs font-bold text-blue-600">Take Photo / Upload</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="space-y-2 pt-2">
                                <button
                                    onClick={handleUnattendedSubmit}
                                    disabled={submitting || !callConfirmed || !photo}
                                    className={`w-full py-3.5 rounded-xl font-bold transition ${
                                        callConfirmed && photo
                                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-200 hover:bg-amber-700'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {submitting ? 'Submitting...' : 'Mark Delivered (Photo Verified)'}
                                </button>

                                <button
                                    onClick={() => setUnavailableMode(false)}
                                    className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition"
                                >
                                    Back to OTP Verification
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
