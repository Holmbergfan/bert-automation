// src/models/ts3Credentials.js

const mongoose = require('mongoose');

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

module.exports = mongoose.model('TS3Credentials', ts3CredentialsSchema);