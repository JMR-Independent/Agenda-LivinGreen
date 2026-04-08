# Agenda LivinGreen

PWA de agendamiento inteligente para LivinGreen Professional Cleaning Services + sistema de chat con Claude AI.

**Deploy:** https://livingreen-eya1.vercel.app

---

## Arquitectura general

```
iPhone (chat)
    │
    ▼
GitHub Gist (service discovery)
    │  lee la URL actual del bridge
    ▼
ngrok (dominio estático)
https://uncontested-brycen-viceregally.ngrok-free.dev
    │
    ▼
bridge/server.py  (puerto 5680)
    │  corre en Mac o PC según quién tenga ngrok activo
    ▼
claude CLI  (--dangerously-skip-permissions)
    │
    ▼
Respuesta al iPhone
```

El chat (`chat.html`) lee el Gist `4e21e868b2becb1423d9af5543ad85b3` para saber a qué URL enviar mensajes. Quien tenga ngrok activo con el dominio estático recibe las peticiones.

---

## Estructura del proyecto

```
├── index.html          # App principal (agenda, calendario, OCR)
├── chat.html           # Chat con Claude AI
├── js/
│   ├── app.js          # Lógica de index.html
│   └── chat.js         # Lógica del chat
├── css/
│   ├── app.css         # Estilos de index.html
│   └── chat.css        # Estilos del chat
├── bridge/             # Servidores del bridge Claude
│   ├── server.py       # HTTP server puerto 5680 — recibe mensajes y llama a claude CLI
│   ├── state_server.py # HTTP server puerto 5681 — estado del relay Mac↔PC
│   ├── start.sh        # Arranque completo (ngrok + actualizar Gist)
│   └── update-gist.sh  # Actualiza el Gist con la URL actual de ngrok
├── api/                # Serverless functions (Vercel)
├── docs/               # Documentación técnica
└── CLAUDE.md           # Reglas para Claude Code al trabajar en este repo
```

**Regla crítica:** nunca JS ni CSS inline en los HTML. Siempre editar `js/app.js`, `js/chat.js`, `css/app.css`, `css/chat.css`.

---

## Bridge — cómo funciona

El bridge es un servidor Python que expone `claude` CLI via HTTP:

```python
POST / 
Body: {"message": "texto del usuario", "history": "contexto previo"}
Response: {"reply": "respuesta de Claude"}
```

Prefijo especial: mensajes que empiezan con `@mac:` se redirigen al Mac Claude via relay n8n en vez de procesarse localmente.

### Arrancar en Mac
```bash
cd /Users/clausita/claude-bridge
./start.sh
```

### Arrancar en PC (Windows)
```bash
cd C:\claude-bridge
start.bat
```

### Verificar que funciona
```bash
curl http://localhost:4040/api/tunnels  # ver URL pública de ngrok
curl http://localhost:5680              # debe responder 501 (server activo)
```

---

## App de agenda

- **OCR**: Tesseract.js (browser-based, sin API keys) con fallback a Google Vision
- **Base de datos**: Supabase + localStorage offline
- **Deploy**: Vercel, rama `master` → producción automática
- **PWA**: funciona offline, instalable en iPhone como app

---

## Relay Mac↔PC

Sistema de comunicación bidireccional entre Claude Code en Mac y Claude Code en PC:

- **Toggle:** `POST http://192.168.12.169:5678/webhook/r2WDvfvW9uE1PUpR/webhook/relay-toggle` `{"enabled": true}`
- **Mensaje:** `POST http://192.168.12.169:5678/webhook/lGuFAUohGL71YAFN/webhook/claude-relay` `{"message": "..."}`

El estado persiste en `state_server.py` (puerto 5681 en el Mac).

---

## Contacto

Jose Miguel Robles Leyton — jose.m.robles7@gmail.com  
GitHub: [@JMR-Independent](https://github.com/JMR-Independent)
