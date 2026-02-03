import React, { useEffect, useState } from 'react';
import { fetchPurchases, fetchCategories, UPLOADS_URL } from '../api';
import { Filter, ShoppingBag } from 'lucide-react';

export function PurchaseList() {
    const [purchases, setPurchases] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCat, setSelectedCat] = useState('');

    useEffect(() => {
        fetchCategories().then(setCategories).catch(console.error);
        loadPurchases();
    }, []);

    useEffect(() => {
        loadPurchases();
    }, [selectedCat]);

    function loadPurchases() {
        fetchPurchases(selectedCat || null).then(setPurchases).catch(console.error);
    }

    const formatImageLocation = (purchase) => {
        if (purchase.image_location_lat == null || purchase.image_location_lon == null) return '-';
        return `${purchase.image_location_lat.toFixed(6)}, ${purchase.image_location_lon.toFixed(6)}`;
    };

    const formatImageTakenAt = (value) => {
        if (!value) return '-';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">History & Compare</h2>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                    <Filter size={18} className="text-slate-400 ml-2" />
                    <select
                        value={selectedCat}
                        onChange={(e) => setSelectedCat(e.target.value)}
                        className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 text-sm min-w-[150px] cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-xs border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">Store</th>
                                <th className="p-4">Categories</th>
                                <th className="p-4">Unit Price (Standard)</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Image Store</th>
                                <th className="p-4">Image Place</th>
                                <th className="p-4">Image Location</th>
                                <th className="p-4">Photo Taken</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {purchases.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800 dark:text-white flex items-center gap-3">
                                        <div className="h-8 w-8 bg-slate-100 dark:bg-slate-700 rounded flex-shrink-0 overflow-hidden text-slate-400 dark:text-slate-500 flex items-center justify-center">
                                            {p.image_path ? (
                                                <img src={`${UPLOADS_URL}/${p.image_path}`} className="h-full w-full object-cover" />
                                            ) : (
                                                <ShoppingBag size={14} />
                                            )}
                                        </div>
                                        {p.name}
                                    </td>
                                    <td className="p-4">{p.store}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(p.categories && p.categories.length > 0
                                                ? p.categories
                                                : p.category
                                                    ? [p.category]
                                                    : []
                                            ).map((c) => (
                                                <span
                                                    key={`${p.id}-${c.id}`}
                                                    className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-200"
                                                >
                                                    {c.name}
                                                </span>
                                            ))}
                                            {(!p.categories || p.categories.length === 0) && !p.category && (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                                        {p.unit_price ? `$${p.unit_price.toFixed(2)} / ${p.standard_unit}` : '-'}
                                    </td>
                                    <td className="p-4 text-slate-800 dark:text-white">${p.price}</td>
                                    <td className="p-4 text-xs text-slate-400 dark:text-slate-500">{p.date.split('T')[0]}</td>
                                    <td className="p-4">{p.image_store_guess || '-'}</td>
                                    <td className="p-4 max-w-[260px] truncate" title={p.image_place || ''}>
                                        {p.image_place || '-'}
                                    </td>
                                    <td className="p-4">{formatImageLocation(p)}</td>
                                    <td className="p-4 text-xs text-slate-400 dark:text-slate-500">{formatImageTakenAt(p.image_taken_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {purchases.length === 0 && (
                        <div className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">
                            No purchases found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
