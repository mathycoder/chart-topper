import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Felt palette
        'felt-bg': '#0a1f14',
        'felt-surface': '#112a1a',
        'felt-elevated': '#1a3d27',
        'felt-border': '#1e4d2e',
        'felt-muted': '#2d6644',
        'gold': '#c9a84c',
        'gold-hover': '#b8912e',
        'cream': '#f5e6c8',
        'cream-muted': '#a89878',

        // Action colors for the range builder
        'action-raise': '#f87171',
        'action-call': '#34d399',
        'action-fold': '#4a7ab5',
        'action-shove': '#dc2626',
        'action-black': '#1a3a25',
        
        // Cell state colors
        'cell-empty': '#1e3d2a',
        'cell-correct': '#22c55e',
        'cell-incorrect': '#ef4444',
        
        // Hover states
        'action-raise-hover': '#ef4444',
        'action-call-hover': '#10b981',
        'action-fold-hover': '#3d6aa5',
        'action-shove-hover': '#b91c1c',
        'action-black-hover': '#243d2e',
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
