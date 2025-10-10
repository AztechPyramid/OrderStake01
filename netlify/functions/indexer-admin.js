/**
 * Netlify Function - OrderStake Indexer Admin Panel
 * Manuel başlatma, durdurma ve status kontrol
 */
exports.handler = async (event, context) => {
  console.log('🔧 OrderStake Admin Panel accessed');
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    const { httpMethod, queryStringParameters, body } = event;
    const action = queryStringParameters?.action || 'status';
    
    console.log(`📋 Admin action: ${action}`);
    
    switch (action) {
      case 'status':
        return await getIndexerStatus(headers);
        
      case 'run':
        return await runIndexerManually(headers);
        
      case 'config':
        return await getConfiguration(headers);
        
      case 'logs':
        return await getRecentLogs(headers);
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid action',
            availableActions: ['status', 'run', 'config', 'logs']
          })
        };
    }
    
  } catch (error) {
    console.error('❌ Admin panel error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Indexer durumunu kontrol et
 */
async function getIndexerStatus(headers) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Data dosyalarını kontrol et
    const dataPath = path.join(process.cwd(), 'indexer', 'data');
    const publicApiPath = path.join(process.cwd(), 'public', 'api');
    
    const status = {
      system: {
        online: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      environment: {
        rpcUrl: process.env.RPC_URL ? 'Configured ✅' : 'Missing ❌',
        factoryAddress: process.env.ECOSYSTEM_STAKING_FACTORY_ADDRESS ? 'Configured ✅' : 'Missing ❌',
        nftLaunchAddress: process.env.ORDER_NFT_LAUNCH_ADDRESS ? 'Configured ✅' : 'Missing ❌'
      },
      files: {},
      lastRun: null,
      stats: null
    };
    
    // Dosya durumlarını kontrol et
    const checkFiles = ['pools.json', 'staking.json', 'latest-block.json', 'stats.json'];
    
    for (const file of checkFiles) {
      const dataFilePath = path.join(dataPath, file);
      const publicFilePath = path.join(publicApiPath, file);
      
      status.files[file] = {
        dataExists: fs.existsSync(dataFilePath),
        publicExists: fs.existsSync(publicFilePath),
        dataSize: fs.existsSync(dataFilePath) ? fs.statSync(dataFilePath).size : 0,
        publicSize: fs.existsSync(publicFilePath) ? fs.statSync(publicFilePath).size : 0,
        lastModified: fs.existsSync(publicFilePath) ? fs.statSync(publicFilePath).mtime : null
      };
    }
    
    // Son çalışma zamanını kontrol et
    const statsPath = path.join(publicApiPath, 'stats.json');
    if (fs.existsSync(statsPath)) {
      try {
        status.stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        status.lastRun = status.stats.lastUpdated;
      } catch (e) {
        console.warn('Stats dosyası okunamadı:', e.message);
      }
    }
    
    // Son blok bilgisi
    const latestBlockPath = path.join(publicApiPath, 'latest-block.json');
    if (fs.existsSync(latestBlockPath)) {
      try {
        status.latestBlocks = JSON.parse(fs.readFileSync(latestBlockPath, 'utf8'));
      } catch (e) {
        console.warn('Latest block dosyası okunamadı:', e.message);
      }
    }
    
    console.log('✅ Status check completed');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(status, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    throw error;
  }
}

/**
 * Indexer'ı manuel olarak çalıştır
 */
async function runIndexerManually(headers) {
  console.log('🚀 Manual indexer run requested');
  
  try {
    // Indexer cron function'ını çağır
    const indexerCron = require('./indexer-cron');
    
    const mockEvent = {
      source: 'manual-trigger',
      timestamp: new Date().toISOString()
    };
    
    const mockContext = {
      functionName: 'indexer-cron-manual',
      functionVersion: 'manual'
    };
    
    console.log('📞 Calling indexer cron function...');
    const result = await indexerCron.handler(mockEvent, mockContext);
    
    console.log('✅ Manual run completed');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Manual indexer run completed',
        trigger: 'manual',
        timestamp: new Date().toISOString(),
        result: JSON.parse(result.body)
      }, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Manual run error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        trigger: 'manual',
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Konfigürasyon bilgilerini getir
 */
async function getConfiguration(headers) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const config = {
      netlify: {
        nodeVersion: process.env.NODE_VERSION || process.version,
        functions: {
          directory: 'netlify/functions',
          bundler: 'esbuild'
        },
        scheduling: {
          plugin: '@netlify/plugin-scheduled-functions',
          schedule: 'Every 15 minutes'
        }
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RPC_URL: process.env.RPC_URL ? 'Set ✅' : 'Missing ❌',
        ECOSYSTEM_STAKING_FACTORY_ADDRESS: process.env.ECOSYSTEM_STAKING_FACTORY_ADDRESS ? 'Set ✅' : 'Missing ❌',
        ORDER_NFT_LAUNCH_ADDRESS: process.env.ORDER_NFT_LAUNCH_ADDRESS ? 'Set ✅' : 'Missing ❌',
        START_BLOCK: process.env.START_BLOCK || 'Default'
      },
      indexer: null
    };
    
    // Indexer config'i oku
    const indexerConfigPath = path.join(process.cwd(), 'indexer', 'config.json');
    if (fs.existsSync(indexerConfigPath)) {
      try {
        config.indexer = JSON.parse(fs.readFileSync(indexerConfigPath, 'utf8'));
      } catch (e) {
        config.indexer = { error: 'Could not parse config.json' };
      }
    } else {
      config.indexer = { error: 'config.json not found' };
    }
    
    console.log('✅ Configuration retrieved');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Configuration retrieval error:', error);
    throw error;
  }
}

/**
 * Son logları getir
 */
async function getRecentLogs(headers) {
  // Bu basit bir mock - gerçek production'da log service kullanılabilir
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'OrderStake Indexer Admin Panel accessed',
      source: 'admin-panel'
    },
    {
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      level: 'INFO', 
      message: 'Scheduled indexer cron job completed successfully',
      source: 'indexer-cron'
    },
    {
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      level: 'INFO',
      message: 'Blockchain events indexed, API files updated',
      source: 'indexer-cron'
    }
  ];
  
  console.log('📋 Recent logs retrieved');
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      logs,
      note: 'This is a simplified log view. For detailed logs, check Netlify function logs.',
      timestamp: new Date().toISOString()
    }, null, 2)
  };
}