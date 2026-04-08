#!/usr/bin/env python3
"""Claude Code Bridge — servidor local que expone claude -p via HTTP POST"""
import json, subprocess, sys
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5680
CLAUDE_BIN = "/Users/clausita/.local/bin/claude"

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[bridge] {args[0]} {args[1]}", flush=True)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        message = body.get("message", "")
        history = body.get("history", "")

        prompt = message
        if history:
            prompt = f"Conversación previa:\n{history}\n\nUsuario: {message}"

        try:
            result = subprocess.run(
                [CLAUDE_BIN, "-p", "--dangerously-skip-permissions", "--", prompt],
                capture_output=True, text=True, timeout=120
            )
            reply = (result.stdout or result.stderr or "Sin respuesta").strip()
        except subprocess.TimeoutExpired:
            reply = "⚠️ Tiempo de espera agotado (120s)."
        except Exception as e:
            reply = f"⚠️ Error: {e}"

        data = json.dumps({"reply": reply}).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

if __name__ == "__main__":
    print(f"[bridge] Claude Code Bridge corriendo en http://localhost:{PORT}", flush=True)
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
