const { TeamSpeak } = require('ts3-nodejs-library');
const TS3Credentials = require('../models/ts3Credentials');
const logger = require('../utils/logger');
require('dotenv').config();
const config = require('../config/config');
const CommandHandler = require('../services/commands');

let client;
let mainChannelId = null;
let commandHandler;

// Helper functions
const getClientInfo = async () => {
  try {
    const whoami = await client.whoami();
    if (!whoami) {
      throw new Error('Could not get client info');
    }
    return whoami;
  } catch (error) {
    logger.error('Error getting client info:', error);
    throw error;
  }
};

const safeDisconnect = async () => {
  if (!client) return;

  try {
    if (client.connected) {
      // Get own client info before disconnecting
      const whoami = await getClientInfo();
      if (whoami && whoami.client_id) {
        try {
          await client.quit();
          logger.info('Successfully disconnected client');
        } catch (err) {
          logger.warn(`Error during quit: ${err.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error during safe disconnect: ${error.message}`);
  } finally {
    client = null;
    mainChannelId = null;
  }
};

const isStatusChannel = (channelId) => {
  return channelId === mainChannelId;
};

const cleanupChannels = async () => {
  if (!client || !client.connected) {
    logger.info('No active client connection, skipping cleanup');
    return;
  }

  logger.info('Starting channel cleanup...');
  
  try {
    const channels = await client.channelList();
    const botChannels = channels.filter(ch => 
      ch.name.includes('robertoBert') && ch.cid !== mainChannelId
    );
    
    for (const channel of botChannels) {
      try {
        await client.channelDelete(channel.cid);
        logger.info(`Deleted channel ${channel.cid}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        logger.warn(`Failed to delete channel ${channel.cid}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error('Error during cleanup:', error);
  } finally {
    mainChannelId = null;
  }
};

const handleInitError = (error) => {
  logger.error('Failed to initialize TeamSpeak client:', error);
  if (client) {
    safeDisconnect();
  }
  throw error;
};

const generateNickname = (base, attempt = 0) => {
  return attempt === 0 ? base : `${base}_${attempt}`;
};

const setNickname = async (client, baseName, maxAttempts = 2) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const nickname = generateNickname(baseName, i);
      await client.execute('clientupdate', { client_nickname: nickname });
      logger.info(`Successfully set nickname to: ${nickname}`);
      return nickname;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error(`Failed to set nickname after ${maxAttempts} attempts`);
      }
      logger.warn(`Nickname "${generateNickname(baseName, i)}" in use, trying next...`);
    }
  }
};

const generateUniqueNickname = (baseName) => {
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${baseName}_${timestamp}${random}`;
};

const connectWithRetry = async (settings, maxRetries = 3) => {
  // First try to clean up any existing connections
  try {
    const tempClient = await TeamSpeak.connect({
      host: settings.host,
      queryport: settings.port,
      username: settings.username,
      password: settings.password
    });

    const clients = await tempClient.clientList();
    const ghostClients = clients.filter(c => 
      c.type === 1 && c.client_nickname.includes('Bert The Bot')
    );

    for (const ghost of ghostClients) {
      try {
        await tempClient.clientKick(ghost.clid, 'server', 'Cleaning up ghost connection');
        logger.info(`Cleaned up ghost client: ${ghost.client_nickname}`);
      } catch (err) {
        logger.warn(`Failed to clean ghost client: ${err.message}`);
      }
    }

    await tempClient.quit();
  } catch (error) {
    logger.warn(`Initial cleanup failed: ${error.message}`);
  }

  // Now try to establish a new connection
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const uniqueNickname = generateUniqueNickname(settings.nickname || config.ts3.clientOptions.nickname);
      logger.info(`Attempt ${attempt + 1}: Connecting with nickname: ${uniqueNickname}`);

      const newClient = await TeamSpeak.connect({
        host: settings.host,
        queryport: settings.port,
        username: settings.username,
        password: settings.password,
        nickname: uniqueNickname
      });

      // First select the server
      await newClient.execute('use', { sid: settings.serverId || 1 });

      // Then check connection
      const whoami = await newClient.execute('whoami');
      logger.info('Connection details:', whoami);

      if (!whoami?.client_id) {
        throw new Error('Client ID not received');
      }

      // Set client properties
      await newClient.execute('clientupdate', {
        client_nickname: uniqueNickname,
        client_input_muted: 1,
        client_output_muted: 0,
        client_input_hardware: 0,
        client_output_hardware: 1
      });

      logger.info(`Successfully connected as ${uniqueNickname} with ID ${whoami.client_id}`);
      return newClient;
    } catch (error) {
      logger.warn(`Connection attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const initializeClient = async (settings) => {
  if (!validateSettings(settings)) return;
  
  await safeDisconnect();
  
  try {
    client = await connectWithRetry(settings);
    commandHandler = new CommandHandler(client);
    await setupBot();
    return true;
  } catch (error) {
    logger.error('Error during initialization:', error);
    await safeDisconnect();
    throw error;
  }
};

const validateSettings = (settings) => {
  if (!settings) {
    logger.error('No settings provided for TS3 initialization');
    return false;
  }

  const requiredFields = ['host', 'port', 'username', 'password'];
  const missingFields = requiredFields.filter(field => !settings[field]);
  
  if (missingFields.length > 0) {
    logger.error(`Invalid TS3 settings: missing ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
};

const setupBot = async () => {
  await cleanupChannels();
  await createStatusChannel();
  await setupEventHandlers();
};

// Channel management
const createStatusChannel = async () => {
  try {
    const mainChannel = await client.channelCreate("━━ Bert the Bot [Online] ━━", {
      type: 0,
      maxclients: -1,
      codec: 4,
      codecQuality: 10
    });

    await client.channelEdit(mainChannel.cid, {
      channel_order: 0,
      channel_topic: "Bot Status: Online",
      channel_description: "[center][b]Bot Status[/b]\n[color=green]✓ Connected[/color]\n\nType !help for commands[/center]"
    });

    mainChannelId = mainChannel.cid;
    logger.info(`Created status channel with ID ${mainChannelId}`);

    // Move bot to the status channel
    const whoami = await client.whoami();
    if (whoami && whoami.client_id) {
      await client.clientMove(whoami.client_id, mainChannelId);
      logger.info('Bot moved to status channel');
    }
  } catch (error) {
    logger.error(`Error creating status channel: ${error.message}`);
  }
};

// Event handlers
const handleTextMessage = async (ev) => {
  try {
    const message = ev.msg;
    if (message.startsWith(config.ts3.commands.prefix)) {
      const command = message.substring(1).toLowerCase();
      await commandHandler.handleCommand(command, ev);
    }
  } catch (error) {
    logger.error(`Error handling text message: ${error.message}`);
  }
};

const handleDisconnect = async () => {
  logger.warn('Connection to TS3 server closed');
  client = null;
  mainChannelId = null;
};

const handleError = (error) => {
  logger.error(`TS3 client error: ${error.message}`);
};

const setupShutdownHandlers = () => {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const setupEventHandlers = async () => {
  try {
    await client.registerEvent("textserver");
    await client.registerEvent("textchannel");
    await client.registerEvent("textprivate");
    
    client.on("textmessage", handleTextMessage);
    client.on("close", handleDisconnect);
    client.on("error", handleError);
  } catch (error) {
    logger.error(`Error setting up event handlers: ${error.message}`);
  }
};

// Command handlers
const handleCommand = async (command, event) => {
  const commands = {
    ping: async () => {
      await client.sendTextMessage(event.invoker.clid, 1, "Pong!");
    },
    help: async () => {
      await client.sendTextMessage(event.invoker.clid, 1, "Available commands: !ping, !help");
    },
  };

  try {
    const handler = commands[command];
    if (handler) {
      await handler();
    } else {
      await client.sendTextMessage(event.invoker.clid, 1, `Unknown command: ${command}`);
    }
  } catch (error) {
    logger.error(`Error handling command ${command}: ${error.message}`);
  }
};

// API endpoint handlers
const getStatus = async (req, res) => {
  try {
    const status = client && client.connected ? 'online' : 'offline';
    res.json({ status });
  } catch (error) {
    logger.error(`Error getting status: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    await initializeClient(settings);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error(`Error updating settings: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await TS3Credentials.findOne();
    res.json(settings || {});
  } catch (error) {
    logger.error(`Error fetching settings: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const sendCommand = async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // Handle the command based on your requirements
    switch (command) {
      case 'connect':
        await initializeClient();
        res.json({ message: 'Connected successfully' });
        break;
      case 'disconnect':
        await cleanupChannels();
        await safeDisconnect();
        res.json({ message: 'Disconnected successfully' });
        break;
      default:
        res.status(400).json({ error: 'Invalid command' });
    }
  } catch (error) {
    logger.error(`Error executing command: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update shutdown handler
const shutdown = async () => {
  logger.info('Shutting down TS3 Bot...');
  await safeDisconnect();
};

// Export only what's needed
module.exports = {
  initializeClient,
  getStatus,
  getSettings,
  updateSettings,
  sendCommand,
  cleanupChannels,
  client // Export client if needed elsewhere
};
