import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { BuilderMode } from '@/components/BuilderMode';

function BuilderModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cream-muted">Loading...</div>
    </div>
  );
}

export default function BuilderPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }

  return (
    <Suspense fallback={<BuilderModeLoading />}>
      <BuilderMode />
    </Suspense>
  );
}
