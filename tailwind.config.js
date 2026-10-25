/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          darkest: '#130624',
          darker: '#1E0B36',
          dark: '#2D124D',
          panel: '#281145',
          card: '#341659',
          border: '#4A217B',
          borderLight: '#6B2FA8',
          accent: '#A855F7',
          pink: '#EC4899',
          cyan: '#38BDF8',
          emerald: '#10B981',
          gold: '#F59E0B',
          glow: 'rgba(168, 85, 247, 0.35)',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.45)',
        'neon-pink': '0 0 15px rgba(236, 72, 153, 0.45)',
        'neon-cyan': '0 0 15px rgba(56, 189, 248, 0.45)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.45)',
        'card-glow': '0 8px 32px 0 rgba(19, 6, 36, 0.65)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}
