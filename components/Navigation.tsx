'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, Palette } from 'lucide-react';
import { useTheme } from '@/hooks';
import { NavDrawer } from './NavDrawer';

const NAV_ITEMS = [
  { href: '/', label: 'Quiz', description: 'Test your range knowledge' },
  { href: '/delta', label: 'Delta', description: 'Train on range differences' },
  { href: '/view', label: 'View', description: 'Browse ranges' },
  ...(process.env.NODE_ENV !== 'production'
    ? [{ href: '/builder', label: 'Builder', description: 'Create & save ranges' }]
    : []),
];

/**
 * Top navigation bar for switching between app modes.
 * Preserves URL params (position, stackSize, scenario) when switching modes.
 * Mobile: hamburger opens a drawer with nav links + theme toggle.
 * Desktop: nav links visible in header + palette icon opens drawer for theme only.
 */
export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerShowNav, setDrawerShowNav] = useState(false);

  const openDrawer = (showNav: boolean) => {
    setDrawerShowNav(showNav);
    setDrawerOpen(true);
  };

  const buildHref = (basePath: string) => {
    const params = searchParams.toString();
    return params ? `${basePath}?${params}` : basePath;
  };

  return (
    <>
      <nav className="bg-felt-surface border-b border-felt-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-cream">♠ Chart Topper</span>
            </div>

            {/* Desktop: nav links + palette icon */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={buildHref(href)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'bg-gold text-felt-bg'
                        : 'text-cream-muted hover:bg-felt-elevated hover:text-cream'
                      }
                    `}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* Desktop: palette icon for theme only */}
              <button
                onClick={() => openDrawer(false)}
                className="ml-2 p-2 rounded-lg text-cream-muted hover:text-cream hover:bg-felt-elevated transition-colors"
                aria-label="Change theme"
              >
                <Palette size={18} />
              </button>
            </div>

            {/* Mobile: hamburger */}
            <button
              onClick={() => openDrawer(true)}
              className="lg:hidden p-2 rounded-lg text-cream-muted hover:text-cream hover:bg-felt-elevated transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      <NavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
        buildHref={buildHref}
        showNavLinks={drawerShowNav}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  );
}

export default Navigation;
