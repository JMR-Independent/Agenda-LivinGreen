#!/usr/bin/env python3
"""Estado compartido para el relay — puerto 5681"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

state = {"relay_enabled": False}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send(state)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        state.update(body)
        self._send(state)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

if __name__ == "__main__":
    print("[state] Servidor de estado en http://localhost:5681", flush=True)
    HTTPServer(("0.0.0.0", 5681), Handler).serve_forever()
