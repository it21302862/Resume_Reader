// app/page.tsx
import { Suspense } from 'react';
import HomeClient from './componenets/HomeClient';

// Fallback component for Suspense
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