"""Fuentes adicionales de eventos: salas, teatros, auditorios y ticketing de Murcia.

Cada función `scrape_*` devuelve eventos con el mismo formato que scrape.py
(sin `fecha_orden`, que se calcula después).
"""
import json
import os
import re
import sys
import unicodedata
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter

# hilos por pool (Raspberry Pi 2 GB: pocos); ajustable con AGENDA_WORKERS
WORKERS = int(os.environ.get("AGENDA_WORKERS", "4"))

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

HEADERS = {"User-Agent": "Mozilla/5.0 (agendaMurcia personal scraper)"}
session = requests.Session()
session.headers.update(HEADERS)
session.mount("https://", HTTPAdapter(pool_maxsize=32))  # las fuentes se consultan en paralelo
session.mount("http://", HTTPAdapter(pool_maxsize=32))


def load_config(path="config.json"):
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), path), encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return {}


CONFIG = load_config()
VENUE_ADDRESSES = CONFIG.get("recintos", {}).get("direcciones", {})
STREET_PREFIX = re.compile(r"^(c/|calle|avda|avenida|plaza|paseo|ronda|camino|carretera|gran v[ií]a)(?![a-zñ])", re.I)

MONTHS = {m: i + 1 for i, m in enumerate(
    "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split())}
MONTHS.update({m[:3]: i for m, i in list(MONTHS.items())})
MONTHS["sept"] = 9
WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

# municipio de Murcia: ciudad y pedanías
MURCIA_TOWNS = [
    "Murcia", "Alquerías", "Aljucer", "Algezares", "La Alberca", "Baños y Mendigo", "Barqueros", "Beniaján",
    "Cabezo de Torres", "Cañadas de San Pedro", "Carrascoy", "Casillas", "Churra", "Cobatillas", "Corvera",
    "El Esparragal", "El Palmar", "El Puntal", "El Raal", "Espinardo", "Gea y Truyols", "Guadalupe",
    "Javalí Nuevo", "Javalí Viejo", "La Arboleda", "La Ñora", "La Raya", "La Albatalía", "Los Dolores",
    "Los Garres", "Llano de Brujas", "Monteagudo", "Nonduermas", "Orilla del Azarbe", "Puebla de Soto",
    "Puente Tocinos", "Rincón de Beniscornia", "Rincón de Seca", "San Benito", "San Ginés", "Santa Cruz",
    "Santiago y Zaraiche", "Santo Ángel", "Sangonera la Seca", "Sangonera la Verde", "Sucina", "Torreagüera",
    "Valladolises", "Zarandona", "Zeneta", "Los Ramos", "Lobosillo", "La Aparecida", "Era Alta", "Patiño",
]
TOWNS_BY_LEN = sorted(MURCIA_TOWNS, key=len, reverse=True)
GENERIC_VENUE = re.compile(
    r"^(auditorio|centro cultural|centro municipal|teatro|biblioteca|iglesia|plaza|parque|museo|casa de cultura)$", re.I)
NOT_CULTURAL = re.compile(
    r"\bf[uú]tbol|baloncesto|balonmano|voleibol|rugby|atletismo|carrera|torneo|campeonato|\bliga\b|nataci[oó]n|"
    r"ciclismo|triatl|\bp[aá]del|hockey|\bmma\b|boxeo|gimnasia|jornada \d|\bpartido|vip experience|"
    r"restaurant experience|real murcia|elpozo|\bsenderis|marcha |congreso|simposio|jornadas? (m[eé]dicas?|t[eé]cnicas?)",
    re.I)
MADRID = ZoneInfo("Europe/Madrid")


def norm(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def fetch(url, **kw):
    for _ in range(3):
        try:
            r = session.get(url, timeout=30, allow_redirects=False, **kw)
            if r.status_code == 200 or (r.status_code in (301, 302) and len(r.content) > 5000):
                return r  # teatrocircomurcia.es responde 302 con la página en el cuerpo
            if r.status_code in (301, 302) and r.headers.get("location"):
                r = session.get(r.headers["location"], timeout=30, **kw)
                if r.status_code == 200:
                    return r
        except requests.RequestException:
            pass
    return None


def decode_text(r):
    """Decodifica línea a línea: algunas webs mezclan UTF-8 y latin-1."""
    out = []
    for line in r.content.split(b"\n"):
        try:
            out.append(line.decode("utf-8"))
        except UnicodeDecodeError:
            out.append(line.decode("latin-1"))
    return "\n".join(out)


def nice_title(t):
    """Los títulos todo en mayúsculas pasan a minúscula con inicial; romanos y siglas cortas se respetan."""
    t = clean(t)
    if not t or not t.isupper():
        return t
    small = {"de", "del", "la", "las", "el", "los", "y", "en", "con", "a", "por"}
    words = []
    for i, w in enumerate(t.lower().split(" ")):
        if re.fullmatch(r"[ivxlc]+", w) and w not in ("c", "l"):
            words.append(w.upper())
        elif i and w in small:
            words.append(w)
        else:
            m = re.search(r"[^\W\d_]", w)
            words.append(w[:m.start()] + w[m.start()].upper() + w[m.start() + 1:] if m else w)
    return " ".join(words)


def infer_year(day, month, today, weekday=None):
    """Año de una fecha sin año: la primera ocurrencia desde hoy (con el día de la semana si se conoce)."""
    for y in range(today.year, today.year + 4):
        try:
            d = date(y, month, day)
        except ValueError:
            continue
        if d < today:
            continue
        if weekday is not None and d.weekday() != weekday:
            continue
        return d
    return None


def roll_date(day, month, last, today):
    """Fecha de una lista ordenada y sin año: sube de año cuando el mes retrocede respecto a la anterior."""
    if last is None:
        return infer_year(day, month, today)
    try:
        d = date(last.year, month, day)
    except ValueError:
        return None
    if d >= last or (last - d).days <= 150:  # pequeños desórdenes de la lista no cambian el año
        return d
    return date(last.year + 1, month, day)


VENUE_HINTS = [(r"mamba|\brem\b|garaje|musik|yeseria|gruta|fofo|plaza de toros|condomina|moon|sala 12", "concierto"),
               (r"teatro|circo murcia", "teatro/musical")]


def venue_hint(lugar):
    p = norm(lugar)
    return next((t for pat, t in VENUE_HINTS if re.search(pat, p)), "otro")


def event(titulo, d, hora, lugar, precio, enlace, fuente, *, tipo="otro", subtitulo=None, descripcion=None,
          enlace_entradas=None, d_fin=None):
    if tipo == "otro":
        tipo = venue_hint(lugar)
    return {
        "titulo": titulo,
        "subtitulo": subtitulo,
        "tipo": tipo,
        "descripcion": descripcion,
        "fecha_inicio": d.isoformat(),
        "fecha_fin": (d_fin or d).isoformat(),
        "fecha_texto": d.isoformat(),
        "horario": hora,
        "lugar": lugar,
        "localidad": "Murcia",
        "precio": precio,
        "enlace_entradas": enlace_entradas,
        "enlace": enlace,
        "fuente": fuente,
    }


def hhmm(text):
    m = re.search(r"(\d{1,2})[:.](\d{2})", text or "") or re.search(r"\b(\d{1,2})\s*h\b", text or "")
    if not m:
        return None
    return f"{int(m.group(1)):02d}:{int(m.group(2)) if m.lastindex > 1 else 0:02d}"


# ---------------------------------------------------------------- murciocio.es (agenda de espectáculos)
MC_BASE = "https://www.murciocio.es"


def mc_venue(v):
    """'Sala REM de Murcia' -> 'Sala REM, Murcia'; None si el sitio no es del municipio."""
    v = clean(v)
    for town in TOWNS_BY_LEN:
        m = re.search(rf"(?:,\s*|\s+de\s+|\s+en\s+){re.escape(town)}$", v, re.I)
        if m:
            name = v[:m.start()].strip(" ,")
            if town == "Murcia":
                return f"{name}, Murcia"
            return f"{v}, Murcia" if GENERIC_VENUE.match(name) else f"{name}, {town}"
    return None


def mc_price(t):
    t = clean(t)
    if not t or re.search(r"agotad|por determinar|sin determinar", t, re.I):
        return None
    if re.search(r"libre|gratuit", t, re.I):
        return "Gratuito"
    return t


def mc_day(url, today):
    r = fetch(url)
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    title = soup.select_one('span[property="dc:title"]')
    m = re.match(r"\s*(\w+),\s*(\d+) de (\w+)(?: de (\d{4}))?", title["content"] if title else "", re.I)
    if not m or norm(m.group(3)) not in MONTHS:
        return []
    wd = norm(m.group(1))
    day, month = int(m.group(2)), MONTHS[norm(m.group(3))]
    if m.group(4):
        d = date(int(m.group(4)), month, day)
    else:
        d = infer_year(day, month, today, WEEKDAYS.index(wd) if wd in WEEKDAYS else None)
    if not d or d < today:
        return []
    out = []
    for tr in soup.select("div.field-item tr"):
        c = tr.find_all("td")
        if len(c) < 5 or not c[1].find("b"):
            continue
        b = c[1].find("b")
        titulo = nice_title(b.get_text(" "))
        prefix = clean(c[1].get_text(" ").split(b.get_text(" "))[0]).rstrip(":").strip()
        rest = clean(c[1].get_text(" ").split(b.get_text(" "), 1)[-1])
        rest = re.sub(r"^[,\s]*(presenta:?|por)\s*", "", rest, flags=re.I).strip(" ,")
        lugar = mc_venue(c[2].get_text(" "))
        icon = (c[0].find("img") or {}).get("src", "")
        if not lugar or "deport" in icon or NOT_CULTURAL.search(f"{prefix} {titulo} {rest}"):
            continue
        hint = "concierto" if "concierto" in icon else "teatro/musical" if "escenico" in icon else "otro"
        sub = clean(f"{prefix}: {rest}" if rest else prefix) or None
        slug = re.sub(r"[^a-z0-9]+", "-", norm(f"{titulo}-{lugar}-{hhmm(c[3].get_text())}")).strip("-")
        out.append(event(titulo, d, hhmm(c[3].get_text()), lugar, mc_price(c[4].get_text()),
                         f"{url}#{slug}", "murciocio.es", tipo=hint, subtitulo=sub))
    return out


def scrape_murciocio(today):
    r = fetch(f"{MC_BASE}/agenda-de-espectaculos")
    if not r:
        return []
    html = decode_text(r)
    days = sorted(set(re.findall(
        r'/content/(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)-\d+-de-[a-z]+(?:-de-\d{4})?(?:-\d+)?"', html)))
    urls = [MC_BASE + d.rstrip('"') for d in days]
    print(f"murciocio.es: {len(urls)} días", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        res = list(ex.map(lambda u: mc_day(u, today), urls))
    return [e for day in res for e in day]


# ---------------------------------------------------------------- Sala Mamba
def scrape_mamba(today):
    r = fetch("https://salamamba.com/")
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    out, month, last = [], None, None
    for ev in soup.select(".event"):
        m = norm(clean(ev.select_one(".month").get_text(" "))) if ev.select_one(".month") else ""
        month = MONTHS.get(m[:3])  # la web a veces deja el mes vacío: ese evento se omite (lo cubre el ticketing)
        day_el = ev.select_one(".day")
        if not (day_el and month):
            continue
        day = int(re.sub(r"\D", "", day_el.get_text()) or 0)
        if not day:
            continue
        # las fechas vienen en orden y sin año: el año sube al volver a un mes anterior
        d = roll_date(day, month, last, today)
        if not d:
            continue
        last = d
        titulo = clean(ev.select_one(".event__title").get_text(" "))
        link = ev.select_one("a.button")
        price = [clean(p.get_text(" ")) for p in ev.select(".event__price div")]
        price = "; ".join(x for x in price if x) or None
        hora = hhmm(ev.select_one(".time").get_text(" ")) if ev.select_one(".time") else None
        href = link["href"] if link else "https://salamamba.com/#programacion"
        out.append(event(titulo, d, hora, "Sala Mamba, Murcia", price, href, "salamamba.com",
                         tipo="concierto", enlace_entradas=href if link else None))
    return out


# ---------------------------------------------------------------- Teatro Circo
TC = "https://www.teatrocircomurcia.es/programacion"
TC_CATS = {"2": "teatro/musical", "5": "danza/flamenco", "7": "magia/circo", "10": "concierto", "17": "humor/monólogo"}


def tc_event(ev_id, today):
    r = fetch(f"{TC}?categoria=0&filtro=0&li=0&evento={ev_id}&load=programacion")
    if not r:
        return None
    soup = BeautifulSoup(decode_text(r), "lxml")
    h1 = soup.select_one(".titulo h1")
    f = soup.select_one(".BoxContentBody .fecha")
    if not (h1 and f):
        return None
    m = re.match(r"(\d+)\s+(\w+)\s+(\d{4})", clean(f.get_text()))
    if not m or norm(m.group(2)) not in MONTHS:
        return None
    d = date(int(m.group(3)), MONTHS[norm(m.group(2))], int(m.group(1)))
    if d < today:
        return None
    titulo = nice_title(h1.get_text())
    sub = soup.select_one(".subtitulo h2")
    autor = soup.select_one(".autor h3")
    price = soup.select_one(".precio")
    price = clean(price.get_text()).replace("Precio:", "").strip() if price else None
    price = re.sub(r"\s*/?\s*ESPECT[ÁA]CULO DE CALLE", "", price or "", flags=re.I).strip(" /") or None
    if price and re.search(r"gratuit", price, re.I):
        price = "Gratuito"
    buy = soup.select_one("a.bcompra")
    sub_txt = clean(" ".join(x.get_text(" ") for x in (sub, autor) if x)) or None
    desc = soup.select_one(".texto, .BoxContentText")
    return event(titulo, d, hhmm((soup.select_one(".BoxContentBody .hora") or soup).get_text(" ")) if soup.select_one(".BoxContentBody .hora") else None,
                 "Teatro Circo, Murcia", price,
                 f"https://www.teatrocircomurcia.es/programacion/categoria/0/filtro/0/li/0/evento/{ev_id}",
                 "teatrocircomurcia.es", subtitulo=sub_txt, enlace_entradas=buy["href"] if buy else None)


def scrape_teatro_circo(today):
    ids = {}
    for qs in ("", "&temporada=49", "&temporada=50", "&temporada=51", "&temporada=52", "&temporada=53"):
        r = fetch(f"{TC}?load=programacion{qs}")
        if not r:
            continue
        for ev_id in re.findall(r"evento/(\d+)", r.text):
            ids.setdefault(ev_id, "otro")
        for ev_id, cat in re.findall(r"evento/(\d+)/title/[^\"]*?/categoria/(\d+)", r.text):
            ids[ev_id] = TC_CATS.get(cat, "otro")
    print(f"teatrocircomurcia.es: {len(ids)} eventos", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        res = list(ex.map(lambda i: tc_event(i, today), ids))
    out = []
    for (ev_id, tipo), e in zip(ids.items(), res):
        if e:
            e["tipo"] = tipo
            out.append(e)
    return out


# ---------------------------------------------------------------- Teatro Romea
ROMEA = "https://www.teatroromea.es"


def romea_event(ev_id, today):
    url = f"{ROMEA}/Evento.aspx?frmid={ev_id}"
    r = fetch(url)
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    text = "\n".join(clean(x) for x in soup.get_text("\n").split("\n") if clean(x))
    lines = text.split("\n")
    try:
        i = next(k for k, x in enumerate(lines) if x == "volver")
    except StopIteration:
        return []
    titulo = nice_title(lines[i + 1])
    autor = lines[i + 2] if i + 2 < len(lines) and not re.search(r"\d{4}", lines[i + 2]) else None
    mp = re.search(r"Precio:\s*([^\n]+?)(?:\n€|\s*€|\n)", text)
    price = None
    if mp:
        price = clean(mp.group(1))
        price = f"{price} €" if re.search(r"\d", price) and "€" not in price else price
    out = []
    for m in re.finditer(r"(\d{1,2}) de (\w+) de (\d{4})\s*-\s*(\d{1,2})(?::(\d{2}))?\s*h", text):
        mo = MONTHS.get(norm(m.group(2)))
        if not mo:
            continue
        d = date(int(m.group(3)), mo, int(m.group(1)))
        if d < today:
            continue
        hora = f"{int(m.group(4)):02d}:{int(m.group(5) or 0):02d}"
        out.append(event(titulo, d, hora, "Teatro Romea, Murcia", price, url, "teatroromea.es",
                         subtitulo=autor, enlace_entradas=url))
    return out


def scrape_romea(today):
    """La programación es un calendario ASP.NET: se avanza mes a mes con su postback."""
    url = f"{ROMEA}/programacion.aspx"
    r = fetch(url)
    if not r:
        return []
    page = decode_text(r)
    ids = set(re.findall(r"[Ee]vento\.aspx\?frmid=(\d+)", page))
    for _ in range(14):
        soup = BeautifulSoup(page, "lxml")
        nxt = [int(m.group(1)) for a in soup.find_all("a", href=re.compile(r"doPostBack"))
               if a.get("title", "").endswith("next month") for m in [re.search(r"'V(\d+)'", a["href"])] if m]
        if not nxt:
            break
        form = {i["name"]: i.get("value", "") for i in soup.select("form input[name]") if i["name"].startswith("__")}
        form.update({"__EVENTTARGET": "ctl00$cuerpo$calendario", "__EVENTARGUMENT": f"V{nxt[0]}"})
        try:
            page = decode_text(session.post(url, data=form, timeout=30))
        except requests.RequestException:
            break
        ids |= set(re.findall(r"[Ee]vento\.aspx\?frmid=(\d+)", page))
    ids = sorted(ids)
    print(f"teatroromea.es: {len(ids)} eventos", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        res = list(ex.map(lambda i: romea_event(i, today), ids))
    return [e for sub in res for e in sub]


# ---------------------------------------------------------------- Auditorio Víctor Villegas y centros asociados
AUD = "https://www.auditoriomurcia.org"
AUD_VENUES = {
    "auditorio": 'Auditorio Víctor Villegas, Murcia', "auditorio-vv": 'Auditorio Víctor Villegas, Murcia',
    "parraga": "Centro Párraga, Murcia", "veronicas": "Sala Verónicas, Murcia", "filmoteca": "Filmoteca Regional, Murcia",
    "cendeac": "CENDEAC, Murcia",
}


def scrape_auditorio(today):
    out, last = [], None
    # las páginas se piden a la vez; el orden importa para inferir el año, así que se procesan en secuencia
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        pages = list(ex.map(lambda n: fetch(f"{AUD}/agenda" + (f"/pag{n}" if n > 1 else "")), range(1, 25)))
    for r in pages:
        if not r:
            break
        soup = BeautifulSoup(decode_text(r), "lxml")
        cards = soup.select("div[data-tickets]")
        if not cards:
            break
        for c in cards:
            a = c.select_one(".content a[href^='/agenda/']")
            dt = c.select_one(".date > span")
            if not (a and dt):
                continue
            m = re.match(r"\s*(\d{1,2})\s+(\w+)", dt.get_text())
            if not m or norm(m.group(2))[:3] not in MONTHS:
                continue
            day, month = int(m.group(1)), MONTHS[norm(m.group(2))[:3]]
            d = roll_date(day, month, last, today)
            if not d:
                continue
            last = d
            titulo = nice_title(a.select_one("h3").get_text())
            if NOT_CULTURAL.search(titulo):
                continue
            spans = [clean(s.get_text()) for s in c.select(".date div span")]
            hora = hhmm(spans[0]) if spans else None
            kind = spans[1] if len(spans) > 1 else ""
            buy = c.select_one(".header a[href^='http']")
            lugar = AUD_VENUES.get(c.get("data", "auditorio"), "Auditorio Víctor Villegas, Murcia")
            out.append(event(titulo, d, hora, lugar, None, AUD + a["href"], "auditoriomurcia.org",
                             subtitulo=kind or None, enlace_entradas=buy["href"] if buy else None))
    print(f"auditoriomurcia.org: {len(out)} eventos", file=sys.stderr)
    return out


# ---------------------------------------------------------------- compralaentrada.com (ticketing)
CE = "https://compralaentrada.com"


def ce_event(url, today):
    r = fetch(url)
    if not r:
        return None
    m = re.search(r'application/ld\+json[^>]*>(.*?)</script>', r.text, re.S)
    if not m:
        return None
    try:
        ld = json.loads(m.group(1))
    except ValueError:
        return None
    if ld.get("@type") != "Event" or not ld.get("startDate"):
        return None
    loc = ld.get("location") or {}
    town = clean((loc.get("address") or {}).get("addressLocality"))
    if norm(town) not in {norm(t) for t in MURCIA_TOWNS}:
        return None
    start = datetime.fromisoformat(ld["startDate"].replace("Z", "+00:00")).astimezone(MADRID)
    if start.date() < today:
        return None
    titulo = nice_title(ld.get("name"))
    venue = clean(loc.get("name"))
    if NOT_CULTURAL.search(f"{titulo} {venue}") or re.search(r"estadio|pabell[oó]n|polideportivo", venue, re.I):
        return None
    price = (ld.get("offers") or {}).get("price")
    try:
        price = f"Desde {float(price):g} €" if price and float(price) > 0 else None
    except ValueError:
        price = None
    venue = re.sub(r"\s+de\s+Murcia$", "", venue.split(":")[0], flags=re.I)
    if STREET_PREFIX.match(venue):
        # la fuente da la dirección y no el nombre: se traduce con config.json (recintos.direcciones)
        venue = VENUE_ADDRESSES.get(norm(venue).replace(",", ""), "")
    lugar = f"{venue}, {town}" if venue else town
    return event(titulo, start.date(), start.strftime("%H:%M"), lugar, price, url,
                 "compralaentrada.com", enlace_entradas=url)


def scrape_compralaentrada(today):
    r = fetch(f"{CE}/sitemap.xml")
    if not r:
        return []
    urls = [u.replace("https://www.", "https://") for u in re.findall(r"<loc>([^<]+/event/[^<]*murcia[^<]*)</loc>", r.text)]
    urls = [u for u in urls if not re.search(r"cartagena|lorca|molina", u)]
    print(f"compralaentrada.com: {len(urls)} eventos en sitemap", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        res = list(ex.map(lambda u: ce_event(u, today), urls))
    return [e for e in res if e]


# ---------------------------------------------------------------- ticketmaster.es (conciertos grandes: Plaza de Toros...)
TM = "https://www.ticketmaster.es"
TM_HEADERS = {"User-Agent": "Mozilla/5.0"}


def tm_jsonld_events(url):
    try:
        r = session.get(url, timeout=30, headers=TM_HEADERS)
    except requests.RequestException:
        return [], ""
    if r.status_code != 200:
        return [], ""
    out = []
    for m in re.finditer(r"<script[^>]*ld\+json[^>]*>(.*?)</script>", r.text, re.S):
        try:
            j = json.loads(m.group(1))
        except ValueError:
            continue
        out += [x for x in (j if isinstance(j, list) else [j])
                if isinstance(x, dict) and x.get("@type") in ("Event", "MusicEvent")]
    return out, r.text


def scrape_ticketmaster(today):
    """Páginas de ciudad y de recintos de Murcia; los eventos vienen como JSON-LD."""
    pages = [f"{TM}/discover/murcia", f"{TM}/search?q=murcia"]
    venues = set()
    for u in pages:
        _, html = tm_jsonld_events(u)
        venues |= {v for v in re.findall(r'https://www\.ticketmaster\.es/venue/[^"\'?<\s]*murcia[^"\'?<\s]*', html)}
    print(f"ticketmaster.es: {len(venues)} recintos", file=sys.stderr)
    evs = []
    for u in pages + sorted(venues):
        evs += tm_jsonld_events(u)[0]
    out, seen = [], set()
    for x in evs:
        loc = x.get("location") or {}
        town = clean((loc.get("address") or {}).get("addressLocality"))
        if norm(town) not in {norm(t) for t in MURCIA_TOWNS} or not x.get("startDate"):
            continue
        sd = x["startDate"]
        d = date.fromisoformat(sd[:10])
        hora = sd[11:16] if len(sd) > 10 and sd[11:16] != "00:00" else None
        titulo = nice_title(re.sub(r"\s*[-(]\s*Murcia\)?\s*$", "", x.get("name") or ""))
        venue = clean(loc.get("name"))
        url = x.get("url")
        if d < today or not titulo or url in seen or NOT_CULTURAL.search(f"{titulo} {venue}"):
            continue
        seen.add(url)
        out.append(event(titulo, d, hora, f"{venue}, {town}", None, url, "ticketmaster.es",
                         tipo="concierto", enlace_entradas=url))
    return out


# ---------------------------------------------------------------- Pupaclown
PUPA = "https://pupaclown.org"


def scrape_pupaclown(today):
    r = fetch(f"{PUPA}/programacion")
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    out = []
    for h3 in soup.select("h3.color-pink"):
        m = re.match(r"(\w+)\s+(\d{4})", norm(clean(h3.get_text())))
        if not m or m.group(1)[:3] not in MONTHS:
            continue
        year = int(m.group(2))
        sect = h3.find_parent("div", class_="col-12").find_parent("div", class_="row").find_next_sibling("div", class_="row")
        for card in (sect.select(".espectaculo-card") if sect else []):
            name = card.select_one(".espectaculo-nombre")
            if not name:
                continue
            tipo = card.select_one(".espectaculo-tipo")
            cal = card.select_one(".espectaculo-calificacion")
            sub = clean(" · ".join(x.get_text(" ") for x in (tipo, cal) if x)).capitalize() or None
            for a in card.select("a.espectaculo-fecha"):
                f = re.search(r"(\d{1,2})\s+([a-záéíóú]+)\s*I\s*([^|]*)\|?\s*(.*)", clean(a.get_text(" ")), re.I)
                if not f or MONTHS.get(norm(f.group(2))[:3]) is None:
                    continue
                d = date(year, MONTHS[norm(f.group(2))[:3]], int(f.group(1)))
                if d < today:
                    continue
                price = clean(f.group(4)) or None
                href = a["href"] if a["href"].startswith("http") else PUPA + a["href"]
                out.append(event(nice_title(name.get_text(" ")), d, hhmm(f.group(3)), "Pupaclown, Murcia", price,
                                 href, "pupaclown.org", tipo="teatro/musical", subtitulo=sub, enlace_entradas=href))
    return out


# ---------------------------------------------------------------- Centro Párraga
PARRAGA = "https://www.centroparraga.es/servlet/s.Sl"
PARRAGA_TYPES = {"ESPECTACULO": "teatro/musical", "EXPOSICION": "exposición", "CURSO": "taller/curso",
                 "TALLER": "taller/curso", "CONFERENCIA": "charla/libro"}


def scrape_parraga(today):
    r = fetch(f"{PARRAGA}?sit=c,914,m,3898")
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    links = {}
    for a in soup.find_all("a", href=re.compile("DETALLE_EVENTO")):
        links.setdefault(a["href"], clean(a.get_text(" ")))

    def one(item):
        href, label = item
        url = urljoin(PARRAGA, href)
        rr = fetch(url)
        if not rr:
            return None
        text = clean(BeautifulSoup(decode_text(rr), "lxml").get_text(" "))
        m = re.search(r"(?:Del\s+)?(\d{2})\.(\d{2})\.(\d{2})(?:\s+hasta\s+(\d{2})\.(\d{2})\.(\d{2}))?", text)
        if not m:
            return None
        d = date(2000 + int(m.group(3)), int(m.group(2)), int(m.group(1)))
        d_fin = date(2000 + int(m.group(6)), int(m.group(5)), int(m.group(4))) if m.group(4) else d
        if d_fin < today or (d_fin - d).days > 200:  # pasado o programa de larga duración (p. ej. sesiones educativas)
            return None
        kind, _, name = label.partition(" / ")
        if not name:
            kind, name = "", label
        tipo = PARRAGA_TYPES.get(norm(kind).upper(), "otro")
        after = text[m.end():m.end() + 400]
        hora = hhmm(re.search(r"\d{1,2}(?:[:.]\d{2})?\s*h\b", after).group(0)) if re.search(r"\d{1,2}(?:[:.]\d{2})?\s*h\b", after) else None
        pr = re.search(r"Precio:?\s*([^A-Za-z]{1,12}?€)", text, re.I)
        price = clean(pr.group(1)) if pr else None
        return event(nice_title(name), max(d, today) if d_fin != d else d, hora, "Centro Párraga, Murcia", price, url,
                     "centroparraga.es", tipo=tipo, d_fin=d_fin, subtitulo=nice_title(kind) if kind else None)

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        return [e for e in ex.map(one, links.items()) if e]


# ---------------------------------------------------------------- Filmoteca Regional
FILMO = "https://filmotecamurcia.carm.es"


def scrape_filmoteca(today):
    r = fetch(f"{FILMO}/servlet/s.Sl?METHOD=ENLACEMENUS&sit=c,884,m,3623,a,0")
    if not r:
        return []
    soup = BeautifulSoup(decode_text(r), "lxml")
    out, seen = [], set()
    for it in soup.select(".item-event"):
        a, ps, h = it.find("a"), it.select("header p"), it.select_one("h3")
        if not (a and h and ps):
            continue
        m = re.match(r"(\d{1,2})\s+(\w+)", norm(clean(ps[0].get_text())))
        if not m or m.group(2)[:3] not in MONTHS:
            continue
        d = infer_year(int(m.group(1)), MONTHS[m.group(2)[:3]], today)
        titulo = nice_title(clean(h.get_text(" ")).rstrip(".… ") if clean(h.get_text()).endswith("...") else clean(h.get_text(" ")))
        hora = hhmm(ps[1].get_text()) if len(ps) > 1 else None
        if not d or (titulo, d, hora) in seen:
            continue
        seen.add((titulo, d, hora))
        out.append(event(titulo, d, hora, "Filmoteca Regional, Murcia", None, urljoin(FILMO, a["href"]),
                         "filmotecamurcia.carm.es", tipo="cine"))
    return out


SOURCES = [scrape_teatro_circo, scrape_romea, scrape_auditorio, scrape_mamba, scrape_compralaentrada,
           scrape_ticketmaster, scrape_murciocio, scrape_pupaclown, scrape_parraga, scrape_filmoteca]


def _run(fn, today):
    try:
        res = fn(today)
    except Exception as exc:  # una fuente caída no debe tumbar el resto
        print(f"{fn.__name__}: ERROR {exc!r}", file=sys.stderr)
        return []
    print(f"{fn.__name__}: {len(res)} eventos", file=sys.stderr)
    return res


def scrape_all(today):
    """Todas las fuentes a la vez (cada una ya pagina/paraleliza por dentro)."""
    with ThreadPoolExecutor(max_workers=min(3, len(SOURCES))) as ex:
        results = list(ex.map(lambda fn: _run(fn, today), SOURCES))
    return [e for res in results for e in res]
