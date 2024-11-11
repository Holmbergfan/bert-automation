const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log('Current Directory:', process.cwd());
console.log('MongoDB URI:', process.env.MONGODB_URI);
const express = require('express');
const app = express();
const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('./utils/logger'); // Adjust the path as necessary
const mongoose = require('mongoose');
const botRoutes = require('../src/routes/bot');
const BOT_API_PORT = process.env.BOT_API_PORT || 3002;

console.log('Current Directory:', process.cwd());
console.log('MongoDB URI:', process.env.MONGODB_URI);

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000', // Replace with the correct frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use('/bot', botRoutes); // Use the bot routes

// Use process.env.MONGODB_URI to get the URI
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1); // Exit the process if we can't connect to MongoDB
  });

// Define the TS3 Credentials Schema
const ts3CredentialsSchema = new mongoose.Schema({
  _id: String,
  host: String,
  port: Number,
  username: String,
  password: String,
  nickname: String,
  serverId: Number,
  channelId: Number
}, { collection: 'ts3_credentials' });

let TS3Credentials;
try {
  TS3Credentials = mongoose.model('TS3Credentials');
} catch (error) {
  if (error.name === 'MissingSchemaError') {
    const ts3CredentialsSchema = new mongoose.Schema({
      _id: String,
      host: String,
      port: Number,
      username: String,
      password: String,
      nickname: String,
      serverId: Number,
      channelId: Number,
    }, { collection: 'ts3_credentials' });

    TS3Credentials = mongoose.model('TS3Credentials', ts3CredentialsSchema);
  } else {
    throw error;
  }
}

// Authentication Middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.BOT_API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

const botController = require('../src/controllers/botController');

// Example endpoint to get bot status
app.get('/status', authenticate, botController.getStatus);

// Endpoint to fetch current settings
app.get('/bot/settings', authenticate, botController.updateSettings);

// Endpoint to update settings
app.post('/bot/settings', authenticate, botController.updateSettings);

// Endpoint to handle connect and disconnect commands
app.post('/command', authenticate, botController.sendCommand);

// Start the Bot API Server
app.listen(BOT_API_PORT, async () => {
  logger.info(`Bot API server is running on port ${BOT_API_PORT}`);
  try {
    await botController.initializeClient(); // Initialize the TS3 client when the server starts
  } catch (error) {
    logger.error(`Failed to initialize TS3 client: ${error.message}`);
  }
});

// Graceful Shutdown
const shutdown = async () => {
  logger.info('Shutting down TS3 Bot...');
  if (botController.client && botController.client.connected) {
    await botController.client.quit();
    logger.info('Bot disconnected successfully.');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);