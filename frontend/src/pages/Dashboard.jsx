import React, { useEffect, useState, useMemo } from 'react';
import { fetchPurchases, fetchCategories, deletePurchase, updatePurchase } from '../api';
import { ShoppingBag, Filter, ChevronDown, Trash2, Pencil, X } from 'lucide-react';

export function Dashboard() {
    const [purchases, setPurchases] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState('All');
    const [expandedImage, setExpandedImage] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        store: '',
        date: '',
        price: '',
        quantity: '',
        unit: 'g',
        category_id: ''
    });
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        return Promise.all([fetchPurchases(), fetchCategories()])
            .then(([purchasesData, categoriesData]) => {
                setPurchases(purchasesData || []);
                setCategories(categoriesData || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deletePurchase(id);
                setPurchases(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                alert('Failed to delete purchase');
            }
        }
    };

    const openEditModal = (purchase) => {
        setEditingProduct(purchase);
        setEditForm({
            name: purchase.name || '',
            store: purchase.store || '',
            date: purchase.date ? new Date(purchase.date).toISOString().split('T')[0] : '',
            price: purchase.price ?? '',
            quantity: purchase.quantity ?? '',
            unit: purchase.unit || 'g',
            category_id: purchase.category_id ?? ''
        });
    };

    const closeEditModal = () => {
        setEditingProduct(null);
        setSavingEdit(false);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;
        setSavingEdit(true);

        try {
            const data = new FormData();
            Object.keys(editForm).forEach((key) => {
                data.append(key, editForm[key]);
            });

            await updatePurchase(editingProduct.id, data);
            await loadData();
            closeEditModal();
        } catch (error) {
            alert(`Failed to update purchase: ${error.message}`);
            setSavingEdit(false);
        }
    };

    // Grouping and Sorting Logic
    const groupedPurchases = useMemo(() => {
        // 1. Filter
        let filtered = purchases;
        if (selectedCat !== 'All') {
            filtered = purchases.filter(p => p.category_id === parseInt(selectedCat));
        }

        // 2. Group
        const groups = {};
        filtered.forEach(p => {
            const catId = p.category_id || 'uncat';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push(p);
        });

        // 3. Process (Sort & Diff)
        return Object.keys(groups).map(catId => {
            const catName = categories.find(c => c.id === parseInt(catId))?.name || 'Uncategorized';
            const products = groups[catId];

            // Sort by unit_price ascending (nulls last)
            const sorted = [...products].sort((a, b) => {
                const pA = a.unit_price || Infinity;
                const pB = b.unit_price || Infinity;
                return pA - pB;
            });

            // Calculate diffs
            const bestPrice = sorted[0]?.unit_price || 0;
            const processedProducts = sorted.map((p, index) => ({
                ...p,
                isBestPrice: index === 0 && p.unit_price > 0 && products.length > 0,
                priceDiff: (p.unit_price && index > 0) ? p.unit_price - bestPrice : 0
            }));

            return {
                id: catId,
                name: catName,
                products: processedProducts
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [purchases, categories, selectedCat]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Price Comparison</h2>

                {/* Category Filter */}
                <div className="relative min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                        value={selectedCat}
                        onChange={(e) => setSelectedCat(e.target.value)}
                        className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                    >
                        <option value="All">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Groups Area */}
            <div className="space-y-12">
                {groupedPurchases.map(group => (
                    <div key={group.id} className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                            {group.name} <span className="text-sm font-normal text-slate-400 ml-2">({group.products.length} items)</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.products.map(p => (
                                <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all group flex flex-col relative ${p.isBestPrice ? 'border-green-400 ring-1 ring-green-400 shadow-green-100 dark:shadow-none' : 'border-slate-100 dark:border-slate-700'}`}>

                                    {/* Best Price Badge */}
                                    {p.isBestPrice && (
                                        <div className="absolute top-0 right-0 z-10 bg-green-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                                            Best Price
                                        </div>
                                    )}

                                    <div className="relative h-48 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                        {p.image_path ? (
                                            <img
                                                src={`http://localhost:8000/uploads/${p.image_path}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                                alt={p.name}
                                                onClick={() => setExpandedImage({
                                                    url: `http://localhost:8000/uploads/${p.image_path}`,
                                                    name: p.name
                                                })}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                                <ShoppingBag size={32} className="mb-2 opacity-50" />
                                                <span className="text-xs">No image</span>
                                            </div>
                                        )}

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(p.id, p.name)}
                                            className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Delete Purchase"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {/* Edit Button */}
                                        <button
                                            onClick={() => openEditModal(p)}
                                            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full text-slate-600 hover:text-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Edit Purchase"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1" title={p.name}>{p.name}</h4>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">${p.price}</span>
                                        </div>

                                        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 flex-1">
                                            <div className="flex justify-between">
                                                <span>Store:</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{p.store}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Size:</span>
                                                <span>{p.quantity} {p.unit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Date:</span>
                                                <span>{new Date(p.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className={`mt-4 pt-3 border-t flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 -mx-4 -mb-4 px-4 py-3 ${p.isBestPrice ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'border-slate-100 dark:border-slate-700'}`}>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Unit Price</span>
                                            <div className="flex flex-col items-end">
                                                <span className={`font-bold ${p.isBestPrice ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {p.unit_price ? `$${p.unit_price.toFixed(2)} / ${p.standard_unit}` : '-'}
                                                </span>
                                                {p.priceDiff > 0 && (
                                                    <span className="text-xs text-red-500 font-medium">
                                                        +{p.priceDiff.toFixed(2)} / {p.standard_unit}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {groupedPurchases.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <ShoppingBag className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No products found</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Try selecting a different category or log a new purchase.</p>
                    </div>
                )}
            </div>

            {expandedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setExpandedImage(null)}
                >
                    <div
                        className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                        <div className="bg-slate-900">
                            <img
                                src={expandedImage.url}
                                alt={expandedImage.name}
                                className="w-full max-h-[80vh] object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}

            {editingProduct && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={closeEditModal}
                >
                    <div
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Product</h3>
                            <button
                                onClick={closeEditModal}
                                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-slate-900"
                                title="Close"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                                    <input
                                        required
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                                    <input
                                        required
                                        name="store"
                                        value={editForm.store}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                <select
                                    required
                                    name="category_id"
                                    value={editForm.category_id}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price</label>
                                        <input
                                            type="number" step="0.01"
                                            required
                                            name="price"
                                            value={editForm.price}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                                        <input
                                            type="number" step="0.01"
                                            required
                                            name="quantity"
                                            value={editForm.quantity}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                                        <select
                                            name="unit"
                                            value={editForm.unit}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        >
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="L">L</option>
                                            <option value="oz">oz</option>
                                            <option value="lb">lb</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            name="date"
                                            value={editForm.date}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
