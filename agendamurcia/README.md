# agenda.murcia

Agenda cultural de Murcia (municipio y pedanías): conciertos, exposiciones, teatro, cine, talleres, visitas, etc.
Web estática con buscador y filtros por categoría (se recuerdan en el navegador).

## Cómo funciona

- `scrape.py` busca eventos en [murciaturistica.es](https://murciaturistica.es) y [eventos.murcia.es](https://eventos.murcia.es), y escribe `events.json` (y `events.js`, la misma copia como script para abrir `index.html` sin servidor). Con `--retag` reaplica `config.json` y la consolidación sobre `events.json` en menos de 1 segundo sin volver a scrapear.
- Cada ejecución **fusiona** con el `events.json` anterior: añade eventos nuevos, actualiza/completa los existentes y elimina los ya terminados. Incluye eventos anunciados con meses de antelación.
- `events.json` queda filtrado y ordenado cronológicamente; `index.html` solo lo muestra y aplica los filtros.

- `sources.py` añade recintos y ticketing: Teatro Circo, Teatro Romea, Auditorio Víctor Villegas, Sala Mamba, compralaentrada.com, Ticketmaster y murciocio.es (que recoge salas y la Plaza de Toros). `consolidate.py` elimina duplicados entre fuentes y resume en una sola entrada las sesiones de un mismo espectáculo (p. ej. 3 días de "Yo, literal").
- `config.json` reúne todos los parámetros configurables: textos y ajustes de la web (`web`), días hacia delante por categoría (`horizontes`), reglas de etiquetado (`clasificacion`: palabras clave, etiquetas manuales por título, eventos a excluir) y unificación de recintos (`recintos`: `direcciones` y `alias`). Edítalo y ejecuta `.venv/bin/python scrape.py --retag`.

## Uso local

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
AGENDA_WORKERS=24 .venv/bin/python scrape.py   # genera events.json y events.js (~4.3 min en RPi 4)
.venv/bin/python scrape.py --retag             # reaplica config.json y duplicados sin re-scrapear (<1 s)
python3 -m http.server                         # http://localhost:8000
```

La variable `AGENDA_WORKERS` controla el número de hilos por pool de scraping (por defecto `4` en `sources.py`; ajustado a `24` en Raspberry Pi 4 para reducir el tiempo a ~4.3 min manteniendo la CPU < 90% el ~99% del tiempo).

## Automatización diaria (cron + agy)

En la Raspberry Pi el proceso se ejecuta automáticamente todos los días a las **15:00** mediante `scripts/cron_runner.sh`:

```cron
0 15 * * * /bin/bash /home/pit/dev/public/agendamurcia/scripts/cron_runner.sh >> /home/pit/dev/public/agendamurcia/logs/cron_general.log 2>&1
```

El runner configura el entorno (`HOME`, `PATH`, `SSH_AUTH_SOCK`, `AGENDA_WORKERS=24`), evita solapamientos con `flock -n /tmp/agendamurcia_cron.lock`, guarda logs en `logs/` (con rotación de 30 días) e invoca a `agy` en modo desatendido para:
1. Hacer `git pull --rebase` si no hay cambios locales sin commitear.
2. Ejecutar `.venv/bin/python scrape.py` y revisar errores de fuentes en `stderr`.
3. Clasificar eventos nuevos en `"Otros"` y fusionar posibles duplicados añadiendo alias/direcciones en `config.json` (o ajustando `consolidate.py`).
4. Regenerar con `.venv/bin/python scrape.py --retag` si hubo cambios de configuración.
5. Validar con `.venv/bin/python -m pytest tests -q`.
6. Hacer commit y `git push` de `events.json`, `events.js` y `config.json` (lo que dispara el redespliegue en GitHub Pages).

## Tests

```
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests          # todo (~15 s)
.venv/bin/python -m pytest tests -k "not web"   # sin navegador
```

- `tests/test_consolidate.py`, `test_scrape.py`, `test_sources.py`: unitarios, sin red.
- `tests/test_data.py`: valida el `events.json`/`events.js` generados (esquema, categorías, fechas, orden, duplicados).
- `tests/test_web.py`: Playwright sobre `index.html` con datos de prueba (`conftest.py`): buscador, filtros, persistencia, modal, compartir, móvil/escritorio. Usa el Google Chrome instalado (`channel="chrome"`), sin descargar Chromium.
- El workflow ejecuta los tests tras el scraper y antes de guardar/desplegar.

## Despliegue en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (rama `main`).
2. En **Settings → Pages**, elige **Source: GitHub Actions**.
3. El workflow `../.github/workflows/deploy-agendamurcia.yml` se ejecuta al hacer push en `agendamurcia/**`, a diario (`05:00 UTC`) y a mano (**Actions → Run workflow**): en `push` valida con `pytest` y publica el sitio; en `schedule` / manual también ejecuta `scrape.py` y guarda `events.json`/`events.js`.

Si el repositorio es privado, GitHub Pages requiere un plan que lo permita.

## Fuentes y uso responsable

Los datos pertenecen a sus fuentes; cada evento enlaza a su página original. El scraper hace pocas peticiones al día y usa un User-Agent identificable.
