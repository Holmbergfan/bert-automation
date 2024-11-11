// ts3-bot/bot.js

require('dotenv').config({ path: '../.env' }); // Ensure this path is correct
const express = require('express');
const cors = require('cors');
const app = express();
const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('./utils/logger'); // Adjust the path if necessary
const mongoose = require('mongoose');
const botController = require('../controllers/botController'); // Adjust the path if necessary

const BOT_API_PORT = process.env.BOT_API_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI; // Ensure this is defined in .env

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit if DB connection fails
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

const TS3Credentials = mongoose.model('TS3Credentials', ts3CredentialsSchema);

// Authentication Middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.BOT_API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Initialize TS3 Client
let client;
let isConnected = false;

const initializeClient = async () => {
  try {
    const credentials = await TS3Credentials.findById('ts3_credentials');
    if (!credentials) {
      throw new Error('TS3 credentials not found in the database');
    }

    client = await TeamSpeak.connect({
      host: credentials.host,
      queryport: credentials.port,
      username: credentials.username,
      password: credentials.password,
      nickname: credentials.nickname,
      serverport: 9987, // Default TS3 port; adjust if different
      serverid: credentials.serverId,
    });

    isConnected = true;
    logger.info('Connected to TS3 server successfully.');

    client.on('close', () => {
      isConnected = false;
      logger.warn('TS3 Client disconnected.');
    });

    client.on('error', (error) => {
      isConnected = false;
      logger.error(`TS3 Client Error: ${error.message}`);
    });
  } catch (error) {
    logger.error(`Error initializing TS3 Client: ${error.message}`);
    throw error; // Rethrow to let the caller handle it
  }
};

// Endpoint to get bot status
app.get('/status', authenticate, async (req, res) => {
  try {
    logger.info('Received request for bot status');
    if (isConnected && client) {
      const serverGroups = await client.serverGroupList();
      const clients = await client.clientList();
      res.json({
        status: 'online',
        channel: client.channel || 'N/A', // Ensure client.channel is defined
        serverGroups: serverGroups.map(group => ({
          id: group.sgid,
          name: group.name,
        })),
        clients: clients.map(client => ({
          id: client.clid,
          nickname: client.nickname,
        })),
      });
    } else {
      res.json({ status: 'offline' });
    }
  } catch (error) {
    logger.error(`Error fetching bot status: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: 'Failed to fetch bot status.', error: error.message });
  }
});

// Endpoint to fetch current settings
app.get('/settings', authenticate, async (req, res) => {
  try {
    const credentials = await TS3Credentials.findById('ts3_credentials');
    if (!credentials) {
      return res.status(404).json({ message: 'TS3 credentials not found' });
    }
    res.json({
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      nickname: credentials.nickname,
      serverId: credentials.serverId,
      channelId: credentials.channelId,
    });
  } catch (error) {
    logger.error(`Error fetching credentials: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch credentials.', error: error.message });
  }
});

// Endpoint to update settings
app.post('/settings', authenticate, async (req, res) => {
  try {
    const { host, port, username, password, nickname, serverId, channelId } = req.body;
    const credentials = await TS3Credentials.findByIdAndUpdate(
      'ts3_credentials',
      { host, port, username, password, nickname, serverId, channelId },
      { new: true, upsert: true }
    );
    res.json({ message: 'Settings updated successfully', credentials });
  } catch (error) {
    logger.error(`Error updating settings: ${error.message}`);
    res.status(500).json({ message: 'Failed to update settings.', error: error.message });
  }
});

// Endpoint to handle connect and disconnect commands
app.post('/command', authenticate, async (req, res) => {
  const { command } = req.body;
  try {
    if (command === 'connect') {
      if (!isConnected) {
        await initializeClient();
        res.json({ message: 'Connected to TS3 server successfully.' });
      } else {
        res.json({ message: 'Already connected.' });
      }
    } else if (command === 'disconnect') {
      if (isConnected && client) {
        await client.quit();
        isConnected = false;
        res.json({ message: 'Disconnected from TS3 server successfully.' });
      } else {
        res.json({ message: 'Already disconnected.' });
      }
    } else {
      res.status(400).json({ message: 'Unknown command.' });
    }
  } catch (error) {
    logger.error(`Error handling command: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: 'Failed to handle command.', error: error.message });
  }
});

// Endpoint to handle player login notifications (from scraper)
app.post('/notify-login', authenticate, async (req, res) => {
  const { playerName, notificationType } = req.body;

  if (!playerName || !notificationType) {
    return res.status(400).json({ message: 'Player name and notification type are required.' });
  }

  try {
    // Determine the message based on notification type
    let message;
    if (notificationType === 'warning') {
      message = `⚠️ **WARNING:** Player **${playerName}** has just logged in!`;
    } else if (notificationType === 'normal') {
      message = `🎮 **${playerName}** has just logged in. Welcome!`;
    } else {
      return res.status(400).json({ message: 'Invalid notification type.' });
    }

    // Send the message to the global channel
    await sendMessageToChannel(process.env.TS3_CHANNEL_ID, message);

    res.json({ message: 'Notification sent successfully.' });
  } catch (error) {
    logger.error(`Error sending login notification for player ${playerName}: ${error.message}`);
    res.status(500).json({ message: 'Failed to send login notification.', error: error.message });
  }
});

// Function to send a message to a channel
const sendMessageToChannel = async (channelId, message) => {
  try {
    if (isConnected && client) {
      await client.sendTextMessage(channelId, 2, message); // 2 = channel message
      logger.info(`Message sent to channel ${channelId}: "${message}"`);
    } else {
      logger.warn('Bot is offline. Cannot send message.');
    }
  } catch (error) {
    logger.error(`Error sending message to channel ${channelId}: ${error.message}`);
  }
};

// Start the Bot API Server
app.listen(BOT_API_PORT, () => {
  logger.info(`Bot API server is running on port ${BOT_API_PORT}`);
  initializeClient(); // Initialize the TS3 client when the server starts
});

// Graceful Shutdown
const shutdown = async () => {
  logger.info('Shutting down TS3 Bot...');
  if (isConnected && client) {
    await client.quit();
    logger.info('Bot disconnected successfully.');
  }
  process.exit(0);
};

// Define your routes here
router.post('/kick', botController.kickUser); // Make sure botController.kickUser is defined
router.get('/status', botController.getStatus); // Make sure botController.getStatus is defined


process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
