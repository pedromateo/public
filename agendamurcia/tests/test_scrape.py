import json
from datetime import date

import pytest

import scrape
from scrape import clean_place, etiquetas, merge_with_existing, only_past_dates, simplify_type, trim_text, within_horizon

TODAY = date(2026, 11, 26)


def test_trim_text_corto_no_cambia():
    assert trim_text("  Hola. ") == "Hola."
    assert trim_text(None) == ""


def test_trim_text_corta_en_frase_completa():
    text = "Primera frase larga. " * 10 + "Ultima frase sin acabar de"
    out = trim_text(text, limit=100)
    assert out.endswith(".") and len(out) <= 100


def test_trim_text_sin_frases_anade_elipsis():
    out = trim_text("palabra " * 50, limit=40)
    assert out.endswith("…") and len(out) <= 41


@pytest.mark.parametrize("lugar,loc,esperado", [
    ("Teatro Romea, Plaza Julián Romea, Murcia", "", "Teatro Romea, Murcia"),
    ("Teatro Romea", "Murcia", "Teatro Romea, Murcia"),
    ("Centro Cultural, Calle Mayor 3, Beniaján", "", "Centro Cultural, Beniaján"),
    ("", "", "Murcia"),
    ("C/ Mayor 4", "Sala X", "Sala X, Murcia"),
])
def test_clean_place(lugar, loc, esperado):
    assert clean_place(lugar, loc) == esperado


def test_clean_place_calle_con_prefijo_c_barra_no_deja_numero():
    assert not clean_place("C/ Santa Quiteria 22", "").isdigit()


def test_simplify_type():
    assert simplify_type("concierto") == "Música"
    assert simplify_type("teatro/humor") == "Teatro"
    assert simplify_type("cine") == "Cine"
    assert simplify_type(["Danza", "Teatro"]) == "Danza"
    assert simplify_type("algo raro") == "Otros"
    assert simplify_type([]) == "Otros"


def base(**kw):
    return {"titulo": "X", "subtitulo": None, "descripcion": "", "tipo": "Teatro", "lugar": "Teatro Romea, Murcia", **kw}


def test_etiquetas_musica_por_titulo():
    tags = etiquetas(base(titulo="Concierto de piano y orquesta"))
    assert tags[0] == "Teatro" and "Música" in tags


def test_etiquetas_sin_duplicar_tipo_principal():
    assert etiquetas(base(titulo="Gran concierto", tipo="Música")).count("Música") == 1


def test_etiquetas_otros_se_descarta_si_hay_otra():
    tags = etiquetas(base(titulo="Concierto", tipo="Otros"))
    assert "Otros" not in tags and "Música" in tags


def test_etiquetas_lugar_numerico_es_musica():
    assert etiquetas(base(titulo="Zzz", tipo="Otros", lugar="33")) == ["Música"]


def test_etiquetas_manual_por_titulo_exacto():
    assert etiquetas(base(titulo="Rupatrupa", tipo="Otros")) == ["Música"]


def test_etiquetas_infantil_por_edad():
    assert "Infantil" in etiquetas(base(titulo="Taller a partir de 4 años", tipo="Talleres"))


def test_within_horizon_usa_el_horizonte_mas_largo():
    cfg = {"por_defecto": 10, "categorias": {"Infantil": 30, "Música": 365}}
    iso = date.fromordinal(TODAY.toordinal() + 100).isoformat()
    assert not within_horizon({"fecha_inicio": iso, "categorias": ["Infantil"]}, TODAY, cfg)
    assert within_horizon({"fecha_inicio": iso, "categorias": ["Infantil", "Música"]}, TODAY, cfg)


def test_within_horizon_por_defecto():
    cfg = {"por_defecto": 10, "categorias": {}}
    assert not within_horizon({"fecha_inicio": "2026-12-20", "categorias": ["Z"]}, TODAY, cfg)
    assert within_horizon({"fecha_inicio": "2026-11-30", "categorias": ["Z"]}, TODAY, cfg)


def test_only_past_dates():
    assert only_past_dates({"descripcion": "Días 01/10/26 y 05/10/26"}, TODAY)
    assert not only_past_dates({"descripcion": "Días 01/10/26 y 05/12/26"}, TODAY)
    assert not only_past_dates({"descripcion": "sin fechas"}, TODAY)


def new(**kw):
    return {"titulo": "A", "fecha_inicio": "2026-12-01", "fecha_fin": "2026-12-01", "lugar": "L",
            "enlace": "http://a", "tipo": "Música", "precio": None, **kw}


def test_merge_con_existing(tmp_path):
    p = tmp_path / "e.json"
    viejo = {**new(precio="5 €"), "categorias": ["Música"]}
    pasado = {**new(enlace="http://old", fecha_inicio="2026-01-01", fecha_fin="2026-01-02"), "categorias": ["Teatro"]}
    p.write_text(json.dumps({"eventos": [viejo, pasado]}))
    out = merge_with_existing([new(), new(enlace="http://b", titulo="B")], str(p), TODAY)
    by = {e["enlace"]: e for e in out}
    assert set(by) == {"http://a", "http://b"}  # el terminado se elimina
    assert by["http://a"]["precio"] == "5 €"  # se conserva el campo que la fuente ya no da


def test_merge_sin_fichero_previo(tmp_path):
    assert len(merge_with_existing([new()], str(tmp_path / "no.json"), TODAY)) == 1


def test_merge_fecha_orden_no_es_pasada(tmp_path):
    e = new(fecha_inicio="2026-11-01", fecha_fin="2027-01-01")
    out = merge_with_existing([e], str(tmp_path / "no.json"), TODAY)
    assert out[0]["fecha_orden"] == "2026-11-26"


def test_config_coherente():
    cfg = scrape.CONFIG
    orden = cfg["web"]["orden_categorias"]
    assert len(orden) == len(set(orden))
    assert scrape.KNOWN_TYPES <= set(orden)
    for tags in cfg["clasificacion"]["etiquetas_manuales"].values():
        for t in ([tags] if isinstance(tags, str) else tags):
            assert t in orden, t
    assert set(cfg["horizontes"]["categorias"]) <= set(orden)


def test_retag_reaplica_etiquetas_y_escribe_json_y_js(tmp_path, monkeypatch):
    out_json = tmp_path / "events.json"
    out_js = tmp_path / "events.js"
    future = date.fromordinal(date.today().toordinal() + 5).isoformat()
    ev = {
        "titulo": "Rupatrupa",
        "subtitulo": None,
        "descripcion": "",
        "fecha_inicio": future,
        "fecha_fin": future,
        "horario": "21:00",
        "lugar": "Sala Mamba, Murcia",
        "enlace": "http://example.com/rupatrupa",
        "precio": None,
        "categorias": ["Otros"],
    }
    out_json.write_text(json.dumps({"eventos": [ev]}), encoding="utf-8")
    monkeypatch.setattr("sys.argv", ["scrape.py", "--retag", "--out", str(out_json)])
    scrape.main()

    data = json.loads(out_json.read_text(encoding="utf-8"))
    assert data["total"] == 1
    assert data["eventos"][0]["categorias"] == ["Música"]
    assert "tipo" not in data["eventos"][0]
    js_text = out_js.read_text(encoding="utf-8")
    assert js_text.startswith("window.EVENTS_DATA = ")
    assert '"Música"' in js_text
