const { TeamSpeak } = require('ts3-nodejs-library');
const TS3Credentials = require('../models/ts3Credentials'); // Adjust the path as necessary

let client;

const initializeClient = async () => {
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

  client.on('close', () => {
    console.warn('TS3 Client disconnected.');
  });

  client.on('error', (error) => {
    console.error(`TS3 Client Error: ${error.message}`);
  });
};

const kickUser = async (req, res) => {
  try {
    if (!client) {
      await initializeClient();
    }

    const { userId } = req.body;
    await client.kickClient(userId, TeamSpeak.Client.KickReason.channel, "Kicked by bot");
    res.json({ message: `User with ID ${userId} kicked successfully.` });
  } catch (error) {
    console.error(`Error kicking user: ${error.message}`);
    res.status(500).json({ message: 'Failed to kick user.', error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    if (!client) {
      await initializeClient();
    }

    const status = client ? 'online' : 'offline';
    res.json({ status });
  } catch (error) {
    console.error(`Error getting status: ${error.message}`);
    res.status(500).json({ message: 'Failed to get status.', error: error.message });
  }
};

const sendCommand = async (req, res) => {
  try {
    if (!client) {
      await initializeClient();
    }

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
    if (!client) {
      await initializeClient();
    }

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
    if (!client) {
      await initializeClient();
    }

    const { playerId } = req.body;
    // Implement player login handling logic here
    res.json({ message: `Player with ID ${playerId} logged in successfully.` });
  } catch (error) {
    console.error(`Error handling player login: ${error.message}`);
    res.status(500).json({ message: 'Failed to handle player login.', error: error.message });
  }
};

module.exports = {
  kickUser,
  getStatus,
  sendCommand,
  getPlayerInfo,
  playerLogin,
};