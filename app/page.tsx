import { Suspense } from 'react';
import { QuizMode } from '@/components/QuizMode';

// Force dynamic rendering to avoid static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

function QuizModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-600">Loading...</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<QuizModeLoading />}>
      <QuizMode />
    </Suspense>
  );
}
