/* ---------------- API CLIENT ----------------
   Talks directly to Supabase - no Express server involved. Every function
   here keeps the same name and return shape as before, so game.js,
   leaderboard.js, admin.js and main.js didn't need to change at all.
------------------------------------------------- */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function rowToPlayer(row) {
  if (!row) return null;
  return {
    name: row.name,
    phone: row.phone,
    bestScore: row.best_score,
    plays: row.plays,
    lastPlayed: row.last_played,
    isWinner: row.is_winner
  };
}

async function apiGetAllPlayers() {
  const { data, error } = await sb.from('players').select('*');
  if (error) throw new Error(error.message);
  return data.map(rowToPlayer);
}

async function apiGetPlayer(phone) {
  const { data, error } = await sb
    .from('players')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return rowToPlayer(data);
}

async function apiRegisterPlayer(name, phone) {
  const { data, error } = await sb.rpc('register_player', { p_name: name, p_phone: phone });
  if (error) throw new Error(error.message);
  return rowToPlayer(data);
}

async function apiSubmitResult(name, phone, score) {
  const { data, error } = await sb.rpc('submit_result', {
    p_name: name,
    p_phone: phone,
    p_score: score
  });
  if (error) throw new Error(error.message);
  return rowToPlayer(data);
}

// Admin login is now real Supabase Auth, not a hand-rolled password check.
// The UI still only asks for a password; ADMIN_EMAIL (config.js) supplies
// the rest. Session persistence is handled by the Supabase client itself.
async function apiAdminLogin(password) {
  const { error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
  if (error) throw new Error("Incorrect password.");
  return { ok: true };
}

// No password param needed anymore - the signed-in session from
// apiAdminLogin is what authorizes this, enforced by toggle_winner()
// in supabase/schema.sql (grantable only to the 'authenticated' role).
async function apiToggleWinner(phone) {
  const { data, error } = await sb.rpc('toggle_winner', { p_phone: phone });
  if (error) throw new Error(error.message);
  return rowToPlayer(data);
}
