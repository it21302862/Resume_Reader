'use client'

import { Suspense } from 'react';
import HomeClient from './componenets/HomeClient';

export const dynamic = 'force-dynamic';

function HomeClientFallback() {
  return <div>Loading...</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<HomeClientFallback />}>
      <HomeClient />
    </Suspense>
  );
}