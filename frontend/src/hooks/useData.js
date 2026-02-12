/**
 * Custom hooks for data fetching — centralize API calls and state management.
 * Use these hooks instead of inline fetch logic in components.
 */
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

/**
 * Generic data fetcher hook.
 * @param {string} endpoint - API endpoint path (e.g., "/stock")
 * @param {object} options - { autoFetch, defaultValue, deps }
 */
export function useFetch(endpoint, { autoFetch = true, defaultValue = [], deps = [] } = {}) {
    const [data, setData] = useState(defaultValue);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (queryParams = {}) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams(queryParams).toString();
            const url = `${API_URL}${endpoint}${params ? `?${params}` : ''}`;
            const res = await fetch(url);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Error ${res.status}`);
            }
            const result = await res.json();
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            console.error(`[useFetch ${endpoint}]`, err);
            return defaultValue;
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    useEffect(() => {
        if (autoFetch) fetchData();
    }, [autoFetch, ...deps]);

    return { data, loading, error, refetch: fetchData, setData };
}

/**
 * Hook for products/stock data.
 */
export function useProducts() {
    const { data: products, loading, error, refetch, setData } = useFetch('/stock');

    const availableProducts = products.filter(p => p.status === 'AVAILABLE');
    const lowStockProducts = products.filter(p => p.quantity <= (p.min_stock_alert || 5));

    return {
        products,
        availableProducts,
        lowStockProducts,
        loading,
        error,
        refetch,
        setProducts: setData,
    };
}

/**
 * Hook for categories data.
 */
export function useCategories() {
    return useFetch('/categories');
}

/**
 * Hook for monthly finances data.
 */
export function useFinances(month, year) {
    const { data, loading, error, refetch } = useFetch(
        '/finances/summary',
        { autoFetch: false, defaultValue: { total_income: 0, total_expense: 0, net_balance: 0 } }
    );

    useEffect(() => {
        if (month && year) {
            refetch({ month, year });
        }
    }, [month, year]);

    return { finances: data, loading, error, refetch };
}

/**
 * Hook for expenses data.
 */
export function useExpenses(month, year) {
    const { data: expenses, loading, error, refetch } = useFetch(
        '/expenses',
        { autoFetch: false, defaultValue: [] }
    );

    useEffect(() => {
        if (month && year) {
            refetch({ month, year });
        }
    }, [month, year]);

    return { expenses, loading, error, refetch };
}
