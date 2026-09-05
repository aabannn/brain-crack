/* ---------------- REGISTRATION ---------------- */
/* ---------------- REGISTRATION ---------------- */
function paintHomeStats(name, rec) {
  document.getElementById('home-name').textContent = name.toUpperCase();
  document.getElementById('home-best').textContent = rec ? rec.bestScore : 0;
  document.getElementById('home-plays').textContent = (rec ? rec.plays : 0) + " plays so far";
}

async function registerPlayer() {
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const err = document.getElementById('reg-error');
  if (!name || name.length < 2) { err.textContent = "Please enter your name."; return; }
  if (!/^[0-9+\-\s]{7,15}$/.test(phone)) { err.textContent = "Please enter a valid mobile number."; return; }

  let rec;
  try {
    rec = await apiRegisterPlayer(name, phone);
  } catch (e) {
    err.textContent = e.message || "Could not reach the server.";
    return;
  }

  err.textContent = "";
  player = { name, phone };
  paintHomeStats(name, rec);
  goto('screen-home');
}

async function goHome() {
  goto('screen-home');
  if (!player) return;
  try {
    const rec = await apiGetPlayer(player.phone);
    paintHomeStats(player.name, rec);
  } catch (e) {}
}
