import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { fetchImageMetadata } from '../api';

export function ImageTest() {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            setMetadata(null);
            setError('');
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        setError('');
        setLoading(true);
        fetchImageMetadata(file)
            .then((data) => {
                setMetadata(data);
            })
            .catch((err) => {
                setMetadata(null);
                setError(err.message || 'Failed to load metadata');
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0] || null;
        setFile(selected);
    };

    const clearFile = () => {
        setFile(null);
        setMetadata(null);
        setError('');
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-900/80 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-100">Image Metadata Test</h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Upload an image to preview it and view basic metadata.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="rounded-2xl border border-slate-900/80 bg-slate-950/80 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]">
                    <label className="text-sm text-slate-300 font-medium">Upload Image</label>
                    <div className="mt-3 relative border-2 border-dashed border-slate-800 rounded-xl h-48 flex items-center justify-center bg-slate-900/40">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {!previewUrl ? (
                            <div className="text-center text-slate-500">
                                <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                                <span className="text-sm">Click to upload</span>
                            </div>
                        ) : (
                            <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-2" />
                        )}
                    </div>

                    {file && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-slate-500 truncate">{file.name}</span>
                            <button
                                type="button"
                                onClick={clearFile}
                                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
                            >
                                <X size={14} />
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-900/80 bg-slate-950/80 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]">
                    <h3 className="text-sm font-semibold text-slate-200">Metadata</h3>
                    {loading && (
                        <div className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Reading metadata...
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 text-sm text-rose-300">{error}</div>
                    )}
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">File name</span>
                            <span className="truncate ml-4">{metadata?.file?.name || file?.name || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Type</span>
                            <span>{metadata?.file?.type || file?.type || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Size</span>
                            <span>{metadata?.file?.size ? `${(metadata.file.size / 1024).toFixed(1)} KB` : (file ? `${(file.size / 1024).toFixed(1)} KB` : '-')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Last modified</span>
                            <span>{file ? new Date(file.lastModified).toLocaleString() : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Dimensions</span>
                            <span>{metadata?.image ? `${metadata.image.width} x ${metadata.image.height}` : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Format</span>
                            <span>{metadata?.image?.format || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Mode</span>
                            <span>{metadata?.image?.mode || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Location</span>
                            <span>
                                {metadata?.location
                                    ? `${metadata.location.latitude.toFixed(6)}, ${metadata.location.longitude.toFixed(6)}`
                                    : '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Place</span>
                            <span className="text-right ml-4">
                                {metadata?.place?.display_name || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Store (best guess)</span>
                            <span className="text-right ml-4">
                                {metadata?.place?.store_guess || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Photo Taken</span>
                            <span className="text-right ml-4">
                                {metadata?.taken_at ? new Date(metadata.taken_at).toLocaleString() : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">EXIF</div>
                        <pre className="text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 rounded-lg p-3 overflow-auto max-h-64">
                            {metadata?.exif ? JSON.stringify(metadata.exif, null, 2) : '-'}
                        </pre>
                    </div>

                    <div className="mt-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">GPS</div>
                        <pre className="text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 rounded-lg p-3 overflow-auto max-h-64">
                            {metadata?.gps ? JSON.stringify(metadata.gps, null, 2) : '-'}
                        </pre>
                    </div>

                </div>
            </div>
        </div>
    );
}
