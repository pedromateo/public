from datetime import date

import pytest

from sources import STREET_PREFIX, CONFIG, event, hhmm, infer_year, roll_date

TODAY = date(2026, 11, 26)


@pytest.mark.parametrize("texto,esperado", [
    ("20:30", "20:30"), ("a las 9.05 h", "09:05"), ("18h", "18:00"), ("sábado I 21h | 9€", "21:00"), ("sin hora", None), (None, None),
])
def test_hhmm(texto, esperado):
    assert hhmm(texto) == esperado


@pytest.mark.parametrize("calle", ["C/ Santa Quiteria 22", "Calle Mayor", "Avda. Libertad", "Plaza Circular", "Paseo Alfonso X"])
def test_street_prefix_detecta_calles(calle):
    assert STREET_PREFIX.match(calle)


@pytest.mark.parametrize("nombre", ["Callejón Teatro", "Plazuela Sala", "Sala REM", "Teatro Circo"])
def test_street_prefix_no_detecta_nombres(nombre):
    assert not STREET_PREFIX.match(nombre)


def test_infer_year_primera_ocurrencia_futura():
    assert infer_year(1, 12, TODAY) == date(2026, 12, 1)
    assert infer_year(1, 2, TODAY) == date(2027, 2, 1)
    assert infer_year(26, 11, TODAY) == TODAY


def test_infer_year_con_dia_de_la_semana():
    d = infer_year(1, 2, TODAY, weekday=0)  # 1 feb 2027 es lunes
    assert d == date(2027, 2, 1)
    assert infer_year(1, 2, TODAY, weekday=1).weekday() == 1


def test_infer_year_fecha_imposible():
    assert infer_year(31, 2, TODAY) is None


def test_roll_date_sube_de_ano_al_retroceder_el_mes():
    assert roll_date(10, 1, date(2026, 12, 20), TODAY) == date(2027, 1, 10)
    assert roll_date(5, 12, date(2026, 12, 1), TODAY) == date(2026, 12, 5)
    assert roll_date(30, 11, date(2026, 12, 1), TODAY) == date(2026, 11, 30)  # desorden pequeño
    assert roll_date(15, 3, None, TODAY) == date(2027, 3, 15)


def test_event_construye_registro_completo():
    e = event("T", date(2026, 12, 1), "20:00", "Sala REM, Murcia", "10 €", "http://x", "fuente", tipo="concierto")
    assert e["titulo"] == "T" and e["tipo"] == "concierto"
    assert e["fecha_inicio"] == e["fecha_fin"] == "2026-12-01"
    assert e["horario"] == "20:00" and e["lugar"] == "Sala REM, Murcia"


def test_direcciones_conocidas_apuntan_a_sus_salas():
    d = CONFIG["recintos"]["direcciones"]
    assert d["c/ santa quiteria 22"] == "La Yesería"
    assert d["c/ puerta nueva 33"] == "Sala REM"
