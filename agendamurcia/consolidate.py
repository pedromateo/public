"""Une los eventos de varias fuentes: quita duplicados y resume series en una sola entrada."""
import re
import unicodedata
from datetime import date

PRIORITY = ["teatrocircomurcia.es", "teatroromea.es", "auditoriomurcia.org", "salamamba.com",
            "compralaentrada.com", "ticketmaster.es", "eventos.murcia.es", "murciaturistica.es", "murciocio.es"]

VENUES = [  # (clave, patrón sobre el lugar normalizado)
    ("romea", r"romea"), ("circo", r"teatro circo"), ("auditorio", r"victor villegas|auditorio y centro de congresos"),
    ("mamba", r"mamba"), ("rem", r"\brem\b"), ("garaje", r"garaje"), ("yeseria", r"yeseria"),
    ("musik", r"musik"), ("toros", r"plaza de toros|condomina"), ("gruta", r"gruta"), ("fofo", r"fofo"),
    ("auditorio-algezares", r"auditorio.*(algezares|clares)"), ("auditorio-cabezo", r"auditorio.*cabezo de torres"),
    ("auditorio-alberca", r"auditorio.*alberca"),
    ("bernal", r"teatro bernal"), ("carcel", r"carcel vieja"), ("neocine", r"neocine"),
]
STOP = set("de del la el los las y en con a al un una por para the of".split())


def norm(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()


def venue_key(e):
    p = norm(e.get("lugar"))
    for k, pat in VENUES:
        if re.search(pat, p):
            return k
    return p.split(",")[0].strip()


def tokens(title):
    return {t for t in re.findall(r"[a-z0-9]+", norm(title)) if t not in STOP and len(t) > 1}


def related_titles(a, b):
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return small <= big or len(ta & tb) / len(ta | tb) >= 0.5


def rank(e):
    try:
        return PRIORITY.index(e.get("fuente"))
    except ValueError:
        return len(PRIORITY)


def overlap(a, b):
    return a["fecha_inicio"] <= b["fecha_fin"] and b["fecha_inicio"] <= a["fecha_fin"]


THEATER_CROSS_SOURCES = {"teatrocircomurcia.es", "teatroromea.es"}


def _hours_compatible(a, b):
    ha, hb = (a.get("horario") or "").strip(), (b.get("horario") or "").strip()
    if not ha or not hb:
        return True
    return ha == hb or ha in hb or hb in ha


def same_event(a, b):
    """Mismo evento: fechas que coinciden y mismo recinto (o cruce de teatros municipales en calle)."""
    if not overlap(a, b):
        return False
    va, vb = venue_key(a), venue_key(b)
    if va != vb:
        # Los teatros municipales (Circo/Romea) publican en su web espectáculos de calle ("A Pie de Calle")
        cross_theater = a.get("fuente") in THEATER_CROSS_SOURCES or b.get("fuente") in THEATER_CROSS_SOURCES
        return bool(cross_theater and related_titles(a["titulo"], b["titulo"]) and _hours_compatible(a, b))
    if related_titles(a["titulo"], b["titulo"]):
        return True
    same_day = a["fecha_inicio"] == b["fecha_inicio"] == a["fecha_fin"] == b["fecha_fin"]
    if same_day and a.get("horario") and a["horario"] == b.get("horario"):
        return True
    ta, tb = tokens(a["titulo"]), tokens(b["titulo"])
    if same_day and (ta & tb) and ("tributo" in ta or "tributo" in tb):
        return True
    # Eventos genéricos en "Murcia" con mismo emplazamiento en la descripción (p. ej. Paseo Alfonso X)
    if va == "murcia":
        da, db = norm(a.get("descripcion")), norm(b.get("descripcion"))
        if "alfonso x el sabio" in da and "alfonso x el sabio" in db:
            return True
    return False


def absorb(best, other):
    # Si best venía de teatro municipal sin descripción y other trae el recinto real de calle, preferirlo
    if (best.get("fuente") in THEATER_CROSS_SOURCES and not (best.get("descripcion") or "").strip()
            and other.get("fuente") not in THEATER_CROSS_SOURCES and venue_key(best) != venue_key(other)):
        if other.get("lugar"):
            best["lugar"] = other["lugar"]
        if other.get("enlace"):
            best["enlace"] = other["enlace"]
    for k, v in other.items():
        if best.get(k) in (None, "", []) and v not in (None, "", []):
            best[k] = v
    # Consenso en descripción (la más completa), horario (el más completo) y categorías (unión)
    if len((other.get("descripcion") or "").strip()) > len((best.get("descripcion") or "").strip()):
        best["descripcion"] = other["descripcion"]
    hb, ho = (best.get("horario") or "").strip(), (other.get("horario") or "").strip()
    if ho and (not hb or (hb in ho and len(ho) > len(hb))):
        best["horario"] = ho
    if best.get("categorias") or other.get("categorias"):
        cats = list(dict.fromkeys([*(best.get("categorias") or []), *(other.get("categorias") or [])]))
        if len(cats) > 1 and "Otros" in cats:
            cats = [c for c in cats if c != "Otros"]
        best["categorias"] = cats
    return best


def dedupe(events):
    out = []
    for e in sorted(events, key=rank):
        for kept in out:
            if same_event(kept, e):
                absorb(kept, e)
                break
        else:
            out.append(dict(e))
    return out


def series(events):
    """Sesiones sueltas de un mismo espectáculo en el mismo recinto -> una entrada con rango de fechas."""
    groups = []
    for e in sorted(events, key=lambda x: (x["fecha_inicio"], rank(x))):
        if e["fecha_inicio"] == e["fecha_fin"]:
            for g in groups:
                gap = (date.fromisoformat(e["fecha_inicio"]) - date.fromisoformat(g[-1]["fecha_inicio"])).days
                if (g[-1]["fecha_inicio"] == g[-1]["fecha_fin"] and gap <= 14 and venue_key(g[0]) == venue_key(e)
                        and related_titles(g[0]["titulo"], e["titulo"])):
                    g.append(e)
                    break
            else:
                groups.append([e])
        else:
            groups.append([e])
    out = []
    for g in groups:
        if len(g) == 1:
            out.append(g[0])
            continue
        first = min(g, key=lambda x: (rank(x), x["fecha_inicio"]))
        merged = dict(first)
        for o in g:
            absorb(merged, o)
        dates = sorted({o["fecha_inicio"] for o in g})
        merged["fecha_inicio"], merged["fecha_fin"] = dates[0], dates[-1]
        merged["fecha_texto"] = " · ".join(dates)
        horas = sorted({o["horario"] for o in g if o.get("horario")})
        merged["horario"] = "; ".join(horas) if horas else None
        out.append(merged)
    return out


def consolidate(events):
    return series(dedupe(events))
