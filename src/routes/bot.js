// src/routes/bot.js

const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Get bot status
router.get('/status', botController.getStatus);

// Get and update bot settings
router.get('/settings', botController.getSettings);
router.post('/settings', botController.updateSettings);

// Send commands to the bot
router.post('/command', botController.sendCommand);

module.exports = router;
