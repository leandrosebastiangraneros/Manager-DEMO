/**
 * Utility functions for handling Argentina Timezone (GMT-3) consistently.
 * The backend sends naive datetimes (e.g., '2026-01-29T22:00:00') which are IMPLICITLY in Argentina time.
 * We avoid using 'new Date()' for parsing these for display, as browsers might shift them based on local timezone.
 */

// Returns "DD/MM/YYYY" from a standard ISO string or YYYY-MM-DD string
export const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    try {
        // Handle "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD"
        // 1. Extract just the date part "YYYY-MM-DD"
        const cleanDate = dateStr.split('T')[0];
        // 2. Split and Reverse
        const [year, month, day] = cleanDate.split('-');
        // 3. Validate
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formatting date", dateStr, e);
        return dateStr;
    }
};

// Returns current date in Argentina "YYYY-MM-DD" for Input fields
export const getTodayArgentina = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
};

// Returns a Display String "Viernes, 29 de Enero" for headers
export const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    // Used for display only, so we can use T12:00:00 trick to force correct day
    // This expects dateStr to be 'YYYY-MM-DD'
    try {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    } catch (e) {
        return dateStr;
    }
};
