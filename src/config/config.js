// src/config/config.js

require('dotenv').config();

module.exports = {
  baseUrl: process.env.BASE_URL, // Replace with your actual base URL
  scrapeInterval: '*/5 * * * *', // Example: Every 5 minutes
  mongodbUri: process.env.MONGODB_URI, // Replace with your MongoDB URI
  BOT_API_URL: process.env.BOT_API_URL || 'http://localhost:3002', // Replace with your bot's API URL
  BOT_API_KEY: process.env.BOT_API_KEY || '332036edf6199a0c3695b50c2b562e0c06725015c823c374ada16c2e8a51a1bffe2c12bfc320ef9543b13f367204d5b4be699cebe4cddcdc0b88cfd4d51a24c7', // Securely store and manage your Bot API Key
  // Add other configurations as needed
};