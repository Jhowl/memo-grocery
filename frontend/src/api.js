const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export async function fetchPurchases(categoryId = null) {
    let url = `${API_URL}/purchases/`;
    if (categoryId) url += `?category_id=${categoryId}`;
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
