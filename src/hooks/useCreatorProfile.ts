import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';

export interface ArenaProfile {
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  isVerified?: boolean;
  userHandle?: string;
  profilePicture?: string;
}

export const useCreatorProfile = (targetAddress?: string) => {
  const { sdk, address: connectedAddress, profile: connectedProfile, isInArena } = useArenaSDK();
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetAddress) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create fallback profile first
        const fallbackProfile = {
          username: targetAddress, // Use full address
          displayName: 'Anonymous User',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${targetAddress}`,
          isVerified: false
        };

        console.log(`🔍 Creator Profile Check:`);
        console.log(`Target: ${targetAddress}`);
        console.log(`Connected: ${connectedAddress}`);
        console.log(`In Arena: ${isInArena}`);

        // Arena SDK limitation: getUserProfile only works for connected user
        // We can only get Arena profile if the target address is the connected user
        if (isInArena && sdk && connectedProfile && 
            targetAddress.toLowerCase() === connectedAddress?.toLowerCase()) {
          
          console.log(`✅ Target is connected user, using Arena profile: @${connectedProfile.userHandle}`);
          setProfile({
            username: connectedProfile.userHandle || fallbackProfile.username,
            displayName: connectedProfile.displayName || connectedProfile.userHandle || fallbackProfile.displayName,
            avatar: connectedProfile.userImageUrl || connectedProfile.profilePicture || connectedProfile.avatar || fallbackProfile.avatar,
            bio: connectedProfile.bio,
            isVerified: connectedProfile.isVerified || false,
            userHandle: connectedProfile.userHandle,
            profilePicture: connectedProfile.userImageUrl || connectedProfile.profilePicture || connectedProfile.avatar
          });
        } else {
          // For different addresses, we can only use fallback with full address
          console.log(`ℹ️ Different address or no Arena access, using fallback for ${targetAddress}`);
          setProfile({
            username: targetAddress, // Use full address instead of shortened
            displayName: 'Anonymous User',
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${targetAddress}`,
            isVerified: false
          });
        }
        
      } catch (err: any) {
        console.error('Error fetching creator profile:', err);
        setError(err.message);
        
        // Always provide fallback profile
        setProfile({
          username: targetAddress, // Use full address
          displayName: 'Anonymous User',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${targetAddress}`,
          isVerified: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetAddress, sdk, connectedAddress, connectedProfile, isInArena]);

  return { profile, isLoading, error };
};