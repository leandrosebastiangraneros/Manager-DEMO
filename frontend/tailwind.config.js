/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // "Ergonomic Grayscale" Palette using CSS variables
                'void': 'var(--color-void)',
                'surface': 'var(--color-surface)',
                'surface-highlight': 'var(--color-surface-highlight)',
                'panel-border': 'var(--color-panel-border)',

                // Accents
                'accent': 'var(--color-accent)',
                'accent-dim': 'var(--color-accent-dim)',

                // Text
                'txt-primary': 'var(--color-txt-primary)',
                'txt-secondary': 'var(--color-txt-secondary)',
                'txt-dim': 'var(--color-txt-dim)',

                // Functional
                'success': 'var(--color-success)',
                'error': 'var(--color-error)',
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
                'full': '9999px',
            },
            boxShadow: {
                'flat': 'none',
                'professional': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
