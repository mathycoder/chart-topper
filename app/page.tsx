import { RangeBuilder } from '@/components/RangeBuilder';
import { utg80bbRfi } from '@/data/ranges/80bb-utg-rfi';

export default function Home() {
  return (
    <main className="min-h-screen max-w-[1050px] mx-auto">
      <RangeBuilder range={utg80bbRfi} />
    </main>
  );
}
