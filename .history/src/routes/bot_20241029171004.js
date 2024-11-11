// src/routes/bot.js

const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController'); // Adjust the path as necessary

// Endpoint to get bot status
router.get('/status', botController.getStatus);

// Endpoint to send commands to the bot
router.post('/command', botController.sendCommand);

// Endpoint to get player information
router.get('/player/:name', botController.getPlayerInfo);

// Endpoint to notify player login
router.post('/player-login', botController.playerLogin);

// Endpoint to kick a user
router.post('/kick', botController.kickUser);

// Endpoint to update bot settings
router.post('/settings', botController.updateSettings); // Add this line

module.exports = router;
