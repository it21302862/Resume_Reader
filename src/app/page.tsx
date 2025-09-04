import { Suspense } from 'react';
import HomeClient from './componenets/HomeClient';
import { use } from 'react';
export const dynamic = 'force-dynamic';

function HomeClientFallback() {
  return <div>Loading...</div>;
}

export default function Page({ searchParams }: { searchParams: { cv?: string } }) {
  const selectedCv = searchParams?.cv || '';
  return (
    <Suspense fallback={<HomeClientFallback />}>
      <HomeClient selectedCv={selectedCv} />
    </Suspense>
  );
}