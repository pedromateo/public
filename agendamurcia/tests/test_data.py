"""Comprobaciones sobre la salida generada (events.json / events.js)."""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "events.json").read_text(encoding="utf-8"))
EVENTS = DATA["eventos"]
ORDEN = DATA["web"]["orden_categorias"]
REQUIRED = ["titulo", "fecha_inicio", "fecha_fin", "lugar", "enlace", "categorias", "fecha_orden"]


def test_total_coincide():
    assert DATA["total"] == len(EVENTS) > 0


@pytest.mark.parametrize("campo", REQUIRED)
def test_campos_obligatorios(campo):
    assert all(e.get(campo) for e in EVENTS), campo


def test_sin_campos_obsoletos():
    assert not any("publico" in e or "tipo" in e for e in EVENTS)


def test_categorias_validas_y_sin_otros():
    for e in EVENTS:
        assert isinstance(e["categorias"], list) and e["categorias"], e["titulo"]
        assert len(set(e["categorias"])) == len(e["categorias"]), e["titulo"]
        assert set(e["categorias"]) <= set(ORDEN), e["titulo"]
        assert "Otros" not in e["categorias"], e["titulo"]


def test_clasica_concierto_cuentos_ya_no_existen():
    usadas = {c for e in EVENTS for c in e["categorias"]}
    assert not usadas & {"Clásica", "Concierto", "Cuentos", "Otros"}


def test_fechas_coherentes():
    iso = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    for e in EVENTS:
        assert iso.match(e["fecha_inicio"]) and iso.match(e["fecha_fin"]), e["titulo"]
        assert e["fecha_inicio"] <= e["fecha_fin"], e["titulo"]
        assert e["fecha_fin"] < "2028-01-01", e["titulo"]
        assert e["fecha_fin"] >= DATA["generado"], e["titulo"]


def test_orden_cronologico():
    claves = [e["fecha_orden"] for e in EVENTS]
    assert claves == sorted(claves)


def test_lugares_sin_calle_ni_numeros():
    for e in EVENTS:
        assert not e["lugar"].isdigit(), e["titulo"]
        assert not re.search(r"\b(c/|calle|avda|avenida)\b", e["lugar"], re.I), (e["titulo"], e["lugar"])


def test_enlaces_http():
    assert all(e["enlace"].startswith("http") for e in EVENTS)


def test_sin_duplicados_exactos():
    claves = [(e["titulo"].lower(), e["fecha_inicio"], e["lugar"]) for e in EVENTS]
    assert len(claves) == len(set(claves))
    enlaces = [e["enlace"] for e in EVENTS]
    assert len(enlaces) == len(set(enlaces))


def test_excluidos_no_aparecen():
    cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    excl = [t.lower() for t in cfg["clasificacion"]["excluir"]]
    assert not [e["titulo"] for e in EVENTS if e["titulo"].lower() in excl]


def test_descripciones_no_cortadas_a_600():
    assert not [e["titulo"] for e in EVENTS if len(e.get("descripcion") or "") == 600]


def test_events_js_igual_que_json():
    js = (ROOT / "events.js").read_text(encoding="utf-8")
    prefijo = "window.EVENTS_DATA = "
    assert js.startswith(prefijo)
    assert json.loads(js[len(prefijo):].rstrip().rstrip(";")) == DATA
