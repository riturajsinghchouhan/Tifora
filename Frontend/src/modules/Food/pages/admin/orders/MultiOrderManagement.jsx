import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminClient } from '@food/api/axios';
import { toast } from 'sonner';

const MultiOrderManagement = () => {
    const [groupedOrders, setGroupedOrders] = useState([]);
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [activeBatches, setActiveBatches] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
    const [restaurantFilter, setRestaurantFilter] = useState('');
    const [onlineOnly, setOnlineOnly] = useState(true);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const fetchGroupedOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await adminClient.get('/food/admin/multi-orders/pending');
            if (res.data?.success) setGroupedOrders(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch unassigned orders');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDeliveryBoys = useCallback(async (online) => {
        try {
            const res = await adminClient.get('/food/admin/multi-orders/active-delivery-boys', {
                params: { onlineOnly: online ? 'true' : 'false' },
            });
            if (res.data?.success) setDeliveryBoys(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch delivery partners');
        }
    }, []);

    const fetchActiveBatches = useCallback(async () => {
        try {
            const res = await adminClient.get('/food/admin/multi-orders/batches');
            if (res.data?.success) setActiveBatches(res.data.data || []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const releaseBatch = async (batchId) => {
        try {
            const res = await adminClient.post('/food/admin/multi-orders/release', { batchId });
            if (res.data?.success) {
                toast.success(res.data.message || 'Batch released');
                refreshAll();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not release this batch');
        }
    };

    const refreshAll = useCallback(() => {
        void fetchGroupedOrders();
        void fetchDeliveryBoys(onlineOnly);
        void fetchActiveBatches();
    }, [fetchGroupedOrders, fetchDeliveryBoys, fetchActiveBatches, onlineOnly]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    /**
     * A batch is collected with one restaurant OTP, so every order in it must come
     * from the same restaurant. Once the first order is picked, the rest of the
     * board locks down to that restaurant.
     */
    const lockedRestaurantId = useMemo(() => {
        if (selectedOrders.length === 0) return null;
        for (const group of groupedOrders) {
            if (group.orders.some((o) => selectedOrders.includes(o._id))) {
                return String(group.restaurant._id);
            }
        }
        return null;
    }, [selectedOrders, groupedOrders]);

    const toggleOrderSelection = (orderId) => {
        setSelectedOrders((prev) =>
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
        );
    };

    const selectWholeGroup = (group) => {
        const ids = group.orders.map((o) => o._id);
        const allSelected = ids.every((id) => selectedOrders.includes(id));
        setSelectedOrders(allSelected ? [] : ids);
    };

    const handleAssign = async () => {
        if (selectedOrders.length === 0) {
            toast.warning('Select at least one order');
            return;
        }
        if (!selectedDeliveryBoy) {
            toast.warning('Select a delivery partner');
            return;
        }

        try {
            setAssigning(true);
            const res = await adminClient.post('/food/admin/multi-orders/assign', {
                orderIds: selectedOrders,
                deliveryPartnerId: selectedDeliveryBoy,
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Batch assigned');
                setSelectedOrders([]);
                setSelectedDeliveryBoy('');
                refreshAll();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to assign orders');
        } finally {
            setAssigning(false);
        }
    };

    const visibleGroups = groupedOrders.filter(
        (group) => !restaurantFilter || String(group.restaurant._id) === restaurantFilter,
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Multi Order Batches</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Orders the restaurant accepted that no rider picked up. Group them by restaurant and hand
                        them to one partner — they collect all of them with a single pickup OTP.
                    </p>
                </div>
                <button
                    onClick={refreshAll}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-medium text-gray-700"
                >
                    Refresh
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                        <h2 className="text-xl font-semibold text-gray-700">Unassigned orders by restaurant</h2>
                        <select
                            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={restaurantFilter}
                            onChange={(e) => setRestaurantFilter(e.target.value)}
                        >
                            <option value="">All restaurants</option>
                            {groupedOrders.map((group) => (
                                <option key={group.restaurant._id} value={String(group.restaurant._id)}>
                                    {group.restaurant.restaurantName || group.restaurant.name} ({group.orders.length})
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Loading orders...</p>
                    ) : visibleGroups.length === 0 ? (
                        <p className="text-gray-500">Nothing waiting for a rider right now.</p>
                    ) : (
                        <div className="space-y-6">
                            {visibleGroups.map((group) => {
                                const groupId = String(group.restaurant._id);
                                const locked = lockedRestaurantId && lockedRestaurantId !== groupId;

                                return (
                                    <div
                                        key={groupId}
                                        className={`border rounded-xl overflow-hidden ${
                                            locked ? 'border-gray-200 opacity-50' : 'border-gray-300'
                                        }`}
                                    >
                                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center gap-3">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-lg text-gray-800 truncate">
                                                    {group.restaurant.restaurantName || group.restaurant.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {group.orders.length} waiting
                                                    {locked ? ' · locked (batch already started elsewhere)' : ''}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => selectWholeGroup(group)}
                                                disabled={locked}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 whitespace-nowrap"
                                            >
                                                Select all
                                            </button>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {group.orders.map((order) => (
                                                <label
                                                    key={order._id}
                                                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                                                        locked
                                                            ? 'cursor-not-allowed bg-gray-50'
                                                            : 'cursor-pointer hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 w-5 h-5 text-blue-600 rounded"
                                                        disabled={locked}
                                                        checked={selectedOrders.includes(order._id)}
                                                        onChange={() => toggleOrderSelection(order._id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between gap-2">
                                                            <span className="font-semibold text-gray-800">
                                                                #{order.order_id || order.orderId || String(order._id).slice(-6)}
                                                            </span>
                                                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                                                                {order.orderStatus}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            <span className="font-medium">Deliver to:</span>{' '}
                                                            {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {order.userId?.name || 'Customer'}
                                                            {order.userId?.phone ? ` · ${order.userId.phone}` : ''} · waiting{' '}
                                                            {order.waitingSinceMinutes} min
                                                        </p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-96 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Assign batch</h2>

                        <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                className="w-4 h-4"
                                checked={onlineOnly}
                                onChange={(e) => {
                                    setOnlineOnly(e.target.checked);
                                    void fetchDeliveryBoys(e.target.checked);
                                }}
                            />
                            Show online partners only
                        </label>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Delivery partner
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={selectedDeliveryBoy}
                                onChange={(e) => setSelectedDeliveryBoy(e.target.value)}
                            >
                                <option value="">-- Choose a delivery partner --</option>
                                {deliveryBoys.map((boy) => (
                                    <option key={boy._id} value={boy._id}>
                                        {boy.name} ({boy.phone}) {boy.isOnline ? '· Online' : '· Offline'} ·{' '}
                                        {boy.activeOrderCount} active
                                    </option>
                                ))}
                            </select>
                            {deliveryBoys.length === 0 && (
                                <p className="text-xs text-red-600 mt-2">
                                    No {onlineOnly ? 'online ' : ''}partners available.
                                </p>
                            )}
                        </div>

                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                            <p className="font-medium text-lg">{selectedOrders.length} orders selected</p>
                            <p className="text-xs mt-1">
                                All orders must be from one restaurant — the rider collects them with a single
                                pickup OTP, then takes a separate OTP from each customer at drop-off.
                            </p>
                            <p className="text-xs mt-2 text-blue-900/80">
                                While a rider holds a batch they are treated as busy, so auto-dispatch will not
                                offer them new single orders until the batch is finished or released.
                            </p>
                        </div>

                        <button
                            onClick={handleAssign}
                            disabled={selectedOrders.length === 0 || !selectedDeliveryBoy || assigning}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            {assigning ? 'Assigning...' : 'Assign orders'}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700">Batches in progress</h2>
                        {activeBatches.length === 0 ? (
                            <p className="text-sm text-gray-500">No active batches.</p>
                        ) : (
                            <div className="space-y-3">
                                {activeBatches.map((batch) => (
                                    <div key={batch.batchId} className="border border-gray-200 rounded-lg p-3">
                                        <p className="font-semibold text-gray-800 text-sm truncate">
                                            {batch.restaurant?.restaurantName || batch.restaurant?.name || 'Restaurant'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {batch.deliveryPartner?.name || 'Unassigned'} ·{' '}
                                            {batch.deliveredCount}/{batch.totalOrders} delivered
                                        </p>
                                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    batch.progressPercent === 100 ? 'bg-green-600' : 'bg-blue-600'
                                                }`}
                                                style={{ width: `${batch.progressPercent || 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs mt-2">
                                            <span
                                                className={
                                                    batch.pickupVerified ? 'text-green-700' : 'text-orange-600'
                                                }
                                            >
                                                {batch.pickupVerified ? 'Picked up' : 'Awaiting restaurant pickup'}
                                            </span>
                                        </p>
                                        {!batch.pickupVerified && batch.remainingCount > 0 && (
                                            <button
                                                onClick={() => releaseBatch(batch.batchId)}
                                                className="mt-2 w-full text-xs font-semibold text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50"
                                            >
                                                Release back to delivery partners
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MultiOrderManagement;
