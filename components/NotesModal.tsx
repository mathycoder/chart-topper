'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { RangeStrategyNotes } from '@/types';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyNotes?: RangeStrategyNotes;
  description?: string;
  title?: string;
}

export function NotesModal({ isOpen, onClose, strategyNotes, description, title }: NotesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasNotes = (strategyNotes && strategyNotes.length > 0) || description;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm bg-felt-surface border border-felt-border rounded-xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-cream">
            {title ?? 'Strategy Notes'}
          </h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {hasNotes ? (
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {strategyNotes && strategyNotes.length > 0 ? (
              strategyNotes.map((section, i) => (
                <div key={i}>
                  {section.heading && (
                    <p className="text-sm font-semibold text-cream mb-1">{section.heading}</p>
                  )}
                  {section.bullets.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {section.bullets.filter(Boolean).map((bullet, bi) => (
                        <li key={bi} className="flex gap-2 text-sm text-cream-muted">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-cream-muted italic">{description}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-cream-muted italic">No notes for this range yet.</p>
        )}
      </div>
    </div>
  );
}
