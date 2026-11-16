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
        """Verifica que solo exista el informe de hoy (2026-11-16) con sus 16 fuentes."""
        self.assertTrue(self.reports_json.exists(), "data/reports.json debe existir")
        with open(self.reports_json, "r", encoding="utf-8") as f:
            reports = json.load(f)

        self.assertEqual(len(reports), 1, "Debe existir exactamente 1 informe (el de hoy)")
        today_report = reports[0]
        self.assertEqual(today_report.get("date"), "2026-11-16", "La fecha del informe debe ser 2026-11-16")
        self.assertEqual(today_report.get("videos_count"), 16, "El recuento de vídeos debe ser 16")
        self.assertEqual(len(today_report.get("fuentes_consultadas", [])), 16, "Deben constar las 16 fuentes consultadas")

    def test_index_page_elements(self):
        """Verifica que la página principal (index.html) tenga los textos, badges y botones correctos."""
        self.assertTrue(self.index_html.exists(), "index.html debe existir")
        with open(self.index_html, "r", encoding="utf-8") as f:
            content = f.read()

        # Contador de informes
        self.assertIn("1</span> informe", content, "El contador del header debe marcar '1 informe'")
        self.assertNotIn("3 informes", content, "No deben aparecer informes antiguos")

        # Texto del audio
        self.assertIn("Resumen de audio", content, "El reproductor de audio debe titularse 'Resumen de audio'")
        self.assertNotIn("Podcast Dual de Resumen", content, "No debe aparecer 'Podcast Dual de Resumen'")
        self.assertNotIn("Repaso conversacional", content, "No debe aparecer 'Repaso conversacional'")

        # Textos prohibidos
        self.assertNotIn("(Por Nivel de Quórum)", content, "No debe aparecer '(Por Nivel de Quórum)'")

        # Fuentes
        self.assertIn("16 emisiones monitorizadas", content, "Debe indicar 16 emisiones monitorizadas")

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

        # Fecha junto al icono del calendario
        self.assertIn("📅 2026-11-16", content, "Debe aparecer la fecha '2026-11-16' al lado de '📅'")

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
