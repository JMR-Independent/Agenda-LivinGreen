# Arquitectura del Proyecto Agenda-LivinGreen

## ⚠️ REGLA CRÍTICA — NUNCA AGREGAR JS O CSS DIRECTAMENTE EN LOS HTML

### Estructura del Proyecto

```
proyecto/
├── index.html     → SOLO estructura HTML (1,983 líneas)
├── chat.html      → SOLO estructura HTML (135 líneas)
├── js/
│   ├── app.js     → Toda la lógica de index.html
│   └── chat.js    → Toda la lógica de chat.html
└── css/
    ├── app.css    → Todos los estilos de index.html
    └── chat.css   → Todos los estilos de chat.html
```

### ANTES DE EDITAR CUALQUIER ARCHIVO:

1. **¿Necesitas modificar JavaScript?**
   - Para `index.html` → edita `js/app.js`
   - Para `chat.html` → edita `js/chat.js`
   - **NUNCA** agregues `<script>` tags inline en los HTML

2. **¿Necesitas modificar estilos?**
   - Para `index.html` → edita `css/app.css`
   - Para `chat.html` → edita `css/chat.css`
   - **NUNCA** agregues `<style>` tags inline en los HTML

3. **¿Necesitas modificar estructura HTML?**
   - Solo entonces edita `index.html` o `chat.html`
   - Pero sin JS ni CSS inline

### Por qué esta regla es CRÍTICA:

- Mantiene el código organizado y fácil de vender/entregar
- Evita que los cambios queden en el archivo equivocado
- Facilita el debugging y el mantenimiento
- Sigue las mejores prácticas de desarrollo web

### Rama de trabajo

- **`master`** → producción (Vercel despliega desde aquí)
- Las ramas `claude/testing-*` NO despliegan a Vercel automáticamente
- Siempre hacer merge a `master` para que los cambios lleguen a producción
