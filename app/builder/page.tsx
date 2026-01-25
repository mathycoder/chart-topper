import { Suspense } from 'react';
import { BuilderMode } from '@/components/BuilderMode';

function BuilderModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-600">Loading...</div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<BuilderModeLoading />}>
      <BuilderMode />
    </Suspense>
  );
}
