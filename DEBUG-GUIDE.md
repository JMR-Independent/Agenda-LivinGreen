# 🔍 Guía de Debugging - Extracción de Datos

## Cómo Ver Qué Está Pasando

Cuando subes una imagen, la consola del navegador te muestra **EXACTAMENTE** qué está detectando y por qué.

---

## 📋 Paso 1: Abrir la Consola

1. Abre tu app en el navegador
2. Presiona **F12** (Windows/Linux) o **Cmd+Option+I** (Mac)
3. Click en la pestaña **"Console"**
4. Sube una imagen

---

## 🔍 Qué Ver en los Logs

### 1. TEXTO EXTRAÍDO

Primero verás todo el texto que Tesseract extrajo:

```
📝 Extracted text from image 1: 3:30
Alexa
Hola buenas tardes, si mañana tengo tiempo...
```

### 2. LÍNEAS SEPARADAS

Luego verás las líneas separadas:

```
📋 Extracted lines: ["3:30", "Alexa", "Hola buenas tardes...", "115 s 950 e Orem"]
```

### 3. BÚSQUEDA DE NOMBRE

Verás cada línea analizada:

```
🔍 Searching for name in first 5 lines...
  Line 1: "3:30" - looks like name? false         ← Rechazado (es hora)
  Line 2: "Alexa" - looks like name? true         ← ✅ Aceptado
✅ Found name in line 2: Alexa
```

**¿Por qué se rechaza una línea?**
- Tiene números: `1234`, `3:30`
- Parece hora: `11 am`, `3:30 pm`
- Es saludo: `Hola`, `Buenas noches`
- No tiene mayúsculas

### 4. BÚSQUEDA DE HORA

Verás cada pattern que prueba:

```
🔍 Searching for time...
  Trying pattern "hora: X": No match              ← No encontró "hora: 3:30"
  Trying pattern "X:XX am/pm": No match           ← No tiene AM/PM
  Trying pattern "X am/pm": No match              ← No es "11 am"
  Trying pattern "a las X:XX": No match           ← No dice "a las"
  Trying pattern "mañana X:XX": No match          ← No está en contexto "mañana"
  Trying pattern "standalone X:XX": Found "3:30"  ← ✅ Encontró "3:30"
✅ Found time: 3:30 (using pattern: standalone X:XX)
```

### 5. BÚSQUEDA DE DIRECCIÓN

```
🔍 Searching for address...
  Trying pattern "dirección:": No match
  Trying pattern "Utah format": Found "115 s 950 e"  ← ✅ Encontró
✅ Found address: 115 s 950 e (using pattern: Utah format)
```

### 6. BÚSQUEDA DE TRABAJO

```
🔍 Searching for job/service...
  Trying pattern "trabajo:": No match
  Trying pattern "limpiar X cuartos": Found "limpiar 3 cuartos"  ← ✅
✅ Found job: limpiar 3 cuartos (using pattern: limpiar X cuartos)
```

### 7. RESUMEN FINAL

Al final verás un resumen de TODO:

```
📊 Extraction Summary:
  Name: Alexa                ← ✅ Encontrado
  Time: 3:30                 ← ✅ Encontrado
  Day: ❌ Not found          ← No estaba en imagen
  Address: 115 s 950 e       ← ✅ Encontrado
  City: Orem                 ← ✅ Encontrado
  Job: limpiar 3 cuartos     ← ✅ Encontrado
  Price: ❌ Not found        ← No estaba en imagen
```

---

## 🐛 Cómo Reportar un Problema

Si algo no funciona correctamente:

### 1. Copia TODO el Log

Desde `📝 Starting Tesseract.js OCR...` hasta `📊 Extraction Summary:`

### 2. Toma Screenshot de la Imagen

La que subiste a la app

### 3. Indica Qué Falló

Ejemplo:
- ❌ Nombre no detectado (debería ser "María")
- ❌ Hora no detectada (debería ser "2:30 pm")
- ✅ Dirección correcta
- ✅ Trabajo correcto

### 4. Comparte Conmigo

Con esa info puedo:
- Ver exactamente qué extrajo Tesseract
- Ver por qué se rechazó el nombre
- Ver qué pattern de hora no funcionó
- Agregar/ajustar patterns específicos

---

## 💡 Ejemplos de Problemas y Soluciones

### Problema 1: Nombre No Detectado

```
📋 Extracted lines: ["11:30", "Maria", "Hola buenos días"]
🔍 Searching for name in first 5 lines...
  Line 1: "11:30" - looks like name? false
  Line 2: "Maria" - looks like name? false  ← ❌ Sin mayúscula
  Line 3: "Hola buenos días" - looks like name? false
❌ Name not found
```

**Por qué:** "Maria" no tiene acento, OCR lo leyó sin mayúscula

**Solución:** Ajustar función para aceptar nombres sin mayúsculas si están en primeras líneas

---

### Problema 2: Hora en Formato Raro

```
🔍 Searching for time...
  Trying pattern "standalone X:XX": Found "11.30"
✅ Found time: 11:30 (using pattern: standalone X:XX)
```

**Nota:** El código ya convierte `11.30` → `11:30`

---

### Problema 3: Dirección con Apartamento

```
📋 Extracted text: 115 s 950 e Orem, Apt C102

🔍 Searching for address...
  Trying pattern "Utah format": Found "115 s 950 e"  ← ❌ No incluye Apt
```

**Por qué:** Pattern actual no captura apartamento después de ciudad

**Solución:** Puedo mejorar el pattern

---

## 🎯 Qué Hacer Ahora

### Paso 1: Espera Deploy (1-2 min)
Vercel está desplegando la nueva versión

### Paso 2: Prueba con Tu Imagen
Sube la imagen de Alexa de nuevo

### Paso 3: Revisa los Logs
Busca específicamente:

```
🔍 Searching for name in first 5 lines...
  Line 1: "..." - looks like name? ...
  Line 2: "..." - looks like name? ...
```

Y:

```
🔍 Searching for time...
  Trying pattern "standalone X:XX": Found "..."
```

### Paso 4: Comparte los Logs

Si algo falla, copia TODO el log desde:
- `📋 Extracted lines: [...]`
- Hasta `📊 Extraction Summary:`

---

## ✅ Lo Que Debería Funcionar Ahora

Con la nueva versión:

**Nombre:**
- ✅ Detecta "Alexa" en línea 2 o 3
- ✅ Ignora "3:30" en línea 1 (es hora, no nombre)
- ✅ Ignora "Hola" (es saludo)

**Hora:**
- ✅ Detecta "3:30" (sin AM/PM)
- ✅ Detecta "3.30" (con punto)
- ✅ Detecta "11 am"
- ✅ Detecta "a las 3:30"

**Dirección:**
- ✅ Detecta "115 s 950 e"
- ✅ Detecta "1234 N 500 W"
- ✅ Detecta "Estoy en 115 s 950 e"

---

**🚀 Prueba y comparte los logs completos para ver qué está pasando exactamente!**
