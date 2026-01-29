import React, { useEffect, useState, useMemo } from 'react';
import { fetchPurchases, fetchCategories, deletePurchase, updatePurchase } from '../api';
import { ShoppingBag, Filter, ChevronDown, Trash2, Pencil, X, Search } from 'lucide-react';

export function Dashboard() {
    const [purchases, setPurchases] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState('All');
    const [expandedImage, setExpandedImage] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [expandedCategoryId, setExpandedCategoryId] = useState(null);
    const [categoryQuery, setCategoryQuery] = useState('');
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

    const toggleCategory = (categoryId) => {
        setExpandedCategoryId(prev => (prev === categoryId ? null : categoryId));
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

    const filteredGroups = useMemo(() => {
        if (!categoryQuery.trim()) return groupedPurchases;
        const query = categoryQuery.trim().toLowerCase();
        return groupedPurchases.filter(group => group.name.toLowerCase().includes(query));
    }, [groupedPurchases, categoryQuery]);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-900/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 md:p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-100">Price Comparison</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">Best-price snapshot per category. Expand to see everything.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 min-w-[220px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-500" />
                            </div>
                            <input
                                value={categoryQuery}
                                onChange={(e) => setCategoryQuery(e.target.value)}
                                placeholder="Filter categories..."
                                className="w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/60 outline-none text-slate-100 transition-colors"
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-slate-500" />
                            </div>
                            <select
                                value={selectedCat}
                                onChange={(e) => setSelectedCat(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/60 outline-none appearance-none cursor-pointer text-slate-100 transition-colors"
                            >
                                <option value="All">All Categories</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6 items-start">
                {filteredGroups.map(group => {
                    const isExpanded = expandedCategoryId === group.id;
                    const bestProduct = group.products[0];
                    const moreProducts = isExpanded ? group.products.slice(1) : [];

                    return (
                        <div
                            key={group.id}
                            className="rounded-2xl border border-slate-900/80 bg-slate-950/80 shadow-[0_0_0_1px_rgba(15,23,42,0.5)] self-start"
                        >
                            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-900/70">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-100">{group.name}</h3>
                                    <p className="text-[11px] text-slate-500">{group.products.length} items</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(group.id)}
                                    className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-slate-100"
                                >
                                    <span>{isExpanded ? 'Hide' : 'View all'}</span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {bestProduct ? (
                                <div className="px-4 py-4">
                                    <div
                                        onClick={() => toggleCategory(group.id)}
                                        className="rounded-2xl border border-slate-900/80 bg-slate-900/40 hover:bg-slate-900/70 transition-colors cursor-pointer overflow-hidden"
                                    >
                                        <div className="relative h-40 w-full bg-slate-900/70 border-b border-slate-800 overflow-hidden">
                                            {bestProduct.image_path ? (
                                                <img
                                                    src={`http://localhost:8000/uploads/${bestProduct.image_path}`}
                                                    alt={bestProduct.name}
                                                    className="h-full w-full object-cover"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedImage({
                                                            url: `http://localhost:8000/uploads/${bestProduct.image_path}`,
                                                            name: bestProduct.name
                                                        });
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <ShoppingBag size={28} className="text-slate-600" />
                                                </div>
                                            )}
                                            {bestProduct.isBestPrice && (
                                                <span className="absolute top-3 left-3 text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">Best</span>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-base font-semibold text-slate-100 truncate" title={bestProduct.name}>{bestProduct.name}</h4>
                                                    <div className="text-[12px] text-slate-400 mt-1 flex flex-wrap gap-1.5">
                                                        <span>{bestProduct.store}</span>
                                                        <span className="text-slate-600">•</span>
                                                        <span>{bestProduct.quantity} {bestProduct.unit}</span>
                                                        <span className="text-slate-600">•</span>
                                                        <span>{new Date(bestProduct.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-base font-semibold text-slate-100">${bestProduct.price}</div>
                                                    <div className="text-[12px] text-emerald-300">
                                                        {bestProduct.unit_price ? `$${bestProduct.unit_price.toFixed(2)} / ${bestProduct.standard_unit}` : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(bestProduct);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs flex items-center gap-1"
                                                    title="Edit Purchase"
                                                >
                                                    <Pencil size={14} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(bestProduct.id, bestProduct.name);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900/70 text-rose-300 hover:text-rose-200 hover:border-rose-500/40 text-xs flex items-center gap-1"
                                                    title="Delete Purchase"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 space-y-3">
                                            {moreProducts.length > 0 ? (
                                                moreProducts.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="flex items-center gap-3 rounded-xl border border-slate-900/70 bg-slate-900/30 px-3 py-3"
                                                    >
                                                        <div className="h-12 w-12 rounded-lg bg-slate-900/70 border border-slate-800 overflow-hidden flex items-center justify-center">
                                                            {p.image_path ? (
                                                                <img
                                                                    src={`http://localhost:8000/uploads/${p.image_path}`}
                                                                    alt={p.name}
                                                                    className="h-full w-full object-cover"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedImage({
                                                                            url: `http://localhost:8000/uploads/${p.image_path}`,
                                                                            name: p.name
                                                                        });
                                                                    }}
                                                                />
                                                            ) : (
                                                                <ShoppingBag size={14} className="text-slate-600" />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-slate-100 truncate" title={p.name}>{p.name}</span>
                                                                {p.isBestPrice && (
                                                                    <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Best</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1.5">
                                                                <span>{p.store}</span>
                                                                <span className="text-slate-600">•</span>
                                                                <span>{p.quantity} {p.unit}</span>
                                                                <span className="text-slate-600">•</span>
                                                                <span>{new Date(p.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold text-slate-100">${p.price}</div>
                                                            <div className="text-[11px] text-slate-400">
                                                                {p.unit_price ? `$${p.unit_price.toFixed(2)} / ${p.standard_unit}` : '-'}
                                                            </div>
                                                            {p.priceDiff > 0 && (
                                                                <div className="text-[11px] text-rose-300">+{p.priceDiff.toFixed(2)} / {p.standard_unit}</div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1 pl-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(p);
                                                                }}
                                                                className="p-1.5 rounded-md border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-slate-100 hover:border-slate-700"
                                                                title="Edit Purchase"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(p.id, p.name);
                                                                }}
                                                                className="p-1.5 rounded-md border border-slate-800 bg-slate-900/70 text-rose-300 hover:text-rose-200 hover:border-rose-500/40"
                                                                title="Delete Purchase"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-[11px] text-slate-500 px-2 py-2">No more items in this category.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="px-4 py-6 text-center text-sm text-slate-500">No products yet.</div>
                            )}
                        </div>
                    );
                })}

                {filteredGroups.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-slate-900/80 bg-slate-950/80 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900/70 mb-4">
                            <ShoppingBag className="h-6 w-6 text-slate-500" />
                        </div>
                        <h3 className="text-base font-medium text-slate-100">No categories found</h3>
                        <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or adding a new purchase.</p>
                    </div>
                )}
            </div>

            {expandedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setExpandedImage(null)}
                >
                    <div
                        className="relative max-w-4xl w-full bg-slate-950 rounded-2xl shadow-xl overflow-hidden border border-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-800"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                        <div className="bg-slate-950">
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
                        className="relative w-full max-w-2xl bg-slate-950 rounded-2xl shadow-xl p-6 border border-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-100">Edit Product</h3>
                            <button
                                onClick={closeEditModal}
                                className="p-2 rounded-full bg-slate-900 text-slate-300 hover:text-slate-100 border border-slate-800"
                                title="Close"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Product Name</label>
                                    <input
                                        required
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500/60 outline-none bg-slate-900 text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Store</label>
                                    <input
                                        required
                                        name="store"
                                        value={editForm.store}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500/60 outline-none bg-slate-900 text-slate-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                <select
                                    required
                                    name="category_id"
                                    value={editForm.category_id}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-2 border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500/60 outline-none bg-slate-900 text-slate-100"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Price</label>
                                        <input
                                            type="number" step="0.01"
                                            required
                                            name="price"
                                            value={editForm.price}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border border-slate-800 rounded-md bg-slate-950 text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number" step="0.01"
                                            required
                                            name="quantity"
                                            value={editForm.quantity}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border border-slate-800 rounded-md bg-slate-950 text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Unit</label>
                                        <select
                                            name="unit"
                                            value={editForm.unit}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border border-slate-800 rounded-md bg-slate-950 text-slate-100"
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
                                        <label className="block text-xs text-slate-400 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            name="date"
                                            value={editForm.date}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 border border-slate-800 rounded-md bg-slate-950 text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-5 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-60"
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
