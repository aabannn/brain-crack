require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const playersRouter = require('./routes/players');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') }));
app.use(express.json());

// Serve static frontend assets so players get the full game on the same port
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/players', playersRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Brain Genius API listening on http://localhost:${PORT}`);
});
