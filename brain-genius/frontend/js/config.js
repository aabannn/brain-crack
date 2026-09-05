/* ---------------- CONFIG ---------------- */

// Fill these in from your Supabase project: Dashboard -> Project Settings -> API.
// The "anon public" key is meant to be shipped to the browser - it has no
// power on its own, since the table's row-level security policies and the
// grants in supabase/schema.sql are what actually decide what it can do.
const SUPABASE_URL = "https://zzqntysvqqyonvocdprp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_e95Q9qxcnDAm6q7C3x79PA_k8-7y19c";

// Must match the email of the admin user you create in
// Supabase Dashboard -> Authentication -> Users -> Add user.
// The admin login screen only asks for a password; this email is combined
// with it behind the scenes.
const ADMIN_EMAIL = "abanabdlnzr3@gmail.com";

const TOTAL_ROUNDS = 10;
const START_LIVES = 3;
const ROUND_TIME = 13000; // ms
const GAME_ORDER = ["constellation", "balls", "web", "shapes", "simon"];
const GAME_TITLES = {
  constellation: "CONSTELLATION",
  balls: "BOUNCING BALLS",
  web: "SPIDER'S WEB",
  shapes: "SHAPE ORDER",
  simon: "STILL AWAKE?"
};
