import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Action colors for the range builder
        'action-raise': '#dc2626',
        'action-call': '#16a34a',
        'action-fold': '#2563eb',
        
        // Cell state colors
        'cell-empty': '#f8fafc',
        'cell-correct': '#22c55e',
        'cell-incorrect': '#ef4444',
        
        // Hover states
        'action-raise-hover': '#b91c1c',
        'action-call-hover': '#15803d',
        'action-fold-hover': '#1d4ed8',
      },
      spacing: {
        'cell': '2.5rem',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
