// src/testDatabase.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Player = require('./models/Player');
const logger = require('./utils/logger');

dotenv.config();

// Enable Mongoose debug mode for detailed logs (optional)
mongoose.set('debug', true);

const testDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB successfully.');

    // Fetch all players
    const players = await Player.find();
    logger.info(`Found ${players.length} player(s) in the database.`);
    players.forEach(player => {
      logger.info(`Player: ${player.name}, Status: ${player.status}, Last Seen: ${player.lastSeen}`);
    });

    // Disconnect after test
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
  } catch (error) {
    logger.error(`Test Database Error: ${error.message}`);
  }
};

testDatabase();
