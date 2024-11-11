// src/routes/bot.js

const express = require('express');
const router = express.Router();
const TS3Credentials = require('../models/ts3Credentials'); // Adjust the path as necessary

// Endpoint to fetch current settings
router.get('/settings', async (req, res) => {
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
    console.error(`Error fetching credentials: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch credentials.', error: error.message });
  }
});

// Endpoint to update settings
router.post('/settings', async (req, res) => {
  try {
    const { host, port, username, password, nickname, serverId, channelId } = req.body;
    const credentials = await TS3Credentials.findByIdAndUpdate(
      'ts3_credentials',
      { host, port, username, password, nickname, serverId, channelId },
      { new: true, upsert: true }
    );
    res.json({ message: 'Settings updated successfully', credentials });
  } catch (error) {
    console.error(`Error updating settings: ${error.message}`);
    res.status(500).json({ message: 'Failed to update settings.', error: error.message });
  }
});

// Endpoint to get bot status
router.get('/status', botController.getStatus);

// Endpoint to send commands to the bot
router.post('/command', botController.sendCommand);

// Endpoint to get player information
router.get('/player/:name', botController.getPlayerInfo);

// Endpoint to notify player login
router.post('/player-login', botController.playerLogin);



module.exports = router;
