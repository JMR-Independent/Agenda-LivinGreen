# API Serverless Functions

Este directorio contiene las funciones serverless de Vercel que manejan las llamadas a APIs externas de forma segura.

## Configuración de Variables de Entorno en Vercel

### Paso 1: Acceder a Settings

1. Ve a tu proyecto en Vercel Dashboard
2. Click en "Settings"
3. Click en "Environment Variables"

### Paso 2: Agregar Variables

Agrega las siguientes variables:

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `GOOGLE_VISION_API_KEY` | API Key de Google Cloud Vision | ✅ Sí |
| `OPENAI_API_KEY` | API Key de OpenAI (fallback) | ⚠️ Opcional |

### Paso 3: Scope de Variables

Para cada variable, selecciona:
- **Production**: ✅ Checked
- **Preview**: ✅ Checked (recomendado)
- **Development**: ✅ Checked (recomendado)

### Paso 4: Redeploy

Después de agregar variables:
1. Ve a "Deployments"
2. Click en el deployment más reciente
3. Click en "Redeploy"

---

## Endpoints Disponibles

### `/api/vision`

Proxy seguro para Google Cloud Vision API.

**Method:** `POST`

**Request Body:**
```json
{
  "image": "base64_encoded_image_data",
  "features": [
    {
      "type": "TEXT_DETECTION",
      "maxResults": 1
    }
  ]
}
```

**Response:**
```json
{
  "responses": [
    {
      "fullTextAnnotation": {
        "text": "Extracted text..."
      }
    }
  ]
}
```

**Errors:**
- `405` - Method not allowed (solo POST)
- `400` - Bad request (falta imagen)
- `500` - Server error (API key no configurada o error de Vision API)

---

## Desarrollo Local

Para probar localmente:

1. Crea archivo `.env` en la raíz:
```bash
GOOGLE_VISION_API_KEY=tu_api_key_aqui
```

2. Instala Vercel CLI:
```bash
npm i -g vercel
```

3. Ejecuta localmente:
```bash
vercel dev
```

4. La app estará en `http://localhost:3000`

---

## Seguridad

✅ **Las API keys NUNCA se exponen al cliente**
✅ **Solo accessible vía HTTPS en producción**
✅ **CORS configurado automáticamente por Vercel**
✅ **Rate limiting aplicado por Vercel**

---

## Troubleshooting

### Error: "API key not configured"
→ Verifica que `GOOGLE_VISION_API_KEY` esté configurada en Vercel Settings

### Error: "CORS blocked"
→ Vercel maneja CORS automáticamente, verifica el dominio desde donde llamas

### Error: "Vision API quota exceeded"
→ Revisa tu uso en Google Cloud Console y aumenta el límite si es necesario

---

Más info: https://vercel.com/docs/concepts/functions/serverless-functions
