import React from 'react';
import { useNavigate } from "react-router-dom";
import { Clock, Navigation, CheckCircle2 } from "lucide-react";
import bikelogo from '@food/assets/bikelogo.png';

const VEG_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMC41IiB5PSIwLjUiIHdpZHRoPSIxMyIgaGVpZ2h0PSIxMyIgcng9IjEuNSIgc3Ryb2tlPSIjMEY4QTQ2Ii8+CjxjaXJjbGUgY3g9IjciIGN5PSI3IiByPSIzIiBmaWxsPSIjMEY4QTQ2Ii8+Cjwvc3ZnPgo=";

export default function TiffinTrackingCard({ delivery }) {
    const navigate = useNavigate();
    const { _id, restaurantId, assignedTo, type, status, date } = delivery;

    const deliveryDate = new Date(date);
    const dateFormatted = deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = deliveryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const isOutForDelivery = status === 'out_for_delivery';
    const isAssigned = status === 'assigned';
    const isDelivered = status === 'delivered' || status === 'delivered_unattended';
    const isPending = status === 'pending';
    
    const canTrack = isOutForDelivery || isAssigned;

    const getStatusText = () => {
        if (isDelivered) return 'Delivered';
        if (isOutForDelivery) return 'Out for delivery';
        if (isAssigned) return 'Rider assigned';
        if (isPending) return 'Pending';
        return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    };

    const getStatusColor = () => {
        if (isDelivered) return 'text-green-600 dark:text-green-400';
        if (isOutForDelivery) return 'text-primary';
        if (isAssigned) return 'text-orange-500 dark:text-orange-400';
        return 'text-gray-500 dark:text-gray-400';
    };

    const shortId = _id.substring(_id.length - 6).toUpperCase();

    return (
        <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-gray-800 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-4">
            {/* Header: Restaurant Info */}
            <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100 dark:border-gray-800 border-dashed">
                <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-800">
                        <img
                            src={restaurantId?.image || restaurantId?.logo || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80"}
                            alt={restaurantId?.name || 'Restaurant'}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">{restaurantId?.name || 'Tiffin Service'}</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Delivery ID: TIF-{shortId}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{restaurantId?.address?.city || 'Local Delivery'}</p>
                        {restaurantId?.slug && (
                            <button onClick={() => navigate(`/food/user/restaurants/${restaurantId.slug}`)} className="text-[11px] text-primary font-medium mt-1">
                                View menu &gt;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="mb-3 mt-1">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-start gap-2">
                        <img src={VEG_ICON} alt="Veg" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug">
                            1 x Special {type} Tiffin Meal
                        </p>
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Prepaid</span>
                </div>
            </div>

            {/* Total Bill */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-lg mb-3 border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Total Bill</span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Subscription</span>
            </div>

            {/* Footer Stats & Actions */}
            <div className="flex justify-between items-end mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Scheduled for {dateFormatted}</p>
                    
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Payment: <strong>Online</strong></span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[9px] px-1.5 py-0.5 rounded font-medium">
                            paid
                        </span>
                    </div>

                    <div className="mt-2.5">
                        <p className={`text-xs font-semibold ${getStatusColor()}`}>
                            {getStatusText()}
                        </p>
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex flex-col items-end gap-2">
                    {canTrack && (
                        <button
                            onClick={() => navigate(`/food/user/tiffin-tracking/${_id}`)}
                            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                        >
                            <Navigation className="w-3.5 h-3.5" />
                            Track
                        </button>
                    )}
                    {isDelivered && (
                        <button
                            onClick={() => navigate(`/food/user/tiffin-tracking/${_id}`)}
                            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            View Details
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
