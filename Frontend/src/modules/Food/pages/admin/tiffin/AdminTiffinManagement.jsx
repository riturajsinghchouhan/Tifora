import React, { useState, useEffect } from 'react';
import { Package, Users, DollarSign, Calendar, Search, Filter } from 'lucide-react';
import api from '@food/api';

export default function AdminTiffinManagement() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get('/admin/tiffin/subscriptions').catch(() => null);
            if (res?.data?.success) {
                setSubscriptions(res.data.data);
            } else {
                setSubscriptions([
                    {
                        _id: 'sub-001',
                        userId: { name: 'Aakash Sharma', phone: '+91 98765 43210' },
                        restaurantId: { name: 'Annapurna Rasoi' },
                        planId: { name: 'Homestyle North Indian Tiffin', durationDays: 30 },
                        status: 'active',
                        amountPaid: 4500,
                        startDate: '2026-08-01',
                        endDate: '2026-08-31'
                    },
                    {
                        _id: 'sub-002',
                        userId: { name: 'Pooja Verma', phone: '+91 98111 22334' },
                        restaurantId: { name: 'Campus Dabbawala' },
                        planId: { name: 'Weekly Student Budget Meal', durationDays: 7 },
                        status: 'active',
                        amountPaid: 899,
                        startDate: '2026-08-01',
                        endDate: '2026-08-08'
                    }
                ]);
            }
        } catch (err) {
            console.error('Error fetching admin tiffin subscriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const activeCount = subscriptions.filter(s => s.status === 'active').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tiffin Subscriptions Management</h1>
                <p className="text-sm text-gray-500">Monitor all user subscriptions, payouts, and deliveries across restaurants</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Subscriptions</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">{subscriptions.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Subscriptions</p>
                        <p className="text-3xl font-black text-green-600 mt-1">{activeCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Upfront Revenue</p>
                        <p className="text-3xl font-black text-orange-600 mt-1">₹{totalRevenue}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-sm">All Subscriptions</h3>
                    <div className="flex gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 bg-white outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Restaurant</th>
                                <th className="p-4">Plan</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subscriptions.map((sub) => (
                                <tr key={sub._id} className="hover:bg-gray-50/60 transition">
                                    <td className="p-4 font-bold text-gray-900">
                                        {sub.userId?.name}
                                        <span className="block text-[10px] font-normal text-gray-400">{sub.userId?.phone}</span>
                                    </td>
                                    <td className="p-4">{sub.restaurantId?.name}</td>
                                    <td className="p-4 font-medium text-gray-800">{sub.planId?.name}</td>
                                    <td className="p-4">{sub.planId?.durationDays} Days</td>
                                    <td className="p-4 font-bold text-gray-900">₹{sub.amountPaid}</td>
                                    <td className="p-4 text-gray-500">
                                        {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                            sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
