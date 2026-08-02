import React, { useState, useEffect } from 'react';
import { Utensils, Sun, Moon } from 'lucide-react';
import api from '@food/api';

export default function TiffinPrepDashboard() {
    const [prepData, setPrepData] = useState({ Morning: 0, Evening: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrepCounts = async () => {
            try {
                // Adjust endpoint when integrated
                const response = await api.get('/restaurant/tiffin/prep-dashboard');
                if (response.data.success) {
                    setPrepData(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching prep counts', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPrepCounts();
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Today's Tiffin Prep</h1>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Morning Card */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white shadow-sm text-yellow-500 rounded-full flex items-center justify-center mb-4">
                            <Sun className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Morning Batch</h2>
                        <p className="text-sm text-gray-500 mb-6">Deliveries by 1:00 PM</p>
                        
                        <div className="text-6xl font-black text-yellow-600 tracking-tighter">
                            {prepData.Morning}
                        </div>
                        <p className="mt-2 text-sm font-medium text-yellow-700">Tiffins to prepare</p>
                    </div>

                    {/* Evening Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white shadow-sm text-indigo-500 rounded-full flex items-center justify-center mb-4">
                            <Moon className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Evening Batch</h2>
                        <p className="text-sm text-gray-500 mb-6">Deliveries by 8:00 PM</p>
                        
                        <div className="text-6xl font-black text-indigo-600 tracking-tighter">
                            {prepData.Evening}
                        </div>
                        <p className="mt-2 text-sm font-medium text-indigo-700">Tiffins to prepare</p>
                    </div>
                </div>
            )}
        </div>
    );
}
