// src/routes/api/players.js

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const jwt = require('jsonwebtoken');

// Middleware to verify API key
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.WEBAPP_API_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Add a new player to track
router.post('/add', authenticate, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Player name is required.' });
  }

  try {
    const existingPlayer = await Player.findOne({ name: name });

    if (existingPlayer) {
      return res.status(400).json({ message: 'Player is already being tracked.' });
    }

    const newPlayer = new Player({
      name: name,
      status: 'offline',
      level: 1,
      role: 'neutral',
      profession: '',
      comment: '',
      deaths: [],
      otherCharacters: [],
      profession: '',
      residence: '',
      sex: 'male'
    });

    await newPlayer.save();

    res.status(200).json({ message: `Player "${name}" has been added to the tracking list.` });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get player details by name
router.get('/:name', authenticate, async (req, res) => {
  const playerName = req.params.name;

  try {
    const player = await Player.findOne({ name: playerName });

    if (!player) {
      return res.status(404).json({ message: `Player "${playerName}" not found.` });
    }

    res.status(200).json({ player });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
