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

module.exports = {
  kickUser,
    getStatus,
    sendCommand,
    getPlayerInfo,
    playerLogin,
  };