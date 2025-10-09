/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Benqi-inspired dark theme
        background: {
          primary: '#0B0E1A',
          secondary: '#1A1F36', 
          tertiary: '#242B47',
        },
        surface: {
          primary: '#1E2235',
          secondary: '#242B47',
          elevated: '#2A3356',
        },
        accent: {
          primary: '#00D4AA',
          secondary: '#4FFFDF',
          tertiary: '#00B890',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          accent: '#00D4AA',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
        border: {
          primary: '#2A3356',
          accent: '#00D4AA',
          muted: '#1E2235',
        },
        // Legacy support
        primary: {
          DEFAULT: '#00D4AA', // Updated to teal
          dark: '#00B890',
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0B0E1A 0%, #1A1F36 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00D4AA 0%, #4FFFDF 100%)',
        'gradient-surface': 'linear-gradient(135deg, #1E2235 0%, #242B47 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(26, 31, 54, 0.9) 0%, rgba(30, 34, 53, 0.8) 100%)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '16px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 170, 0.3)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
