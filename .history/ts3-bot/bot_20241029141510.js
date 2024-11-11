require('dotenv').config({ path: '../.env' }); // Ensure this path is correct
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const botRoutes = require('./routes/bot'); // Adjust the path as necessary

const app = express();
const PORT = process.env.BOT_API_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use('/bot', botRoutes); // Use the bot routes

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Bot API server is running on port ${PORT}`);
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