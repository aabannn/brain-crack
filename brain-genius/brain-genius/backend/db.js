const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'players.sqlite3');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    phone       TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    best_score  INTEGER NOT NULL DEFAULT 0,
    plays       INTEGER NOT NULL DEFAULT 0,
    last_played TEXT,
    is_winner   INTEGER NOT NULL DEFAULT 0
  );
`);

function rowToPlayer(row) {
  if (!row) return null;
  return {
    name: row.name,
    phone: row.phone,
    bestScore: row.best_score,
    plays: row.plays,
    lastPlayed: row.last_played,
    isWinner: !!row.is_winner
  };
}

const stmts = {
  getByPhone: db.prepare('SELECT * FROM players WHERE phone = ?'),
  getAll: db.prepare('SELECT * FROM players'),
  insert: db.prepare(`
    INSERT INTO players (phone, name, best_score, plays, last_played, is_winner)
    VALUES (@phone, @name, @best_score, @plays, @last_played, @is_winner)
  `),
  updateResult: db.prepare(`
    UPDATE players
    SET name = @name,
        plays = plays + 1,
        last_played = @last_played,
        best_score = CASE WHEN @score > best_score THEN @score ELSE best_score END
    WHERE phone = @phone
  `),
  setWinner: db.prepare('UPDATE players SET is_winner = ? WHERE phone = ?')
};

function getPlayer(phone) {
  return rowToPlayer(stmts.getByPhone.get(phone));
}

function getAllPlayers() {
  return stmts.getAll.all().map(rowToPlayer);
}

// Registers a player if new, or just returns the existing record.
// Does NOT count as a "play" - that only happens when a game result is submitted.
function ensurePlayer(phone, name) {
  const existing = stmts.getByPhone.get(phone);
  if (existing) return rowToPlayer(existing);
  stmts.insert.run({
    phone,
    name,
    best_score: 0,
    plays: 0,
    last_played: null,
    is_winner: 0
  });
  return getPlayer(phone);
}

// Records a completed game: increments plays, updates bestScore/lastPlayed.
// Creates the player record first if it somehow doesn't exist yet.
function submitResult(phone, name, score) {
  ensurePlayer(phone, name);
  stmts.updateResult.run({
    phone,
    name,
    score,
    last_played: new Date().toISOString()
  });
  return getPlayer(phone);
}

function setWinner(phone, isWinner) {
  const result = stmts.setWinner.run(isWinner ? 1 : 0, phone);
  if (result.changes === 0) return null;
  return getPlayer(phone);
}

module.exports = { getPlayer, getAllPlayers, ensurePlayer, submitResult, setWinner };
