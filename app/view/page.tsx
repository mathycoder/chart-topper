import { Suspense } from 'react';
import { ViewMode } from '@/components/ViewMode';

function ViewModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cream-muted">Loading...</div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense fallback={<ViewModeLoading />}>
      <ViewMode />
    </Suspense>
  );
}
