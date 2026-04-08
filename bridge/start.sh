#!/bin/bash
# Claude Code Bridge — arranque automático

BRIDGE_DIR="/Users/clausita/claude-bridge"
GIST_ID="4e21e868b2becb1423d9af5543ad85b3"
GH_TOKEN="YOUR_GITHUB_TOKEN_HERE"
NGROK_BIN="/usr/local/bin/ngrok"
PYTHON_BIN="/usr/bin/python3"

# 1. Matar instancias previas
pkill -f "claude-bridge/server.py" 2>/dev/null
pkill -f "ngrok http 5680" 2>/dev/null
sleep 2

# 2. Arrancar servidor Python
$PYTHON_BIN $BRIDGE_DIR/server.py >> $BRIDGE_DIR/server.log 2>&1 &
sleep 3

# 3. Arrancar ngrok
$NGROK_BIN http 5680 --log=stdout >> $BRIDGE_DIR/ngrok.log 2>&1 &
sleep 6

# 4. Obtener URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
  echo "[bridge] ERROR: no se pudo obtener URL de ngrok" >> $BRIDGE_DIR/server.log
  exit 1
fi

echo "[bridge] URL activa: $NGROK_URL" >> $BRIDGE_DIR/server.log

# 5. Actualizar Gist con la nueva URL
curl -s -X PATCH "https://api.github.com/gists/$GIST_ID" \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"files\":{\"claude_webhook.json\":{\"content\":\"{\\\"url\\\":\\\"${NGROK_URL}\\\"}\"}}}" > /dev/null

echo "[bridge] Gist actualizado — listo" >> $BRIDGE_DIR/server.log
