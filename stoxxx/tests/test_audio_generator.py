import unittest
from pathlib import Path
from src.audio_generator import clean_tts_text, PodcastGenerator


class TestAudioGenerator(unittest.TestCase):
    """Pruebas unitarias para la sanitización de texto y procesamiento de audio del podcast."""

    def test_clean_tts_text_newlines_and_carriage_returns(self):
        """Verifica que los saltos de línea y retornos de carro se reemplacen por un único espacio."""
        text = "Primera frase.\r\nSegunda frase con\nsalto de línea\ry más texto."
        cleaned = clean_tts_text(text)
        self.assertNotIn("\n", cleaned)
        self.assertNotIn("\r", cleaned)
        self.assertEqual(cleaned, "Primera frase. Segunda frase con salto de línea y más texto.")

    def test_clean_tts_text_analyst_expansions(self):
        """Verifica que las iniciales y abreviaturas de analistas se expandan a su nombre completo."""
        cases = [
            ("Tal como señalaban analistas como D. Galán o M. Pinto",
             "Tal como señalaban analistas como David Galán o Manuel Pinto"),
            ("A. Iturralde, E. Bolinches, R. Moro y P. Pérez: el castigo ha sido excesivo",
             "Alberto Iturralde, Eduardo Bolinches, Roberto Moro y Paco Pérez: el castigo ha sido excesivo"),
            ("rescatamos una pauta esencial que J. M. Luna recordaba",
             "rescatamos una pauta esencial que José María Luna recordaba"),
            ("Unanimidad total entre Moro, Iturralde, Alfayate, V. Galán y Bolinches",
             "Unanimidad total entre Moro, Iturralde, Alfayate, Víctor Galán y Bolinches"),
            ("S. Rodríguez explicaba en Visionarios Bolsa",
             "Sito Rodríguez explicaba en Visionarios Bolsa"),
            ("G. Ortega y M. Ribes analizan la situación",
             "Gerardo Ortega y Marc Ribes analizan la situación"),
            ("según S. Clatum y J. del Canto",
             "según Sergio Clatum y Jorge del Canto")
        ]
        for original, expected in cases:
            self.assertEqual(clean_tts_text(original), expected)

    def test_clean_tts_text_common_abbreviations(self):
        """Verifica la expansión de siglas y abreviaturas comunes."""
        cases = [
            ("En EE.UU. la Reserva Federal actúa con cautela",
             "En Estados Unidos la Reserva Federal actúa con cautela"),
            ("Valores cíclicos p. ej. banca e industria",
             "Valores cíclicos por ejemplo banca e industria"),
            ("Químicas, seguros, utilities etc.",
             "Químicas, seguros, utilities etcétera.")
        ]
        for original, expected in cases:
            self.assertEqual(clean_tts_text(original), expected)

    def test_clean_tts_text_markdown_and_unmapped_initials(self):
        """Verifica la limpieza de markdown e iniciales sueltas no mapeadas."""
        text = "El analista **F. Martínez** destaca el valor _Iberdrola_."
        cleaned = clean_tts_text(text)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("_", cleaned)
        # La inicial suelta no debe conservar el punto para no cortar la frase
        self.assertEqual(cleaned, "El analista F Martínez destaca el valor Iberdrola.")

    def test_clean_tts_text_multiple_spaces_and_ellipsis(self):
        """Verifica que los espacios múltiples y puntos suspensivos se normalicen."""
        text = "Esperamos...   una corrección técnica..... en el índice."
        cleaned = clean_tts_text(text)
        self.assertEqual(cleaned, "Esperamos. una corrección técnica. en el índice.")

    def test_podcast_generator_clean_text_method(self):
        """Verifica que la instancia de PodcastGenerator utilice la limpieza adecuada."""
        gen = PodcastGenerator()
        res = gen.clean_text("D. Galán y M. Pinto en EE.UU.\nRevisan el IBEX.")
        self.assertEqual(res, "David Galán y Manuel Pinto en Estados Unidos Revisan el IBEX.")

    def test_save_script_markdown(self):
        """Verifica que el guion del podcast se guarde correctamente en formato Markdown."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_path = Path(tmpdir)
            gen = PodcastGenerator()
            guion_sample = [
                {"locutor": "Voz 1", "genero": "masculino", "texto": "Bienvenidos a STOXXX."},
                {"locutor": "Voz 2", "genero": "femenino", "texto": "Repasamos las claves de la sesión."}
            ]
            saved_file = gen.save_script_markdown(guion_sample, "2026-11-19", output_dir=temp_path)
            self.assertIsNotNone(saved_file)
            self.assertTrue(saved_file.exists())
            self.assertEqual(saved_file.name, "podcast-2026-11-19.md")

            content = saved_file.read_text(encoding="utf-8")
            self.assertIn("# Guion del Podcast - 2026-11-19", content)
            self.assertIn("**Voz 1**: Bienvenidos a STOXXX.", content)
            self.assertIn("**Voz 2**: Repasamos las claves de la sesión.", content)
            self.assertIn("- **Total de intervenciones:** 2", content)


if __name__ == "__main__":
    unittest.main()
