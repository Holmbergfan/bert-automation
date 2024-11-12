const mongoose = require('mongoose');

const ts3CredentialsSchema = new mongoose.Schema({
  _id: String,
  host: String,
  queryport: Number,
  port: Number,
  username: String,
  password: String,
  nickname: String,
  serverId: Number,
  channelId: Number
}, { 
  collection: 'ts3_credentials', // Specify collection name
  _id: false, // Allow custom _id
  timestamps: true
});

module.exports = mongoose.model('TS3Credentials', ts3CredentialsSchema, 'ts3_credentials');