// Arena API test methods
// Test different API methods to see what's available

export const testArenaAPIMethods = async (sdk: any, address: string) => {
  const testMethods = [
    'getUserProfile',
    'getUserProfileByAddress', 
    'getProfile',
    'getProfileByAddress',
    'getUser',
    'getUserByAddress',
    'getPublicProfile',
    'getPublicProfileByAddress',
    'searchUsers',
    'findUser',
    'findUserByAddress',
    'getArenaUser',
    'getArenaUserByAddress',
    'lookupUser',
    'lookupUserByAddress'
  ];

  const results: Record<string, any> = {};

  for (const method of testMethods) {
    try {
      console.log(`🧪 Testing Arena API method: ${method}`);
      
      // Test without parameters
      try {
        const result = await sdk.sendRequest(method);
        results[method] = { success: true, data: result, params: 'none' };
        console.log(`✅ ${method} (no params):`, result);
      } catch (err) {
        console.log(`❌ ${method} (no params) failed:`, err);
      }

      // Test with address parameter
      try {
        const result = await sdk.sendRequest(method, { address });
        results[`${method}_with_address`] = { success: true, data: result, params: address };
        console.log(`✅ ${method} (with address):`, result);
      } catch (err) {
        console.log(`❌ ${method} (with address) failed:`, err);
      }

      // Test with direct address parameter
      try {
        const result = await sdk.sendRequest(method, address);
        results[`${method}_direct_address`] = { success: true, data: result, params: `direct:${address}` };
        console.log(`✅ ${method} (direct address):`, result);
      } catch (err) {
        console.log(`❌ ${method} (direct address) failed:`, err);
      }

    } catch (generalError) {
      console.log(`❌ ${method} general error:`, generalError);
      results[method] = { success: false, error: generalError };
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('🎯 Arena API Test Results:', results);
  return results;
};

// Test Arena Trade-like endpoints
export const testArenaTradeEndpoints = async (sdk: any, address: string) => {
  const tradeMethods = [
    'getTraderProfile',
    'getTraderInfo', 
    'getUserTradeInfo',
    'getPublicTraderProfile',
    'getTraderByAddress',
    'getUserStats',
    'getUserInfo',
    'getProfileData',
    'getPublicUserData'
  ];

  const results: Record<string, any> = {};

  for (const method of tradeMethods) {
    try {
      console.log(`📊 Testing Arena Trade method: ${method}`);
      
      const result = await sdk.sendRequest(method, { address });
      results[method] = { success: true, data: result };
      console.log(`✅ ${method}:`, result);
      
    } catch (err) {
      console.log(`❌ ${method} failed:`, err);
      results[method] = { success: false, error: err };
    }

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log('📈 Arena Trade Test Results:', results);
  return results;
};