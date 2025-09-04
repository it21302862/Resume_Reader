'use client'

import { Suspense } from 'react';
import HomeClient from './componenets/HomeClient';

export const dynamic = 'force-dynamic';

function HomeClientFallback() {
  return <div>Loading...</div>;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ cv?: string }> }) {
  const { cv = '' } = await searchParams;
  const selectedCv = cv || '';
  return (
    <Suspense fallback={<HomeClientFallback />}>
      <HomeClient selectedCv={selectedCv} />
    </Suspense>
  );
}