/* ---------------- ADMIN ----------------
   Login is real Supabase Auth (see api.js). Supabase's client keeps the
   signed-in session itself, so there's no password to hold onto here
   anymore - toggleWinner() below just relies on the existing session.
------------------------------------------------- */

async function adminLogin() {
  const val = document.getElementById('admin-pass').value;
  const err = document.getElementById('admin-error');
  try {
    await apiAdminLogin(val);
  } catch (e) {
    err.textContent = "Incorrect password.";
    return;
  }
  err.textContent = "";
  document.getElementById('admin-pass').value = "";
  goto('screen-admin-panel');
  renderAdminPanel();
}

async function renderAdminPanel() {
  const summary = document.getElementById('admin-summary');
  const wrap = document.getElementById('admin-table-wrap');
  summary.textContent = "Loading players...";

  let list;
  try {
    list = await apiGetAllPlayers();
  } catch (e) {
    summary.textContent = "Could not reach the server.";
    return;
  }

  list.sort((a, b) => b.bestScore - a.bestScore);
  summary.textContent = list.length + " registered player" + (list.length === 1 ? "" : "s") +
    " \u00b7 " + list.filter(p => p.isWinner).length + " marked as winner";

  if (list.length === 0) {
    wrap.innerHTML = "<p class='lead'>No players have registered yet.</p>";
    return;
  }

  let html = "<table><tr><th>#</th><th>Name</th><th>Phone</th><th>Best</th><th>Plays</th><th>Winner</th></tr>";
  list.forEach((p, idx) => {
    html += "<tr>" +
      "<td class='rank'>" + (idx + 1) + "</td>" +
      "<td>" + escapeHtml(p.name) + "</td>" +
      "<td>" + escapeHtml(p.phone) + "</td>" +
      "<td>" + p.bestScore + "</td>" +
      "<td>" + p.plays + "</td>" +
      "<td><button class='toggle " + (p.isWinner ? "on" : "") + "' onclick=\"toggleWinner('" +
        p.phone.replace(/'/g, "\\'") + "')\">" + (p.isWinner ? "WINNER" : "MARK") + "</button></td>" +
      "</tr>";
  });
  html += "</table>";
  wrap.innerHTML = html;
}

async function toggleWinner(phone) {
  try {
    await apiToggleWinner(phone);
    renderAdminPanel();
  } catch (e) {
    alert("Could not update winner status: " + e.message);
  }
}
