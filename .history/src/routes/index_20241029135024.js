// src/routes/index.js

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Activity = require('../models/Activity'); // Import Activity model
const logger = require('../utils/logger');
const moment = require('moment');
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');
const Death = require('../models/Death');
const TS3Credentials = require('../models/ts3Credentials.js'); // Adjust the path as necessary

// Middleware to fetch latest activities
router.use(async (req, res, next) => {
  try {
    const latestActivities = await Activity.find().sort({ timestamp: -1 }).limit(5);
    res.locals.latestActivities = latestActivities;
    next();
  } catch (error) {
    logger.error(`Error fetching latest activities: ${error.message}`);
    next();
  }
});

// Home Page
router.get('/', async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    res.render('index', { 
      totalPlayers, 
      activePage: 'home', 
      title: 'Home' 
    });
  } catch (error) {
    logger.error(`Error fetching total players: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// Dashboard Page
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch data for cards
    const totalTrackedPlayers = await Player.countDocuments();
    const highLevelSpawnsFree = 5; // Placeholder: Replace with actual logic
    const midLevelSpawnsFree = 10; // Placeholder
    const lowLevelSpawnsFree = 15; // Placeholder
    const totalCommandsFromUsers = 100; // Placeholder
    const totalCommandsFromBot = 200; // Placeholder
    const usersOnlineTS3 = 20; // Placeholder
    const usersAfkTS3 = 5; // Placeholder

    // Categorize Power Gamers
    const enemiesPowerGamers = await Player.find({ role: 'enemy' }).sort({ level: -1 }).limit(5);
    const friendsPowerGamers = await Player.find({ role: 'friend' }).sort({ level: -1 }).limit(5);
    const neutralsPowerGamers = await Player.find({ role: 'neutral' }).sort({ level: -1 }).limit(5);

    // Aggregation to categorize Latest Deaths
    const enemiesDeaths = await Player.aggregate([
      { $match: { 'deaths.isTeammateKill': false } },
      { $unwind: '$deaths' },
      { $match: { 'deaths.isTeammateKill': false } },
      { $sort: { 'deaths.timestamp': -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          victim: '$deaths.victim',
          killer: '$deaths.killer',
          victimLevel: '$deaths.victimLevel',
          reason: '$deaths.reason'
        }
      }
    ]);

    const friendsDeaths = await Player.aggregate([
      { $match: { 'deaths.isTeammateKill': true } },
      { $unwind: '$deaths' },
      { $match: { 'deaths.isTeammateKill': true } },
      { $sort: { 'deaths.timestamp': -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          victim: '$deaths.victim',
          killer: '$deaths.killer',
          victimLevel: '$deaths.victimLevel',
          reason: '$deaths.reason'
        }
      }
    ]);

    // For neutrals, adjust the criteria as needed. Assuming neutrals deaths are those not covered by above
    const neutralsDeaths = await Player.aggregate([
      { $unwind: '$deaths' },
      // Add criteria for neutrals deaths if any. Placeholder example:
      // { $match: { 'deaths.someNeutralCriteria': true } },
      { $sort: { 'deaths.timestamp': -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          victim: '$deaths.victim',
          killer: '$deaths.killer',
          victimLevel: '$deaths.victimLevel',
          reason: '$deaths.reason'
        }
      }
    ]);

    // Calculate total kills (as sum of all deaths)
    const totalKills = await Player.aggregate([
      { $unwind: '$deaths' },
      { $count: 'totalKills' }
    ]);

    const totalKillsCount = totalKills.length > 0 ? totalKills[0].totalKills : 0;

    res.render('dashboard', {
      title: 'Dashboard',
      totalTrackedPlayers,
      highLevelSpawnsFree,
      midLevelSpawnsFree,
      lowLevelSpawnsFree,
      totalCommandsFromUsers,
      totalCommandsFromBot,
      usersOnlineTS3,
      usersAfkTS3,
      enemiesPowerGamers,
      friendsPowerGamers,
      neutralsPowerGamers,
      enemiesDeaths,
      friendsDeaths,
      neutralsDeaths,
      totalKills: totalKillsCount,
      moment,
      activePage: 'dashboard'
    });
  } catch (error) {
    logger.error(`Error fetching data for dashboard: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});


// Players Management Page
router.get('/players', async (req, res) => {
  try {
    const players = await Player.find();
    res.render('players', { 
      players, 
      moment, 
      activePage: 'players', 
      title: 'Players Management' 
    });
  } catch (error) {
    logger.error(`Error fetching players: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// Add Player to Track
router.post('/add-player', async (req, res) => {
  const { name, role, mainStatus, comment } = req.body;

  if (!name || !role || !mainStatus) {
    req.flash('error', 'Player name, role, and main status are required.');
    logger.error('Player name, role, and main status are required.');
    return res.redirect('/players');
  }

  try {
    // Check if player exists on the website
    const url = `${config.baseUrl}/?subtopic=characters&name=${encodeURIComponent(name)}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const playerExists = $('table.TableContent').length > 0; // Adjust selector based on actual page
    if (!playerExists) {
      req.flash('error', `Player "${name}" does not exist on the server.`);
      logger.error(`Player "${name}" does not exist on the server.`);
      return res.redirect('/players');
    }

    const existingPlayer = await Player.findOne({ name });

    if (existingPlayer) {
      existingPlayer.role = role;
      existingPlayer.mainStatus = mainStatus;
      existingPlayer.comment = comment || '';
      existingPlayer.lastSeen = new Date();
      await existingPlayer.save();
      req.flash('message', `Updated player "${name}" with role "${role}".`);
      logger.info(`Updated player "${name}" with role "${role}".`);
    } else {
      const newPlayer = new Player({ name, role, mainStatus, comment });
      await newPlayer.save();
      req.flash('message', `Added player "${name}" with role "${role}" to tracking list.`);
      logger.info(`Added player "${name}" with role "${role}" to tracking list.`);
    }

    res.redirect('/players');
  } catch (err) {
    req.flash('error', `Error adding or updating player: ${err.message}`);
    logger.error(`Error adding or updating player: ${err.message}`);
    res.redirect('/players');
  }
});

// Remove Player from Tracking
router.post('/remove-player', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    req.flash('error', 'Player name is required.');
    return res.status(400).send('Player name is required.');
  }

  try {
    await Player.deleteOne({ name });
    req.flash('message', `Removed player "${name}" from tracking.`);
    logger.info(`Removed player "${name}" from tracking.`);
    res.redirect('/players');
  } catch (error) {
    req.flash('error', `Error removing player: ${error.message}`);
    logger.error(`Error removing player: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});



// Activities Page (Optional: To view more activities)
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 });
    res.render('activities', { 
      activities, 
      moment, 
      title: 'Activities', 
      activePage: 'activities' 
    });
  } catch (error) {
    logger.error(`Error fetching activities: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// Player Detail Page
router.get('/players/:name', async (req, res) => {
  const playerName = req.params.name;
  try {
    const player = await Player.findOne({ name: playerName });
    if (!player) {
      req.flash('error', `Player "${playerName}" not found.`);
      return res.redirect('/players');
    }
    res.render('playerDetail', { 
      player, 
      moment, 
      title: `${player.name} - Details`, 
      activePage: 'players' 
    });
  } catch (error) {
    logger.error(`Error fetching player details: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// Route to render the configuration page
router.get('/config', async (req, res) => {
  try {
    const credentials = await TS3Credentials.findById('ts3_credentials'); // Fetch credentials from MongoDB

    if (!credentials) {
      return res.status(404).json({ message: 'TS3 credentials not found' });
    }

    // Set the title variable for the page
    const title = 'Configuration';

    // Pass the fetched credentials to the view to pre-fill the form
    res.render('config', {
      ts3Host: credentials.host,
      ts3Port: credentials.port,
      ts3Username: credentials.username,
      ts3Password: credentials.password,
      ts3Nickname: credentials.nickname,
      ts3ServerId: credentials.serverId,
      ts3ChannelId: credentials.channelId,
      title
    });
  } catch (error) {
    console.error(`Error fetching credentials: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch credentials.', error: error.message });
  }
});

module.exports = router;