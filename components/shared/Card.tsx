import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shared card component for consistent container styling.
 * Used throughout the app for grouping related content.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-felt-surface rounded-xl p-4 shadow-sm border border-felt-border ${className}`}>
      {children}
    </div>
  );
}
