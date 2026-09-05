import http.server
import json
import os
import sqlite3
import urllib.parse
from datetime import datetime, timezone

PORT = int(os.environ.get("PORT", 4000))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "genius2026admin")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
DB_PATH = os.path.join(DATA_DIR, "players.sqlite3")

os.makedirs(DATA_DIR, exist_ok=True)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS players (
                phone       TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                best_score  INTEGER NOT NULL DEFAULT 0,
                plays       INTEGER NOT NULL DEFAULT 0,
                last_played TEXT,
                is_winner   INTEGER NOT NULL DEFAULT 0
            );
        """)
        conn.commit()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def row_to_player(row):
    if not row:
        return None
    return {
        "name": row["name"],
        "phone": row["phone"],
        "bestScore": row["best_score"],
        "plays": row["plays"],
        "lastPlayed": row["last_played"],
        "isWinner": bool(row["is_winner"])
    }

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            return self.send_json(200, {"ok": True})

        if path == "/api/players":
            with get_db() as conn:
                rows = conn.execute("SELECT * FROM players").fetchall()
                return self.send_json(200, [row_to_player(r) for r in rows])

        if path.startswith("/api/players/"):
            raw_phone = path[len("/api/players/"):]
            phone = urllib.parse.unquote(raw_phone)
            with get_db() as conn:
                row = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                return self.send_json(200, row_to_player(row))

        # Static files fallback
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            data = json.loads(post_body)
        except Exception:
            data = {}

        if path == "/api/players/register":
            name = (data.get("name") or "").strip()
            phone = (data.get("phone") or "").strip()
            if len(name) < 2:
                return self.send_json(400, {"error": "Please enter your name."})
            if len(phone) < 7:
                return self.send_json(400, {"error": "Please enter a valid mobile number."})

            with get_db() as conn:
                row = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                if not row:
                    conn.execute("""
                        INSERT INTO players (phone, name, best_score, plays, last_played, is_winner)
                        VALUES (?, ?, 0, 0, NULL, 0)
                    """, (phone, name))
                    conn.commit()
                    row = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                return self.send_json(200, row_to_player(row))

        if path == "/api/players/result":
            name = (data.get("name") or "").strip()
            phone = (data.get("phone") or "").strip()
            score = data.get("score")
            if len(name) < 2:
                return self.send_json(400, {"error": "Please enter your name."})
            if len(phone) < 7:
                return self.send_json(400, {"error": "Please enter a valid mobile number."})
            if not isinstance(score, (int, float)) or score < 0:
                return self.send_json(400, {"error": "Invalid score."})

            now = datetime.now(timezone.utc).isoformat()
            score = round(score)
            with get_db() as conn:
                row = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                if not row:
                    conn.execute("""
                        INSERT INTO players (phone, name, best_score, plays, last_played, is_winner)
                        VALUES (?, ?, ?, 1, ?, 0)
                    """, (phone, name, score, now))
                else:
                    new_best = max(row["best_score"], score)
                    new_plays = row["plays"] + 1
                    conn.execute("""
                        UPDATE players
                        SET name = ?, plays = ?, last_played = ?, best_score = ?
                        WHERE phone = ?
                    """, (name, new_plays, now, new_best, phone))
                conn.commit()
                updated = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                return self.send_json(200, row_to_player(updated))

        if path == "/api/admin/login":
            password = data.get("password")
            if password != ADMIN_PASSWORD:
                return self.send_json(401, {"ok": False, "error": "Incorrect password."})
            return self.send_json(200, {"ok": True})

        if path == "/api/admin/toggle-winner":
            password = data.get("password")
            phone = data.get("phone")
            if password != ADMIN_PASSWORD:
                return self.send_json(401, {"error": "Incorrect password."})
            with get_db() as conn:
                row = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                if not row:
                    return self.send_json(404, {"error": "Player not found."})
                new_winner = 0 if row["is_winner"] else 1
                conn.execute("UPDATE players SET is_winner = ? WHERE phone = ?", (new_winner, phone))
                conn.commit()
                updated = conn.execute("SELECT * FROM players WHERE phone = ?", (phone,)).fetchone()
                return self.send_json(200, row_to_player(updated))

        self.send_json(404, {"error": "Endpoint not found"})

if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Brain Genius server running on http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
