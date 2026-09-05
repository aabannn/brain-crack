/* ---------------- STATE ---------------- */
let player = null; // {name, phone}
let session = { round: 0, score: 0, lives: START_LIVES, timer: null, timerStart: 0, locked: false };

/* ---------------- SCREEN NAV ---------------- */
function goto(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---------------- GAME LOOP ---------------- */
function startGame() {
  session = { round: 0, score: 0, lives: START_LIVES, timer: null, timerStart: 0, locked: false };
  goto('screen-game');
  nextRound();
}

function updateHud() {
  document.getElementById('hud-score').textContent = "Score: " + session.score;
  document.getElementById('hud-lives').textContent =
    "\u2665".repeat(session.lives) + "\u2661".repeat(START_LIVES - session.lives);
}

function difficultyForRound(r) { return 1 + Math.floor(r / 2); } // r is 0-indexed
function difficultyLabel(d) {
  if (d <= 2) return "Junior";
  if (d <= 4) return "Master";
  return "Genius";
}

function nextRound() {
  if (session.round >= TOTAL_ROUNDS || session.lives <= 0) {
    endGame();
    return;
  }
  session.locked = false;
  const gameType = GAME_ORDER[session.round % GAME_ORDER.length];
  const difficulty = difficultyForRound(session.round);
  document.getElementById('board-game-title').textContent = GAME_TITLES[gameType];
  document.getElementById('board-round-label').textContent =
    difficultyLabel(difficulty) + " \u2014 Round " + (session.round + 1) + " / " + TOTAL_ROUNDS;
  updateHud();

  const stage = document.getElementById('stage');
  const answerArea = document.getElementById('answer-area');
  stage.innerHTML = "";
  answerArea.innerHTML = "";
  stage.className = "stage";

  const renderer = RENDERERS[gameType];
  renderer(stage, answerArea, difficulty, onRoundAnswer);
  startTimer();
}

function startTimer() {
  clearInterval(session.timer);
  session.timerStart = Date.now();
  const fill = document.getElementById('timerbar');
  fill.style.width = "100%";
  session.timer = setInterval(() => {
    const elapsed = Date.now() - session.timerStart;
    const pct = Math.max(0, 100 - (elapsed / ROUND_TIME) * 100);
    fill.style.width = pct + "%";
    if (elapsed >= ROUND_TIME) {
      clearInterval(session.timer);
      onRoundAnswer(false);
    }
  }, 100);
}

function flashMessage(text, good) {
  const el = document.getElementById('flash-overlay');
  el.textContent = text;
  el.className = "flash-overlay show " + (good ? "good" : "bad");
  setTimeout(() => { el.className = "flash-overlay"; }, 650);
}

function onRoundAnswer(correct) {
  if (session.locked) return;
  session.locked = true;
  clearInterval(session.timer);
  const difficulty = difficultyForRound(session.round);
  if (correct) {
    session.score += 100 * difficulty;
    flashMessage("CORRECT!", true);
  } else {
    session.lives -= 1;
    flashMessage("MISSED IT", false);
  }
  updateHud();
  session.round += 1;
  setTimeout(nextRound, 700);
}

async function endGame() {
  clearInterval(session.timer);
  document.getElementById('over-score').textContent = session.score;
  goto('screen-gameover');
  if (player) {
    try {
      const rec = await apiSubmitResult(player.name, player.phone, session.score);
      const note = session.score >= rec.bestScore
        ? "New personal best!"
        : "Your best remains " + rec.bestScore + ".";
      document.getElementById('over-best-note').textContent = note;
    } catch (e) {
      document.getElementById('over-best-note').textContent =
        "Could not save your score - check your Supabase config in js/config.js.";
    }
  }
}
