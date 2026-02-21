import { Suspense } from 'react';
import { DeltaMode } from '@/components/DeltaMode';

function DeltaModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cream-muted">Loading...</div>
    </div>
  );
}

export default function DeltaPage() {
  return (
    <Suspense fallback={<DeltaModeLoading />}>
      <DeltaMode />
    </Suspense>
  );
}
