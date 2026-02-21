import { Suspense } from 'react';
import { QuizMode } from '@/components/QuizMode';

function QuizModeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cream-muted">Loading...</div>
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
