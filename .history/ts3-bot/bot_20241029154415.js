require('dotenv').config({ path: '../.env' }); // This explicitly points to the `.env` file in the project root directory
const express = require('express');
const cors = require('cors'); // Import the cors middleware
const app = express();
const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('./utils/logger'); // Adjust the path as necessary
const mongoose = require('mongoose');

const BOT_API_PORT = process.env.BOT_API_PORT || 3002;
console.log('Current Directory:', process.cwd());
console.log('MongoDB URI:', process.env.MONGODB_URI);

// MongoDB connection
mongoose.connect(config.mongodbUriI,
  serverSelectionTimeoutMS: 30000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Bot API server is running on port ${PORT}`);
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



// Middleware
app.use(cors());
app.use(express.json());
app.use('/bot', botRoutes); // Use the bot routes
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
      serverport: 9987,
      serverid: credentials.serverId,
    });

    isConnected = true;
    logger.info('Connected to TS3 server successfully.');

    client.on('close', () => {
      isConnected = false;
      logger.warn('TS3 Client disconnected.');
    });

    client.on('error', (error) => {
      logger.error(`TS3 Client Error: ${error.message}`);
    });
  } catch (error) {
    logger.error(`Error initializing TS3 Client: ${error.message}`);
  }
};

// Example endpoint to get bot status
app.get('/status', authenticate, async (req, res) => {
  try {
    logger.info('Received request for bot status');
    if (isConnected && client) {
      const serverGroups = await client.serverGroupList();
      const clients = await client.clientList();
      res.json({
        status: 'online',
        channel: client.channel,
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);