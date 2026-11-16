import unittest
import json
import subprocess
import shutil
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parent.parent

class AdvancedWebFunctionalityTests(unittest.TestCase):
    """
    Suite de pruebas funcionales avanzadas para STOXXX:
    - Comprobación de apertura e interactividad de secciones (<details> / <summary>).
    - Verificación de enlaces de descarga y validez binaria de ficheros (PDF y MP3).
    - Comprobación de reproducción y códecs de audio mediante ffprobe.
    - Validación de navegación interna (anclas de sección), filtrado reactivo y accesibilidad.
    """

    @classmethod
    def setUpClass(cls):
        cls.index_path = BASE_DIR / "index.html"
        cls.detail_path = BASE_DIR / "reports" / "html" / "report-2026-11-16.html"

        with open(cls.index_path, "r", encoding="utf-8") as f:
            cls.index_soup = BeautifulSoup(f.read(), "html.parser")

        with open(cls.detail_path, "r", encoding="utf-8") as f:
            cls.detail_soup = BeautifulSoup(f.read(), "html.parser")

    # =========================================================================
    # 1. PRUEBAS DE SECCIONES COLAPSABLES E INTERACTIVAS (<details> / <summary>)
    # =========================================================================

    def test_details_summary_structure_index(self):
        """Verifica que los elementos <details> de la portada tengan su <summary> interactivo."""
        details_elements = self.index_soup.find_all("details")
        self.assertGreater(len(details_elements), 0, "Debe existir al menos un acordeón <details> en la portada")

        for d in details_elements:
            summary = d.find("summary")
            self.assertIsNotNone(summary, "Cada elemento <details> debe contener un <summary>")
            self.assertTrue(len(summary.get_text(strip=True)) > 0, "El <summary> no debe estar vacío")
            self.assertIn("cursor-pointer", summary.get("class", []), "El <summary> debe ser clicable (cursor-pointer)")

    def test_sources_section_expansion_detail(self):
        """Verifica que la sección de fuentes en el informe de detalle sea colapsable y contenga las 16 fuentes."""
        fuentes_details = self.detail_soup.find("details", id="fuentes")
        self.assertIsNotNone(fuentes_details, "Debe existir una sección <details id='fuentes'> en el informe")

        summary = fuentes_details.find("summary")
        self.assertIsNotNone(summary, "La sección de fuentes debe tener un <summary>")
        self.assertIn("16 fuentes", summary.get_text(), "El resumen debe indicar '16 fuentes'")

        # Verificar que dentro del acordeón colapsable se encuentren las tarjetas de los vídeos
        cards_container = fuentes_details.find("div", id="lista-fuentes")
        self.assertIsNotNone(cards_container, "Debe existir un contenedor de tarjetas de fuentes")
        
        # Enlaces a YouTube dentro de las fuentes
        yt_links = cards_container.find_all("a", href=lambda h: h and "youtube.com/watch" in h)
        self.assertEqual(len(yt_links), 16, "Deben existir exactamente 16 enlaces a vídeos de YouTube en las fuentes")

    def test_section_anchors_navigation(self):
        """Comprueba que todas las anclas de navegación interna (#resumen, #macro, #empresas, #fuentes) existan en el DOM."""
        nav_anchors = ["resumen", "macro", "empresas", "fuentes"]
        for anchor in nav_anchors:
            target = self.detail_soup.find(id=anchor)
            self.assertIsNotNone(target, f"Debe existir en el DOM un elemento con id='{anchor}' para permitir la navegación interna")

    # =========================================================================
    # 2. PRUEBAS DE ENLACES DE DESCARGA Y VALIDEZ DE FICHEROS (PDF Y MP3)
    # =========================================================================

    def test_pdf_download_link_in_index(self):
        """Verifica que el enlace de descarga de PDF en la portada apunte a un fichero real y válido."""
        pdf_links = self.index_soup.find_all("a", href=lambda h: h and h.endswith(".pdf"))
        self.assertGreater(len(pdf_links), 0, "Debe haber al menos un enlace a PDF en la portada")

        for link in pdf_links:
            self.assertTrue(link.has_attr("download"), "El enlace de descarga debe contener el atributo 'download'")
            rel_href = link["href"]
            target_file = (BASE_DIR / rel_href).resolve()
            self.assertTrue(target_file.exists(), f"El archivo PDF enlazado ({target_file}) debe existir en disco")
            self.assertGreater(target_file.stat().st_size, 50000, "El archivo PDF debe tener un tamaño superior a 50KB")

            # Verificar cabecera mágica de PDF (%PDF-)
            with open(target_file, "rb") as f:
                header = f.read(5)
                self.assertEqual(header, b"%PDF-", "El fichero descargable debe ser un PDF binario válido")

    def test_pdf_integrity_with_pdfinfo(self):
        """Si pdfinfo está instalado, verifica la integridad estructural y número de páginas del PDF."""
        pdf_file = BASE_DIR / "reports" / "pdf" / "informe-2026-11-16.pdf"
        self.assertTrue(pdf_file.exists())

        if shutil.which("pdfinfo"):
            res = subprocess.run(["pdfinfo", str(pdf_file)], capture_output=True, text=True, check=True)
            self.assertIn("Pages:", res.stdout, "pdfinfo debe detectar páginas válidas")
            self.assertIn("Page size:", res.stdout, "pdfinfo debe reconocer el tamaño A4")
            self.assertIn("PDF version:", res.stdout, "Debe ser un PDF compatible")

    def test_mp3_download_link_in_index_and_detail(self):
        """Verifica que los enlaces de descarga de MP3 funcionen y apunten a ficheros de audio existentes."""
        for soup, base_folder in [(self.index_soup, BASE_DIR), (self.detail_soup, BASE_DIR / "reports" / "html")]:
            mp3_links = soup.find_all("a", href=lambda h: h and ".mp3" in h)
            self.assertGreater(len(mp3_links), 0, "Debe existir al menos un enlace al podcast MP3")
            for link in mp3_links:
                target_file = (base_folder / link["href"]).resolve()
                self.assertTrue(target_file.exists(), f"El fichero MP3 ({target_file}) debe existir")
                self.assertGreater(target_file.stat().st_size, 1000000, "El MP3 debe pesar más de 1MB")

    # =========================================================================
    # 3. PRUEBAS DE REPRODUCCIÓN Y CÓDECS DE AUDIO (<audio> / ffprobe)
    # =========================================================================

    def test_audio_player_element_structure(self):
        """Verifica que el reproductor <audio> en portada y detalle esté correctamente configurado con su <source>."""
        for soup, doc_name in [(self.index_soup, "index.html"), (self.detail_soup, "report_detail.html")]:
            audio_tag = soup.find("audio")
            self.assertIsNotNone(audio_tag, f"Debe existir una etiqueta <audio> en {doc_name}")
            self.assertTrue(audio_tag.has_attr("controls"), f"El reproductor <audio> en {doc_name} debe tener 'controls'")

            source_tag = audio_tag.find("source")
            self.assertIsNotNone(source_tag, f"La etiqueta <audio> en {doc_name} debe contener un <source>")
            self.assertEqual(source_tag.get("type"), "audio/mpeg", f"El tipo MIME debe ser 'audio/mpeg' en {doc_name}")

    def test_audio_playback_integrity_with_ffprobe(self):
        """Utiliza ffprobe para verificar que el podcast se puede reproducir sin errores, con duración y bitrate correctos."""
        mp3_file = BASE_DIR / "reports" / "audio" / "podcast-2026-11-16.mp3"
        self.assertTrue(mp3_file.exists())

        if shutil.which("ffprobe"):
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration,bit_rate:stream=codec_name,channels,sample_rate",
                "-of", "json",
                str(mp3_file)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            info = json.loads(res.stdout)

            # Verificar que ffprobe reconozca formato y stream
            format_info = info.get("format", {})
            duration = float(format_info.get("duration", 0))
            self.assertGreater(duration, 60.0, "El audio debe durar más de 1 minuto (podcast extenso)")

            streams = info.get("streams", [])
            self.assertGreater(len(streams), 0, "Debe existir al menos un stream de audio")
            audio_stream = streams[0]
            self.assertIn("mp3", audio_stream.get("codec_name", "").lower(), "El códec debe ser MP3")
            self.assertGreater(int(audio_stream.get("channels", 0)), 0, "Debe tener canales de audio válidos")

    # =========================================================================
    # 4. PRUEBAS DE BÚSQUEDA REACTIVA Y FILTRO DE SENTIMIENTO (SIMULACIÓN DOM)
    # =========================================================================

    def test_reactive_search_keywords_matching(self):
        """Simula la lógica de búsqueda reactiva del frontend comprobando los data-attributes de las tarjetas."""
        cards = self.index_soup.find_all(class_=lambda c: c and "report-card" in c)
        self.assertEqual(len(cards), 1, "Debe existir 1 tarjeta de informe en la portada")

        card = cards[0]
        keywords = card.get("data-keywords", "").lower()
        self.assertTrue(len(keywords) > 0, "La tarjeta debe tener un atributo data-keywords no vacío")

        # Comprobar que palabras clave clave hagan match
        test_queries = ["nvidia", "iberdrola", "banco santander", "2026-11-16"]
        for q in test_queries:
            self.assertIn(q, keywords, f"La búsqueda de '{q}' debe coincidir con data-keywords")

        # Comprobar que una búsqueda no coincidente no haga match
        self.assertNotIn("empresa_inexistente_xyz", keywords)

    def test_sentiment_filter_contract(self):
        """Verifica que el botón de filtro de sentimiento coincida con el sentimiento de la tarjeta."""
        card = self.index_soup.find(class_=lambda c: c and "report-card" in c)
        card_sentiment = card.get("data-sentiment", "").lower()
        self.assertIn("alcista", card_sentiment, "La tarjeta de hoy debe clasificarse como alcista")

        # Comprobar que los botones de filtro existan
        filter_buttons = self.index_soup.find_all("button", class_=lambda c: c and "sentiment-filter" in c)
        self.assertGreater(len(filter_buttons), 1, "Deben existir botones de filtro de sentimiento")

    # =========================================================================
    # 5. PRUEBAS DE ACCESIBILIDAD Y BOTÓN THEME SWITCHER
    # =========================================================================

    def test_theme_toggle_accessibility_and_icons(self):
        """Verifica que el botón de modo claro/oscuro cumpla las pautas de accesibilidad sin textos visibles."""
        for soup, doc in [(self.index_soup, "index.html"), (self.detail_soup, "report_detail.html")]:
            btn = soup.find("button", id="theme-toggle")
            self.assertIsNotNone(btn, f"El botón #theme-toggle debe existir en {doc}")
            self.assertTrue(btn.has_attr("aria-label"), f"Debe tener 'aria-label' en {doc}")
            self.assertTrue(btn.has_attr("onclick"), f"Debe tener 'onclick' en {doc}")

            # Comprobar que contiene iconos SVG para el Sol y la Luna
            svgs = btn.find_all("svg")
            self.assertEqual(len(svgs), 2, f"El botón de tema debe contener exactamente 2 iconos SVG (sol y luna) en {doc}")

            # Asegurar que no tiene texto
            btn_text = btn.get_text(strip=True)
            self.assertEqual(btn_text, "", f"El botón #theme-toggle en {doc} no debe tener texto visible")

    # =========================================================================
    # 6. PRUEBAS DE ENLACES A GOOGLE FINANCE EN ANÁLISIS DE EMPRESAS
    # =========================================================================

    def test_google_finance_links_in_company_analysis(self):
        """Verifica que cada empresa analizada tenga junto a su nombre un enlace funcional a su ficha en Google Finance."""
        empresas_section = self.detail_soup.find("section", id="empresas")
        self.assertIsNotNone(empresas_section, "Debe existir la sección #empresas")

        gf_links = empresas_section.find_all("a", href=lambda h: h and "google.com/finance/quote" in h)
        self.assertEqual(len(gf_links), 19, "Deben existir exactamente 19 enlaces a fichas de Google Finance (12 nacionales + 7 internacionales)")

        for link in gf_links:
            self.assertEqual(link.get("target"), "_blank", "El enlace a Google Finance debe abrirse en nueva pestaña")
            self.assertEqual(link.get("rel"), ["noopener", "noreferrer"], "El enlace debe incluir rel='noopener noreferrer'")
            self.assertEqual(link.get_text(strip=True), "", "El enlace debe ser solo un icono sin texto visible para mantener la web sencilla")
            self.assertIsNotNone(link.find("svg"), "El enlace debe contener el icono SVG")
            self.assertIn("Google Finance", link.get("aria-label", ""), "El atributo aria-label debe referenciar Google Finance")
            self.assertTrue(link["href"].startswith("https://www.google.com/finance/quote/"))

    # =========================================================================
    # 7. PRUEBAS DE AUSENCIA DE EMOJIS (DISEÑO PROFESIONAL CON ICONOS SVG)
    # =========================================================================

    def test_strict_no_emojis_in_web_interface(self):
        """Verifica que no se utilicen emojis en la interfaz web, asegurando el uso de iconos SVG profesionales."""
        import re
        emoji_pattern = re.compile(
            r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50]|[\u3030]|[\u00a9\u00ae]|✔|📅|📚|📻|🇪🇸|🌍|📈|📄'
        )
        for soup, doc_name in [(self.index_soup, "index.html"), (self.detail_soup, "report_detail.html")]:
            html_text = str(soup)
            emojis_found = emoji_pattern.findall(html_text)
            self.assertEqual(len(emojis_found), 0, f"No deben existir emojis en {doc_name}. Se encontraron: {set(emojis_found)}")

if __name__ == "__main__":
    unittest.main()
