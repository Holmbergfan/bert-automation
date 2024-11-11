const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      serverSelectionTimeoutMS: 30000,
    }
  },
  server: {
    port: process.env.BOT_API_PORT || 3002,
    cors: {
      origin: 'http://localhost:3000',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    }
  },
  ts3: {
    defaultServerPort: 9987,
    channelSettings: {
      status: {
        name: "━━ Bert the Bot [Online] ━━",
        type: 0,
        maxclients: -1,
        codec: 4,
        codecQuality: 10
      }
    },
    commands: {
      prefix: '!'
    },
    clientOptions: {
      nickname: "Bert The Bot",
      platform: "Node Bot",
      version: "1.0",
      default: {
        channel: "Lobby",
        clientType: 0  // 0 = Regular client, 1 = Query client
      }
    }
  }
};