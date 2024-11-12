const winston = require('winston');
const path = require('path');

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// Create formatters
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ level, message }) => {
    // Simplified console output
    return `${level}: ${message}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  levels,
  transports: [
    // Console transport with minimal info
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
      handleExceptions: true
    }),
    // File transport with detailed info
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add colors to Winston
winston.addColors(colors);

module.exports = {
  error: (message, meta = {}) => {
    logger.error(message, { meta });
  },
  warn: (message, meta = {}) => {
    logger.warn(message, { meta });
  },
  info: (message, meta = {}) => {
    logger.info(message, { meta });
  },
  debug: (message, meta = {}) => {
    logger.debug(message, { meta });
  }
};
