require('dotenv').config({ path: '../.env' }); // Ensure this path is correct
const express = require('express');
const cors = require('cors');
const app = express();
const { TeamSpeak } = require('ts3-nodejs-library');
const logger = require('./utils/logger'); // Adjust the path if necessary
const mongoose = require('mongoose');

const BOT_API_PORT = process.env.BOT_API_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI; // Ensure this is defined in .env
const botController = require('./controllers/botController'); // Adjust the path if necessary

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit if DB connection fails
  });

// Define the TS3 Credentials Schema
const ts3CredentialsSchema = new mongoose.Schema({
  _id: String,
  host: String,
  port: Number,
  username: String,
  password: String,
  nickname: String,
  serverId: Number,
  channelId: Number
}, { collection: 'ts3_credentials' });

const TS3Credentials = mongoose.model('TS3Credentials', ts3CredentialsSchema);

// Authentication Middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.BOT_API_KEY) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Initialize TS3 Client
let client;
let isConnected = false;