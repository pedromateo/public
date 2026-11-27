# agenda.murcia

Agenda cultural de Murcia (municipio y pedanías): conciertos, exposiciones, teatro, cine, talleres, visitas, etc.
Web estática con buscador y filtros por categoría (se recuerdan en el navegador).

## Cómo funciona

- `scrape.py` busca eventos en [murciaturistica.es](https://murciaturistica.es) y [eventos.murcia.es](https://eventos.murcia.es), y escribe `events.json` (y `events.js`, la misma copia como script para abrir `index.html` sin servidor).
- Cada ejecución **fusiona** con el `events.json` anterior: añade eventos nuevos, actualiza/completa los existentes y elimina los ya terminados. Incluye eventos anunciados con meses de antelación.
- `events.json` queda filtrado y ordenado cronológicamente; `index.html` solo lo muestra y aplica los filtros.

- `sources.py` añade recintos y ticketing: Teatro Circo, Teatro Romea, Auditorio Víctor Villegas, Sala Mamba, compralaentrada.com, Ticketmaster y murciocio.es (que recoge salas y la Plaza de Toros). `consolidate.py` elimina duplicados entre fuentes y resume en una sola entrada las sesiones de un mismo espectáculo (p. ej. 3 días de "Yo, literal").
- `config.json` reúne todos los parámetros configurables: textos y ajustes de la web (`web`), días hacia delante por categoría (`horizontes`) y reglas de etiquetado (`clasificacion`: palabras clave, etiquetas manuales por título, eventos a excluir). Edítalo y vuelve a ejecutar `scrape.py`.

## Uso local

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scrape.py      # genera events.json y events.js
python3 -m http.server          # http://localhost:8000
```

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
3. El workflow `.github/workflows/update.yml` se ejecuta al hacer push, a diario y a mano (**Actions → Run workflow**): actualiza los eventos, guarda `events.json` en el repo y publica el sitio.

Si el repositorio es privado, GitHub Pages requiere un plan que lo permita.

## Fuentes y uso responsable

Los datos pertenecen a sus fuentes; cada evento enlaza a su página original. El scraper hace pocas peticiones al día y usa un User-Agent identificable.
