// Arena Profile API - Alternative approaches to get user profiles

export interface ArenaUserData {
  address: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  profilePicture?: string;
  userHandle?: string;
  isVerified?: boolean;
  bio?: string;
  fetchSuccess?: boolean;
  source?: string;
}

/**
 * Attempt to get Arena profile by trying different methods
 */
export const getArenaProfileByAddress = async (
  sdk: any, 
  address: string
): Promise<ArenaUserData | null> => {
  if (!sdk || !address) return null;

  console.log(`🔍 Attempting to fetch Arena profile for: ${address}`);

  // Method 1: Try direct Arena API methods
  const directMethods = [
    'getUserProfileByAddress',
    'getPublicProfile', 
    'getProfileByAddress',
    'getUserByAddress',
    'lookupUser',
    'findUser',
    'getArenaUser',
    'getPublicUserData',
    'getUserInfo'
  ];

  for (const method of directMethods) {
    try {
      console.log(`🧪 Trying method: ${method}`);
      
      // Try with object parameter
      let result = await sdk.sendRequest(method, { address });
      if (result && (result.userHandle || result.username || result.address)) {
        console.log(`✅ Success with ${method}:`, result);
        return parseArenaProfile(result, address);
      }

      // Try with direct address parameter  
      result = await sdk.sendRequest(method, address);
      if (result && (result.userHandle || result.username || result.address)) {
        console.log(`✅ Success with ${method} (direct):`, result);
        return parseArenaProfile(result, address);
      }

    } catch (error: any) {
      console.log(`❌ ${method} failed:`, error?.message || 'Unknown error');
    }
  }

  // Method 2: Try Arena Trade specific endpoints
  console.log(`🏪 Trying Arena Trade methods...`);
  const tradeMethods = [
    'getTraderProfile',
    'getTraderInfo',
    'getUserTradeData', 
    'getPublicTrader',
    'getTraderByAddress'
  ];

  for (const method of tradeMethods) {
    try {
      const result = await sdk.sendRequest(method, { address });
      if (result && typeof result === 'object') {
        console.log(`✅ Trade method ${method} success:`, result);
        return parseArenaProfile(result, address);
      }
    } catch (error: any) {
      console.log(`❌ Trade method ${method} failed:`, error?.message);
    }
  }

  // Method 3: Try to access parent window Arena API directly
  console.log(`🪟 Trying parent window access...`);
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      // Try to call parent window Arena methods
      const parentMethods = ['getUser', 'getUserProfile', 'findUserByAddress'];
      
      for (const method of parentMethods) {
        try {
          // This might work if Arena exposes global methods
          const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
            
            window.parent.postMessage({
              type: 'arena-api-request',
              method,
              params: { address },
              id: Date.now()
            }, '*');

            const handler = (event: MessageEvent) => {
              if (event.data.type === 'arena-api-response') {
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                resolve(event.data.result);
              }
            };
            
            window.addEventListener('message', handler);
          });

          if (result) {
            console.log(`✅ Parent window ${method} success:`, result);
            return parseArenaProfile(result, address);
          }
        } catch (error) {
          console.log(`❌ Parent window ${method} failed:`, error);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Parent window access failed:`, error);
  }

  console.log(`❌ All Arena profile methods failed for address: ${address}`);
  return null;
};

/**
 * Parse Arena profile data from various response formats
 */
const parseArenaProfile = (data: any, address: string): ArenaUserData => {
  if (!data || typeof data !== 'object') {
    return { address };
  }

  return {
    address: data.address || address,
    username: data.username || data.userHandle || data.handle,
    displayName: data.displayName || data.name || data.userName,
    avatar: data.avatar || data.userImageUrl || data.profilePicture || data.image,
    profilePicture: data.profilePicture || data.userImageUrl || data.avatar,
    userHandle: data.userHandle || data.handle || data.username,
    isVerified: data.isVerified || data.verified || false,
    bio: data.bio || data.description
  };
};

/**
 * Fallback method: Try to scrape Arena Trade page
 * Uses serverless function to avoid CORS issues
 */
export const fetchArenaTradeProfile = async (address: string): Promise<ArenaUserData | null> => {
  try {
    console.log(`🌐 Attempting to fetch Arena Trade profile for: ${address}`);
    
    // Call our Netlify function
    const response = await fetch(`/.netlify/functions/arena-profile?address=${address}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Arena Trade profile fetched:`, data);
      
      // Only return if we got meaningful data (not just fallback)
      if (data.username && data.username !== `${address.slice(0, 6)}...${address.slice(-4)}`) {
        return data;
      }
    } else {
      console.log(`❌ Arena Trade API returned ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Arena Trade profile fetch failed:`, error);
  }

  return null;
};

/**
 * Combined method: Try all approaches
 */
export const getProfileByAddress = async (
  sdk: any,
  address: string
): Promise<ArenaUserData | null> => {
  console.log(`🚀 Starting profile fetch for: ${address}`);
  
  // First try Arena SDK methods (only if SDK is available)
  if (sdk) {
    console.log(`🏛️ Trying Arena SDK methods...`);
    let profile = await getArenaProfileByAddress(sdk, address);
    
    if (profile && (profile.username || profile.userHandle)) {
      console.log(`✅ Arena SDK success for ${address}:`, profile);
      return profile;
    }
  } else {
    console.log(`ℹ️ No Arena SDK available, skipping SDK methods`);
  }

  // Always try Arena Trade scraping as fallback
  console.log(`🌐 Trying Arena Trade scraping for: ${address}`);
  const profile = await fetchArenaTradeProfile(address);
  
  if (profile && profile.fetchSuccess && (profile.username || profile.userHandle)) {
    console.log(`✅ Arena Trade success for ${address}:`, profile);
    return profile;
  }

  console.log(`❌ All methods failed for ${address}, returning null`);
  return null;
};