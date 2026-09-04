# 🎙️ Loopp - PWA Loop Station Multipista

> Progressive Web App (PWA) de Loop Station multipista en el navegador, sin backend, optimizada para desplegarse como sitio estático en GitHub Pages con soporte offline y exportación dual (WAV y MP3).

---

## 🚀 Características principales

- **⏱️ Motor de Audio Cuantizado:** Web Audio API nativa (`AudioContext`, `currentTime`, lookahead scheduler a 25 ms con ventana de 100 ms) para una precisión rítmica exacta sin desincronización por lag del hilo principal.
- **🟢 Grabación Sincronizada con Estados Visuales:**
  - **Pulsar a mitad de secuencia:** El botón pasa inmediatamente a **`ESPERA`** con fondo naranja (`bg-amber-500`).
  - **Inicio del nuevo ciclo (beat 0):** Pasa automáticamente a **`GRABANDO`** con fondo verde (`bg-emerald-500`) y comienza la captura de audio.
  - **Fin de compases seleccionados:** Se crea la nueva pista en la mezcla y el botón regresa a **`GRABAR`** en rojo (`bg-red-600`).
- **🎼 Visualizador de Compases Multilínea:**
  - Los pulsos se representan con una fila horizontal por cada compás seleccionado (ej. 2 compases de 4/4 = 2 filas de 4 puntos; 4 compases = 4 filas de 4 puntos).
  - Garantiza que los puntos nunca se solapen o queden ocultos tras los controles laterales.
- **🎛️ Mezcla Multipista en Tiempo Real:**
  - Control de volumen independiente por pista con deslizadores dedicados.
  - Botón de Silenciar (**Mute / Unmute**) con respuesta visual instantánea (opacidad atenuada).
  - Eliminación de pistas individuales con renumerado automático.
  - Reproducción sincronizada de todas las pistas en bucle infinito vinculadas a la cuadrícula temporal común.
- **🔔 Metrónomo Integrado:**
  - Sintetizador con oscilador de audio y envolvente exponencial rápida.
  - Tono agudo diferenciado (`1000 Hz`) para el primer pulso del compás y tono estándar (`800 Hz`) para los restantes.
  - Conmutable (**ON / OFF**); excluido automáticamente de las exportaciones.
- **💾 Exportación de Audio Dual (WAV & MP3):**
  - **WAV:** Renderizado offline PCM estéreo a 16-bit mediante `DataView` nativo.
  - **MP3:** Codificación estéreo en cliente a través de `lamejs` (vía CDN).
  - Descarga directa en un clic respetando los niveles de mezcla y silencios de cada pista.
- **📱 PWA 100% Instalable y Offline-First:**
  - `manifest.json` y `sw.js` (Service Worker) con precacheo de interfaz, estilos y recursos.
  - Iconos vectoriales limpios en SVG (`icon-192.svg`, `icon-512.svg`).
  - Rutas relativas (`./`) listas para despliegue directo en subcarpetas de GitHub Pages.
- **🧪 Calidad y Testing Automatizado (Playwright E2E):**
  - Suite completa de tests funcionales de extremo a extremo que validan el flujo completo desde la configuración inicial hasta la exportación.

---

## 🛠️ Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior).
- Navegador moderno con soporte para **Web Audio API** y **MediaDevices / getUserMedia** (Chrome, Firefox, Safari, Edge).

---

## 📦 Instalación y Desarrollo Local

### 1. Entrar en la carpeta del proyecto
```bash
cd loopp
```

### 2. Instalar dependencias de testing
```bash
npm install
```

### 3. Ejecutar el servidor de desarrollo
Puedes utilizar cualquier servidor estático HTTP local. Por ejemplo:
```bash
npx http-server -p 8080 -c-1
```
Abre tu navegador en `http://localhost:8080`.

---

## 🧪 Ejecución de Tests Funcionales (E2E)

El proyecto utiliza **Playwright** con simulación de micrófono en Chromium:

```bash
# Ejecutar todos los tests E2E
npx playwright test

# Ver informe visual de los tests
npx playwright show-report
```

Los tests verifican:
1. Flujo de inicio y configuración inicial (BPM, compases).
2. Renderizado de filas de compases (visibilidad de 16 puntos en 4 compases).
3. Conmutación de metrónomo (ON/OFF).
4. Ciclo de grabación y transiciones de color/texto (`ESPERA` naranja $\rightarrow$ `GRABANDO` verde $\rightarrow$ `GRABAR` rojo).
5. Controles de pista (Mute y Delete).

---

## 📂 Estructura de Archivos

```text
loopp/
├── index.html                 # Marcado semántico y layout (Tailwind CSS vía CDN)
├── manifest.json              # Manifiesto PWA para instalación
├── sw.js                      # Service Worker para funcionamiento offline
├── icons/                     # Iconos PWA vectoriales (SVG y PNG)
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── icon-192.png
│   └── icon-512.png
├── js/
│   ├── app.js                 # Controlador de la UI, eventos y renderizado
│   └── audio.js               # Motor de audio, scheduler, grabación y exportadores
├── tests/
│   └── e2e/
│       └── looper.spec.js     # Suite de pruebas funcionales automatizadas
├── playwright.config.js       # Configuración de Playwright y fake media devices
└── package.json               # Dependencias de desarrollo y scripts
```

---

## 🌐 Despliegue en GitHub Pages

El repositorio principal incluye un workflow en [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) que:
1. Detecta cambios en la carpeta `loopp/**`.
2. Ejecuta automáticamente los tests funcionales con Playwright.
3. Empaqueta la aplicación en `dist/loopp/` con actualización de versión en caché del Service Worker.
4. Despliega en GitHub Pages en la subruta `/loopp/`.
