const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./utils/logger');
const botController = require('./controllers/botController');

require('dotenv').config();

const app = express();
const PORT = process.env.BOT_API_PORT || 3002;

// Basic middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Bot endpoints
app.get('/status', async (req, res) => {
  try {
    const status = await botController.getStatus(req, res);
    res.json(status);
  } catch (error) {
    logger.error('Error getting bot status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/command', async (req, res) => {
  try {
    const { command } = req.body;
    // Add command handling here
    res.json({ success: true, message: `Command ${command} received` });
  } catch (error) {
    logger.error('Error processing command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize bot and start server
const start = async () => {
  try {
    // Connect to MongoDB with updated options
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');
    
    // Initialize bot first
    const initialized = await botController.initializeSettings();
    if (!initialized) {
      throw new Error('Bot initialization failed - check database settings');
    }
    
    // Start express server
    app.listen(PORT, () => {
      logger.info('Bot server running on port', { port: PORT });
    });
  } catch (error) {
    logger.error('Application startup failed', { 
      error: error.message,
      context: error.context || 'startup'
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  botController.safeDisconnect()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    });
});

start();
