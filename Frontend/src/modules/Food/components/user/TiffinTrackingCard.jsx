import React from 'react';
import { Card, CardContent } from "@food/components/ui/card";
import { Button } from "@food/components/ui/button";
import { Clock, MapPin, Phone, Check, ChevronRight, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bikelogo from '@food/assets/bikelogo.png';

export default function TiffinTrackingCard({ delivery }) {
    const navigate = useNavigate();
    const { _id, restaurantId, assignedTo, type, status, date } = delivery;

    const deliveryDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isOutForDelivery = status === 'out_for_delivery';
    const isAssigned = status === 'assigned';
    const isDelivered = status === 'delivered' || status === 'delivered_unattended';
    
    // Status color mapping
    const getStatusStyle = () => {
        if (isDelivered) return 'text-green-700 bg-green-50 border-green-200';
        if (isOutForDelivery) return 'text-blue-700 bg-blue-50 border-blue-200';
        if (isAssigned) return 'text-orange-700 bg-orange-50 border-orange-200';
        return 'text-gray-700 bg-gray-50 border-gray-200';
    };

    const getStatusText = () => {
        if (isDelivered) return 'Delivered';
        if (isOutForDelivery) return 'On the way';
        if (isAssigned) return 'Rider Assigned';
        return status.replace(/_/g, ' ').toUpperCase();
    };

    const canTrack = isOutForDelivery || isAssigned;

    return (
        <Card className="mb-4 overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)] border-gray-100 rounded-2xl hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-shadow duration-300 bg-white">
            <CardContent className="p-0">
                <div 
                    className={`p-5 flex justify-between items-start ${canTrack ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`} 
                    onClick={() => canTrack && navigate(`/food/user/tiffin-tracking/${_id}`)}
                >
                    <div className="flex gap-4">
                        {/* Restaurant / Food Icon */}
                        <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                            <img 
                                src={restaurantId?.image || restaurantId?.logo || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80"} 
                                alt={restaurantId?.name || 'Restaurant'} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1.5">
                                <h3 className="font-bold text-[17px] text-gray-900 leading-none">{restaurantId?.name || 'Tiffin Service'}</h3>
                            </div>
                            <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> 
                                <span>{type} Meal • {deliveryDate}</span>
                            </div>
                            <div className="mt-2">
                                <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border ${getStatusStyle()} uppercase tracking-wider`}>
                                    {getStatusText()}
                                </span>
                            </div>
                        </div>
                    </div>
                    {canTrack && (
                        <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:text-gray-900 transition-colors self-center">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    )}
                </div>
                
                <div className="border-t border-dashed border-gray-200 mx-5"></div>

                {/* Rider Info if Assigned */}
                {assignedTo && !isDelivered && (
                    <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-sm border border-gray-100 overflow-hidden p-0.5">
                                {assignedTo.profileImage ? (
                                    <img src={assignedTo.profileImage} alt="rider" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <img src={bikelogo} alt="rider" className="w-8 h-8 object-contain opacity-80" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-[15px] text-gray-900 leading-tight">{assignedTo.name || 'Delivery Partner'}</p>
                                <p className="text-[13px] text-gray-500">is delivering your tiffin</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {assignedTo.phone && (
                                <a href={`tel:${assignedTo.phone}`} className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors border border-green-100 shadow-sm">
                                    <Phone className="w-4 h-4 fill-current" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="p-4 pt-2">
                    {canTrack && (
                        <Button 
                            className="w-full bg-gradient-to-r from-[#f15700] to-[#e04f00] hover:from-[#d14b00] hover:to-[#c24500] text-white font-bold py-6 rounded-xl shadow-[0_4px_14px_rgba(241,87,0,0.25)] transition-all flex items-center justify-center text-[15px]"
                            onClick={() => navigate(`/food/user/tiffin-tracking/${_id}`)}
                        >
                            <Navigation className="w-4 h-4 mr-2" />
                            Track Live Location
                        </Button>
                    )}
                    {isDelivered && (
                        <div className="w-full text-center py-3 bg-green-50 rounded-xl text-green-700 font-semibold flex items-center justify-center gap-2 border border-green-100">
                            <Check className="w-4 h-4 bg-green-600 text-white rounded-full p-0.5" /> 
                            Delivered Successfully
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
