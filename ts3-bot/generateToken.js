// generateToken.js

require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { bot: 'ts3-bot' }, // Payload
  process.env.WEBAPP_API_KEY, // Secret
  { expiresIn: '1h' } // Options
);

console.log(`JWT Token: ${token}`);