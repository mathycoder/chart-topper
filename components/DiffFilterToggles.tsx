'use client';

import type { DiffCategories, DiffCategoryKey } from '@/lib/getDiffCategories';
import { ALL_DIFF_CATEGORIES, DIFF_CATEGORY_LABELS } from '@/lib/getDiffCategories';

interface DiffFilterTogglesProps {
  categories: DiffCategories;
  enabledCategories: Set<DiffCategoryKey>;
  onToggle: (category: DiffCategoryKey) => void;
}

export function DiffFilterToggles({ categories, enabledCategories, onToggle }: DiffFilterTogglesProps) {
  const visibleCategories = ALL_DIFF_CATEGORIES.filter(k => categories.counts[k] > 0);
  if (visibleCategories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleCategories.map(key => {
        const active = enabledCategories.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
              ${active
                ? 'bg-felt-muted text-cream border border-felt-border'
                : 'bg-felt-elevated text-cream-muted border border-transparent opacity-60'
              }
            `}
          >
            <span>{DIFF_CATEGORY_LABELS[key]}</span>
            <span className={`
              inline-flex items-center justify-center min-w-5 h-4 px-1 rounded text-[10px] font-bold
              ${active ? 'bg-felt-elevated text-cream' : 'bg-felt-surface text-cream-muted'}
            `}>
              {categories.counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
