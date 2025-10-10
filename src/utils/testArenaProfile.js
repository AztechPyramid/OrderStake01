// Test Arena Profile API
// Bu dosya manuel test için - browser console'da çalıştırılabilir

async function testArenaProfileAPI() {
  const testAddress = '0x3fa6df8357dc58935360833827a9762433488c83';
  
  try {
    console.log('🧪 Testing Arena Profile API...');
    
    // Test local netlify function
    const response = await fetch(`/.netlify/functions/arena-profile?address=${testAddress}`);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Arena Profile API Success:', data);
      return data;
    } else {
      console.log('❌ Arena Profile API failed:', response.statusText);
    }
  } catch (error) {
    console.log('❌ Arena Profile API error:', error);
  }
  
  return null;
}

// Test Arena SDK methods
async function testArenaSDKMethods() {
  const testAddress = '0x3fa6df8357dc58935360833827a9762433488c83';
  
  // Check if we have Arena SDK
  if (typeof window !== 'undefined' && window.arenaAppStoreSdk) {
    const sdk = window.arenaAppStoreSdk;
    
    console.log('🧪 Testing Arena SDK methods...');
    
    const methods = [
      'getUserProfile',
      'getPublicProfile',
      'getUserByAddress',
      'getProfileByAddress',
      'lookupUser',
      'findUser',
      'getArenaUser',
      'getUserInfo'
    ];
    
    for (const method of methods) {
      try {
        console.log(`Testing: ${method}`);
        const result = await sdk.sendRequest(method, { address: testAddress });
        console.log(`✅ ${method} SUCCESS:`, result);
      } catch (error) {
        console.log(`❌ ${method} failed:`, error.message);
      }
    }
  } else {
    console.log('❌ Arena SDK not available');
  }
}

// Kombine test
async function runAllTests() {
  console.log('🚀 Starting Arena Profile Tests...');
  
  await testArenaProfileAPI();
  await testArenaSDKMethods();
  
  console.log('✅ All tests completed');
}

// Export for console use
window.testArenaProfile = runAllTests;
window.testProfileAPI = testArenaProfileAPI;
window.testSDKMethods = testArenaSDKMethods;

console.log('📝 Arena Profile Test Functions loaded. Run:');
console.log('- testArenaProfile() - Run all tests');
console.log('- testProfileAPI() - Test Netlify function');
console.log('- testSDKMethods() - Test Arena SDK methods');