#!/bin/bash
# Espera a que ngrok esté listo, luego actualiza el Gist con la URL actual
sleep 20

GIST_ID="4e21e868b2becb1423d9af5543ad85b3"
GH_TOKEN="YOUR_GITHUB_TOKEN_HERE"

NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | /usr/bin/python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
  echo "[gist-updater] ERROR: ngrok no listo todavía" >> /Users/clausita/claude-bridge/gist.log
  exit 1
fi

curl -s -X PATCH "https://api.github.com/gists/$GIST_ID" \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"files\":{\"claude_webhook.json\":{\"content\":\"{\\\"url\\\":\\\"${NGROK_URL}\\\"}\"}}}"\
  > /dev/null

echo "$(date): Gist actualizado → $NGROK_URL" >> /Users/clausita/claude-bridge/gist.log
