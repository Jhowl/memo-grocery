// API base for the backend.
// In production behind nginx (memogrocery.home), we proxy the API at /api.
// In dev, you can still override with VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

// Where images are served from. Behind nginx we proxy /uploads.
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${window.location.origin}/uploads`;

export { API_URL, UPLOADS_URL };

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/categories/`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
}

export async function createCategory(name) {
    const res = await fetch(`${API_URL}/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
}

export async function createPurchase(formData) {
    const res = await fetch(`${API_URL}/purchases/`, {
        method: 'POST',
        body: formData, // FormData handles Content-Type multipart/form-data
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail
            ? (Array.isArray(errorData.detail)
                ? errorData.detail.map(e => `${e.loc.join('.')} - ${e.msg}`).join(', ')
                : errorData.detail)
            : 'Failed to create purchase';
        throw new Error(errorMessage);
    }
    return res.json();
}

export async function fetchPurchases(categoryIdOrOpts = null, maybeOpts = null) {
    // Backwards compatible:
    // - fetchPurchases() -> all
    // - fetchPurchases(categoryId)
    // New:
    // - fetchPurchases({ categoryId, includeReference })
    let categoryId = null;
    let includeReference = false;

    if (typeof categoryIdOrOpts === 'object' && categoryIdOrOpts !== null) {
        categoryId = categoryIdOrOpts.categoryId ?? null;
        includeReference = !!categoryIdOrOpts.includeReference;
    } else {
        categoryId = categoryIdOrOpts;
        includeReference = !!(maybeOpts && maybeOpts.includeReference);
    }

    const params = new URLSearchParams();
    if (categoryId) params.set('category_id', categoryId);
    if (includeReference) params.set('include_reference', 'true');

    const qs = params.toString();
    const url = `${API_URL}/purchases/${qs ? `?${qs}` : ''}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch purchases');
    return res.json();
}

export async function deletePurchase(id) {
    const res = await fetch(`${API_URL}/purchases/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete purchase');
    return res.json();
}

export async function deleteCategory(id) {
    const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to delete category';
        throw new Error(errorMessage);
    }
    return res.json();
}

export async function updatePurchase(id, formData) {
    const res = await fetch(`${API_URL}/purchases/${id}`, {
        method: 'PUT',
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail
            ? (Array.isArray(errorData.detail)
                ? errorData.detail.map(e => `${e.loc.join('.')} - ${e.msg}`).join(', ')
                : errorData.detail)
            : 'Failed to update purchase';
        throw new Error(errorMessage);
    }
    return res.json();
}

export async function fetchImageMetadata(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/images/metadata`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to read image metadata';
        throw new Error(errorMessage);
    }
    return res.json();
}
