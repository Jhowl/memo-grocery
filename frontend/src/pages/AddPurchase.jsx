import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { fetchCategories, createCategory, createPurchase } from '../api';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export function AddPurchase() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [showNewCatInput, setShowNewCatInput] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        store: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        quantity: '',
        unit: 'g',
        category_id: '',
        file: null
    });

    const [preview, setPreview] = useState(null);

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        try {
            const data = await fetchCategories();
            setCategories(data);
        } catch (e) {
            console.error(e);
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, file }));
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleCreateCategory = async () => {
        if (!newCatName) return;
        try {
            const cat = await createCategory(newCatName);
            setCategories([...categories, cat]);
            setFormData(prev => ({ ...prev, category_id: cat.id }));
            setNewCatName('');
            setShowNewCatInput(false);
        } catch (e) {
            alert('Failed to create category');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'file' && formData[key]) {
                    data.append('file', formData[key]);
                } else if (key !== 'file') {
                    data.append(key, formData[key]);
                }
            });

            await createPurchase(data);
            navigate('/purchases');
        } catch (e) {
            alert(`Failed to save purchase: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const unitPricePreview = useMemo(() => {
        if (!formData.price || !formData.quantity) return null;
        const price = parseFloat(formData.price);
        const qty = parseFloat(formData.quantity);
        if (!price || !qty) return null;

        // Simple client-side estimation for quick feedback
        // The real calc is on server, but this helps user
        let unit = formData.unit.toLowerCase();
        let normQty = qty;
        let stdUnit = unit;

        if (['g', 'ml'].includes(unit)) {
            normQty = qty / 1000;
            stdUnit = unit === 'g' ? 'kg' : 'L';
        } else if (unit === 'kg') {
            stdUnit = 'kg';
        } else if (unit === 'l') {
            stdUnit = 'L';
        }

        const val = price / normQty;
        return `${val.toFixed(2)} / ${stdUnit}`;
    }, [formData.price, formData.quantity, formData.unit]);

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Log Purchase</h2>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6 border border-slate-100 dark:border-slate-700 transition-colors">
                {/* Name & Store */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                        <input
                            required
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g. Soy Sauce"
                            className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                        <input
                            required
                            name="store"
                            value={formData.store}
                            onChange={handleInputChange}
                            placeholder="e.g. Walmart"
                            className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <div className="flex gap-2">
                        {!showNewCatInput ? (
                            <select
                                required
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleInputChange}
                                className="flex-1 px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        ) : (
                            <input
                                autoFocus
                                placeholder="New Category Name"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                className="flex-1 px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (showNewCatInput) handleCreateCategory();
                                else setShowNewCatInput(true);
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
                        >
                            {showNewCatInput ? 'Save' : 'New'}
                        </button>
                        {showNewCatInput && (
                            <button
                                type="button"
                                onClick={() => setShowNewCatInput(false)}
                                className="px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >Cancel</button>
                        )}
                    </div>
                </div>

                {/* Price & Quantity */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Pricing Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price</label>
                            <input
                                type="number" step="0.01"
                                required
                                name="price"
                                value={formData.price} onChange={handleInputChange}
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                            <input
                                type="number" step="0.01"
                                required
                                name="quantity"
                                value={formData.quantity} onChange={handleInputChange}
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                                placeholder="500"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                            <select
                                name="unit"
                                value={formData.unit} onChange={handleInputChange}
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                            >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="L">L</option>
                                <option value="oz">oz</option>
                                <option value="lb">lb</option>
                            </select>
                        </div>
                        <div className="col-span-1 flex flex-col justify-end">
                            <div className="text-sm text-right">
                                <span className="block text-xs text-gray-400 dark:text-gray-500">Unit Price</span>
                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                    {unitPricePreview ? unitPricePreview : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date & Image */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date</label>
                        <input
                            type="date"
                            required
                            name="date"
                            value={formData.date} onChange={handleInputChange}
                            className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Receipt / Product Image</label>
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg h-32 flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group bg-gray-50 dark:bg-slate-800/50">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {preview ? (
                                <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-lg p-1" />
                            ) : (
                                <div className="text-center group-hover:text-blue-500 dark:group-hover:text-blue-400">
                                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-1" />
                                    <span className="text-xs text-gray-500 dark:text-slate-400">Click to upload</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin" size={20} />}
                    Save Purchase
                </button>

            </form>
        </div>
    );
}
