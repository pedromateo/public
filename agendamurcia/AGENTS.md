# agenda.murcia — contexto del proyecto

Agenda cultural del municipio de Murcia (ciudad + pedanías). Web estática mínima (`index.html`) que lee `events.js`/`events.json`, generados por un scraper en Python. Pensada para GitHub Pages. Idioma: español.

## Archivos
- `scrape.py` — punto de entrada. Fuentes originales (murciaturistica.es, eventos.murcia.es), tipos (`SIMPLE_TYPES`, `refine_type`, `refine_simple`), `clean_place` (lugar sin calle: "Teatro Romea, Murcia"), `merge_with_existing`, horizontes (`within_horizon`) y `main`.
- `sources.py` — fuentes de recintos y ticketing: Teatro Circo, Teatro Romea (calendario ASP.NET con postback), Auditorio Víctor Villegas, Sala Mamba, Pupaclown, Centro Párraga (portal CARM), Filmoteca Regional, compralaentrada.com (JSON-LD), Ticketmaster (JSON-LD de /discover/murcia y páginas de recinto), murciocio.es (agregador de salas y Plaza de Toros). `scrape_all(today)`.
- `consolidate.py` — dedupe entre fuentes (mismo recinto + fechas solapadas + título parecido u hora igual) y colapso de series (sesiones sueltas del mismo espectáculo, ≤14 días entre ellas → una entrada con rango y horarios "20:00; 21:00").
- `config.json` (› clasificacion.etiquetas_manuales) — etiquetas fijadas a mano por título.
- `config.json` (› horizontes) — días hacia delante por categoría. Editable a mano.
- `events.json` / `events.js` — salida generada (no editar a mano).
- `index.html` — web: buscador + filtros de categoría multi-selección (persisten en localStorage `agenda.murcia.filtros.v2`), etiquetas negras con × bajo el buscador. Orden = el del JSON (cronológico, no reordenar en la web).
- `README.md`, `.github/workflows/update.yml`, `favicon.svg`, `.nojekyll`.

## Cómo ejecutar
```
.venv/bin/python scrape.py   # ~11 min (el Auditorio tarda ~2 min; eventos.murcia.es muchas URLs)
```
Requiere `truststore.inject_into_ssl()` (ya en el código) por el certificado corporativo. Servir en local: `.venv/bin/python -m http.server 8765` (Playwright bloquea file://).

## Procedimiento de actualización con un agente IA (Copilot CLI / Antigravity)
Scraping y clasificación se hacen **en paralelo** para ahorrar tiempo (el scraper tarda ~11 min):
1. Lanzar `scrape.py` en segundo plano (async) y, mientras corre, no esperar: usar ese tiempo para
   - buscar en web anuncios que las fuentes no cubran (salas: Garaje Beat, Gruta 77, Sala REM, Musik, La Yesería; festivales; Plaza de Toros; nuevas giras) y añadirlos (ver pendiente: `manual_events.json`);
   - revisar los eventos en "Otros" que ya estén en el `events.json` anterior (abrir su enlace/buscar en web, decidir la etiqueta y fijarla en `config.json` (› clasificacion.etiquetas_manuales): `titulos`; `excluir` para lo no cultural/deportivo). Si un subagente puede abrir varios enlaces a la vez, repartir los eventos entre varios (uno por grupo).
2. Al terminar el scraper, revisar el log (cada fuente imprime su recuento; si una cae, se sigue con el resto).
3. Clasificar solo los "Otros" **nuevos** que haya traído el scraper (los ya resueltos están en `config.json` (› clasificacion.etiquetas_manuales)). El scraping da datos en bruto y la IA aporta la clasificación fina donde las reglas no alcanzan; si ya es clara, no hace falta.
4. Comprobar: sin duplicados, sin fechas absurdas (2028+), orden cronológico, eventos clave presentes, ningún "Otros" sin revisar.
5. Regenerar `events.json`/`events.js` (reaplicar `etiquetas()`) y revisar la web.

### Censo de recintos (causa del olvido de Pupaclown)
Las fuentes se eligieron a partir de agregadores y de los recintos grandes; un teatro que vende en su propia web (Pupaclown) no sale en ningún agregador y nadie lo buscó. Para no repetirlo, cada vez que se revise la cobertura:
1. Listar teatros, salas, auditorios, centros culturales y compañías de Murcia (búsqueda web, mapas, OpenStreetMap `amenity=theatre|arts_centre|music_venue`) **por tipo de público**, no solo música: infantil, títeres, circo, danza, teatro amateur.
2. Para cada uno, comprobar si aparece en `events.json` (`lugar`/`fuente`); si no, mirar su web: ¿tiene programación estructurada? → añadir `scrape_<recinto>` en `sources.py` (se registra en `SOURCES` y corre en paralelo).
3. Anotar abajo los recintos revisados y su estado.

Recintos con fuente propia: Teatro Circo, Teatro Romea, Auditorio Víctor Villegas, Sala Mamba, **Pupaclown**, **Centro Párraga**, **Filmoteca Regional** (`pupaclown.org/programacion`, una entrada por función, el año sale de la cabecera del mes).

## Decisiones del usuario (mantener)
- Solo municipio de Murcia + pedanías (excluir Cartagena, Lorca, Molina…). Incluir gratuitos. Sin deportes.
- Categorías (etiquetas): Música, Exposiciones, Teatro, Comedia, Cine, Danza, Infantil (incluye cuentos), Circo y magia, Talleres, Visitas, Festivales, Fiestas, Literatura, Conferencias, Gastronomía, Otros. El JSON tiene `categorias`, una **lista de etiquetas** (sin campo `tipo`; internamente el scraper usa `tipo` como tipo principal y lo elimina al escribir) (un evento puede aparecer en varios filtros, p. ej. `["Teatro","Música"]`); la primera es la principal (la que usa `config.json` (› horizontes)). `etiquetas()` en scrape.py añade Música/Conferencias por palabras clave y aplica `config.json` (› clasificacion.etiquetas_manuales) (etiquetas fijadas a mano por título, con prioridad; ampliarlo al detectar errores). No hay "Pintura" (cubierta por Exposiciones). No añadir categorías nuevas salvo que el usuario lo pida (Gastronomía se añadió a petición suya).
- Sin campo `publico`: el público infantil se distingue con la categoría Infantil.
- Lugar sin calle. Series de varios días = una sola entrada.
- Diseño: cuadrado, minimalista, monoespaciada "agenda.murcia", sin cartel de "Actualizado".
- Eventos futuros de salas/teatros deben incluirse para poder comprar entradas con antelación.

## Pendiente
1. **Fichero de eventos manuales** (`manual_events.json`) que `scrape.py` fusione, para lo que el agente encuentre buscando en web y no esté en ninguna fuente (p. ej. Rod Stewart solo sale vía murciocio.es). Que sobreviva a `merge_with_existing` y al workflow.
2. **Revisar el workflow** `.github/workflows/update.yml` (refresco diario): ahora el scraper tarda ~11 min y trae más fuentes; verificar que no pierde eventos curados y que el timeout es suficiente.
3. **Clasificación**: mantener `config.json` (› clasificacion.etiquetas_manuales) al día (ver procedimiento); mejorar `KEYWORDS`/`VENUE_HINTS` en sources.py para que menos eventos necesiten revisión manual.
4. **Más fuentes** por explorar: garajebeatclub.es, gruta77.com, Sala REM / Musik (devolvían 502), Plaza de Toros (murciaon.es falló), festivales, bibliotecas RMBM (`rmbm.org/agenda/index.php?d=YYYYMMDD&n=1`, sin horas; opcional).
5. **Calidad de datos**:
   - Mamba deja a veces el mes vacío (p. ej. Deacon Blue); se omite y lo cubre compralaentrada. Vigilar.
   - murciocio.es no da año (se infiere por día de la semana) ni enlace propio (enlace = página del día + #slug).
   - Ticketmaster: solo ~7 eventos de Murcia en las páginas usadas; las páginas de evento dan 401.
   - Precios de compralaentrada son "Desde X €" (mínimo); el Auditorio no publica precio.
6. **Rendimiento**: acelerar el scraper (paralelizar Auditorio / eventos.murcia.es, caché de páginas).
7. **README**: documentar procedimiento del agente y `manual_events.json` cuando exista.
8. Verificar en navegador la web con los datos actuales (la última revisión visual fue antes de los datos nuevos).
9. Limpieza: `__pycache__`, `.playwright-mcp` tras cada sesión.

## Trampas conocidas
- `merge_with_existing` conserva entradas viejas hasta su fecha fin: si una fuente corrige fechas, purgar antes del JSON las entradas de esa fuente (se hizo así al integrar las nuevas fuentes).
- Teatro Circo responde 302 con la página en el cuerpo: `fetch` acepta 301/302 con cuerpo >5000 bytes.
- Romea codifica en ISO-8859-1/UTF-8 mezclado: usar `decode_text`.
- Entradas cuyo rango pasado/futuro es falso (p. ej. "MURCIA ON" con descripción solo de fechas pasadas) se descartan con `only_past_dates`.
- Sin comillas de shell raras: matar procesos solo con `kill <PID>` numérico.

### Censo de recintos (nov 2026)
- Descartados: Gruta 77 (es de Madrid), Sala Spectrum (agenda sin eventos futuros), El Jardín de la Estación (bodas), TeaTres (productora), Sala Tolosa Latour (Cartagena).
- Pendientes de revisar: Sala Verónicas (web 502), Cines (Rex, Centrofama, Cinesa), Centro de Artistas Jóvenes, Teatro Pujante, centros municipales (los cubre eventos.murcia.es).
- Garaje Beat entra vía compralaentrada.com; Teatro Bernal vía auditoriosybernal.es/murciocio.
