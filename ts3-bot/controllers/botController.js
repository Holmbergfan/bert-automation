const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('../utils/logger');
const TS3Credentials = require('../models/ts3Credentials');
const config = require('../config/config');

let client;
let statusChannelId = null;

const validateSettings = (settings) => {
  const required = ['host', 'username', 'password'];
  const isValid = required.every(field => settings[field] && settings[field].toString().trim() !== '');
  if (!isValid) {
    logger.error('Missing required TS3 credentials', {
      missing: required.filter(field => !settings[field]).join(', ')
    });
  }
  return isValid;
};

const initializeSettings = async () => {
  try {
    const settings = await TS3Credentials.findById('ts3_credentials');
    if (!settings) {
      logger.error('Bot initialization failed', {
        error: 'No TS3 credentials found in database',
        context: 'database'
      });
      return false;
    }

    await initializeClient(settings);
    return true;
  } catch (error) {
    logger.error('Failed to initialize settings', {
      error: error.message,
      context: 'database'
    });
    return false;
  }
};

// Connect using ServerQuery credentials from MongoDB
const initializeClient = async (settings) => {
  if (!settings || !validateSettings(settings)) {
    throw new Error('Invalid settings provided');
  }

  try {
    await safeDisconnect();
    
    // Connect using ServerQuery credentials from MongoDB
    client = await TeamSpeak.connect({
      host: settings.host,
      queryport: settings.queryport || 10011,
      username: settings.username,
      password: settings.password,
      nickname: settings.nickname
    });

    // Select virtual server using port from MongoDB
    await client.useByPort(settings.port || 9987);

    // Register for events
    await client.registerEvent('server');
    await client.registerEvent('textserver');
    await client.registerEvent('textchannel');
    await client.registerEvent('textprivate');

    // Setup handlers and create status channel
    setupEventHandlers();
    await createStatusChannel();

    logger.info('TeamSpeak connection established', {
      host: settings.host,
      nickname: settings.nickname
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize TS3 client', {
      error: error.message,
      context: 'connection'
    });
    throw error;
  }
};

// Helper function to disconnect the bot
const safeDisconnect = async () => {
  if (client) {
    try {
      if (statusChannelId) {
        await client.channelDelete(statusChannelId);
      }
      if (client.connected) {
        await client.quit();
        logger.info('Successfully disconnected client');
      }
    } catch (error) {
      logger.error(`Error during disconnect: ${error.message}`);
    } finally {
      client = null;
      statusChannelId = null;
    }
  }
};

// Set up event handlers for the bot
const setupEventHandlers = () => {
  client.on('textmessage', async (event) => {
    if (event.msg.startsWith('!')) {
      const command = event.msg.substring(1).toLowerCase();
      handleCommand(command, event);
    }
  });

  client.on('error', (error) => {
    logger.error(`TS3 client error: ${error.message}`, { error });
  });

  client.on('close', () => {
    logger.warn('Connection to TS3 server closed');
    safeDisconnect();
  });
};

// Handle incoming text messages
const handleCommand = async (command, event) => {
  try {
    // Add your command handling logic here
    logger.info(`Received command: ${command} from ${event.invoker.nickname}`);
    
    // Example command response
    switch (command) {
      case 'ping':
        await client.sendTextMessage(event.invoker.clid, 1, "Pong!");
        break;
      // Add more commands as needed
    }
  } catch (error) {
    logger.error(`Error handling command: ${error.message}`, { error });
  }
};

const createStatusChannel = async () => {
  try {
    const channels = await client.channelList();
    const existingChannel = channels.find(c => c.name === config.ts3.channelSettings.status.name);
    if (existingChannel) {
      statusChannelId = existingChannel.cid;
      logger.info('Using existing status channel:', { channelName: existingChannel.name, channelId: statusChannelId });
    } else {
      const channelName = config.ts3.channelSettings.status.name;
      const channelProps = {
        channelTopic: "Bot Status Channel",
        channelDescription: "This channel indicates that the bot is online",
        channelFlagPermanent: false, // Make the channel temporary
        cpid: 0, // Parent channel ID 0 to place it at the top
        channelOrder: 0 // Order 0 to place it at the top
      };
      const channel = await client.channelCreate(channelName, channelProps);
      statusChannelId = channel.cid;
      
      // Log the entire channel object for debugging
      logger.debug('Created channel object:', channel);
      
      logger.info('Channel created successfully:', { channelId: statusChannelId, channelName: channel.name });
    }
  } catch (error) {
    logger.error(`Error creating status channel: ${error.message}`, { error });
  }
};

// API endpoint handlers (if needed for interaction via API)
const getStatus = async (req, res) => {
  try {
    const status = client && client.connected ? 'online' : 'offline';
    res.json({ status });
  } catch (error) {
    logger.error(`Error getting status: ${error.message}`, { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// API endpoint to update credentials
const updateCredentials = async (req, res) => {
  try {
    const credentials = await TS3Credentials.findOne();
    if (credentials) {
      await TS3Credentials.findByIdAndUpdate(credentials._id, req.body);
    } else {
      await TS3Credentials.create(req.body);
    }
    await initializeSettings();
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to update TS3 credentials:', error, { error });
    res.status(500).json({ error: 'Failed to update credentials' });
  }
};

module.exports = {
  initializeClient,
  getStatus,
  initializeSettings,
  updateCredentials
};
