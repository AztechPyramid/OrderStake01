const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

class IndexerAPIServer {
  constructor(storage, port = 3001) {
    this.storage = storage;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for all routes
    this.app.use(cors());
    this.app.use(express.json());
    
    // Add request logging
    this.app.use((req, res, next) => {
      console.log(`📡 API Request: ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Get all pools
    this.app.get('/api/pools', async (req, res) => {
      try {
        const pools = await this.storage.getAllPoolsData();
        res.json({
          success: true,
          data: pools,
          count: Object.keys(pools).length
        });
      } catch (error) {
        console.error('❌ Error fetching pools:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get specific pool
    this.app.get('/api/pools/:address', async (req, res) => {
      try {
        const { address } = req.params;
        const pool = await this.storage.getPoolData(address);
        
        if (!pool) {
          return res.status(404).json({
            success: false,
            error: 'Pool not found'
          });
        }

        res.json({
          success: true,
          data: pool
        });
      } catch (error) {
        console.error('❌ Error fetching pool:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get events
    this.app.get('/api/events/:type', async (req, res) => {
      try {
        const { type } = req.params;
        const { limit, offset, filter } = req.query;
        
        let events = await this.storage.getEvents(type, filter ? JSON.parse(filter) : {});
        
        // Apply pagination
        if (limit || offset) {
          const start = parseInt(offset) || 0;
          const end = limit ? start + parseInt(limit) : undefined;
          events = events.slice(start, end);
        }

        res.json({
          success: true,
          data: events,
          count: events.length
        });
      } catch (error) {
        console.error('❌ Error fetching events:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get storage stats
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.storage.getStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🌐 Indexer API Server running on http://localhost:${this.port}`);
          console.log(`📊 Available endpoints:`);
          console.log(`   GET /health - Health check`);
          console.log(`   GET /api/pools - All pools data`);
          console.log(`   GET /api/pools/:address - Specific pool data`);
          console.log(`   GET /api/events/:type - Events by type`);
          console.log(`   GET /api/stats - Storage statistics`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('❌ Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = IndexerAPIServer;