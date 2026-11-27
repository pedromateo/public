from consolidate import consolidate, dedupe, norm, related_titles, same_event, series, venue_key


def ev(titulo, ini, fin=None, lugar="Teatro Romea, Murcia", horario=None, fuente="murciocio.es", **kw):
    return {"titulo": titulo, "fecha_inicio": ini, "fecha_fin": fin or ini, "lugar": lugar,
            "horario": horario, "fuente": fuente, "enlace": kw.pop("enlace", None), **kw}


def test_norm_quita_acentos_y_mayusculas():
    assert norm("Víctor Villegas ÁÉ") == "victor villegas ae"
    assert norm(None) == ""


def test_venue_key_reconoce_recintos_y_cae_al_nombre():
    assert venue_key({"lugar": "Teatro Romea, Murcia"}) == "romea"
    assert venue_key({"lugar": "Auditorio Víctor Villegas, Murcia"}) == "auditorio"
    assert venue_key({"lugar": "Sala Desconocida, Murcia"}) == "sala desconocida"


def test_related_titles():
    assert related_titles("Rod Stewart", "Rod Stewart en concierto")
    assert not related_titles("Hamlet", "Cascanueces")
    assert not related_titles("", "Hamlet")


def test_same_event_exige_mismo_recinto_y_fechas():
    a = ev("Hamlet", "2026-12-01")
    assert same_event(a, ev("Hamlet", "2026-12-01", lugar="Teatro Romea"))
    assert not same_event(a, ev("Hamlet", "2026-12-01", lugar="Teatro Circo, Murcia"))
    assert not same_event(a, ev("Hamlet", "2026-12-05"))


def test_same_event_misma_hora_distinto_titulo():
    a = ev("Concierto A", "2026-12-01", horario="20:00")
    assert same_event(a, ev("Otro nombre", "2026-12-01", horario="20:00"))
    assert not same_event(a, ev("Otro nombre", "2026-12-01", horario="21:00"))


def test_dedupe_prefiere_fuente_prioritaria_y_completa_campos():
    a = ev("Hamlet", "2026-12-01", fuente="murciocio.es", precio="10 €")
    b = ev("Hamlet", "2026-12-01", fuente="teatroromea.es", enlace="https://romea")
    out = dedupe([a, b])
    assert len(out) == 1
    assert out[0]["fuente"] == "teatroromea.es"
    assert out[0]["precio"] == "10 €"


def test_series_colapsa_sesiones_cercanas_con_horarios():
    out = series([ev("Show", "2026-12-01", horario="20:00"), ev("Show", "2026-12-02", horario="21:00"),
                  ev("Show", "2026-12-02", horario="20:00")])
    assert len(out) == 1
    s = out[0]
    assert (s["fecha_inicio"], s["fecha_fin"]) == ("2026-12-01", "2026-12-02")
    assert s["horario"] == "20:00; 21:00"


def test_series_no_junta_si_hay_mas_de_14_dias():
    assert len(series([ev("Show", "2026-12-01"), ev("Show", "2026-12-20")])) == 2


def test_series_no_junta_distinto_recinto_ni_titulo():
    assert len(series([ev("Show", "2026-12-01"), ev("Show", "2026-12-02", lugar="Teatro Circo, Murcia")])) == 2
    assert len(series([ev("Hamlet", "2026-12-01"), ev("Cascanueces", "2026-12-02")])) == 2


def test_series_respeta_eventos_con_rango():
    assert len(series([ev("Expo", "2026-12-01", "2026-12-30"), ev("Expo", "2026-12-02")])) == 2


def test_consolidate_es_idempotente():
    data = [ev("Show", "2026-12-01", horario="20:00"), ev("Show", "2026-12-02", horario="20:00"),
            ev("Hamlet", "2026-12-05")]
    once = consolidate(data)
    assert consolidate(once) == once
