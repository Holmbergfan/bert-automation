const { TeamSpeak } = require('ts3-nodejs-library');
let client;
let isConnected = false;

exports.initializeClient = async () => {
  try {
    client = await TeamSpeak.connect({
      host: process.env.TS3_HOST,
      queryport: parseInt(process.env.TS3_PORT, 10),
      username: process.env.TS3_USERNAME,
      password: process.env.TS3_PASSWORD,
      nickname: process.env.TS3_NICKNAME,
      serverport: 9987, // Default TS3 port; adjust if different
      serverid: parseInt(process.env.TS3_SERVER_ID, 10),
    });

    isConnected = true;
    client.on('close', () => {
      isConnected = false;
    });

    client.on('error', (error) => {
      console.error(`TS3 Client Error: ${error.message}`);
    });

    return 'Connected to TS3 server successfully.';
  } catch (error) {
    console.error(`Error initializing TS3 Client: ${error.message}`);
    throw new Error('Failed to connect to TS3 server.');
  }
};

exports.getStatus = async () => {
  if (isConnected) {
    const serverGroups = await client.serverGroupList();
    const clients = await client.clientList();
    return {
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
    };
  } else {
    return { status: 'offline' };
  }
};

exports.sendCommand = async (command) => {
  if (command === 'connect') {
    if (!isConnected) {
      return await this.initializeClient();
    } else {
      return 'Already connected.';
    }
  } else if (command === 'disconnect') {
    if (isConnected) {
      await client.quit();
      isConnected = false;
      return 'Disconnected from TS3 server successfully.';
    } else {
      return 'Already disconnected.';
    }
  } else {
    throw new Error('Unknown command.');
  }
};

// botService.js
const kickUser = async (userId) => {
  try {
    // Your logic to kick the user using the TeamSpeak library
    const client = await getClientById(userId); // Fetch the client by ID
    if (client) {
      await client.kickFromServer('You have been kicked by an admin.'); // Message is optional
    } else {
      throw new Error('User not found on the server.');
    }
  } catch (error) {
    throw new Error(`Unable to kick user: ${error.message}`);
  }
};



exports.banUser = async (userId) => {
  if (isConnected) {
    await client.banClient(userId);
    return `User ID ${userId} banned successfully.`;
  } else {
    throw new Error('Bot is not connected.');
  }
};

module.exports = {
  kickUser,
};
