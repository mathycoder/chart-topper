'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { Theme } from '@/hooks';

const NAV_ITEMS = [
  { href: '/', label: 'Quiz', description: 'Test your range knowledge' },
  { href: '/delta', label: 'Delta', description: 'Train on range differences' },
  { href: '/view', label: 'View', description: 'Browse ranges' },
  ...(process.env.NODE_ENV !== 'production'
    ? [{ href: '/builder', label: 'Builder', description: 'Create & save ranges' }]
    : []),
];

const THEMES: { value: Theme; label: string; description: string; preview: string }[] = [
  {
    value: 'felt',
    label: 'Felt',
    description: 'Dark casino table',
    preview: '#0a1f14',
  },
  {
    value: 'lounge',
    label: 'Lounge',
    description: 'Warm bourbon speakeasy',
    preview: '#1f1208',
  },
  {
    value: 'midnight',
    label: 'Midnight',
    description: 'Deep navy high-stakes',
    preview: '#0d1b2e',
  },
  {
    value: 'chalk',
    label: 'Chalk',
    description: 'Blackboard study session',
    preview: '#faf6f0',
  },
  {
    value: 'marker',
    label: 'Marker',
    description: 'Bold whiteboard strokes',
    preview: '#ffffff',
  },
  {
    value: 'watercolor',
    label: 'Watercolor',
    description: 'Soft washed parchment',
    preview: '#f0e8de',
  },
  {
    value: 'classic',
    label: 'Classic',
    description: 'Clean & minimal',
    preview: '#ffffff',
  },
];

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current page pathname */
  pathname: string;
  /** Build href with preserved search params */
  buildHref: (path: string) => string;
  /** Whether to show nav links (mobile only) */
  showNavLinks: boolean;
  /** Current theme */
  theme: Theme;
  /** Theme setter */
  onThemeChange: (theme: Theme) => void;
}

export function NavDrawer({
  isOpen,
  onClose,
  pathname,
  buildHref,
  showNavLinks,
  theme,
  onThemeChange,
}: NavDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-50 bg-black/60 transition-opacity duration-200
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 right-0 bottom-0 z-50 w-72
          bg-felt-surface border-l border-felt-border
          flex flex-col
          transition-transform duration-250 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-felt-border shrink-0">
          <span className="text-sm font-semibold text-cream-muted uppercase tracking-wide">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-cream-muted hover:text-cream hover:bg-felt-elevated transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-6">
          {/* Nav links — mobile only */}
          {showNavLinks && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-cream-muted uppercase tracking-wide mb-2">
                Navigate
              </span>
              {NAV_ITEMS.map(({ href, label, description }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={buildHref(href)}
                    onClick={onClose}
                    className={`
                      flex flex-col px-3 py-2.5 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-gold/15 border border-gold/40'
                        : 'hover:bg-felt-elevated border border-transparent'
                      }
                    `}
                  >
                    <span className={`text-sm font-semibold ${isActive ? 'text-gold' : 'text-cream'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-cream-muted mt-0.5">{description}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Theme picker */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-cream-muted uppercase tracking-wide mb-1">
              Theme
            </span>
            {THEMES.map(({ value, label, description, preview }) => {
              const isSelected = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                    transition-colors border
                    ${isSelected
                      ? 'bg-gold/15 border-gold/40'
                      : 'hover:bg-felt-elevated border-transparent'
                    }
                  `}
                >
                  {/* Color swatch */}
                  <div
                    className="w-8 h-8 rounded-md shrink-0 border border-felt-border shadow-sm"
                    style={{ backgroundColor: preview }}
                  />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${isSelected ? 'text-gold' : 'text-cream'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-cream-muted">{description}</span>
                  </div>
                  {isSelected && (
                    <span className="ml-auto text-gold text-sm">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default NavDrawer;
