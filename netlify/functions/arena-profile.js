// Simple Arena Profile API - Fallback approach
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Get address from query params or body
    const address = event.queryStringParameters?.address || 
                   (event.body ? JSON.parse(event.body).address : null);

    if (!address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Address parameter is required',
          usage: 'GET /.netlify/functions/arena-profile?address=0x...'
        }),
      };
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid Ethereum address format',
          address: address
        }),
      };
    }

    console.log(`🌐 Processing Arena Trade profile request for: ${address}`);

    // For now, return a meaningful fallback that indicates we should try client-side
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    const response = {
      address,
      username: null, // Let frontend handle this
      displayName: null, // Let frontend handle this
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
      isVerified: false,
      bio: null,
      fetchSuccess: false, // Indicates frontend should try client-side fetch
      source: 'server-fallback',
      timestamp: new Date().toISOString(),
      note: 'Server-side scraping not available - frontend should attempt client-side fetch'
    };
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ Arena profile error:', error);
    
    const address = event.queryStringParameters?.address || 'unknown';
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({
        address,
        username: null,
        displayName: null,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        isVerified: false,
        bio: null,
        fetchSuccess: false,
        source: 'error-fallback',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
    };
  }
};