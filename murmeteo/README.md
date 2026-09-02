# ☀️ MurMeteo

> Aplicación web progresiva (PWA) moderna, ligera y rápida para consultar la previsión meteorológica hora a hora de Murcia, con soporte offline, datos oficiales de **AEMET OpenData** y modo de pruebas con datos simulados.

![MurMeteo](icons/android/play_store_512.png)

---

## 🚀 Características principales

- **📡 Datos oficiales en tiempo real**: Conexión con la API de [AEMET OpenData](https://opendata.aemet.es/) (predicción horaria oficial para el municipio de Murcia `30030`).
- **🌅 Información de Orto y Ocaso**: Visualización de la hora exacta de salida y puesta del sol.
- **🌡️ Métricas completas**:
  - Temperatura real y sensación térmica.
  - Temperatura máxima y mínima del día.
  - Velocidad y rachas de viento en km/h.
  - Precipitaciones acumuladas (mm) e iconos de estado del cielo diurnos y nocturnos.
- **🏷️ Badges condicionales inteligentes**: Avisos visuales automáticos configurables por umbrales de calor ($\ge 30^\circ\text{C}$), frío ($\le 9^\circ\text{C}$), lluvia ($\ge 0.1\text{ mm}$) y viento ($\ge 15\text{ km/h}$).
- **🔒 Seguridad de API Key**: Las claves secretas se gestionan en el archivo `.env` o variables de entorno en el servidor ([`server.js`](server.js)), evitando que se expongan en el navegador o en repositorios públicos.
- **📱 PWA 100% instalable y Offline-First**:
  - Service Worker con estrategia de caché inteligente para funcionamiento sin conexión.
  - Iconos oficiales adaptativos para Android e iOS.
  - Gesto táctil *Pull-to-Refresh* (deslizar hacia abajo para actualizar).
  - Botón nativo de compartir (integración con el menú del sistema operativo: WhatsApp, Telegram, Email, o copia al portapapeles).
- **🧪 Modo Mock (Datos de prueba simulados)**: Simulación diurna realista de Murcia para desarrollo y testing sin necesidad de conexión o API Key.

---

## 🛠️ Requisitos previos

- [Node.js](https://nodejs.org/) (versión 18 o superior).
- *(Opcional pero recomendado)* Una API Key gratuita de [AEMET OpenData](https://opendata.aemet.es/centrodedescargas/altaUsuario).

---

## 📦 Instalación y configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/murmeteo.git
cd murmeteo
```

### 2. Configurar las variables de entorno
Copia la plantilla `.env.example` a `.env`:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus preferencias:
```env
# Clave API de AEMET OpenData (obtenla gratis en https://opendata.aemet.es/)
AEMET_API_KEY=tu_clave_de_aemet_aqui

# Activar o desactivar datos simulados de prueba (false para datos reales)
MOCK_MODE=false

# Código del municipio (30030 = Murcia)
MUNICIPIO_ID=30030

# Puerto del servidor local
PORT=8080
```

> **Nota:** El archivo `.env` está protegido en `.gitignore` para que tus claves nunca se suban a Git.

---

## ▶️ Ejecución

### Iniciar el servidor de la aplicación:
```bash
npm start
```
Abre tu navegador en: **[http://localhost:8080](http://localhost:8080)**

### Ejecutar las pruebas unitarias:
```bash
npm test
```

---

## ⚙️ Configuración avanzada (`config.json`)

El archivo [`config.json`](config.json) permite personalizar la interfaz y los umbrales de alerta sin modificar el código fuente:

```json
{
  "location": {
    "name": "Murcia",
    "region": "Región de Murcia",
    "municipio_id": "30030"
  },
  "thresholds": {
    "heat": { "min_temp_c": 30 },
    "cold": { "max_temp_c": 9 },
    "rain": { "min_precip_mm": 0.1 },
    "wind": { "min_speed_kmh": 15, "min_gust_kmh": 20 }
  }
}
```

---

## 🌐 Despliegue y GitHub Secrets

Si vas a desplegar la aplicación en GitHub Actions, Docker o cualquier plataforma cloud (Vercel, Render, Railway, etc.):

1. En GitHub, ve a **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Añade un secreto llamado **`AEMET_API_KEY`** con el valor de tu clave.
3. El servidor [`server.js`](server.js) detectará automáticamente la variable del entorno (`process.env.AEMET_API_KEY`).

---

## 📁 Estructura del proyecto

```text
├── aemetService.js      # Servicio de consulta AEMET OpenData y generador de Mock data
├── app.js               # Lógica de la interfaz de usuario, eventos PWA y gestos táctiles
├── config.json          # Configuración de localización, umbrales e interfaz
├── index.html           # Estructura principal de la aplicación
├── manifest.json        # Manifiesto de la PWA (nombre, tema, iconos oficiales)
├── package.json         # Scripts de arranque y dependencias
├── server.js            # Servidor HTTP seguro con soporte .env y endpoint /api/forecast
├── style.css            # Estilos modernos y diseño responsive mobile-first
├── sw.js                # Service Worker para funcionamiento offline y caché
├── test.js              # Pruebas unitarias automatizadas
├── .env.example         # Plantilla de variables de entorno
├── .gitignore           # Archivos ignorados por Git (.env, logs, etc.)
└── icons/               # Iconos oficiales multi-resolución para Android e iOS
    ├── original_1024.png
    ├── android/         # Mipmaps (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi, play store)
    └── ios/             # Iconos para iPhone, iPad y App Store
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el código fuente para más detalles.
