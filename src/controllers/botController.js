const { TeamSpeak } = require('ts3-nodejs-library'); // Import only TeamSpeak
const TS3Credentials = require('../models/ts3Credentials'); // Adjust the path as necessary
const logger = require('../utils/logger'); // Ensure logger is imported

let client;

const initializeClient = async () => {
  if (client && client.connected) {
    logger.info('TS3 Client is already connected.');
    return; // Avoid re-initializing if already connected
  }

  try {
    const credentials = await TS3Credentials.findById('ts3_credentials');
    if (!credentials) {
      throw new Error('TS3 credentials not found in the database');
    }

    logger.info('Connecting to TS3 server with the following credentials:', {
      host: credentials.host,
      queryport: credentials.port,
      username: credentials.username,
      // Do not log password for security reasons
      nickname: credentials.nickname,
      serverport: 9987,
      serverid: credentials.serverId,
    });

    client = await TeamSpeak.connect({
      host: credentials.host,
      queryport: credentials.port,
      username: credentials.username,
      password: credentials.password,
      nickname: credentials.nickname,
      serverport: 9987,
      serverid: credentials.serverId,
    });

    logger.info('Connected to TS3 server successfully.');

    // Corrected logger statement without the extra parenthesis
    logger.info('Creating temporary channel with parameters:', {
      channelName: "Bert The Bot Is connected to the TS3 server and listen to textcommands",
      channelFlagPermanent: false,
      channelCodecQuality: 10,
      channelCodec: 0, // Ensure this is a numerical value
    });

    // Corrected channel creation with camelCase parameters
    await client.channelCreate({
      channelName: "Bert The Bot Is connected to the TS3 server and listen to textcommands",
      channelFlagPermanent: false,
      channelCodecQuality: 10,
      channelCodec: 0, // Use numerical value as per library requirements
    });

    // Register for private text messages
    await client.registerEvent("textprivate");

    // Listening for text messages
    client.on("textmessage", async (event) => {
      console.log(`Message received from ${event.invoker.nickname}: ${event.msg}`);

      // Handle commands like !command
      if (event.msg.startsWith("!")) {
        const command = event.msg.substring(1).toLowerCase(); // Get command without "!"
        await handleCommand(command, event.invoker);
      }
    });

    client.on('close', () => {
      logger.warn('TS3 Client disconnected.');
    });

    client.on('error', (error) => {
      logger.error(`TS3 Client Error: ${error.message}`);
    });
  } catch (error) {
    logger.error(`Error initializing TS3 Client: ${error.message}`);
  }
};

const handleCommand = async (command, invoker) => {
  switch (command) {
    case "ping":
      await client.sendTextMessage(invoker.clid, 4, "Pong!"); // Use numerical mode
      break;

    case "help":
      await client.sendTextMessage(invoker.clid, 4, "Available commands: !ping, !help"); // Use numerical mode
      break;

    // Add more cases here for different commands
    default:
      await client.sendTextMessage(invoker.clid, 4, `Unknown command: ${command}`); // Use numerical mode
  }
};

const kickUser = async (req, res) => {
  try {
    if (!client) {
      await initializeClient();
    }

    const { userId } = req.body;
    await client.kickClient(userId, 'CHANNEL', "Kicked by bot"); // Replace enumeration with string
    res.json({ message: `User with ID ${userId} kicked successfully.` });
  } catch (error) {
    console.error(`Error kicking user: ${error.message}`);
    res.status(500).json({ message: 'Failed to kick user.', error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const status = client ? 'online' : 'offline';
    res.json({ status });
  } catch (error) {
    console.error(`Error getting status: ${error.message}`);
    res.status(500).json({ message: 'Failed to get status.', error: error.message });
  }
};

const sendCommand = async (req, res) => {
  try {
    const { command } = req.body;
    // Implement command handling logic here
    res.json({ message: `Command ${command} sent successfully.` });
  } catch (error) {
    console.error(`Error sending command: ${error.message}`);
    res.status(500).json({ message: 'Failed to send command.', error: error.message });
  }
};

const getPlayerInfo = async (req, res) => {
  try {
    const { name } = req.params;
    // Implement player info fetching logic here
    res.json({ player: { name, info: 'Player info' } });
  } catch (error) {
    console.error(`Error getting player info: ${error.message}`);
    res.status(500).json({ message: 'Failed to get player info.', error: error.message });
  }
};

const playerLogin = async (req, res) => {
  try {
    const { playerId } = req.body;
    // Implement player login handling logic here
    res.json({ message: `Player with ID ${playerId} logged in successfully.` });
  } catch (error) {
    console.error(`Error handling player login: ${error.message}`);
    res.status(500).json({ message: 'Failed to handle player login.', error: error.message });
  }
};

const assignServerAdmin = async (req, res) => {
  try {
    const { queryLoginName, queryLoginPassword } = req.body;

    // Connect to the TS3 Server Query interface
    const queryClient = await TeamSpeak.connect({
      host: '64.23.190.127',
      queryport: 10011,
      username: queryLoginName,
      password: queryLoginPassword,
    });

    // Get the client database ID
    const clientList = await queryClient.clientList();
    const queryUser = clientList.find(client => client.clientLoginName === queryLoginName);
    if (!queryUser) {
      throw new Error('Query user not found');
    }

    const clientDbInfo = await queryClient.clientDbInfo(queryUser.clid);
    const clientDbId = clientDbInfo.cldbid;

    // Assign the server admin group
    await queryClient.serverGroupAddClient(6, clientDbId); // Replace 6 with the actual server admin group ID

    res.json({ message: 'Server admin privileges assigned successfully.' });
  } catch (error) {
    console.error(`Error assigning server admin privileges: ${error.message}`);
    res.status(500).json({ message: 'Failed to assign server admin privileges.', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { host, port, username, password, nickname, serverId, channelId } = req.body;

    const credentials = await TS3Credentials.findById('ts3_credentials');
    if (!credentials) {
      return res.status(404).json({ message: 'TS3 credentials not found' });
    }

    credentials.host = host;
    credentials.port = port;
    credentials.username = username;
    credentials.password = password;
    credentials.nickname = nickname;
    credentials.serverId = serverId;
    credentials.channelId = channelId;

    await credentials.save();
    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error(`Error updating settings: ${error.message}`);
    res.status(500).json({ message: 'Failed to update settings.', error: error.message });
  }
};

module.exports = {
  kickUser,
  getStatus,
  sendCommand,
  getPlayerInfo,
  assignServerAdmin,
  playerLogin,
  updateSettings,
  initializeClient,
};
