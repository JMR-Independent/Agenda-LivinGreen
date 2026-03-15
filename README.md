# Agenda LivinGreen - PWA de Agendamiento con OCR

Progressive Web App para gestión de citas con extracción automática de datos mediante OCR desde capturas de WhatsApp.

## Características

- 📱 PWA completa (funciona offline)
- 📝 **OCR automático GRATIS con Tesseract.js** (corre en el navegador, sin API keys)
- 🔍 Sistema de fallback multinivel (Tesseract → Google Vision → MCP → GPT-4)
- 💾 Integración con Supabase
- 📊 Análisis financiero de citas
- 🔔 Notificaciones push
- 🔒 100% privado (OCR corre en tu navegador)

## Stack Tecnológico

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **OCR Principal**: Tesseract.js (100% gratis, corre en el navegador)
- **OCR Fallback**: Google Cloud Vision API (requiere billing)
- **Backend**: Supabase
- **AI Fallback**: MCP, OpenAI GPT-4
- **Deploy**: Vercel

## Instalación Local

1. Clona el repositorio:
```bash
git clone https://github.com/JMR-Independent/Agenda-LivinGreen.git
cd Agenda-LivinGreen
```

2. Abre `index.html` en tu navegador

O usa un servidor local:
```bash
python -m http.server 8000
# o
npx http-server
```

## Configuración

### ✅ OCR con Tesseract.js (Recomendado)

**No requiere configuración** - Funciona automáticamente. Es:
- ✅ 100% Gratis (sin límites)
- ✅ Sin API keys ni registro
- ✅ Privado (corre en tu navegador)
- ✅ Funciona offline

**→ Ver [`TESSERACT-OCR-INFO.md`](TESSERACT-OCR-INFO.md)** para más detalles y tips de uso.

### 🔧 OCR con Google Vision (Opcional)

Si quieres máxima precisión (99%+), puedes habilitar Google Vision como fallback:
- Ver `INSTRUCCIONES-GOOGLE-VISION.md` para configurar
- ⚠️ Requiere habilitar billing en Google Cloud (gratis hasta 1000/mes)

**→ Si tienes problemas con Google Vision:** [`SOLUCION-GOOGLE-VISION-VERCEL.md`](SOLUCION-GOOGLE-VISION-VERCEL.md)

## Deploy en Vercel

### Opción 1: Deploy Automático

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JMR-Independent/Agenda-LivinGreen)

### Opción 2: Deploy Manual

1. **Fork/Clone este repositorio**

2. **Conecta a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New Project"
   - Selecciona este repositorio
   - Click en "Import"

3. **⚠️ IMPORTANTE: Configurar Variables de Entorno**

   Antes de deployar, agrega estas variables en Settings → Environment Variables:

   ```
   GOOGLE_VISION_API_KEY=tu_google_vision_api_key
   ```

   **Cómo obtener la API Key:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Crea un proyecto o selecciona uno existente
   - Habilita "Cloud Vision API"
   - Crea credenciales → API Key
   - Copia la key y pégala en Vercel

4. **Deploy**
   - Click en "Deploy"
   - Espera ~2 minutos
   - Tu app estará lista en `https://tu-proyecto.vercel.app`

### 🔒 Seguridad

- ✅ API keys protegidas (backend serverless)
- ✅ HTTPS automático
- ✅ Deploy automático desde GitHub
- ✅ Sin exposición de credenciales al cliente

Ver más detalles en: [`api/README.md`](api/README.md)

## Estructura del Proyecto

```
├── index.html                          # App principal
├── check-appointment.html              # Verificación de citas
├── extract-data.html                   # Extracción de datos
├── force-reload-supabase.html          # Recarga de DB
├── google-vision-setup.html            # Setup de Vision API
├── finance-tests.html                  # Tests financieros
├── images/                             # Recursos visuales
├── icon-*.svg                          # Iconos PWA
├── livingreen-logo.png                 # Logo de la app
└── INSTRUCCIONES-GOOGLE-VISION.md      # Docs de configuración
```

## Uso

1. **Agendamiento Manual**: Crea citas manualmente desde la interfaz
2. **OCR desde WhatsApp**: Sube captura de pantalla de WhatsApp para extraer datos automáticamente
3. **Gestión de Citas**: Edita, elimina o marca citas como completadas
4. **Análisis Financiero**: Revisa estadísticas de ingresos y citas

## Tecnologías de OCR

La app usa un sistema de fallback inteligente de 5 niveles:

1. **Tesseract.js** (Principal - 100% gratis, browser-based)
2. **Google Cloud Vision API** (Fallback 1 - requiere billing)
3. **MCP Vision** (Fallback 2)
4. **OpenAI GPT-4 Vision** (Fallback 3)
5. **Entrada manual** (Fallback 4)

**Recomendación:** Tesseract.js funciona excelente para la mayoría de casos (~80-85% precisión) y es completamente gratis.

## Desarrollo

Para contribuir:

1. Fork el proyecto
2. Crea una branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Proyecto privado - Todos los derechos reservados

## Contacto

Jose Miguel Robles - [@JMR-Independent](https://github.com/JMR-Independent)

Project Link: [https://github.com/JMR-Independent/Agenda-LivinGreen](https://github.com/JMR-Independent/Agenda-LivinGreen)

---

🤖 Desarrollado con AI-Assisted Development
