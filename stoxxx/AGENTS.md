# STOXXX - Guía Técnica para Agentes de Inteligencia y Desarrollo (AGENTS.md)

Este documento contiene la **arquitectura técnica completa, el mapa de componentes y la matriz de configuración** de STOXXX. Su objetivo es permitir que cualquier agente de IA o desarrollador localice, comprenda y modifique cualquier aspecto del sistema de forma inmediata sin necesidad de reexplorar todo el repositorio.

---

## 🧭 Principios Fundamentales del Sistema (Reglas Inmutables)

1. **Horizonte temporal de 3 días**: El sistema extrae y valida información de los **últimos 3 días naturales** (el día de hoy, el de ayer y antesdeayer). El corte se calcula como `hoy - 2 días` a nivel de fecha de publicación `YYYYMMDD`.
2. **Formato obligatorio de analistas (`R. Moro`)**: Nunca se deben mostrar los nombres de pila completos de los analistas en ninguna sección del informe, gráficos, tablas ni podcast. Siempre se emplea inicial del nombre y apellido (ej. *R. Moro*, *A. Iturralde*, *D. Galán*, *V. Galán*, *S. Rodríguez*, *J. Alfayate*, *P. Pérez*, *E. Bolinches*, *M. Barrero*, *G. Ortega*, *J. M. Luna*, *M. Pinto*).
3. **Locutores del Podcast sin nombres propios**: En el guion y el audio del podcast, los locutores son estrictamente `Voz 1` (masculino) y `Voz 2` (femenino). Está **terminantemente prohibido** asignarles nombres como *Carlos*, *Laura*, *Álvaro*, etc., o saludarse con nombres personales.
4. **Veracidad y Fidelidad 100%**: No se inventan cotizaciones ni recomendaciones. Los niveles técnicos se reconcilian con precios reales de Yahoo Finance (`yfinance`) y las afirmaciones se contrastan con las transcripciones en `data/transcripts/`.
5. **Persistencia y Reproducibilidad**: Todas las transcripciones se guardan en JSON (`data/transcripts/{video_id}.json`) y se versionan en Git para auditoría sin consumo redundante de red.
6. **Persistencia del Guion del Podcast en Markdown (`.md`)**: Junto a cada archivo MP3 sintetizado (`reports/audio/podcast-YYYY-MM-DD.mp3`), se guarda obligatoriamente el guion estructurado en Markdown (`reports/audio/podcast-YYYY-MM-DD.md`) con las intervenciones de `Voz 1` y `Voz 2`. Este archivo se versiona en Git para consulta interna en GitHub, pero está **terminantemente prohibido** enlazarlo o hacerlo accesible desde la web estática pública (`reports.json`, `index.html` o vistas HTML).

---

## 🗺️ Matriz de Configuración Rápida ("Dónde tocar para cambiar X")

| Parámetro / Requisito | Fichero Principal | Variable / Función / Clave | Notas / Comportamiento |
| :--- | :--- | :--- | :--- |
| **Horizonte en días** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) y [.env](file:///home/pit/dev/public/stoxxx/.env) | `DEFAULT_HORIZON_DAYS`, `DAYS_HORIZON` | Por defecto: `3`. Se sobreescribe por CLI con `--days <N>`. |
| **Cálculo de fecha de corte** | [src/extractor.py](file:///home/pit/dev/public/stoxxx/src/extractor.py) y [src/validators.py](file:///home/pit/dev/public/stoxxx/src/validators.py) | `cutoff_date = datetime.now() - timedelta(days=max(0, days_horizon - 1))` | Garantiza cubrir hoy (T), ayer (T-1) y antesdeayer (T-2). |
| **Canales y Playlists de YouTube** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) | `YOUTUBE_CHANNELS` | Lista de diccionarios con `id`, `name`, `url` y `keywords`. |
| **Prompt y Esquema de Gemini** | [src/analyzer.py](file:///home/pit/dev/public/stoxxx/src/analyzer.py) | `FINANCIAL_ANALYST_SYSTEM_PROMPT` | Reglas de extracción de quórum, JSON schema y guion de podcast. |
| **Abreviaciones de Analistas** | [src/analyzer.py](file:///home/pit/dev/public/stoxxx/src/analyzer.py) | `ANALYST_ABBREVIATIONS` | Diccionario de reemplazo directo `Nombre Completo -> Inicial. Apellido`. |
| **Reglas de Locutores del Podcast** | [src/analyzer.py](file:///home/pit/dev/public/stoxxx/src/analyzer.py) y [src/validators.py](file:///home/pit/dev/public/stoxxx/src/validators.py) | `FINANCIAL_ANALYST_SYSTEM_PROMPT` (Regla 5) y `audit_and_verify_report` | Prohibición y regex de limpieza de nombres en el audio. |
| **Voces y Proveedor de Audio** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) y [.env](file:///home/pit/dev/public/stoxxx/.env) | `TTS_PROVIDER`, `TTS_VOICE_MALE`, `TTS_VOICE_FEMALE` | Por defecto `edge`, `es-ES-AlvaroNeural` y `es-ES-XimenaNeural` / `es-ES-ElviraNeural`. |
| **Guion de Podcast en Markdown (.md)** | [src/audio_generator.py](file:///home/pit/dev/public/stoxxx/src/audio_generator.py) y [main.py](file:///home/pit/dev/public/stoxxx/main.py) | `save_script_markdown`, `reports/audio/podcast-YYYY-MM-DD.md` | Guarda el guion en Markdown junto al MP3. Excluido de la web pública. |
| **Modelo de Lenguaje (LLM)** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) y [.env](file:///home/pit/dev/public/stoxxx/.env) | `GEMINI_MODEL`, `GEMINI_API_KEY` | Por defecto `gemini-3.8-flash`. |
| **Despliegue Git Automático** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) y [main.py](file:///home/pit/dev/public/stoxxx/main.py) | `AUTO_GIT_PUSH`, flag `--push` | Ejecuta `git add`, `git commit` y `git push origin main`. |
| **Ejecución Periódica Desatendida** | [scripts/cron_runner.sh](file:///home/pit/dev/public/stoxxx/scripts/cron_runner.sh) | `crontab -e` / `cron_runner.sh` | Invoca `agy` o `main.py --push` y guarda logs en `logs/`. |
| **Directorio de Transcripciones** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) | `TRANSCRIPTS_DIR = DATA_DIR / "transcripts"` | Caché persistente de ficheros `.json`. |
| **Base de datos de Informes** | [config.py](file:///home/pit/dev/public/stoxxx/config.py) | `REPORTS_JSON = DATA_DIR / "reports.json"` | Histórico completo de reportes publicados en el portal. |

---

## 🏗️ Flujo de Ejecución (Pipeline de Datos)

```mermaid
flowchart TD
    A[Cron o CLI main.py] --> B[YouTubeExtractor (src/extractor.py)]
    B -->|Comprueba data/transcripts/| C{¿En disco?}
    C -->|Sí| D[Carga transcripción JSON local]
    C -->|No| E[Descarga online YouTubeTranscriptApi / yt-dlp]
    E -->|Guarda| D
    D --> F[MarketReportValidator.verify_video_sources]
    F --> G[GeminiMarketAnalyzer (src/analyzer.py)]
    G --> H[MarketReportValidator.audit_and_verify_report (src/validators.py)]
    H -->|Reconciliación yfinance| I[Datos Auditados y Normalizados]
    I --> J[AudioPodcastGenerator (src/audio_generator.py)]
    I --> K[PdfReportGenerator (src/pdf_generator.py)]
    I --> L[StaticWebPublisher (src/web_publisher.py)]
    J --> M[GitSyncManager (src/git_sync.py)]
    K --> M
    L --> M
    M -->|git commit & push| N[GitHub Pages Live]
```

### Detalle de Fases:

1. **Extracción (`src/extractor.py`)**:
   - Itera por `YOUTUBE_CHANNELS`.
   - Recupera emisiones recientes mediante `yt-dlp`.
   - Filtra vídeos cuya `upload_date < cutoff_str`.
   - Comprueba si existe caché en `data/transcripts/{id}.json`. Si no existe, descarga los subtítulos en español y guarda el JSON.
2. **Validación de Fuentes (`src/validators.py`)**:
   - `MarketReportValidator.verify_video_sources` valida que los vídeos pertenezcan estrictamente al horizonte y canales oficiales.
3. **Análisis y Consenso (`src/analyzer.py`)**:
   - Inyecta el corpus consolidado en `FINANCIAL_ANALYST_SYSTEM_PROMPT` con Google GenAI SDK.
   - Extrae sentimiento, situación global, índices, valores nacionales/internacionales y guion del podcast.
   - Aplica `format_analyst_abbreviations` sobre la respuesta JSON.
4. **Auditoría e Integridad Técnica (`src/validators.py`)**:
   - `audit_and_verify_report` contrasta soportes y resistencias contra cotizaciones reales (`yfinance`). Si hay desviación >20% por desactualización de los analistas, ajusta los niveles de forma coherente.
   - Ordena los bloques de empresas por número de menciones descendente.
   - Sanitiza el guion del podcast eliminando nombres propios de locutores y forzando `Voz 1` / `Voz 2`.
5. **Generación de Podcast y Guion Markdown (`src/audio_generator.py`)**:
   - Guarda el guion completo del podcast en formato Markdown en `reports/audio/podcast-YYYY-MM-DD.md` (no expuesto en la interfaz web pública).
   - Sintetiza cada turno del guion de forma asíncrona con Edge-TTS (`asyncio`).
   - Concatena las pistas en un único archivo MP3 estéreo en `reports/audio/podcast-YYYY-MM-DD.mp3`.
6. **Maquetación PDF (`src/pdf_generator.py`)**:
   - Genera `reports/pdf/informe-YYYY-MM-DD.pdf` mediante ReportLab, incluyendo métricas clave, quórum, tablas comparativas y enlaces canónicos.
7. **Publicación Web (`src/web_publisher.py`)**:
   - Actualiza `data/reports.json` con el nuevo informe al inicio de la lista.
   - Genera la vista detallada HTML en `reports/html/report-YYYY-MM-DD.html`.
   - Actualiza el portal principal `index.html` en la raíz del repositorio.
8. **Despliegue (`src/git_sync.py`)**:
   - Si `--push` o `AUTO_GIT_PUSH=true`, ejecuta `git add`, `git commit` y `git push origin main`.

---

## 🧪 Pruebas Automatizadas y Verificación

Para ejecutar la suite completa de pruebas unitarias y de integración:

```bash
.venv/bin/python3 -m unittest discover tests
```

### Tests principales:
- `tests/test_validators_and_cache.py`: Almacenamiento en caché de transcripciones, reconciliación de precios técnicos y auditoría de integridad.
- `tests/test_advanced_web_functionality.py`: Búsqueda, filtrado por sentimiento, accesibilidad y reproductores en la web estática.
- `tests/test_web_and_report.py`: Generación de HTML y persistencia en `reports.json`.
- `tests/test_audio_generator.py`: Generación y concatenación de audio MP3.

---

## 🛠️ Comandos Frecuentes para Agentes

- **Ejecución rápida sin sintetizar audio (ideal para pruebas)**:
  ```bash
  .venv/bin/python main.py --skip-audio
  ```
- **Ejecución con publicación directa**:
  ```bash
  .venv/bin/python main.py --push
  ```
- **Comprobación de logs de cron**:
  ```bash
  tail -n 50 logs/cron_stoxxx_*.log
  ```
- **Inspección de transcripciones en disco**:
  ```bash
  ls -lt data/transcripts/
  ```
