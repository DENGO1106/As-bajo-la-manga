'use client';

import { Suspense } from 'react';
import SalaClient from '@/components/SalaClient';

export default function SalaClientWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-gold">Cargando la mesa...</div>}>
      <SalaClient />
    </Suspense>
  );
}
