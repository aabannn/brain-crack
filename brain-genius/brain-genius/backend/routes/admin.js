const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/admin/login  { password }
// The real check happens here, server-side, instead of shipping the
// password to the browser as it was in the original single-file version.
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }
  res.json({ ok: true });
});

// POST /api/admin/toggle-winner  { password, phone }
// Password is re-checked on every mutating admin action rather than trusting
// the client to have "already logged in", since there's no session/token here.
router.post('/toggle-winner', (req, res) => {
  const { password, phone } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const current = db.getPlayer(phone);
  if (!current) return res.status(404).json({ error: 'Player not found.' });
  const updated = db.setWinner(phone, !current.isWinner);
  res.json(updated);
});

module.exports = router;
