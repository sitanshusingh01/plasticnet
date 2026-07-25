/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E8449',
          dark: '#166339',
          light: '#E7F3EC'
        },
        lake: {
          DEFAULT: '#2E86C1',
          dark: '#21618C',
          light: '#E8F2FA'
        },
        warning: {
          DEFAULT: '#F4D03F',
          dark: '#B7950B',
          light: '#FDF6DD'
        },
        danger: {
          DEFAULT: '#C0392B',
          dark: '#922B21',
          light: '#FBEAE8'
        },
        ink: {
          DEFAULT: '#1B2A22',
          muted: '#5B6B60',
          faint: '#8A968D'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F0F2ED',
          sunk: '#F7F8F5'
        },
        border: {
          DEFAULT: '#DDE2D6'
        },
        sidebar: {
          DEFAULT: '#152920',
          hover: '#1E3A2C',
          active: '#1E8449'
        },
        night: {
          bg: '#0F1712',
          surface: '#16211A',
          muted: '#1C2A21',
          border: '#28372D',
          ink: '#EAF1EC',
          'ink-muted': '#9FB0A5',
          'ink-faint': '#6D8176'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 42, 34, 0.06), 0 1px 0 rgba(27, 42, 34, 0.04)',
        raised: '0 4px 16px rgba(27, 42, 34, 0.08)'
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px'
      }
    }
  },
  plugins: []
}
