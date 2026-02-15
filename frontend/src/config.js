/**
 * Frontend configuration.
 *
 * Provides API_URL and authHeaders() for all API calls.
 * API key is optional — if VITE_API_KEY is not set, no auth header is sent.
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';

function getApiUrl() {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;

    // Auto-detect: if running on localhost, use local backend
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return 'http://localhost:8000';
    }

    // Production: API routes through /api
    return '/api';
}

export const API_URL = getApiUrl();

/**
 * Returns headers object for authenticated API requests.
 * Includes Content-Type and X-API-Key (if configured).
 */
export function authHeaders(extra = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extra,
    };
    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }
    return headers;
}

/**
 * Returns headers object without Content-Type (for FormData uploads).
 */
export function authHeadersMultipart(extra = {}) {
    const headers = { ...extra };
    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }
    return headers;
}
