// src/scrapers/WhoIsOnlineScraper.js

const axios = require('axios');
const cheerio = require('cheerio');
const Player = require('../models/Player');
const Activity = require('../models/Activity');
const config = require('../config/config');
const logger = require('../utils/logger');

const scrapeWhoIsOnline = async () => {
  try {
    const response = await axios.get(`${config.baseUrl}/?subtopic=whoisonline`);
    const html = response.data;
    const $ = cheerio.load(html);

    // Check if the table exists
    const table = $('table.TableContent').first();
    if (!table.length) {
      logger.error('No online players table found.');
      return;
    }

    // Extract player names
    const onlinePlayers = [];
    table.find('tr').each((index, element) => {
      if (index === 0) return; // Skip header row
      const name = $(element).find('td a').text().trim();
      if (name) {
        onlinePlayers.push(name);
      }
    });

    // Fetch all tracked players from the database
    const allPlayers = await Player.find();

    // Prepare bulk operations for status updates
    const bulkOps = allPlayers.map(player => {
      if (onlinePlayers.includes(player.name)) {
        return {
          updateOne: {
            filter: { _id: player._id },
            update: { status: 'online', lastSeen: new Date() }
          }
        };
      } else {
        return {
          updateOne: {
            filter: { _id: player._id },
            update: { status: 'offline' }
          }
        };
      }
    });

    if (bulkOps.length > 0) {
      const result = await Player.bulkWrite(bulkOps);
      logger.info(`Bulk update result: ${JSON.stringify(result)}`);
    }

    // Record activities for players who came online and send notifications
    for (const player of allPlayers) {
      if (onlinePlayers.includes(player.name) && player.status !== 'online') {
        // Player has come online
        const activity = new Activity({
          playerName: player.name,
          description: 'Player came online',
        });
        await activity.save();
        logger.info(`Recorded activity for player ${player.name} coming online.`);

        // Send notification to TS3 channel via bot's API
        await sendLoginNotification(player);
      }
    }

    // Log the update
    logger.info('Who Is Online scraper executed successfully.');
  } catch (error) {
    logger.error(`Error in Who Is Online scraper: ${error.message}`);
  }
};

// Function to send login notifications based on player role
const sendLoginNotification = async (player) => {
  try {
    const botApiUrl = config.BOT_API_URL; // Ensure this is defined in your config
    const botApiKey = config.BOT_API_KEY; // Ensure this is defined and secure

    // Determine the type of notification based on player role
    let notificationType;
    if (player.role.toLowerCase() === 'enemy') {
      notificationType = 'warning';
    } else {
      notificationType = 'normal';
    }

    // Prepare the payload
    const payload = {
      playerName: player.name,
      notificationType: notificationType
    };

    // Send POST request to bot's /notify-login endpoint
    await axios.post(`${botApiUrl}/notify-login`, payload, {
      headers: {
        'x-api-key': botApiKey,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Sent ${notificationType} notification for player ${player.name} login.`);
  } catch (error) {
    logger.error(`Failed to send login notification for player ${player.name}: ${error.message}`);
  }
};

module.exports = scrapeWhoIsOnline;
