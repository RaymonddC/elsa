/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ELSA Design System - Fintech/Crypto Colors
        'bg-primary': '#090909',      // Main background
        'bg-secondary': '#0c0c0c',    // Sidebar
        'bg-tertiary': '#141414',     // Cards/inputs
        'bg-elevated': '#181818',     // Elevated elements
        'bg-glass': 'rgba(255,255,255,0.04)', // Glass elements

        // Accent colors from design system
        'primary': {
          DEFAULT: '#F59E0B',  // Amber - trust/gold
          light: '#FBBF24',
          dark: '#D97706',
        },
        'accent': {
          DEFAULT: '#8B5CF6',  // Purple - tech/future (CTA color)
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        'success': '#10b981',  // Green for positive
        'danger': '#ef4444',   // Red for negative
        'warning': '#f59e0b',  // Orange for alerts
        'info': '#3b82f6',     // Blue for info
      },
      fontFamily: {
        sans: ['Exo 2', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Orbitron', 'system-ui', 'sans-serif'], // For headings
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 12px rgba(34, 197, 94, 0.4)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
