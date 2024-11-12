require('dotenv').config();

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  ts3: {
    credentials: {
      host: process.env.TS3_HOST,
      queryport: parseInt(process.env.TS3_QUERYPORT) || 10011,
      serverport: parseInt(process.env.TS3_SERVER_PORT) || 9987,
      username: process.env.TS3_USERNAME,
      password: process.env.TS3_PASSWORD,
      nickname: process.env.TS3_NICKNAME || 'Bert',
      serverId: parseInt(process.env.TS3_SERVER_ID) || 1
    },
    channelSettings: {
      status: {
        name: "━━ Bert [Online] ━━"
      }
    }
  }
};