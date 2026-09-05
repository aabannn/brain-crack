const express = require('express');
const db = require('../db');

const router = express.Router();

function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2;
}
function isValidPhone(phone) {
  return typeof phone === 'string' && /^[0-9+\-\s]{7,15}$/.test(phone.trim());
}

// GET /api/players - full list, used by leaderboard + admin panel
router.get('/', (req, res) => {
  res.json(db.getAllPlayers());
});

// GET /api/players/:phone - single player lookup, used on registration/home
router.get('/:phone', (req, res) => {
  const player = db.getPlayer(req.params.phone);
  res.json(player); // null if not found - frontend treats that as "new player"
});

// POST /api/players/register  { name, phone } - create-if-missing, no play increment
router.post('/register', (req, res) => {
  const { name, phone } = req.body || {};
  if (!isValidName(name)) return res.status(400).json({ error: 'Please enter your name.' });
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  const player = db.ensurePlayer(phone.trim(), name.trim());
  res.json(player);
});

// POST /api/players/result  { name, phone, score } - record a finished game
router.post('/result', (req, res) => {
  const { name, phone, score } = req.body || {};
  if (!isValidName(name)) return res.status(400).json({ error: 'Please enter your name.' });
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Invalid score.' });
  }
  const player = db.submitResult(phone.trim(), name.trim(), Math.round(score));
  res.json(player);
});

module.exports = router;
