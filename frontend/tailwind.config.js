/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk palette
        cyber: {
          dark: '#0a0a0f',
          darker: '#050508',
          surface: '#12121a',
          border: '#1e1e2e',
          cyan: '#00f5ff',
          purple: '#bf5af2',
          pink: '#ff2d55',
          green: '#30d158',
          yellow: '#ffd60a',
          orange: '#ff9f0a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'border-flow': 'border-flow 3s linear infinite',
        'data-stream': 'data-stream 20s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            opacity: '1'
          },
          '50%': {
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            opacity: '0.8'
          },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': `linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
}
