// src/utils/logger.js

const moment = require('moment');

const logger = {
  info: (message) => {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] INFO: ${message}`);
  },
  error: (message) => {
    console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ERROR: ${message}`);
  },
};

module.exports = logger;
