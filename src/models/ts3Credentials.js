const mongoose = require('mongoose');

const ts3CredentialsSchema = new mongoose.Schema({
  host: String,
  queryport: Number,
  port: Number,
  username: String,
  password: String,
  nickname: String,
  serverId: Number,
  channelId: Number
}, { 
  timestamps: true,
  strict: false // Allow flexible document structure
});

module.exports = mongoose.model('TS3Credentials', ts3CredentialsSchema);
