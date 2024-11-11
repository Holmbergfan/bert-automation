const express = require('express');
const router = express.Router();
const deathController = require('../controllers/deathController'); // Adjust the path as necessary

// Define your routes here
router.get('/', deathController.getAllDeaths);
router.post('/', deathController.createDeath);

module.exports = router;