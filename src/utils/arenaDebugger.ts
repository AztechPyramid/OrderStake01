export const ArenaDebugger = {
  log: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = '🏛️ [ARENA DEBUG]';
    console.log(`%c${prefix} ${timestamp}: ${message}`, 'color: orange; font-weight: bold;', data || '');
    
    // Also use console.warn to make it more visible
    console.warn(`${prefix} ${message}`, data || '');
  },

  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = '❌ [ARENA ERROR]';
    console.error(`%c${prefix} ${timestamp}: ${message}`, 'color: red; font-weight: bold;', error || '');
  },

  success: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = '✅ [ARENA SUCCESS]';
    console.log(`%c${prefix} ${timestamp}: ${message}`, 'color: green; font-weight: bold;', data || '');
  },

  warn: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = '⚠️ [ARENA WARNING]';
    console.warn(`%c${prefix} ${timestamp}: ${message}`, 'color: yellow; font-weight: bold;', data || '');
  },

  // Specific Arena connection debugging
  connectionStep: (step: string, details?: unknown) => {
    ArenaDebugger.log(`🔧 CONNECTION STEP: ${step}`, details);
  },

  walletState: (state: { isInArena?: boolean; arenaConnected?: boolean; arenaAddress?: string; provider?: unknown; sdk?: unknown }) => {
    ArenaDebugger.log('💰 WALLET STATE:', {
      isInArena: state.isInArena,
      arenaConnected: state.arenaConnected,
      arenaAddress: state.arenaAddress,
      hasProvider: !!state.provider,
      hasSdk: !!state.sdk
    });
  }
};
