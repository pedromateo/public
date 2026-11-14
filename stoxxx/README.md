# STOXXX - Agente Automatizado de Inteligencia Bursátil

Agente automatizado ejecutable desde consola bajo demanda que extrae, analiza y publica informes bursátiles con podcast dual en una web estática optimizada para **GitHub Pages**.

---

## 🚀 Características Principales

1. **Extracción Automatizada de YouTube (Horizonte configurable, 14 días por defecto)**:
   - Monitoriza los consultorios de bolsa de **Capital Radio** (con expertos como Roberto Moro, Alberto Iturralde, Javier Alfayate, Gerardo Ortega) y el canal **Visionarios Bolsa** (Sito Rodríguez).
   - Descarga y consolida las transcripciones completas en español.
2. **Análisis de Consenso con Google Gemini (Gemini 2.0 Flash)**:
   - Identifica el **quórum real** entre los analistas, niveles clave de índices mundiales (IBEX 35, DAX, S&P 500, Nasdaq 100) y divergencias estratégicas.
   - Clasifica empresas en **Valores Nacionales** e **Internacionales**, ordenadas de mayor a menor número de menciones.
3. **Entregables por Ejecución**:
   - 🖥️ **Terminal Interactiva**: Presentación visual completa con tablas de índices, quórum y colores enriquecidos (`rich`).
   - 📄 **Informe PDF Profesional**: Maquetado corporativo con soporte UTF-8, cajas de resumen, niveles de soporte/resistencia y numeración de páginas.
   - 🎙️ **Podcast Dual en MP3**: Diálogo dinámico de radio entre dos locutores (**Carlos** y **Laura**) con voces neuronales realistas (Edge-TTS / Google Cloud TTS).
4. **Publicación Automática en GitHub Pages**:
   - Web estática responsiva (`index.html`) construida con HTML5, Tailwind CSS y Vanilla JS.
   - Feed cronológico con reproductor de audio embebido, vista de detalle por informe y botones directos de descarga (PDF y MP3).
   - Automatización de `git add`, `git commit` y `git push` en cada ejecución.

---

## 📂 Estructura del Proyecto

```text
.
├── .env.example             # Plantilla de configuración y variables de entorno
├── .gitignore               # Archivos excluidos del control de versiones
├── requirements.txt         # Dependencias de Python
├── config.py                # Configuración global de fuentes, rutas y modelos
├── main.py                  # CLI principal ejecutable
├── README.md                # Documentación del sistema
├── src/
│   ├── extractor.py         # Extracción de vídeos y transcripciones de YouTube
│   ├── analyzer.py          # Prompting estructurado e inferencia con Gemini API
│   ├── audio_generator.py   # Síntesis del diálogo dual en formato MP3
│   ├── pdf_generator.py     # Maquetación y exportación a PDF profesional
│   ├── web_publisher.py     # Generación de la web estática y actualización de feed
│   └── git_sync.py          # Sincronización automática de Git y GitHub Pages
├── templates/
│   ├── index.html           # Plantilla principal del portal y feed de informes
│   └── report_detail.html   # Plantilla para la vista detallada de cada informe
├── data/
│   └── reports.json         # Base de datos JSON de publicaciones
├── reports/
│   ├── pdf/                 # Documentos PDF generados
│   ├── audio/               # Archivos MP3 de los podcasts
│   └── html/                # Informes web detallados
└── index.html               # Portal principal publicado en la raíz para GitHub Pages
```

---

## ⚙️ Requisitos y Puesta en Marcha

### 1. Clonar el repositorio y crear el entorno virtual

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configurar las Variables de Entorno

Copia el archivo de plantilla `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus preferencias:

```env
# Clave de API de Google Gemini (Obtén la tuya en https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=tu_clave_de_gemini_aqui

# Proveedor de TTS: 'edge' (recomendado, gratuito y de máxima calidad) o 'google'
TTS_PROVIDER=edge

# Voces del podcast (Edge-TTS en español de España)
TTS_VOICE_MALE=es-ES-AlvaroNeural
TTS_VOICE_FEMALE=es-ES-ElviraNeural

# Horizonte de búsqueda de vídeos en días
DAYS_HORIZON=14

# Publicar automáticamente a GitHub Pages tras cada análisis (true/false)
AUTO_GIT_PUSH=false
```

---

## 💻 Uso desde Consola

### Ejecución estándar completa:
```bash
.venv/bin/python main.py
```
*Extrae los últimos 14 días, consulta a Gemini, imprime el informe por consola, genera el PDF, sintetiza el podcast MP3 y actualiza la web.*

### Ejecución con despliegue automático en GitHub Pages:
```bash
.venv/bin/python main.py --push
```

### Opciones y Modificadores de Comando:

| Parámetro | Descripción |
| :--- | :--- |
| `--days <N>` | Cambia el horizonte temporal (ej. `--days 7` para la última semana). Por defecto: 14. |
| `--push` | Ejecuta `git add`, `git commit` y `git push origin main` al finalizar. |
| `--no-push` | Desactiva el push a GitHub incluso si está activo en `.env`. |
| `--mock` | Ejecuta todo el flujo (PDF, Audio, Web) con datos realistas sin gastar tokens de Gemini. |
| `--skip-audio` | Omite la síntesis del podcast MP3 (ideal para análisis rápidos en segundos). |
| `--skip-pdf` | Omite la generación del documento PDF. |
| `--verbose` | Muestra registros detallados de depuración. |

---

## 🌐 Configuración de GitHub Pages

1. En tu repositorio en GitHub (`pedromateo/public`), ve a **Settings** > **Pages**.
2. En **Build and deployment** > **Source**, selecciona **Deploy from a branch**.
3. Selecciona la rama **`main`** y la carpeta raíz **`/ (root)`**.
4. Haz clic en **Save**. Tu portal estará disponible inmediatamente en tu subdominio de GitHub Pages.
