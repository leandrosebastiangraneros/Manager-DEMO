/**
 * Centralized formatting utilities for the entire application.
 * All components should import from here instead of defining local formatters.
 */

/**
 * Format a number as Argentine Peso currency.
 * @param {number|null|undefined} val - The value to format
 * @returns {string} Formatted currency string
 */
export const formatMoney = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$ 0,00';
    return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

/**
 * Format a number with locale-appropriate separators.
 * @param {number|null|undefined} val - The value to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('es-AR');
};

/**
 * Format a date string to a human-readable Argentine format.
 * @param {string|Date} dateStr - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateStr, options = {}) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...options
        });
    } catch {
        return '-';
    }
};
