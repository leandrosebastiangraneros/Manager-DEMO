/**
 * useData — Generic data fetching hooks with error toasts and retry.
 *
 * Provides useFetch (generic), useProducts, useCategories, useFinances, useExpenses.
 * All hooks automatically include auth headers.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL, authHeaders } from '../config';

/**
 * Generic fetch hook with automatic retry and error toasts.
 *
 * @param {string} endpoint - API path (without base URL)
 * @param {object} options - { skip, autoRetry, retries, dependencies }
 */
export function useFetch(endpoint, options = {}) {
    const { skip = false, autoRetry = true, retries = 1, dependencies = [] } = options;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!skip);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (attempt = 0) => {
        if (skip) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                headers: authHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(errBody.detail || `Error ${res.status}`);
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            if (autoRetry && attempt < retries) {
                // Exponential backoff: 500ms, 1000ms
                const delay = 500 * Math.pow(2, attempt);
                setTimeout(() => fetchData(attempt + 1), delay);
                return;
            }
            setError(err.message);
            toast.error(`Error cargando datos`, {
                description: err.message,
                duration: 4000,
            });
        } finally {
            setLoading(false);
        }
    }, [endpoint, skip, autoRetry, retries]);

    useEffect(() => {
        fetchData();
    }, [fetchData, ...dependencies]);

    return { data, loading, error, refetch: () => fetchData(0) };
}


/**
 * Fetch all products (stock items).
 */
export function useProducts() {
    const { data, loading, error, refetch } = useFetch('/stock');
    return {
        products: data || [],
        loading,
        error,
        refetch,
    };
}


/**
 * Fetch categories, optionally filtered by type.
 */
export function useCategories(type = null) {
    const endpoint = type ? `/categories?type=${type}` : '/categories';
    const { data, loading, error, refetch } = useFetch(endpoint);
    return {
        categories: data || [],
        loading,
        error,
        refetch,
    };
}


/**
 * Fetch financial summary for a given month/year.
 */
export function useFinances(month, year) {
    const endpoint = `/finances/summary?month=${month}&year=${year}`;
    const { data, loading, error, refetch } = useFetch(endpoint, {
        dependencies: [month, year],
    });
    return {
        finances: data || { total_income: 0, total_expense: 0, net_balance: 0 },
        loading,
        error,
        refetch,
    };
}


/**
 * Fetch expenses for a given month/year.
 */
export function useExpenses(month, year) {
    const endpoint = `/expenses?month=${month}&year=${year}`;
    const { data, loading, error, refetch } = useFetch(endpoint, {
        dependencies: [month, year],
    });
    return {
        expenses: data || [],
        loading,
        error,
        refetch,
    };
}
