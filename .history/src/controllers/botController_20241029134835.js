// src/controllers/botController.js

const TS3Credentials = require('../models/ts3Credentials'); // Adjust the path as necessary
const { TeamSpeak } = require('ts3-nodejs-library');

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
    console.log(`Attempting to kick user with ID: ${userId}`);
    if (!client) {
      console.log('Client is not initialized.');
      await initializeClient();
      
    }

    const { userId } = req.body;
    await client.kickClient(userId, TeamSpeak.Client.KickReason.channel, "Kicked by bot")
  .then(() => console.log(`Successfully kicked user with ID: ${userId}`))
  .catch((err) => console.error(`Error kicking user: ${err.message}`));

    res.json({ message: `User with ID ${userId} kicked successfully.` });
  } catch (error) {
    console.error(`Error kicking user: ${error.message}`);
    res.status(500).json({ message: 'Failed to kick user.', error: error.message });
  }
};

const express = require('express');
const router = express.Router();
const botService = require('../services/botService'); // Assuming this is where the bot logic is implemented

router.post('/kick', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    await botService.kickUser(userId); // Ensure botService has a method to handle kicking users
    res.status(200).json({ message: `User with ID ${userId} has been kicked.` });
  } catch (error) {
    console.error(`Failed to kick user: ${error.message}`);
    res.status(500).json({ message: 'Failed to kick user.', error: error.message });
  }
});

module.exports = router;
