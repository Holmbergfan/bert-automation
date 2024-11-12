const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('../utils/logger');
const TS3Credentials = require('../models/ts3Credentials');
const config = require('../config/config');
require('dotenv').config();

let client;
let statusChannelId = null;
let commandHandler;

// Connect as ServerQuery User, select server, then connect as real Client
const initializeClient = async (settings) => {
  if (!settings || !validateSettings(settings)) {
    throw new Error('Invalid settings provided');
  }

  try {
    await safeDisconnect();
    
    // Connect using ServerQuery credentials
    client = await TeamSpeak.connect({
      host: settings.host,
      queryport: settings.queryport,
      username: settings.username,
      password: settings.password,
      nickname: settings.nickname,
    });

    await client.useByPort(settings.port || config.ts3.defaultServerPort);

    // Register for events
    await client.registerEvent('server');
    await client.registerEvent('textserver');
    await client.registerEvent('textchannel');
    await client.registerEvent('textprivate');

    setupEventHandlers();
    await createStatusChannel();

    logger.info('TeamSpeak connection established successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to initialize TS3 client: ${error.message}`);
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
    logger.error(`TS3 client error: ${error.message}`);
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
    logger.error(`Error handling command: ${error.message}`);
  }
};

const createStatusChannel = async () => {
  try {
    const channels = await client.channelList();
    const existingChannel = channels.find(c => c.name === config.ts3.channelSettings.status.name);
    
    if (existingChannel) {
      statusChannelId = existingChannel.cid;
      logger.info('Using existing status channel:', { 
        channelName: existingChannel.name,
        channelId: statusChannelId
      });
    } else {
      // Ensure we have the channel name from config
      const channelName = config.ts3.channelSettings.status.name || 'Bot Status';
      
      logger.debug('Attempting to create channel with name:', channelName);
      
      // Create channel with all required properties
      const channelProps = {
        channel_name: channelName,
        channel_topic: "Bot Status Channel",
        channel_description: "This channel indicates that the bot is online",
        channel_flag_permanent: 1,
        channel_maxclients: 0,
        channel_maxfamilyclients: -1
      };
      
      logger.debug('Creating channel with properties:', channelProps);
      
      const channel = await client.channelCreate({
        channel_name: channelProps.channel_name,
        channel_topic: channelProps.channel_topic,
        channel_description: channelProps.channel_description,
        channel_flag_permanent: channelProps.channel_flag_permanent,
        channel_maxclients: channelProps.channel_maxclients,
        channel_maxfamilyclients: channelProps.channel_maxfamilyclients
      });
      statusChannelId = channel.cid;

      logger.info('Channel created successfully:', { 
        channelId: statusChannelId,
        channelName: channelName,
        response: channel
      });
    }
  } catch (error) {
    logger.error('Channel creation failed:', { 
      error: error.message,
      stack: error.stack,
      context: 'createStatusChannel',
      lastError: client?.lastError
    });
    throw error;
  }
};

// API endpoint handlers (if needed for interaction via API)
const getStatus = async (req, res) => {
  try {
    const status = client && client.connected ? 'online' : 'offline';
    res.json({ status });
  } catch (error) {
    logger.error(`Error getting status: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Initialize settings (retrieving from database)
const initializeSettings = async () => {
  try {
    const settings = await TS3Credentials.findOne();
    if (settings) {
      await initializeClient(settings);
    } else {
      logger.warn('No settings found for TeamSpeak bot');
    }
  } catch (error) {
    logger.error(`Error initializing settings: ${error.message}`);
  }
};

module.exports = {
  initializeClient,
  getStatus,
  initializeSettings
};
