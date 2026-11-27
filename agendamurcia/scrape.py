#!/usr/bin/env python3
"""Agenda cultural de Murcia (municipio + pedanías) -> events.json

Fuente: murciaturistica.es (Instituto de Turismo de la Región de Murcia).
Uso: python scrape.py [--days 7] [--out events.json]
"""
import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor
import re
import sys
import time
from datetime import date, timedelta

import requests
from bs4 import BeautifulSoup

from consolidate import consolidate
from sources import CONFIG, WORKERS, scrape_all

try:
    import truststore  # usa el almacén de certificados del sistema (proxies corporativos)
    truststore.inject_into_ssl()
except ImportError:
    pass

BASE = "https://murciaturistica.es"
HEADERS = {"User-Agent": "Mozilla/5.0 (agendaMurcia personal scraper)"}
MONTHS = {m: i + 1 for i, m in enumerate(
    "ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC".split())}

# tipo de la fuente -> tipo propio; los no listados (deportes, naturaleza, vino...) se excluyen
TYPES = {
    "MUSICA": "concierto",
    "EXPOSICIONES": "exposición",
    "TEATROYHUMOR": "teatro/humor",
    "CINE": "cine",
    "CURSOSYTALLERES": "taller/curso",
    "RUTASYVISITAS": "visita guiada/ruta",
    "FESTIVALES": "festival",
    "FIESTASYTRADICIONES": "fiesta popular/folclore",
    "MERCADILLOS": "mercadillo artesano",
    "PROGRAMACIONCULTURAL": "programación cultural",
    "SEMANASANTA": "procesión/Semana Santa",
    "RELIGIOSO": "religioso/cultural",
    "NAVIDAD": "navidad",
    "FERIASYCONGRESOS": "feria/jornada",
    "ENOGASTRONOMIA": "gastronomía cultural",
    "OTROSEVENTOS": "otro",
    "NI\u00d1OS": "infantil",
}
# palabras clave para afinar el tipo
KEYWORDS = [
    (r"cuentacuentos|cuenta cuentos", "cuentacuentos"),
    (r"t[ií]teres|marionetas", "títeres/infantil"),
    (r"\bmagia\b|mago|circo|malabar", "magia/circo"),
    (r"flamenco|\bdanza\b|\bballet\b|baile", "danza/flamenco"),
    (r"festival", "festival"),
    (r"[oó]pera|zarzuela|sinf[oó]nic|orquesta|c[aá]mara|[oó]rgano|m[uú]sicas hist[oó]ricas|coral|cantor", "ópera/zarzuela/clásica"),
    (r"caperucita|cuento", "infantil/cuentos"),
    (r"cl[oó]wn|payas", "magia/circo"),
    (r"bel[eé]n monumental|belenes", "exposición"),
    (r"mon[oó]logo|open mic|stand.?up|comedia|humor|c[oó]mic", "humor/monólogo"),
    (r"poes[ií]a|recital po", "poesía/recital"),
    (r"presentaci[oó]n del libro|presentaci[oó]n de libro|charla|conferencia|coloquio", "charla/libro"),
    (r"proyecci[oó]n|cine|pel[ií]cula|cortometraje", "cine"),
    (r"concierto|jam session|\bdj\b|recital", "concierto"),
    (r"exposici[oó]n|muestra de arte|galer[ií]a", "exposición"),
    (r"teatro|musical|obra de", "teatro/musical"),
    (r"street art|arte urbano|fotograf", "fotografía/arte urbano"),
    (r"visita guiada|ruta guiada|visita teatralizada", "visita guiada/ruta"),
    (r"\btaller|\bcursos?\b", "taller/curso"),
    (r"\bvisita|itinerario|ruta\b", "visita guiada/ruta"),
    (r"mercadillo|mercado artesan|artesan", "mercadillo artesano"),
    (r"procesi[oó]n|semana santa", "procesión/Semana Santa"),
]
# nombres de filtro simplificados que ve el usuario
SIMPLE_TYPES = {
    "concierto": "Música", "ópera/zarzuela/clásica": "Música",
    "exposición": "Exposiciones", "fotografía/arte urbano": "Exposiciones",
    "teatro/humor": "Teatro", "teatro/musical": "Teatro", "humor/monólogo": "Comedia",
    "cine": "Cine", "danza/flamenco": "Danza",
    "cuentacuentos": "Infantil", "infantil": "Infantil", "infantil/cuentos": "Infantil",
    "títeres/infantil": "Infantil", "magia/circo": "Circo y magia",
    "taller/curso": "Talleres", "visita guiada/ruta": "Visitas", "festival": "Festivales",
    "fiesta popular/folclore": "Fiestas", "mercadillo artesano": "Fiestas",
    "procesión/Semana Santa": "Fiestas", "religioso/cultural": "Fiestas", "navidad": "Fiestas",
    "charla/libro": "Literatura", "poesía/recital": "Literatura",
    "gastronomía cultural": "Gastronomía",
}
KNOWN_TYPES = set(SIMPLE_TYPES.values()) | {"Conferencias"}


CUENTOS_RE = re.compile(r"cuentacuentos|cuenta cuentos|\bcuentos?\b|narraci[oó]n oral|cuentista", re.I)


def refine_simple(e):
    """Los cuentos (narración oral, cuentacuentos) se agrupan en Infantil."""
    text = " ".join(str(e.get(k) or "") for k in ("titulo", "subtitulo", "descripcion"))
    if e["tipo"] in ("Infantil", "Otros", "Literatura", "Teatro") and CUENTOS_RE.search(text):
        return "Infantil"
    return e["tipo"]


STREET_RE = re.compile(
    r"^(calle|c/|c\.|avenida|avda\.?|av\.|paseo|glorieta|ronda|camino|carretera|gran v[ií]a|"
    r"travesía|callejón|esquina|s/n|\d{5}\b)", re.I)
STREET_CUT = re.compile(
    r"\s+(calle|c/|avenida|avda\.?|plaza|paseo|glorieta|ronda|camino|carretera|gran v[ií]a)\b.*$", re.I)
SMALL_WORDS = {"de", "del", "la", "las", "el", "los", "y", "en"}


def _title_case(t):
    words = t.lower().split()
    return " ".join(w if (i and w in SMALL_WORDS) else w[:1].upper() + w[1:] for i, w in enumerate(words))


VENUE_ALIASES = {k.lower(): v for k, v in CONFIG.get("recintos", {}).get("alias", {}).items()}


def trim_text(text, limit=2000):
    """Recorta la descripción sin partir frases: si pasa del límite, se queda con la última frase completa."""
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    m = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[:m + 1] if m > limit // 2 else cut.rstrip(" ,;:") + "…"


def clean_place(lugar, localidad=""):
    """'Nombre del sitio, Población' sin calle ni número (p. ej. 'Teatro Romea, Murcia')."""
    lugar, localidad = (lugar or "").strip(), (localidad or "").strip()
    if not lugar and localidad.isupper():
        # eventos.murcia.es a veces deja el lugar en mayúsculas dentro de 'localidad'
        t = re.sub(r"\(\s*murcia\s*\)|\bs/n\b", "", localidad, flags=re.I).strip()
        t = STREET_CUT.sub("", t).strip(" ,")
        half = len(t) // 2
        if t and t[:half].strip() == t[half:].strip():
            t = t[:half].strip()
        t = re.sub(r"\s+MURCIA$", "", t).strip(" ,")
        lugar = _title_case(t) if t else "Murcia"
    if not lugar:
        return "Murcia"
    parts = [p.strip() for p in lugar.split(",") if p.strip()]
    venue = parts[0]
    if STREET_RE.match(venue):
        # sólo había una calle: el nombre del sitio, si existe, está en 'localidad'
        venue = localidad if localidad and localidad.lower() != "murcia" and not STREET_RE.match(localidad) else ""
    towns = [p for p in parts[1:] if not STREET_RE.match(p) and not re.match(r"plaza|plz|pza", p, re.I)]
    named = [p for p in towns if p.lower() != "murcia"]  # prefiere la pedanía a "Murcia"
    town = named[-1] if named else "Murcia"
    venue = VENUE_ALIASES.get(venue.lower(), venue)
    if not venue or venue.lower() == town.lower():
        return town
    return f"{venue}, {town}"


def simplify_type(t):
    if isinstance(t, list):  # JSON previo: la primera etiqueta es el tipo principal
        t = t[0] if t else "Otros"
    return SIMPLE_TYPES.get(t, t if t in KNOWN_TYPES else "Otros")


# palabras que descartan el evento (no culturales)
EXCLUDE = re.compile(
    r"marcha senderista|senderismo|carrera popular|btt|ciclismo|marat[oó]n|torneo|"
    r"\bf[uú]tbol|baloncesto|triatl|bus del vino|paquete", re.I)

session = requests.Session()
session.headers.update(HEADERS)


def decode(content: bytes) -> str:
    """La web mezcla UTF-8 (descripciones) y latin-1 (resto) en el mismo documento."""
    out = []
    for line in content.split(b"\n"):
        try:
            out.append(line.decode("utf-8"))
        except UnicodeDecodeError:
            out.append(line.decode("latin-1"))
    return "\n".join(out)


def get_soup(url, params=None):
    for attempt in range(3):
        try:
            r = session.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return BeautifulSoup(decode(r.content), "lxml")
        except requests.RequestException:
            pass
        time.sleep(1 + attempt)
    return None


def list_events(localidad="murcia", tipo=None):
    params = {"buscar": "si", "localidad": localidad}
    if tipo:
        params["tipo"] = tipo
    soup = get_soup(f"{BASE}/es/agenda/", params)
    urls = {}
    if not soup:
        return urls
    for card in soup.select(".resultado-card"):
        a = card.select_one("a.ver-mas")
        if a:
            urls[a["href"]] = tipo
    return urls


def parse_dates(text, today):
    """Devuelve (inicio, fin) a partir de textos como '27 NOV 2026', '14 NOV - 05 DIC'."""
    found = re.findall(r"(\d{1,2})\s+([A-Z]{3})[A-Z]*\.?(?:\s+(\d{4}))?", text.upper())
    ds = []
    for d, m, y in found:
        if m not in MONTHS:
            continue
        year = int(y) if y else None
        ds.append([int(d), MONTHS[m], year])
    if not ds:
        return None, None
    # el año sólo suele aparecer en la última fecha del rango
    last_year = next((x[2] for x in reversed(ds) if x[2]), None)
    res = []
    for i, (d, m, y) in enumerate(ds):
        y = y or last_year or today.year
        if i == 0 and len(ds) > 1 and ds[0][2] is None and last_year:
            # si el inicio quedaría posterior al fin, pertenece al año anterior
            if date(y, m, d) > date(last_year, ds[-1][1], ds[-1][0]):
                y -= 1
        try:
            res.append(date(y, m, d))
        except ValueError:
            return None, None
    return res[0], res[-1]


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def parse_event(path, source_type, today):
    url = BASE + path if path.startswith("/") else path
    soup = get_soup(url)
    if not soup:
        return None
    h1 = soup.select_one("h1")
    if not h1:
        return None
    col = h1.find_parent("div")
    title = clean(h1.get_text())
    subtitle_el = h1.find_next_sibling("p")
    subtitle = clean(subtitle_el.get_text()) if subtitle_el else ""
    h5s = col.find_all("h5")
    date_txt = ""
    for h in h5s:
        t = clean(h.get_text())
        if re.search(r"\d{1,2}\s+[A-Za-z]{3}", t) and not t.lower().startswith(("info", "hor", "prec")):
            date_txt = t
            break
    start, end = parse_dates(date_txt, today)

    def section(name):
        for h in h5s:
            if clean(h.get_text()).lower().startswith(name):
                ul = h.find_next_sibling()
                if ul:
                    return [clean(li.get_text()) for li in ul.find_all("li")] or [clean(ul.get_text())]
        return []

    horario = "; ".join(section("horario"))
    precio_l = section("precio")
    precio = "; ".join(precio_l) if precio_l else None
    loc_block = col.select_one("div.my-4")
    localidad = clean(loc_block.get_text(" ")) if loc_block else ""
    info_h = next((h for h in h5s if clean(h.get_text()).lower().startswith("info")), None)
    desc_parts = []
    if info_h:
        for sib in info_h.find_next_siblings():
            if sib.name == "h5":
                break
            desc_parts.append(clean(sib.get_text(" ")))
    desc = clean(" ".join(desc_parts))
    lugar = None
    lc = soup.select_one(".lugar-card")
    if lc:
        lugar = clean(lc.get_text(" "))
    tickets = [a["href"] for a in col.select("a[href^=http]") if "entrada" in a.get_text().lower()]

    return {
        "titulo": title,
        "subtitulo": subtitle or None,
        "tipo": source_type,
        "descripcion": trim_text(desc) or None,
        "fecha_inicio": start.isoformat() if start else None,
        "fecha_fin": end.isoformat() if end else None,
        "fecha_texto": date_txt,
        "horario": horario or None,
        "lugar": lugar,
        "localidad": localidad,
        "precio": precio,
        "enlace_entradas": tickets[0] if tickets else None,
        "enlace": url,
        "fuente": "murciaturistica.es",
    }


def refine_type(ev, default):
    text = f"{ev['titulo']} {ev.get('subtitulo') or ''} {(ev.get('descripcion') or '')[:300]}".lower()
    for pat, t in KEYWORDS:
        if re.search(pat, text):
            return t
    return default


# ---------------------------------------------------------------- eventos.murcia.es
EM_BASE = "https://eventos.murcia.es"
MONTHS_FULL = {m: i + 1 for i, m in enumerate(
    "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split())}
# estas secciones no son culturales (el sitio también lista deportes)
EM_EXCLUDE = re.compile(r"\bf[uú]tbol|baloncesto|balonmano|voleibol|rugby|atletismo|carrera|torneo|"
                        r"campeonato|liga\b|nataci[oó]n|ciclismo|marcha|triatl|\bpadel\b|\bp[aá]del", re.I)


def em_prices(text):
    m = re.search(r"Precios?:\s*([^\n]*?)\s*(?:COMPRAR|VENTA DE|ENTRADAS|\(http|$)", text, re.I | re.M)
    if m and re.search(r"\d|gratuit|libre", m.group(1), re.I):
        return clean(m.group(1))
    t = re.sub(r"\s+", " ", text)
    if re.search(r"gratuit[oa]|entrada libre|acceso libre|entrada gratuita|entrada liberada", t, re.I):
        free = "Gratuito"
    else:
        free = None
    amounts = re.findall(r"[^.\n]{0,40}?\d+(?:[.,]\d+)?\s?(?:€|euros)[^.\n]{0,25}", t)
    if amounts:
        amounts = [clean(a) for a in amounts[:3]]
        return "; ".join(([free] if free else []) + amounts)
    return free


def em_dates(text, ld_start, ld_end):
    ds = set()
    if ld_start:
        ds.add(ld_start)
    if ld_end:
        ds.add(ld_end)
    for d, m, y in re.findall(r"(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", text.lower()):
        if m in MONTHS_FULL:
            try:
                ds.add(date(int(y), MONTHS_FULL[m], int(d)))
            except ValueError:
                pass
    return ds


def em_event(url, today):
    soup = get_soup(url)
    if not soup:
        return None
    ld = None
    for sc in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(sc.string or "")
        except ValueError:
            continue
        if isinstance(data, dict) and data.get("@type") == "Event":
            ld = data
            break
    if not ld or not ld.get("startDate"):
        return None
    start = date.fromisoformat(ld["startDate"][:10])
    end = date.fromisoformat(ld.get("endDate", ld["startDate"])[:10])
    desc = ld.get("description") or ""
    dates = em_dates(desc, start, end)
    window = [d for d in dates if d >= today]
    if window:
        end = max(end, max(window))
    if end < today:
        return None
    cat = soup.select_one(".event-category, .category, .event_category")
    loc = ld.get("location") or {}
    place = clean(loc.get("name", "")).replace(", España", "") or None
    title = clean(ld.get("name"))
    if EM_EXCLUDE.search(title) or re.search(
            r"estadio|deportes|pabell[oó]n|polideportivo|\bcd\b|\bue\b|elpozo|real murcia|itinerario",
            f"{title} {place}", re.I):
        return None
    hours = sorted({m for m in re.findall(r"\b(\d{1,2}(?::\d{2})?\s?(?:h|horas))\b", desc)})[:4]
    time_ld = ld["startDate"][11:16] if len(ld["startDate"]) > 10 else None
    return {
        "titulo": title,
        "subtitulo": None,
        "tipo": "otro",
        "descripcion": trim_text(clean(desc)) or None,
        "fecha_inicio": start.isoformat(),
        "fecha_fin": end.isoformat(),
        "fecha_texto": ", ".join(sorted(d.isoformat() for d in window)) or f"{start} a {end}",
        "horario": time_ld if time_ld and time_ld != "00:00" else ("; ".join(hours) or None),
        "lugar": place,
        "localidad": (loc.get("address") or {}).get("addressLocality") or "Murcia",
        "precio": em_prices(desc),
        "enlace_entradas": None,
        "enlace": ld.get("url") or url,
        "fuente": "eventos.murcia.es",
    }


def scrape_eventos_murcia(today):
    r = session.get(f"{EM_BASE}/sitemap.xml", timeout=60)
    urls = re.findall(r"<loc>([^<]+)</loc>", r.text)
    print(f"eventos.murcia.es: {len(urls)} URLs en sitemap", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        res = list(ex.map(lambda u: em_event(u, today), urls))
    return [e for e in res if e]


def event_key(e):
    return e["enlace"] or (e["titulo"].lower(), e["fecha_inicio"], e["lugar"])


def only_past_dates(e, today):
    """Programas largos (p. ej. un ciclo de conciertos) cuya descripción lista fechas dd/mm/aa y todas ya pasaron."""
    ds = []
    for d, m, y in re.findall(r"\b(\d{2})/(\d{2})/(\d{2})\b", e.get("descripcion") or ""):
        try:
            ds.append(date(2000 + int(y), int(m), int(d)))
        except ValueError:
            pass
    return bool(ds) and max(ds) < today


def within_horizon(e, today, cfg):
    """Descarta eventos que empiezan más allá del horizonte configurado para su categoría (config.json › horizontes)."""
    # con varias etiquetas manda la de horizonte más largo
    por = cfg.get("categorias", {})
    days = max(por.get(t, cfg.get("por_defecto", 365)) for t in e["categorias"])
    return e["fecha_inicio"] <= (today + timedelta(days=days)).isoformat()


def merge_with_existing(new_events, path, today):
    """Fusiona la búsqueda actual con el JSON previo: añade nuevos, actualiza/completa
    los existentes y elimina los ya terminados."""
    merged = {}
    try:
        with open(path, encoding="utf-8") as f:
            for e in json.load(f).get("eventos", []):
                e["tipo"] = e.pop("categorias", None) or e.get("tipo") or "Otros"  # la primera etiqueta es la principal
                merged[event_key(e)] = e
    except (FileNotFoundError, ValueError):
        pass
    for e in new_events:
        old = merged.get(event_key(e), {})
        # los datos nuevos mandan; si la fuente ya no da un campo, se conserva el anterior
        merged[event_key(e)] = {**e, **{k: v for k, v in old.items() if e.get(k) in (None, "", [])}}
    out = []
    for e in merged.values():
        if e["fecha_fin"] < today.isoformat() or only_past_dates(e, today):
            continue
        e["fecha_orden"] = max(e["fecha_inicio"], today.isoformat())
        out.append(e)
    return out


_CLS = CONFIG.get("clasificacion", {})
KEYWORD_TAGS = {tag: re.compile(p, re.I) for tag, p in _CLS.get("palabras_clave", {}).items()}
MUSIC_TITLE_ONLY = set(_CLS.get("musica_solo_titulo_en", []))
MANUAL_TAGS = {k.lower(): ([v] if isinstance(v, str) else v) for k, v in _CLS.get("etiquetas_manuales", {}).items()}
MANUAL_EXCLUDE = [t.lower() for t in _CLS.get("excluir", [])]


def etiquetas(e):
    """Etiquetas del evento (puede tener varias y aparecer en varios filtros). La primera es
    el tipo principal; las palabras clave de config.json suman Música, Conferencias, Gastronomía.
    "Otros" se omite si ya hay otra etiqueta."""
    title = e["titulo"].lower()
    manual = next((v for k, v in MANUAL_TAGS.items() if title == k or (len(k) >= 12 and title.startswith(k))), None)
    if manual:
        return list(manual)
    tipo = e["tipo"]
    if tipo == "Otros" and (e.get("lugar") or "").isdigit():
        tipo = "Música"  # salas de conciertos de compralaentrada cuyo recinto llega como número
    tags = [tipo]
    head = " ".join(filter(None, [e["titulo"], e.get("subtitulo")]))
    for tag, rx in KEYWORD_TAGS.items():
        if tag == tipo:
            continue
        # la descripción solo cuenta para Música y no en tipos donde da falsos positivos
        text = head if tag != "Música" or tipo in MUSIC_TITLE_ONLY else f"{head} {e.get('descripcion') or ''}"
        if rx.search(text):
            tags.append(tag)
    if tipo == "Otros" and len(tags) > 1:
        tags.remove("Otros")
    return tags


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="events.json")
    ap.add_argument("--localidad", default="murcia")
    args = ap.parse_args()

    today = date.today()

    def murciaturistica():
        jobs = [(None, "otro")] + list(TYPES.items())
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            listings = list(ex.map(lambda j: list_events(args.localidad, j[0]), jobs))
        cand = {}
        for (tipo, label), found in zip(jobs, listings):
            for path, t in found.items():
                cand.setdefault(path, label if t else None)
                if t and cand[path] in (None, "otro"):
                    cand[path] = label
        print(f"{len(cand)} eventos candidatos", file=sys.stderr)
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            parsed = list(ex.map(lambda pl: (parse_event(pl[0], pl[1] or "otro", today), pl[1] or "otro"), cand.items()))
        out = []
        for ev, label in parsed:
            if not ev or not ev["fecha_inicio"] or date.fromisoformat(ev["fecha_fin"]) < today:
                continue
            if EXCLUDE.search(f"{ev['titulo']} {ev.get('subtitulo') or ''}"):
                continue
            ev["tipo"] = refine_type(ev, label)
            out.append(ev)
        return out

    def eventos_murcia():
        out = scrape_eventos_murcia(today)
        for e in out:
            e["tipo"] = refine_type(e, "otro")
        return out

    # las tres familias de fuentes son independientes: se lanzan a la vez
    with ThreadPoolExecutor(max_workers=3) as ex:
        f_mt, f_em, f_extra = ex.submit(murciaturistica), ex.submit(eventos_murcia), ex.submit(scrape_all, today)
        events = f_mt.result() + f_em.result()
        extra = f_extra.result()  # recintos, teatros y ticketing
    for e in extra:
        e["tipo"] = refine_type(e, e["tipo"])
    events = consolidate(events + extra)

    for e in events:
        # los eventos en curso se ordenan como si empezaran el día de generación
        e["fecha_orden"] = max(e["fecha_inicio"], today.isoformat())

    merged = merge_with_existing(events, args.out, today)
    for e in merged:
        e["lugar"] = clean_place(e["lugar"], e["localidad"])
        e["tipo"] = refine_simple({**e, "tipo": simplify_type(e["tipo"])})
    merged = consolidate(merged)
    merged = [e for e in merged if not any(e["titulo"].lower().startswith(t) for t in MANUAL_EXCLUDE)]
    for e in merged:
        e.pop("publico", None)
    for e in merged:
        e["categorias"] = etiquetas(e)
        del e["tipo"]
    cfg = CONFIG.get("horizontes", {})
    merged = [e for e in merged if within_horizon(e, today, cfg)]
    for e in merged:
        e["fecha_orden"] = max(e["fecha_inicio"], today.isoformat())
    out = sorted(merged, key=lambda e: (e["fecha_orden"], e["horario"] or "99", e["titulo"]))
    data = {"generado": today.isoformat(), "total": len(out), "web": CONFIG.get("web", {}), "eventos": out}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # copia como script para que index.html funcione abierto directamente (file://)
    with open(os.path.splitext(args.out)[0] + ".js", "w", encoding="utf-8") as f:
        f.write("window.EVENTS_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    print(f"{len(out)} eventos escritos en {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
