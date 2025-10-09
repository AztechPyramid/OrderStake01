import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import to prevent SSR issues
const EcosystemStakingPage = dynamic(
  () => import('@/components/ecosystem/EcosystemStakingPageNew').then(mod => ({ default: mod.EcosystemStakingPage })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    )
  }
);

export default function EcosystemStaking() {
  return <EcosystemStakingPage />;
}
