import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Phone, 
    ShieldCheck, 
    Receipt, 
    ChevronRight, 
    MessageSquare, 
    User
} from 'lucide-react';
import { CUSTOMER_PIN_SVG, RESTAURANT_PIN_SVG } from '@food/constants/mapIcons';

const DEFAULT_CUSTOMER_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_CUSTOMER_PIN = typeof CUSTOMER_PIN_SVG !== 'undefined' ? CUSTOMER_PIN_SVG : DEFAULT_CUSTOMER_PIN;
const DEFAULT_RESTAURANT_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_RESTAURANT_PIN = typeof RESTAURANT_PIN_SVG !== 'undefined' ? RESTAURANT_PIN_SVG : DEFAULT_RESTAURANT_PIN;

const SectionItem = ({ icon: Icon, iconNode, title, subtitle, showArrow = true, onClick }) => (
    <div 
        className={`flex items-start gap-4 p-4 border-b border-gray-100 dark:border-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors' : ''}`}
        onClick={onClick}
    >
        <div className="mt-1 shrink-0">
            {iconNode ? iconNode : <Icon className="w-6 h-6 text-gray-400" />}
        </div>
        <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-1">{subtitle}</p>
        </div>
        {showArrow && (
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
        )}
    </div>
);

export default function TiffinTrackingDetailsSheet({
    delivery,
    isSheetExpanded,
    setIsSheetExpanded,
    customerDeliveryOtp,
    getStatusHeading,
    showSuccess
}) {
    if (!delivery) return null;

    const { restaurantId, status, type } = delivery;
    const isOutForDelivery = status === 'out_for_delivery';
    const isAssigned = status === 'assigned';
    const isDelivered = status === 'delivered';

    return (
        <>
            {/* Scrollable Content (Bottom Sheet) */}
            <motion.div 
                className="absolute bottom-0 left-0 right-0 z-20 bg-gray-50 dark:bg-[#141414] rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] flex flex-col max-h-[45vh]"
                initial={false}
                animate={{ y: isSheetExpanded ? 0 : 'calc(100% - 48px)' }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
            >
                {/* Drag handle pill */}
                <div 
                    className="w-full flex justify-center pt-4 pb-3 shrink-0 bg-transparent cursor-pointer"
                    onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 space-y-4 md:space-y-6 pb-24">
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                        
                        {/* Customer Delivery OTP */}
                        {customerDeliveryOtp && (
                            <motion.div
                                className="bg-sky-50 dark:bg-sky-900/10 rounded-xl p-4 shadow-sm border border-sky-100 dark:border-sky-800"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-sky-900 dark:text-sky-100 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-sky-500" /> Handover OTP
                                        </p>
                                        <p className="text-xs text-sky-700/80 dark:text-sky-300">Share this with the delivery partner</p>
                                    </div>
                                    <div className="bg-white dark:bg-black/20 px-4 py-2 rounded-lg border border-sky-200 dark:border-sky-700 shadow-inner">
                                        <span className="text-2xl font-black tracking-widest text-sky-600 dark:text-sky-400">{customerDeliveryOtp}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Dynamic Status Card */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-orange-100 bg-orange-50 text-orange-500">
                                    <Receipt className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{getStatusHeading()}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                                        {isDelivered ? "Your tiffin has been delivered" : isOutForDelivery ? "Rider is heading to your location" : "Waiting for restaurant to accept"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Delivery Details Banner */}
                        <motion.div
                            className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 text-center border border-yellow-100 dark:border-yellow-900/30"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <p className="text-yellow-800 dark:text-yellow-400 font-medium text-sm">
                                All your delivery details in one place 🥡
                            </p>
                        </motion.div>

                        {/* Contact & Address Section */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm overflow-hidden border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <SectionItem
                                icon={User}
                                title={delivery?.userId?.name || delivery?.userId?.fullName || 'Customer'}
                                subtitle={delivery?.deliveryAddress?.phone || delivery?.userId?.phone || 'Phone number not available'}
                                showArrow={false}
                            />
                            <SectionItem
                                iconNode={
                                    <div
                                        dangerouslySetInnerHTML={{ __html: SAFE_CUSTOMER_PIN }}
                                        className="w-6 h-6 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                                    />
                                }
                                title="Delivery at Location"
                                subtitle={delivery?.deliveryAddress?.fullAddress || delivery?.deliveryAddress?.formattedAddress || delivery?.deliveryAddress?.street || delivery?.deliveryAddress?.area || 'Address not available'}
                                showArrow={false}
                            />
                            <SectionItem
                                icon={MessageSquare}
                                title="Add delivery instructions"
                                subtitle=""
                                onClick={() => {}}
                            />
                        </motion.div>

                        {/* Restaurant Section */}
                        <motion.div
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm overflow-hidden border border-gray-100"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="flex items-center gap-3 p-4 border-b border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-12 h-12 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: SAFE_RESTAURANT_PIN }}
                                        className="w-7 h-7 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{restaurantId?.name || 'Tiffin Service'}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{restaurantId?.address?.formattedAddress || restaurantId?.formattedAddress || 'Restaurant location'}</p>
                                </div>
                                <motion.button
                                    className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => window.location.href = `tel:${restaurantId?.phone || ''}`}
                                >
                                    <Phone className="w-5 h-5 text-orange-500" />
                                </motion.button>
                            </div>

                            {/* Order Items */}
                            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <Receipt className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="mt-1 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="w-4 h-4 rounded border border-green-600 flex items-center justify-center">
                                                    <span className="w-2 h-2 rounded-full bg-green-600" />
                                                </span>
                                                <span>1 x {type || 'Special'} Meal / Dinner Tiffin</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </motion.div>
            
            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-green-600 flex flex-col justify-center items-center text-white"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="bg-white rounded-full p-4 mb-6 shadow-2xl"
                        >
                            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold mb-2"
                        >
                            Order Received!
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-green-100 font-medium"
                        >
                            Taking you to home screen...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
