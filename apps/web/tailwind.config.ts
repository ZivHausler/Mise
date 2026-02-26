import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        accent: {
          400: '#C2616B',
          500: '#A84850',
          600: '#8E3640',
        },
        success: {
          light: '#E8F5E1',
          DEFAULT: '#4A9B3F',
          dark: '#2D6A25',
        },
        warning: {
          light: '#FFF4D6',
          DEFAULT: '#D4920A',
          dark: '#9B6B00',
        },
        error: {
          light: '#FDE8E8',
          DEFAULT: '#C53030',
          dark: '#9B2C2C',
        },
        info: {
          light: '#E3F0FC',
          DEFAULT: '#2B6CB0',
          dark: '#1E4E8C',
        },
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F3',
          200: '#E7E5E2',
          300: '#D6D3CE',
          400: '#A8A29D',
          500: '#78726B',
          600: '#57534C',
          700: '#44403B',
          800: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        heading: ['Assistant', 'system-ui', 'sans-serif'],
        body: ['Assistant', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['1.875rem', { lineHeight: '1.25', fontWeight: '700' }],
        h2: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        h4: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        overline: ['0.6875rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(61, 38, 16, 0.05)',
        sm: '0 1px 3px rgba(61, 38, 16, 0.08), 0 1px 2px rgba(61, 38, 16, 0.04)',
        md: '0 4px 6px rgba(61, 38, 16, 0.07), 0 2px 4px rgba(61, 38, 16, 0.04)',
        lg: '0 10px 15px rgba(61, 38, 16, 0.08), 0 4px 6px rgba(61, 38, 16, 0.04)',
        xl: '0 20px 25px rgba(61, 38, 16, 0.10), 0 10px 10px rgba(61, 38, 16, 0.04)',
      },
      zIndex: {
        dropdown: '10',
        sticky: '20',
        drawer: '30',
        overlay: '40',
        modal: '50',
        popover: '60',
        toast: '70',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-end': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'image-crossfade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'expand-down': {
          '0%': { opacity: '0', maxHeight: '0' },
          '100%': { opacity: '1', maxHeight: '500px' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-in': 'slide-in-from-end 300ms ease-out',
        'progress-indeterminate': 'progress-indeterminate 1.2s ease-in-out infinite',
        'image-crossfade': 'image-crossfade 700ms ease-in-out forwards',
        'expand-down': 'expand-down 250ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
