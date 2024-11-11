// src/routes/deaths.js

const express = require('express');
const router = express.Router();
//const recordDeath = require('../scrapers/deathRecorder');
const logger = require('../utils/logger');
const deathController = require('../controllers/deathController'); // Adjust the path as necessary

// Define your routes here
router.get('/', deathController.getAllDeaths);
router.post('/', deathController.createDeath);

// Endpoint to record a death
router.post('/record-death', async (req, res) => {
  const { victimName, killerName, reason } = req.body;

  if (!victimName || !killerName) {
    return res.status(400).json({ error: 'Victim and Killer names are required.' });
  }

  try {
    await recordDeath({ victimName, killerName, reason });
    res.status(200).json({ message: 'Death recorded successfully.' });
  } catch (error) {
    logger.error(`Error in /record-death route: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
