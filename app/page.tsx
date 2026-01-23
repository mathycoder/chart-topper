import { RangeBuilder } from '@/components/RangeBuilder';
import { utg80bbRfi } from '@/data/ranges/80bb-utg-rfi';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <RangeBuilder range={utg80bbRfi} />
    </main>
  );
}
