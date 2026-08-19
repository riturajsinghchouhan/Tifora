import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Edit3, 
    Trash2, 
    Package, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Utensils, 
    Leaf, 
    Flame, 
    Calendar, 
    Info, 
    AlertCircle, 
    Loader2, 
    X,
    TrendingUp,
    Layers
} from 'lucide-react';
import api from '@food/api';
import { toast } from 'sonner';

const DURATION_PRESETS = [
    { label: '7 Days (Weekly)', days: 7 },
    { label: '15 Days (Bi-weekly)', days: 15 },
    { label: '30 Days (Monthly)', days: 30 },
];

const MEAL_TYPES = [
    { value: 'Morning', label: 'Lunch / Morning', desc: 'Delivered between 11:30 AM - 1:30 PM' },
    { value: 'Evening', label: 'Dinner / Evening', desc: 'Delivered between 7:00 PM - 9:00 PM' },
    { value: 'Both', label: 'Both Lunch & Dinner', desc: 'Two deliveries every day' }
];

export default function TiffinSettings() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deleteConfirmPlan, setDeleteConfirmPlan] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        durationDays: 30,
        mealType: 'Morning',
        price: '',
        itemsDescription: '',
        isVegetarian: true,
        isActive: true,
        imageFile: null,
        items: [] // array of { name: '', quantity: '', imageFile: null, imageUrl: '' }
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await api.get('/food/tiffin/restaurant/plans');
            if (response?.data?.success) {
                setPlans(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch tiffin plans', error);
            // Fallback try legacy route
            try {
                const fallbackRes = await api.get('/restaurant/tiffin/plans');
                if (fallbackRes?.data?.success) {
                    setPlans(fallbackRes.data.data || []);
                }
            } catch (err) {
                toast.error(error?.response?.data?.message || 'Failed to fetch tiffin plans');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingPlan(null);
        setFormData({
            name: '',
            durationDays: 30,
            mealType: 'Morning',
            price: '',
            itemsDescription: '',
            isVegetarian: true,
            isActive: true,
            imageFile: null,
            items: []
        });
        setShowModal(true);
    };

    const handleOpenEditModal = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name || '',
            durationDays: plan.durationDays || 30,
            mealType: plan.mealType || 'Morning',
            price: plan.price || '',
            itemsDescription: plan.itemsDescription || '',
            isVegetarian: plan.isVegetarian !== undefined ? plan.isVegetarian : true,
            isActive: plan.isActive !== undefined ? plan.isActive : true,
            imageFile: null,
            items: Array.isArray(plan.items) ? plan.items.map(item => ({ ...item, imageFile: null, imageUrl: item.image })) : []
        });
        setShowModal(true);
    };

    const handleApplyTemplate = (template) => {
        setEditingPlan(null);
        setFormData(template);
        setShowModal(true);
    };

    const handleSubmitPlan = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Please enter a plan name');
            return;
        }
        if (!formData.price || Number(formData.price) <= 0) {
            toast.error('Please enter a valid plan price');
            return;
        }
        if (!formData.durationDays || Number(formData.durationDays) <= 0) {
            toast.error('Please enter a valid plan duration in days');
            return;
        }

        try {
            setIsSubmitting(true);
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('durationDays', Number(formData.durationDays));
            submitData.append('mealType', formData.mealType);
            submitData.append('price', Number(formData.price));
            submitData.append('itemsDescription', formData.itemsDescription.trim());
            submitData.append('isVegetarian', Boolean(formData.isVegetarian));
            submitData.append('isActive', Boolean(formData.isActive));
            
            if (formData.imageFile) {
                submitData.append('imageFile', formData.imageFile);
            }

            // Append items array and item images
            const itemsToSave = formData.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                image: item.imageUrl || '' // Existing image url if no new file is uploaded
            }));
            submitData.append('items', JSON.stringify(itemsToSave));

            formData.items.forEach((item, index) => {
                if (item.imageFile) {
                    submitData.append(`items[${index}][imageFile]`, item.imageFile);
                }
            });

            if (editingPlan) {
                const res = await api.put(`/food/tiffin/restaurant/plans/${editingPlan._id}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res?.data?.success) {
                    toast.success('Tiffin plan updated successfully! 🎉');
                    setPlans(plans.map(p => p._id === editingPlan._id ? res.data.data : p));
                    setShowModal(false);
                }
            } else {
                const res = await api.post('/food/tiffin/restaurant/plans', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res?.data?.success) {
                    toast.success('Tiffin plan created successfully! 🎉');
                    setPlans([res.data.data, ...plans]);
                    setShowModal(false);
                }
            }
        } catch (error) {
            console.error('Save tiffin plan error:', error);
            toast.error(error?.response?.data?.message || 'Failed to save tiffin plan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (plan) => {
        try {
            const updatedStatus = !plan.isActive;
            const res = await api.put(`/food/tiffin/restaurant/plans/${plan._id}`, {
                isActive: updatedStatus
            });
            if (res?.data?.success) {
                toast.success(`Plan marked as ${updatedStatus ? 'Active' : 'Inactive'}`);
                setPlans(plans.map(p => p._id === plan._id ? { ...p, isActive: updatedStatus } : p));
            }
        } catch (error) {
            toast.error('Failed to update plan status');
        }
    };

    const handleDeletePlan = async () => {
        if (!deleteConfirmPlan) return;
        try {
            setDeletingId(deleteConfirmPlan._id);
            const res = await api.delete(`/food/tiffin/restaurant/plans/${deleteConfirmPlan._id}`);
            if (res?.data?.success) {
                toast.success('Tiffin plan deleted successfully');
                setPlans(plans.filter(p => p._id !== deleteConfirmPlan._id));
                setDeleteConfirmPlan(null);
            }
        } catch (error) {
            console.error('Delete plan error:', error);
            toast.error(error?.response?.data?.message || 'Failed to delete plan');
        } finally {
            setDeletingId(null);
        }
    };

    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.isActive).length;
    const vegPlans = plans.filter(p => p.isVegetarian).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-gray-100/30 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Banner */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    
                    <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tiffin Subscription Plans</h1>
                                <p className="text-sm text-gray-500">Provide monthly & weekly daily meal packages to your regular customers</p>
                            </div>
                        </div>

                        {/* Quick Stats Badges */}
                        {totalPlans > 0 && (
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {activePlans} Active Plans
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                                    <Leaf className="w-3.5 h-3.5" />
                                    {vegPlans} Veg Plans
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                                    <Layers className="w-3.5 h-3.5" />
                                    {totalPlans} Total Packages
                                </span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleOpenCreateModal}
                        className="relative z-10 inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all duration-200 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Plan
                    </button>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-sm font-medium text-gray-500">Loading your tiffin plans...</p>
                    </div>
                ) : plans.length === 0 ? (
                    /* Empty State with Quick Templates */
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
                        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                            <Utensils className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Tiffin Plans Created Yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                            Create your first subscription package to start receiving automated recurring daily lunch or dinner orders.
                        </p>

                        <div className="max-w-3xl mx-auto text-left mb-8">
                            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Or start with a popular template:
                            </div>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                <button
                                    onClick={() => handleApplyTemplate({
                                        name: 'Standard Veg Thali (Lunch)',
                                        durationDays: 30,
                                        mealType: 'Morning',
                                        price: 2499,
                                        itemsDescription: '4 Butter Rotis, Dal Tadka, Seasonal Sabzi, Steamed Rice, Salad, Pickle & Papad',
                                        isVegetarian: true,
                                        isActive: true
                                    })}
                                    className="p-4 rounded-xl border border-gray-200 hover:border-orange-400 bg-gray-50/50 hover:bg-orange-50/20 text-left transition group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition">Standard Veg Thali</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">Veg</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">30 Days • ₹2,499 (₹83/day)</p>
                                    <span className="text-xs font-semibold text-orange-600 group-hover:underline">Use this template →</span>
                                </button>

                                <button
                                    onClick={() => handleApplyTemplate({
                                        name: 'Executive Deluxe Box',
                                        durationDays: 30,
                                        mealType: 'Both',
                                        price: 4999,
                                        itemsDescription: 'Lunch & Dinner: 4 Chapatis, Paneer/Veg Dish, Dal Fry, Jeera Rice, Sweet/Dessert, Salad',
                                        isVegetarian: true,
                                        isActive: true
                                    })}
                                    className="p-4 rounded-xl border border-gray-200 hover:border-orange-400 bg-gray-50/50 hover:bg-orange-50/20 text-left transition group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition">Executive Lunch+Dinner</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Both</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">30 Days • ₹4,999 (₹166/day)</p>
                                    <span className="text-xs font-semibold text-orange-600 group-hover:underline">Use this template →</span>
                                </button>

                                <button
                                    onClick={() => handleApplyTemplate({
                                        name: 'Weekly Trial Pack (Lunch)',
                                        durationDays: 7,
                                        mealType: 'Morning',
                                        price: 699,
                                        itemsDescription: '4 Fresh Rotis, Dal, 1 Special Sabzi, Rice, Salad & Sweet on Sunday',
                                        isVegetarian: true,
                                        isActive: true
                                    })}
                                    className="p-4 rounded-xl border border-gray-200 hover:border-orange-400 bg-gray-50/50 hover:bg-orange-50/20 text-left transition group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition">7-Day Weekly Trial</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">Trial</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">7 Days • ₹699 (₹99/day)</p>
                                    <span className="text-xs font-semibold text-orange-600 group-hover:underline">Use this template →</span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 transition"
                        >
                            <Plus className="w-5 h-5" />
                            Create Custom Plan
                        </button>
                    </div>
                ) : (
                    /* Plans List Grid */
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {plans.map(plan => {
                            const perDayCost = Math.round(plan.price / (plan.durationDays || 1));
                            return (
                                <div 
                                    key={plan._id} 
                                    className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                                        plan.isActive 
                                            ? 'border-gray-200/90 hover:border-orange-300 hover:shadow-md' 
                                            : 'border-gray-200/50 opacity-75 bg-gray-50/40'
                                    }`}
                                >
                                    {/* Top colored accent bar */}
                                    <div className={`h-1.5 w-full ${plan.isVegetarian ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        {/* Card Header */}
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div>
                                                    <h3 className="font-extrabold text-gray-900 text-lg leading-tight line-clamp-1">
                                                        {plan.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                            plan.isVegetarian 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {plan.isVegetarian ? (
                                                                <Leaf className="w-3 h-3 text-emerald-600" />
                                                            ) : (
                                                                <Flame className="w-3 h-3 text-rose-600" />
                                                            )}
                                                            {plan.isVegetarian ? 'Pure Veg' : 'Non-Veg'}
                                                        </span>

                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                            <Clock className="w-3 h-3 text-gray-500" />
                                                            {plan.mealType === 'Morning' ? 'Lunch' : plan.mealType === 'Evening' ? 'Dinner' : 'Lunch & Dinner'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Price block */}
                                                <div className="text-right shrink-0">
                                                    <div className="text-2xl font-black text-gray-900 tracking-tight">
                                                        ₹{plan.price}
                                                    </div>
                                                    <div className="text-[11px] font-semibold text-orange-600">
                                                        ~₹{perDayCost}/day
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Duration pill */}
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 bg-gray-50 px-2.5 py-1 rounded-lg w-fit">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>Duration: <strong className="text-gray-800">{plan.durationDays} Days</strong></span>
                                            </div>

                                            {/* Items included */}
                                            <div className="bg-orange-50/40 border border-orange-100/60 rounded-xl p-3">
                                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                    What's Included:
                                                </div>
                                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                                                    {plan.itemsDescription || 'Standard homestyle meal with fresh rotis, dal, sabzi, and rice.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Card Footer Actions */}
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                            {/* Status Switch */}
                                            <button
                                                onClick={() => handleToggleStatus(plan)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                                    plan.isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {plan.isActive ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                    <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </button>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleOpenEditModal(plan)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                                                    title="Edit Plan"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmPlan(plan)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                                    title="Delete Plan"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create / Edit Plan Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingPlan ? 'Edit Tiffin Plan' : 'Create New Tiffin Plan'}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {editingPlan ? 'Update plan pricing, meal items, or status' : 'Fill in the details below to launch a new meal subscription'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmitPlan} className="p-6 space-y-5">
                            <div className="grid md:grid-cols-2 gap-5">
                                {/* Plan Name */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Plan Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Standard Veg Thali, Executive Non-Veg Box"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                                    />
                                </div>
                                {/* Plan Main Image */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Plan Cover Image
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setFormData({ ...formData, imageFile: e.target.files[0] })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                    />
                                </div>
                            </div>

                            {/* Dietary Preference */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                    Dietary Preference <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isVegetarian: true })}
                                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-sm transition ${
                                            formData.isVegetarian 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' 
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Leaf className="w-4 h-4 text-emerald-600" />
                                        Pure Vegetarian
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isVegetarian: false })}
                                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-sm transition ${
                                            !formData.isVegetarian 
                                                ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' 
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Flame className="w-4 h-4 text-rose-600" />
                                        Non-Vegetarian
                                    </button>
                                </div>
                            </div>

                            {/* Meal Type Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                                    Meal Delivery Time <span className="text-red-500">*</span>
                                </label>
                                <div className="grid sm:grid-cols-3 gap-2.5">
                                    {MEAL_TYPES.map(mt => (
                                        <button
                                            key={mt.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, mealType: mt.value })}
                                            className={`p-3 rounded-xl border text-left transition ${
                                                formData.mealType === mt.value
                                                    ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="font-bold text-xs">{mt.label}</div>
                                            <div className="text-[10px] text-gray-500 mt-1 leading-tight">{mt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Plan Duration (Days) <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {DURATION_PRESETS.map(preset => (
                                        <button
                                            key={preset.days}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, durationDays: preset.days })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                                formData.durationDays === preset.days
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                                    : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    required
                                    placeholder="Or enter custom days (e.g. 15, 60)"
                                    value={formData.durationDays}
                                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Total Subscription Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    {formData.price && formData.durationDays > 0 && (
                                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                            ₹{Math.round(formData.price / formData.durationDays)} / day
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="e.g. 2499"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition font-semibold"
                                    />
                                </div>
                            </div>

                            {/* Items Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Short Menu Description <span className="text-gray-400 font-normal">(Shown as subtext)</span>
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Pure veg thali with rotating daily items."
                                    value={formData.itemsDescription}
                                    onChange={(e) => setFormData({ ...formData, itemsDescription: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                                />
                            </div>

                            {/* Dynamic Items Array */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Individual Meal Items
                                        </label>
                                        <span className="text-[11px] text-gray-500">List specific items (e.g. Roti, Dal) with optional images.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            items: [...formData.items, { name: '', quantity: '', imageFile: null, imageUrl: '' }]
                                        })}
                                        className="inline-flex items-center gap-1.5 bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Item
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.length === 0 ? (
                                        <div className="text-center py-4 text-xs font-medium text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                            No items added. Click "Add Item" to start.
                                        </div>
                                    ) : formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm relative group">
                                            <input
                                                type="text"
                                                placeholder="Item Name (e.g. Dal Tadka)"
                                                value={item.name}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].name = e.target.value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                className="flex-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Qty (e.g. 1 Bowl)"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].quantity = e.target.value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                className="w-full sm:w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                                            />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].imageFile = e.target.files[0];
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                className="w-full sm:w-48 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-700 cursor-pointer"
                                                title="Upload item image"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newItems = [...formData.items];
                                                    newItems.splice(index, 1);
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                className="absolute -top-2 -right-2 sm:relative sm:top-auto sm:right-auto p-1.5 bg-white sm:bg-transparent text-red-400 hover:text-red-600 rounded-full border sm:border-0 border-gray-200 shadow-sm sm:shadow-none hover:bg-red-50 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <div className="text-xs font-bold text-gray-900">Make Plan Active Immediately</div>
                                    <div className="text-[11px] text-gray-500">Customers will be able to discover and purchase this plan right away</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingPlan ? 'Save Changes' : 'Create Plan'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-md text-center space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Delete Tiffin Plan?</h3>
                        <p className="text-sm text-gray-500">
                            Are you sure you want to delete <strong className="text-gray-900">"{deleteConfirmPlan.name}"</strong>? Existing active subscriptions won't be disrupted, but new users cannot purchase it.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={() => setDeleteConfirmPlan(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePlan}
                                disabled={deletingId === deleteConfirmPlan._id}
                                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-red-600/20 transition disabled:opacity-50"
                            >
                                {deletingId === deleteConfirmPlan._id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Yes, Delete Plan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
