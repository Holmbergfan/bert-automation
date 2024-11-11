// src/models/Player.js

const mongoose = require('mongoose');

const deathSchema = new mongoose.Schema({
  victim: { type: String, required: true },
  killer: { type: String, required: true },
  victimLevel: { type: Number, required: true },
  reason: { type: String, default: 'Unknown' },
  isTeammateKill: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
  level: { type: Number, default: 1 },
  role: { type: String, enum: ['friend', 'enemy', 'neutral'], default: 'neutral' },
  vocation: { type: String },
  comment: { type: String },
  deaths: [deathSchema], // Embedded Death documents
  deathsFromTeammates: { type: Number, default: 0 },
  killsToTeammates: { type: Number, default: 0 },
  lastLogin: { type: Date },
  otherCharacters: [{ type: String }],
  profession: { type: String },
  residence: { type: String },
  sex: { type: String, enum: ['male', 'female'], default: 'male' },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
