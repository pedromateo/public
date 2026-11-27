import json
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

WEB = {
    "titulo_negrita": "agenda", "titulo_resto": ".murcia", "descripcion": "Agenda de prueba",
    "buscador_placeholder": "Buscar eventos…", "texto_boton_filtros": "Filtros",
    "clave_almacenamiento": "test.filtros", "ancho_minimo_tarjeta_px": 300,
    "orden_categorias": ["Música", "Teatro", "Infantil", "Exposiciones"],
}


def _ev(titulo, cats, ini, fin=None, **kw):
    return {"titulo": titulo, "subtitulo": kw.get("subtitulo"), "descripcion": kw.get("descripcion", f"Descripción de {titulo}."),
            "fecha_inicio": ini, "fecha_fin": fin or ini, "fecha_texto": ini, "horario": kw.get("horario", "20:00"),
            "lugar": kw.get("lugar", "Teatro Romea, Murcia"), "localidad": "Murcia", "precio": kw.get("precio", "10 €"),
            "enlace_entradas": kw.get("enlace_entradas"), "enlace": f"https://example.com/{titulo.replace(' ', '-')}",
            "fuente": "test", "fecha_orden": ini, "categorias": cats}


EVENTS = [
    _ev("Musical Romea", ["Teatro", "Música"], "2026-12-01", subtitulo="Con orquesta",
        enlace_entradas="https://tickets.example.com/romea"),
    _ev("Concierto Rock", ["Música"], "2026-12-02", lugar="Sala REM, Murcia"),
    _ev("Cuentos de Navidad", ["Infantil"], "2026-12-03", precio=None),
    _ev("Hamlet <b>", ["Teatro"], "2026-12-05", "2026-12-07", horario="20:00; 21:00"),
    _ev("Expo Fuensanta", ["Exposiciones"], "2026-12-01", "2027-01-24", horario=None),
]


@pytest.fixture(scope="session")
def site(tmp_path_factory):
    d = tmp_path_factory.mktemp("site")
    for f in ("index.html", "favicon.svg"):
        shutil.copy(ROOT / f, d / f)
    data = {"generado": "2026-11-26", "total": len(EVENTS), "web": WEB, "eventos": EVENTS}
    (d / "events.json").write_text(json.dumps(data), encoding="utf-8")
    (d / "events.js").write_text("window.EVENTS_DATA = " + json.dumps(data) + ";", encoding="utf-8")

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(d)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield {"url": f"http://127.0.0.1:{srv.server_address[1]}", "dir": d, "data": data}
    srv.shutdown()


@pytest.fixture(scope="session")
def browser_type_launch_args():
    # usa el Chrome instalado: evita descargar Chromium (el proxy corporativo lo bloquea)
    return {"channel": "chrome"}


@pytest.fixture
def app(page, site):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(site["url"] + "/index.html")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".card")
    page.errors = errors
    return page
