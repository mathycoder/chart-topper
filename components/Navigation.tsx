'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

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
 */
export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build href with current search params preserved
  const buildHref = (basePath: string) => {
    const params = searchParams.toString();
    return params ? `${basePath}?${params}` : basePath;
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / App name */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">♠️ Chart Topper</span>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = pathname === href;
              
              return (
                <Link
                  key={href}
                  href={buildHref(href)}
                  className={`
                    px-3 py-2 lg:px-4 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
