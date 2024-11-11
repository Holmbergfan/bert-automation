// src/utils/logger.js

const moment = require('moment');

const logger = {
  info: (message) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString()
    }));
  },
  error: (message, error) => {
    console.error(JSON.stringify({
      level: 'error',
      message: typeof error === 'object' ? `${message}: ${error.message}` : message,
      timestamp: new Date().toISOString()
    }));
  },
  warn: (message) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString()
    }));
  }
};

module.exports = logger;
