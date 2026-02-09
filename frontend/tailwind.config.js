/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // "Ergonomic Grayscale" Light Palette
                'void': '#F2F2F2',      // Soft Off-White Background
                'surface': '#FFFFFF',   // Pure White for Cards (depth)
                'surface-highlight': '#E5E7EB', // Soft Gray for Inputs
                'panel-border': '#1A1A1A', // Carbon border

                // Accents - Carbon Gray
                'accent': '#1A1A1A',
                'accent-dim': '#4B5563',

                // Text
                'txt-primary': '#1A1A1A',
                'txt-secondary': '#374151',
                'txt-dim': '#6B7280',

                // Functional
                'success': '#1A1A1A',
                'error': '#1A1A1A',
            },
            fontFamily: {
                'sans': ['Inter', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace'],
                'display': ['Inter', 'sans-serif'],
            },
            borderRadius: {
                'none': '0',
                'sm': '0',
                'md': '0',
                'lg': '0',
                'xl': '0',
                '2xl': '0',
                '3xl': '0',
                'full': '9999px', // Mantener para elementos circulares (avatares, puntos de estado)
            },
            boxShadow: {
                'flat': 'none',
                'professional': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
