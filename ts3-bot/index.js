
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./utils/logger');
const botController = require('./controllers/botController');
const config = require('./config/config');

// Initialize Express app
const app = express();
const BOT_API_PORT = process.env.BOT_API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the bot
const initializeBot = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
    await botController.initializeSettings();
  } catch (error) {
    logger.error(`Error during bot initialization: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
app.listen(BOT_API_PORT, () => {
  logger.info(`Bot API server running on port ${BOT_API_PORT}`);
  initializeBot();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await botController.safeDisconnect();
  process.exit(0);
});