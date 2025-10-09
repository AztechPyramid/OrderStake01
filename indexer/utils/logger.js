const fs = require('fs').promises;
const path = require('path');

/**
 * Simple logging utility for the indexer
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.logFile = options.logFile || './data/indexer.log';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        formatted += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        formatted += ` ${data}`;
      }
    }
    
    return formatted;
  }

  /**
   * Check if we should log this level
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Write to console with colors
   */
  writeConsole(level, message) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[37m'  // White
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}${message}${reset}`);
  }

  /**
   * Write to file (async)
   */
  async writeFile(message) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.logFile);
      await fs.mkdir(dir, { recursive: true });
      
      // Check file size and rotate if needed
      await this.rotateFileIfNeeded();
      
      // Append to log file
      await fs.appendFile(this.logFile, message + '\n', 'utf8');
      
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file if it's too large
   */
  async rotateFileIfNeeded() {
    try {
      const stats = await fs.stat(this.logFile);
      
      if (stats.size > this.maxFileSize) {
        // Rotate files
        for (let i = this.maxFiles - 1; i > 0; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          
          try {
            await fs.rename(oldFile, newFile);
          } catch (error) {
            // File might not exist, that's ok
          }
        }
        
        // Move current file to .1
        await fs.rename(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      // File might not exist yet, that's ok
    }
  }

  /**
   * Log with specific level
   */
  async log(level, message, data = null) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);
    
    // Always write to console
    this.writeConsole(level, formatted);
    
    // Write to file asynchronously
    this.writeFile(formatted).catch(error => {
      console.error('Log file write failed:', error);
    });
  }

  /**
   * Convenience methods
   */
  error(message, data = null) {
    return this.log('error', message, data);
  }

  warn(message, data = null) {
    return this.log('warn', message, data);
  }

  info(message, data = null) {
    return this.log('info', message, data);
  }

  debug(message, data = null) {
    return this.log('debug', message, data);
  }

  /**
   * Log event activity
   */
  event(eventName, data) {
    return this.info(`📡 Event: ${eventName}`, data);
  }

  /**
   * Log errors with context
   */
  errorWithContext(message, error, context = null) {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    return this.error(message, errorData);
  }

  /**
   * Log contract interaction
   */
  contract(contractName, method, data = null) {
    return this.debug(`🔗 Contract: ${contractName}.${method}`, data);
  }

  /**
   * Log performance metrics
   */
  perf(operation, duration, details = null) {
    return this.info(`⚡ Performance: ${operation} took ${duration}ms`, details);
  }
}

// Create default logger instance
const defaultLogger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './data/indexer.log'
});

module.exports = {
  Logger,
  logger: defaultLogger
};