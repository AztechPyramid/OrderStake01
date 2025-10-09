import { useEffect, useState } from 'react';

export function useArenaEnvironment() {
  const [isInArena, setIsInArena] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const isIframe = window.self !== window.top;
      const referrer = document.referrer || '';
      const fromArena = referrer.includes('arena.social');
      const arenaDetected = isIframe && fromArena;
      
      setIsInArena(arenaDetected);
      console.log('🏛️ Arena Environment:', { isIframe, fromArena, arenaDetected, referrer });
    } catch (error) {
      console.error('Arena environment check failed:', error);
      setIsInArena(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isInArena, isLoading };
}
