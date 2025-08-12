'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import for VapiAssistant to improve bundle splitting
const VapiAssistant = dynamic(() => import('./VapiAssistant'), {
  ssr: false, // Disable SSR for this component
  loading: () => null // No loading component needed
});

const VapiAssistantDynamic = () => {
  return (
    <Suspense fallback={null}>
      <VapiAssistant />
    </Suspense>
  );
};

export default VapiAssistantDynamic;