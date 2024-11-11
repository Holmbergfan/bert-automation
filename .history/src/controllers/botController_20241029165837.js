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

  // Register for private text messages
  await client.executeCommand("servernotifyregister", {
    event: "textprivate"
  });

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
    console.warn('TS3 Client disconnected.');
  });

  client.on('error', (error) => {
    console.error(`TS3 Client Error: ${error.message}`);
  });
};

const handleCommand = async (command, invoker) => {
  switch (command) {
    case "ping":
      await client.sendTextMessage(invoker.clid, TeamSpeak.TextMessageTargetMode.CLIENT, "Pong!");
      break;

    case "help":
      await client.sendTextMessage(invoker.clid, TeamSpeak.TextMessageTargetMode.CLIENT, "Available commands: !ping, !help");
      break;

    // Add more cases here for different commands
    default:
      await client.sendTextMessage(invoker.clid, TeamSpeak.TextMessageTargetMode.CLIENT, `Unknown command: ${command}`);
  }
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

// Function to update bot settings in MongoDB
const updateSettings = async (req, res) => {
  try {
    const { host, port, username, password, nickname, serverId, channelId } = req.body;

    // Find and update the credentials in MongoDB
    const updatedCredentials = await TS3Credentials.findByIdAndUpdate(
      'ts3_credentials', // Assuming you have a document with this ID
      { host, port, username, password, nickname, serverId, channelId },
      { new: true, upsert: true } // Create if not exists
    );

    res.json({ message: 'Settings updated successfully.', updatedCredentials });
  } catch (error) {
    logger.error(`Error updating settings: ${error.message}`);
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
  updateSettings, // Make sure to export this new function
  initializeClient,
  updateSettings,
};