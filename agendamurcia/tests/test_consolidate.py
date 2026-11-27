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


def test_dedupe_auditorio_alberca_y_consenso():
    a = ev("El Pequeño Mundo de la Música", "2026-11-29", lugar="Auditorio de La Alberca, Murcia",
           horario="12:00", fuente="murciocio.es", precio="5€", categorias=["Teatro", "Infantil"])
    b = ev("El pequeño mundo de la música", "2026-11-29", lugar="Auditorio Municipal La Alberca, Murcia",
           horario="12:00", fuente="eventos.murcia.es", descripcion="Historia musical infantil",
           categorias=["Danza", "Música"])
    out = dedupe([a, b])
    assert len(out) == 1
    assert out[0]["precio"] == "5€"
    assert out[0]["descripcion"] == "Historia musical infantil"
    assert set(out[0]["categorias"]) == {"Danza", "Música", "Teatro", "Infantil"}


def test_dedupe_espectaculo_calle_cruzado_teatro_municipal():
    circo = ev("El Circo de los Sentidos", "2026-11-27", "2026-11-28", lugar="Teatro Circo, Murcia",
               horario="11:00; 17:00", fuente="teatrocircomurcia.es", descripcion="", enlace="https://circo")
    romea = ev("El Circo de los Sentidos", "2026-11-27", "2026-11-28", lugar="Teatro Romea, Murcia",
               horario="11:00; 17:00", fuente="teatroromea.es", descripcion="", enlace="https://romea")
    calle = ev("'El circo de los sentidos'. Espectáculo de calle", "2026-11-27", "2026-11-28",
               lugar="Plaza Santo Domingo, Murcia", horario="17:00", fuente="eventos.murcia.es",
               descripcion="Instalación inmersiva en la calle.", enlace="https://murcia")
    out = dedupe([circo, romea, calle])
    assert len(out) == 1
    assert out[0]["lugar"] == "Plaza Santo Domingo, Murcia"
    assert out[0]["horario"] == "11:00; 17:00"
    assert "Instalación inmersiva" in out[0]["descripcion"]


def test_dedupe_tributo_mismo_dia_y_sala():
    a = ev("El mejor tributo a HÉROES DEL SILENCIO", "2026-12-18", lugar="Garaje Beat Club, Murcia",
           horario="21:00", fuente="compralaentrada.com", precio="Desde 10 €")
    b = ev("Héroes el Culto", "2026-12-18", lugar="Garaje Beat Club, Murcia",
           horario="22:00", fuente="murciocio.es", precio="12€")
    out = dedupe([a, b])
    assert len(out) == 1
    assert out[0]["fuente"] == "compralaentrada.com"
