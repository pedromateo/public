import unittest
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class TestWebAndReport(unittest.TestCase):
    """Batería de pruebas automatizadas para la web, informes, formatos y diseño de STOXXX."""

    def setUp(self):
        self.reports_json = BASE_DIR / "data" / "reports.json"
        self.index_html = BASE_DIR / "index.html"
        self.report_detail = BASE_DIR / "reports" / "html" / "report-2026-11-16.html"
        self.pdf_report = BASE_DIR / "reports" / "pdf" / "informe-2026-11-16.pdf"
        self.podcast_mp3 = BASE_DIR / "reports" / "audio" / "podcast-2026-11-16.mp3"

    def test_single_today_report(self):
        """Verifica la integridad de los informes en data/reports.json y sus fuentes."""
        self.assertTrue(self.reports_json.exists(), "data/reports.json debe existir")
        with open(self.reports_json, "r", encoding="utf-8") as f:
            reports = json.load(f)

        self.assertGreaterEqual(len(reports), 1, "Debe existir al menos 1 informe en reports.json")
        latest_report = reports[0]
        self.assertTrue(bool(latest_report.get("date")), "El informe debe tener fecha válida")
        self.assertGreaterEqual(latest_report.get("videos_count", 0), 16, "El recuento de vídeos debe ser al menos 16")
        self.assertGreaterEqual(len(latest_report.get("fuentes_consultadas", [])), 16, "Deben constar al menos 16 fuentes consultadas")

    def test_index_page_elements(self):
        """Verifica que la página principal (index.html) tenga los textos, badges y botones correctos."""
        self.assertTrue(self.index_html.exists(), "index.html debe existir")
        with open(self.index_html, "r", encoding="utf-8") as f:
            content = f.read()

        with open(self.reports_json, "r", encoding="utf-8") as rf:
            reports = json.load(rf)
        total_reports = len(reports)

        # Contador de informes (con separación clara de spans y gap)
        self.assertIn(f">{total_reports}</span>", content, f"El número de informes debe coincidir con {total_reports}")
        label = "informe" if total_reports == 1 else "informes"
        self.assertIn(f"<span>{label}</span>", content, f"La etiqueta debe contener '<span>{label}</span>'")
        self.assertNotIn("3 informes", content, "No deben aparecer informes antiguos")

        # Texto del audio
        self.assertIn("Resumen de audio", content, "El reproductor de audio debe titularse 'Resumen de audio'")
        self.assertNotIn("Podcast Dual de Resumen", content, "No debe aparecer 'Podcast Dual de Resumen'")
        self.assertNotIn("Repaso conversacional", content, "No debe aparecer 'Repaso conversacional'")

        # Textos prohibidos
        self.assertNotIn("(Por Nivel de Quórum)", content, "No debe aparecer '(Por Nivel de Quórum)'")
        self.assertNotIn("Diseño inspirado en la prensa económica de referencia con soporte multitema Expansión y Terminal.", content, "Frase eliminada no debe figurar")
        self.assertNotIn("📅", content, "No deben utilizarse emojis en index.html")
        self.assertNotIn("📚", content, "No deben utilizarse emojis en index.html")

        # Fuentes
        self.assertIn("16 emisiones monitorizadas", content, "Debe indicar 16 emisiones monitorizadas")

        # Título del informe con fecha entre paréntesis
        self.assertTrue(
            any(f"Informe de Consenso Bursátil & Macro ({r.get('date')})" in content for r in reports),
            "El título debe incluir la fecha entre paréntesis al final"
        )

        # Accesibilidad y SEO
        self.assertIn('name="description"', content, "Debe incluir meta description para SEO")
        self.assertIn('property="og:title"', content, "Debe incluir etiqueta OpenGraph og:title")
        self.assertIn('aria-label="Buscar empresa, ticker, índice o fecha"', content, "El input de búsqueda debe tener aria-label")

        # Botón de modo claro / oscuro sin texto
        theme_btn_match = re.search(r'<button\s+id="theme-toggle"[^>]*>(.*?)</button>', content, re.DOTALL)
        self.assertTrue(theme_btn_match, "El botón #theme-toggle debe existir")
        theme_btn_content = theme_btn_match.group(1)
        self.assertNotIn("Expansión", theme_btn_content, "El botón de tema no debe incluir texto 'Expansión'")
        self.assertNotIn("Terminal", theme_btn_content, "El botón de tema no debe incluir texto 'Terminal'")
        self.assertNotIn("theme-toggle-label", theme_btn_content, "No debe haber etiqueta de texto en el botón")

    def test_report_detail_elements(self):
        """Verifica que el informe de detalle tenga la fecha junto al icono, analistas abreviados y sin textos no deseados."""
        self.assertTrue(self.report_detail.exists(), "report-2026-11-16.html debe existir")
        with open(self.report_detail, "r", encoding="utf-8") as f:
            content = f.read()

        # Fecha junto al icono SVG del calendario (sin emojis)
        self.assertIn("2026-11-16", content, "Debe aparecer la fecha '2026-11-16'")
        self.assertNotIn("📅", content, "No deben utilizarse emojis como 📅 en el informe")

        # Audio
        self.assertIn("Resumen de audio", content, "Debe titularse 'Resumen de audio'")
        self.assertNotIn("Podcast Dual de Resumen", content, "No debe figurar 'Podcast Dual de Resumen'")
        self.assertNotIn("Repaso conversacional", content, "No debe figurar 'Repaso conversacional'")

        # Sin textos de ordenación en el título
        self.assertIn("3. Análisis de Empresas", content, "Debe aparecer '3. Análisis de Empresas'")
        self.assertNotIn("3. Análisis de Empresas (Por Nivel de Quórum)", content, "No debe tener '(Por Nivel de Quórum)'")

        # Nombres de analistas abreviados (R. Moro, A. Iturralde, S. Rodríguez, etc.)
        self.assertIn("R. Moro", content, "Debe utilizarse la forma abreviada 'R. Moro'")
        self.assertIn("A. Iturralde", content, "Debe utilizarse la forma abreviada 'A. Iturralde'")
        self.assertIn("S. Rodríguez", content, "Debe utilizarse la forma abreviada 'S. Rodríguez'")
        self.assertIn("J. Alfayate", content, "Debe utilizarse la forma abreviada 'J. Alfayate'")

        # Verificar que en la lista de analistas de las empresas no se use el nombre completo de pila
        self.assertNotIn("Analistas: Roberto Moro", content, "No debe citarse 'Roberto Moro' con nombre completo en analistas")
        self.assertNotIn("Analistas: Alberto Iturralde", content, "No debe citarse 'Alberto Iturralde' con nombre completo en analistas")

    def test_pdf_margins_and_file(self):
        """Verifica que el PDF esté generado y que los márgenes en el generador sean estrictos."""
        self.assertTrue(self.pdf_report.exists(), "El informe PDF debe existir")
        self.assertGreater(self.pdf_report.stat().st_size, 50000, "El PDF debe superar los 50KB")

        from src.pdf_generator import PRINT_WIDTH, MARGIN, PAGE_WIDTH
        self.assertEqual(PAGE_WIDTH, 210, "El ancho de página A4 debe ser 210mm")
        self.assertEqual(MARGIN, 12, "El margen debe ser de 12mm")
        self.assertEqual(PRINT_WIDTH, 186, "El ancho imprimible debe ser de 186mm (210 - 24)")

    def test_podcast_mp3_exists(self):
        """Verifica que el archivo MP3 del podcast esté generado y tenga un tamaño adecuado."""
        self.assertTrue(self.podcast_mp3.exists(), "El archivo podcast-2026-11-16.mp3 debe existir")
        self.assertGreater(self.podcast_mp3.stat().st_size, 1000000, "El MP3 debe superar 1MB")

if __name__ == "__main__":
    unittest.main()
