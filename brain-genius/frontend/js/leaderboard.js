/* ---------------- LEADERBOARD ---------------- */
async function renderLeaderboard() {
  const wrap = document.getElementById('leaderboard-wrap');
  wrap.innerHTML = "<p class='lead'>Loading...</p>";

  let list;
  try {
    list = await apiGetAllPlayers();
  } catch (e) {
    wrap.innerHTML = "<p class='lead'>Could not reach Supabase. Check js/config.js.</p>";
    return;
  }

  list.sort((a, b) => b.bestScore - a.bestScore);
  if (list.length === 0) {
    wrap.innerHTML = "<p class='lead'>No scores yet. Be the first to play!</p>";
    return;
  }
  let html = "<table><tr><th>#</th><th>Name</th><th>Best</th></tr>";
  list.slice(0, 30).forEach((p, idx) => {
    const isMe = player && p.phone === player.phone;
    html += "<tr class='" + (isMe ? "me" : "") + "'><td class='rank'>" + (idx + 1) + "</td><td>" +
      escapeHtml(p.name) + (p.isWinner ? " \u{1F3C6}" : "") + "</td><td>" + p.bestScore + "</td></tr>";
  });
  html += "</table>";
  wrap.innerHTML = html;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
