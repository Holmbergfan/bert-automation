// src/models/Activity.js

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Activity', activitySchema);
