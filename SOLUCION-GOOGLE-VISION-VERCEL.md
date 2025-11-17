# 🔧 Solución: Google Vision API no funciona en Vercel

## 🎯 Problema

Después de mover la API key a las variables de entorno de Vercel (por seguridad), la función de extracción de texto de imágenes solo carga la imagen pero no extrae nada.

## ✅ Solución Paso a Paso

### Paso 1: Verificar que la API key está configurada en Vercel

1. **Ve a tu proyecto en Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Selecciona tu proyecto**: `Agenda-LivinGreen`

3. **Ve a Settings → Environment Variables**

4. **Verifica que existe esta variable:**
   ```
   GOOGLE_VISION_API_KEY = AIzaSy...
   ```

5. **Asegúrate de que esté habilitada para todos los ambientes:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

**Si NO está configurada:** Continúa al Paso 2.

**Si SÍ está configurada:** Continúa al Paso 3.

---

### Paso 2: Agregar la variable de entorno en Vercel

1. **Obtén tu API key de Google Cloud:**
   - Ve a https://console.cloud.google.com/apis/credentials
   - Selecciona tu proyecto (o crea uno nuevo)
   - Habilita "Cloud Vision API" si no lo has hecho
   - Crea una API key o copia una existente

2. **En Vercel → Settings → Environment Variables:**
   - Click en "Add New"
   - **Key**: `GOOGLE_VISION_API_KEY`
   - **Value**: Tu API key (ej: `AIzaSyC-xxxxx...`)
   - **Environments**: Marca las 3 opciones (Production, Preview, Development)
   - Click en "Save"

3. **Continúa al Paso 4** (Redeploy)

---

### Paso 3: Verificar configuración de la API key en Google Cloud

**⚠️ IMPORTANTE:** Las API keys pueden tener restricciones que bloquean llamadas desde Vercel.

1. **Ve a Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials

2. **Click en tu API key** (la que estás usando)

3. **Sección "API restrictions":**
   - **RECOMENDADO:** Selecciona "Restrict key"
   - En la lista, marca SOLO: **Cloud Vision API**
   - Click "Save"

4. **Sección "Application restrictions":**

   **Opción A - Sin restricciones (más fácil, menos seguro):**
   - Selecciona "None"
   - Click "Save"

   **Opción B - Con restricciones HTTP (más seguro):**
   - Selecciona "HTTP referrers (websites)"
   - Agrega estos referrers:
     ```
     https://tu-proyecto.vercel.app/*
     https://*.vercel.app/*
     http://localhost:3000/*
     ```
   - Reemplaza `tu-proyecto` con el nombre de tu proyecto en Vercel
   - Click "Save"

5. **Verifica que la API esté habilitada:**
   - Ve a https://console.cloud.google.com/apis/api/vision.googleapis.com
   - Debe decir **"API enabled"** en verde
   - Si no, click en "Enable"

---

### Paso 4: Redeploy en Vercel

**⚠️ MUY IMPORTANTE:** Agregar variables de entorno NO actualiza deployments existentes.

1. **Ve a tu proyecto en Vercel → Deployments**

2. **Click en el deployment más reciente** (el primero de la lista)

3. **Click en los 3 puntos (⋮) → "Redeploy"**

4. **Espera 1-2 minutos** hasta que el deployment termine

5. **Continúa al Paso 5** (Verificar)

---

### Paso 5: Verificar que funciona

#### Opción A: Health Check Endpoint (Nuevo - Recomendado)

1. **Abre tu app en el navegador:**
   ```
   https://tu-proyecto.vercel.app/api/health
   ```

2. **Deberías ver algo como:**
   ```json
   {
     "overallStatus": "healthy",
     "checks": {
       "visionApiKeyConfigured": {
         "status": true,
         "message": "✅ API key configurada (AIzaSyC-xx...)"
       },
       "visionApiWorking": {
         "status": true,
         "message": "✅ Google Vision API responde correctamente"
       }
     }
   }
   ```

3. **Si ves "unhealthy" o errores:**
   - Lee el mensaje de error
   - Vuelve al paso correspondiente según el error

#### Opción B: Prueba con una imagen real

1. **Abre tu app:**
   ```
   https://tu-proyecto.vercel.app
   ```

2. **Click en "Agendar Citas"**

3. **Sube una imagen de prueba** (screenshot de WhatsApp con texto)

4. **Abre la consola del navegador** (F12)

5. **Busca estos mensajes:**
   - ✅ `📸 Starting Google Cloud Vision OCR...`
   - ✅ `✅ Image 1 processed successfully`
   - ✅ `📝 Extracted text from image 1: ...`

6. **Si ves errores:**
   - Lee el mensaje de error en la consola
   - Sigue las instrucciones que aparecen

---

## 🐛 Solución de Problemas Comunes

### Error: "API key not configured"

**Causa:** La variable `GOOGLE_VISION_API_KEY` no está en Vercel.

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Agrega la variable (ver Paso 2)
3. Haz Redeploy (ver Paso 4)

---

### Error: "API Key rechazada" (403)

**Causa:** La API key tiene restricciones que bloquean Vercel.

**Solución:**
1. Ve a Google Cloud Console → APIs & Credentials
2. Edita tu API key
3. En "Application restrictions":
   - Opción 1: Selecciona "None" (temporal)
   - Opción 2: Agrega `https://*.vercel.app/*` a HTTP referrers
4. En "API restrictions": Asegúrate de que "Cloud Vision API" esté permitida
5. Guarda cambios
6. Espera 2-3 minutos (los cambios tardan en propagarse)
7. Prueba de nuevo

---

### Error: "Cloud Vision API has not been used" (403)

**Causa:** La API no está habilitada en tu proyecto de Google Cloud.

**Solución:**
1. Ve a https://console.cloud.google.com/apis/api/vision.googleapis.com
2. Selecciona el proyecto correcto (arriba, en el dropdown)
3. Click en "Enable API"
4. Espera 1-2 minutos
5. Prueba de nuevo

---

### Error: "Quota exceeded" (429)

**Causa:** Has superado el límite gratuito de 1000 requests/mes.

**Solución:**
1. Ve a Google Cloud Console → Billing
2. Revisa tu uso en "Reports"
3. Opciones:
   - Espera al próximo mes (se resetea)
   - Habilita billing para pagar por requests adicionales ($1.50 por 1000)

---

### La app carga la imagen pero no extrae nada

**Causa:** Google Vision falla silenciosamente y salta a los métodos de fallback.

**Solución:**
1. Abre la consola del navegador (F12)
2. Sube una imagen de nuevo
3. Busca mensajes de error en rojo
4. Sigue las instrucciones según el error que veas
5. Si no ves errores, puede que el texto en la imagen no sea legible

---

## 🧪 Cómo probar localmente (opcional)

Si quieres probar antes de deployar a Vercel:

1. **Crea archivo `.env` en la raíz:**
   ```bash
   GOOGLE_VISION_API_KEY=tu_api_key_aqui
   ```

2. **Instala Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Ejecuta localmente:**
   ```bash
   vercel dev
   ```

4. **Abre:** http://localhost:3000

5. **Prueba la funcionalidad**

---

## 📊 Resumen de la Arquitectura

```
┌─────────────────────────────────────┐
│  Frontend (index.html)              │
│  - Carga la imagen                  │
│  - Convierte a base64               │
└──────────────┬──────────────────────┘
               │ POST /api/vision
               │ { image: "base64..." }
               ▼
┌─────────────────────────────────────┐
│  Vercel Serverless Function         │
│  (api/vision.js)                    │
│  - Lee GOOGLE_VISION_API_KEY        │
│  - Llama a Google Vision API        │
└──────────────┬──────────────────────┘
               │ POST https://vision.googleapis.com/v1/images:annotate
               │ Authorization: API_KEY
               ▼
┌─────────────────────────────────────┐
│  Google Cloud Vision API            │
│  - Analiza la imagen                │
│  - Extrae texto (OCR)               │
│  - Retorna JSON con el texto        │
└──────────────┬──────────────────────┘
               │ { text: "..." }
               ▼
┌─────────────────────────────────────┐
│  Frontend recibe el texto           │
│  - Parsea los datos                 │
│  - Llena el formulario              │
└─────────────────────────────────────┘
```

**Puntos críticos donde puede fallar:**
1. ❌ Variable de entorno no configurada en Vercel → Error 500
2. ❌ API key inválida → Error 403
3. ❌ Cloud Vision API no habilitada → Error 403
4. ❌ Restricciones de API key bloquean Vercel → Error 403
5. ❌ No se hizo redeploy después de agregar variable → Sigue usando versión antigua

---

## ✅ Checklist Final

Antes de reportar un problema, verifica que:

- [ ] La variable `GOOGLE_VISION_API_KEY` existe en Vercel
- [ ] La variable está habilitada para Production, Preview y Development
- [ ] Hiciste redeploy después de agregar/modificar la variable
- [ ] La API key es válida (la copiaste completa)
- [ ] Cloud Vision API está habilitada en Google Cloud Console
- [ ] La API key no tiene restricciones que bloqueen Vercel (o agregaste `*.vercel.app`)
- [ ] Probaste el endpoint `/api/health` y retorna "healthy"
- [ ] Revisaste la consola del navegador (F12) en busca de errores específicos

---

## 🆘 Si nada funciona

1. **Crea una nueva API key desde cero:**
   - Ve a Google Cloud Console
   - Crea una nueva API key
   - NO pongas restricciones (déjala abierta por ahora)
   - Actualiza la variable en Vercel
   - Redeploy
   - Prueba de nuevo

2. **Revisa los logs de Vercel:**
   - Ve a Vercel → tu proyecto → Deployments
   - Click en el deployment activo
   - Ve a "Functions" → "/api/vision"
   - Revisa los logs en tiempo real

3. **Contacta soporte:**
   - Si sigues teniendo problemas después de seguir todos estos pasos
   - Comparte el output del endpoint `/api/health`
   - Comparte los logs de Vercel
   - Comparte los errores de la consola del navegador

---

**✅ Con estos pasos, tu Google Vision API debería funcionar perfectamente en Vercel.**
