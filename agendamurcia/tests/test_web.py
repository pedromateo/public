"""Pruebas de la web en navegador real (Playwright). Datos deterministas desde conftest.py."""
import json

import pytest
from playwright.sync_api import expect

MOVIL = {"width": 390, "height": 844}
ESCRITORIO = {"width": 1280, "height": 800}


def cards(page):
    return page.locator(".card")


def abrir_filtros(page):
    page.click("#toggle")
    expect(page.locator("#panel")).to_be_visible()


def chip(page, nombre):
    return page.locator(f'#cat .chip[data-v="{nombre}"]')


# ---------------------------------------------------------------- carga y cabecera
def test_carga_sin_errores_y_con_todas_las_tarjetas(app):
    expect(cards(app)).to_have_count(5)
    expect(app.locator("#count")).to_have_text("5 eventos")
    assert app.errors == []


def test_titulo_logo_y_meta(app):
    expect(app.locator("#title")).to_have_text("agenda.murcia")
    expect(app.locator("#title b")).to_have_text("agenda")
    assert app.title() == "agenda.murcia"
    expect(app.locator("h1 img")).to_have_attribute("src", "favicon.svg")
    # el logo va a la izquierda del título
    img, title = app.locator("h1 img").bounding_box(), app.locator("#title").bounding_box()
    assert img["x"] + img["width"] <= title["x"] + 1


def test_orden_de_las_tarjetas_es_el_del_json(app):
    titulos = cards(app).locator("h2").all_inner_texts()
    assert titulos == ["Musical Romea", "Concierto Rock", "Cuentos de Navidad", "Hamlet <b>", "Expo Fuensanta"]


def test_html_del_titulo_se_escapa(app):
    assert app.locator(".card h2", has_text="Hamlet").inner_html() == "Hamlet &lt;b&gt;"


def test_tarjeta_muestra_cuando_donde_precio(app):
    c = cards(app).first
    expect(c).to_contain_text("Cuándo:")
    expect(c).to_contain_text("20:00")
    expect(c).to_contain_text("Teatro Romea, Murcia")
    expect(c).to_contain_text("10 €")
    expect(cards(app).nth(2)).not_to_contain_text("Precio:")


def test_rango_de_fechas_en_tarjeta(app):
    expect(cards(app).nth(3)).to_contain_text("–")
    expect(cards(app).nth(3)).to_contain_text("20:00; 21:00")


def test_cabecera_sticky_con_aire_superior(app):
    app.set_viewport_size(MOVIL)
    app.evaluate("document.body.style.minHeight='4000px'; window.scrollTo(0, 800)")
    h = app.locator("header")
    assert h.evaluate("e => getComputedStyle(e).position") == "sticky"
    assert h.bounding_box()["y"] == 0
    assert float(h.evaluate("e => getComputedStyle(e).paddingTop").removesuffix("px")) >= 12
    top = h.locator("h1").bounding_box()["y"]
    assert top >= 10  # el título no queda pegado al borde superior


# ---------------------------------------------------------------- buscador
def test_buscador_filtra_y_es_insensible_a_acentos(app):
    app.fill("#q", "descripcion de concierto")
    expect(cards(app)).to_have_count(1)
    expect(app.locator("#count")).to_have_text("1 evento")
    app.fill("#q", "sala rem")
    expect(cards(app).first).to_contain_text("Concierto Rock")


def test_buscador_sin_resultados(app):
    app.fill("#q", "zzzzzz")
    expect(app.locator(".empty")).to_have_text("No hay eventos que coincidan con la búsqueda.")
    expect(app.locator("#count")).to_have_text("0 eventos")


def test_buscador_se_vacia_y_vuelven_todos(app):
    app.fill("#q", "hamlet")
    expect(cards(app)).to_have_count(1)
    app.fill("#q", "")
    expect(cards(app)).to_have_count(5)


# ---------------------------------------------------------------- filtros
def test_panel_cerrado_al_inicio_y_toggle(app):
    expect(app.locator("#panel")).to_be_hidden()
    expect(app.locator("#toggle")).to_have_attribute("aria-expanded", "false")
    abrir_filtros(app)
    expect(app.locator("#toggle")).to_have_attribute("aria-expanded", "true")
    app.click("#toggle")
    expect(app.locator("#panel")).to_be_hidden()


def test_chips_en_el_orden_configurado(app):
    abrir_filtros(app)
    assert app.locator("#cat .chip").all_inner_texts() == ["Música", "Teatro", "Infantil", "Exposiciones"]


def test_filtro_por_una_categoria(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    expect(cards(app)).to_have_count(2)  # un espectáculo puede tener varias etiquetas
    expect(app.locator("#toggle")).to_have_text("Filtros · 1")
    expect(app.locator("#active .sel")).to_have_text("Música ×")


def test_multiseleccion_suma_opciones(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    chip(app, "Infantil").click()
    expect(cards(app)).to_have_count(3)
    expect(app.locator("#toggle")).to_have_text("Filtros · 2")


def test_filtro_y_buscador_se_combinan(app):
    abrir_filtros(app)
    chip(app, "Teatro").click()
    app.fill("#q", "hamlet")
    expect(cards(app)).to_have_count(1)


def test_quitar_filtro_con_etiqueta_x(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    app.click('#active .sel[data-v="Música"]')
    expect(cards(app)).to_have_count(5)
    expect(chip(app, "Música")).to_have_attribute("aria-pressed", "false")
    expect(app.locator("#toggle")).to_have_text("Filtros")


def test_quitar_todos_los_filtros(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    chip(app, "Teatro").click()
    app.click("#clear")
    expect(cards(app)).to_have_count(5)
    expect(app.locator("#active .sel")).to_have_count(0)


def test_panel_se_cierra_al_hacer_clic_fuera(app):
    abrir_filtros(app)
    app.click("#count")
    expect(app.locator("#panel")).to_be_hidden()


def test_panel_no_se_cierra_al_usar_el_panel_ni_las_etiquetas(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    expect(app.locator("#panel")).to_be_visible()
    app.click('#active .sel[data-v="Música"]')
    expect(app.locator("#panel")).to_be_visible()


def test_panel_se_cierra_al_hacer_clic_en_una_tarjeta(app):
    abrir_filtros(app)
    cards(app).first.locator("h2").click()
    expect(app.locator("#panel")).to_be_hidden()


def test_filtros_persisten_en_localstorage(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    app.fill("#q", "rock")
    saved = json.loads(app.evaluate("localStorage.getItem('test.filtros')"))
    assert saved == {"q": "rock", "cat": ["Música"]}
    app.reload()
    app.wait_for_selector(".card")
    expect(app.locator("#q")).to_have_value("rock")
    expect(cards(app)).to_have_count(1)
    expect(app.locator("#active .sel")).to_have_text("Música ×")


def test_localstorage_con_categoria_inexistente_se_ignora(app):
    app.evaluate("localStorage.setItem('test.filtros', JSON.stringify({q:'', cat:['Fantasma']}))")
    app.reload()
    app.wait_for_selector(".card")
    expect(cards(app)).to_have_count(5)


def test_localstorage_corrupto_no_rompe(app):
    app.evaluate("localStorage.setItem('test.filtros', '{no es json')")
    app.reload()
    expect(cards(app)).to_have_count(5)


# ---------------------------------------------------------------- modal
def abrir_modal(page, i=0):
    cards(page).nth(i).get_by_role("button", name="Más info").click()
    expect(page.locator("#modal")).to_be_visible()


def test_modal_muestra_la_info_completa(app):
    abrir_modal(app, 0)
    m = app.locator("#modal")
    expect(m.locator(".tag")).to_have_text(["Teatro", "Música"])
    expect(m.locator("h2")).to_have_text("Musical Romea")
    expect(m.locator(".sub2")).to_have_text("Con orquesta")
    expect(m).to_contain_text("Teatro Romea, Murcia")
    expect(m).to_contain_text("10 €")
    expect(m.locator(".full")).to_have_text("Descripción de Musical Romea.")


def test_modal_enlaces_en_nueva_pestana(app):
    abrir_modal(app, 0)
    links = app.locator("#modal .url a")
    expect(links).to_have_count(2)  # web + entradas (distintas)
    for i in range(2):
        expect(links.nth(i)).to_have_attribute("target", "_blank")
        expect(links.nth(i)).to_have_attribute("rel", "noopener")
    expect(links.first).to_have_attribute("href", "https://example.com/Musical-Romea")
    expect(links.nth(1)).to_have_attribute("href", "https://tickets.example.com/romea")


def test_modal_sin_enlace_de_entradas(app):
    abrir_modal(app, 1)
    expect(app.locator("#modal .url a")).to_have_count(1)


def test_modal_abre_la_tarjeta_correcta_con_filtros(app):
    abrir_filtros(app)
    chip(app, "Infantil").click()
    abrir_modal(app, 0)
    expect(app.locator("#modal h2")).to_have_text("Cuentos de Navidad")


def test_modal_escapa_html(app):
    abrir_modal(app, 3)
    assert app.locator("#m-title").inner_html() == "Hamlet &lt;b&gt;"


def test_volver_cierra_y_conserva_busqueda_y_filtros(app):
    abrir_filtros(app)
    chip(app, "Música").click()
    app.fill("#q", "rock")
    abrir_modal(app, 0)
    app.get_by_role("button", name="Volver").click()
    expect(app.locator("#modal")).to_be_hidden()
    expect(app.locator("#q")).to_have_value("rock")
    expect(cards(app)).to_have_count(1)
    expect(app.locator("#active .sel")).to_have_text("Música ×")


def test_escape_cierra_la_modal(app):
    abrir_modal(app)
    app.keyboard.press("Escape")
    expect(app.locator("#modal")).to_be_hidden()
    assert app.url.endswith("index.html")


def test_boton_atras_del_navegador_cierra_la_modal(app):
    abrir_modal(app)
    app.go_back()
    expect(app.locator("#modal")).to_be_hidden()
    expect(cards(app)).to_have_count(5)


def test_abrir_y_cerrar_varias_veces(app):
    for _ in range(3):
        abrir_modal(app, 1)
        app.get_by_role("button", name="Volver").click()
        expect(app.locator("#modal")).to_be_hidden()
    assert app.evaluate("history.length") <= 5


def test_modal_pantalla_completa_en_movil(app):
    app.set_viewport_size(MOVIL)
    abrir_modal(app)
    box = app.locator("#modal").bounding_box()
    assert box["width"] >= MOVIL["width"] - 1 and box["height"] >= MOVIL["height"] - 1


def test_modal_centrada_y_acotada_en_escritorio(app):
    app.set_viewport_size(ESCRITORIO)
    abrir_modal(app)
    box = app.locator("#modal").bounding_box()
    assert box["width"] <= 641 and box["width"] < ESCRITORIO["width"] - 100


def test_volver_visible_en_movil_sin_desplazar(app):
    app.set_viewport_size(MOVIL)
    abrir_modal(app)
    expect(app.get_by_role("button", name="Volver")).to_be_in_viewport()


# ---------------------------------------------------------------- compartir
def test_compartir_copia_al_portapapeles_sin_web_share(app):
    app.evaluate("""() => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        window.__copied = null;
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true });
    }""")
    abrir_modal(app, 0)
    app.click("#m-share")
    expect(app.locator("#m-toast")).to_have_text("Copiado al portapapeles")
    copied = app.evaluate("window.__copied")
    assert "Musical Romea" in copied and copied.endswith("https://example.com/Musical-Romea")
    expect(app.locator("#m-toast")).to_be_hidden(timeout=4000)


def test_compartir_usa_navigator_share_si_existe(app):
    app.evaluate("""() => { window.__shared = null; navigator.share = async d => { window.__shared = d; }; }""")
    abrir_modal(app, 0)
    app.click("#m-share")
    data = app.evaluate("window.__shared")
    assert data["title"] == "Musical Romea"
    assert data["url"] == "https://example.com/Musical-Romea"


def test_compartir_informa_si_falla_el_portapapeles(app):
    app.evaluate("""() => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('no'); } }, configurable: true });
    }""")
    abrir_modal(app)
    app.click("#m-share")
    expect(app.locator("#m-toast")).to_have_text("No se pudo copiar")


def test_boton_compartir_arriba_a_la_derecha_y_pequeno(app):
    app.set_viewport_size(ESCRITORIO)
    abrir_modal(app)
    b, m = app.locator("#m-share").bounding_box(), app.locator("#modal").bounding_box()
    assert b["x"] > m["x"] + m["width"] / 2 and b["y"] < m["y"] + 80
    assert b["width"] <= 40 and app.locator("#m-share svg").count() == 1


# ---------------------------------------------------------------- robustez
def test_fallback_a_events_json_sin_events_js(page, site):
    page.route("**/events.js", lambda r: r.fulfill(status=404, body=""))
    page.goto(site["url"] + "/index.html")
    expect(cards(page)).to_have_count(5)


def test_mensaje_de_error_si_no_hay_datos(page, site):
    page.route("**/events.js", lambda r: r.fulfill(status=404, body=""))
    page.route("**/events.json", lambda r: r.fulfill(status=500, body="x"))
    page.goto(site["url"] + "/index.html")
    expect(page.locator(".empty")).to_have_text("No se pudieron cargar los eventos.")


@pytest.mark.parametrize("vp", [MOVIL, ESCRITORIO], ids=["movil", "escritorio"])
def test_sin_desbordamiento_horizontal(app, vp):
    app.set_viewport_size(vp)
    assert app.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def test_grid_responsive(app):
    app.set_viewport_size(MOVIL)
    xs = {round(c.bounding_box()["x"]) for c in cards(app).all()}
    assert len(xs) == 1  # una columna
    app.set_viewport_size(ESCRITORIO)
    xs = {round(c.bounding_box()["x"]) for c in cards(app).all()}
    assert len(xs) > 1


def test_web_real_con_events_json_del_proyecto():
    """El index.html real debe poder consumir el events.json real (esquema compatible)."""
    from pathlib import Path
    d = json.loads((Path(__file__).resolve().parent.parent / "events.json").read_text(encoding="utf-8"))
    claves = {"titulo", "fecha_inicio", "fecha_fin", "lugar", "enlace", "categorias"}
    assert all(claves <= set(e) for e in d["eventos"])
