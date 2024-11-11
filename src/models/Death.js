// src/models/Death.js

const mongoose = require('mongoose');

const deathSchema = new mongoose.Schema({
  victim: { type: String, required: true }, // Name of the player who died
  killer: { type: String, required: true }, // Name of the player who killed
  victimLevel: { type: Number, required: true }, // Level of the victim
  killerLevel: { type: Number, required: true }, // Level of the killer
 // timestamp: { type: Date, default: Date.now },
  reason: { type: String }, // Optional: Reason for death
  isTeammateKill: { type: Boolean, default: false }, // Whether the kill was by a teammate
  timestamp: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return !isNaN(Date.parse(value));
      },
      message: props => `${props.value} is not a valid date!`
    }
  }
});


module.exports = mongoose.model('Death', deathSchema);
