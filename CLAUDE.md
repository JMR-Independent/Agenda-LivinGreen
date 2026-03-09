# Arquitectura del Proyecto Agenda-LivinGreen

## ⚠️ REGLA CRÍTICA - NUNCA EDITAR HTML DIRECTAMENTE PARA JS O CSS

### Estructura del Proyecto

```
proyecto/
├── chat.html          → SOLO estructura HTML
├── index.html         → SOLO estructura HTML
├── js/
│   ├── app.js         → Lógica de index.html
│   └── chat.js        → Lógica de chat.html
└── css/
    └── styles.css     → Todos los estilos
```

### ANTES DE EDITAR CUALQUIER ARCHIVO:

1. **¿Necesitas modificar JavaScript?**
   - `chat.html` → Edita `js/chat.js`
   - `index.html` → Edita `js/app.js`
   - **NUNCA** agregues `<script>` tags inline en HTML

2. **¿Necesitas modificar estilos?**
   - Edita `css/styles.css`
   - **NUNCA** agregues `<style>` tags o atributos `style=""` inline

3. **¿Necesitas modificar estructura HTML?**
   - Solo entonces edita los archivos `.html`
   - Pero sin JS ni CSS inline

### Por qué esta regla es CRÍTICA:

- ✅ Mantiene el código organizado y mantenible
- ✅ Evita duplicación de código
- ✅ Facilita el debugging
- ✅ Permite reutilización de código
- ✅ Sigue las mejores prácticas de desarrollo web

### Si necesitas ayuda:

Siempre lee primero el archivo correcto antes de editarlo:
- Lee `js/chat.js` completo antes de modificar funcionalidad de chat
- Lee `js/app.js` completo antes de modificar funcionalidad de index
- Lee `css/styles.css` completo antes de modificar estilos

---

**Esta regla es automáticamente aplicada por git pre-commit hooks.**
