/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // "Void & Light" Monochromatic Palette
                'void': '#000000',      // Absolute Zero
                'surface': '#050505',   // Deepest Grey
                'surface-highlight': '#121212', // Slightly lighter
                'glass': 'rgba(255, 255, 255, 0.03)',
                'glass-border': 'rgba(255, 255, 255, 0.2)', // Higher contrast for B&W

                // Accents - Pure White
                'accent': '#FFFFFF',        // Pure White
                'accent-dim': 'rgba(255, 255, 255, 0.1)',
                'accent-glow': 'rgba(255, 255, 255, 0.5)',

                'secondary': '#808080',     // Mid Grey

                // Text
                'txt-primary': '#ffffff',
                'txt-secondary': '#a0a0a0', // Light Grey
                'txt-dim': '#505050',       // Dark Grey

                // Functional - High Contrast Grayscale
                'success': '#FFFFFF', // White for success (rely on context/icon)
                'error': '#FFFFFF',   // White for error (rely on context/icon)
            },
            fontFamily: {
                'sans': ['Inter', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace'],
                'display': ['Inter', 'sans-serif'], // Switched to Inter for maximum readability and formal look
            },
            backgroundImage: {
                'void-gradient': 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
                'accent-gradient': 'linear-gradient(135deg, #ffffff 0%, #808080 100%)',
            }
        },
    },
    plugins: [],
}
