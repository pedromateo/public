import unittest
import tempfile
import json
from pathlib import Path
from src.validators import MarketReportValidator
from src.extractor import YouTubeExtractor

class TestValidatorsAndCache(unittest.TestCase):
    """Pruebas funcionales de almacenamiento en caché y validación de coherencia técnica."""

    def test_transcript_cache_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            extractor = YouTubeExtractor(days_horizon=7, cache_dir=tmp_path)
            video_id = "test_vid_123"
            video_data = {
                "id": video_id,
                "title": "Consultorio de Bolsa Test",
                "channel": "Capital Radio",
                "channel_id": "capital_radio",
                "upload_date": "20261114",
                "date_formatted": "2026-11-14",
                "transcript": "Esta es una transcripción de prueba completa sobre el IBEX 35 y Banco Santander."
            }

            # Guardar en caché
            saved_file = extractor.save_cached_transcript(video_data)
            self.assertTrue(saved_file.exists())
            self.assertEqual(saved_file.name, f"{video_id}.json")

            # Recuperar de caché sin red
            cached_text = extractor.get_transcript(video_id)
            self.assertEqual(cached_text, video_data["transcript"])

            # Cargar todos los cacheados dentro del horizonte
            all_cached = extractor.load_all_cached_transcripts()
            self.assertEqual(len(all_cached), 1)
            self.assertEqual(all_cached[0]["id"], video_id)

    def test_technical_coherence_reconciliation(self):
        # Precio real de 20.000 vs soporte antiguo de 11.450 (desfase >20%)
        is_coherent, rec_sop, rec_res, reason = MarketReportValidator.verify_technical_coherence(
            price=20020.10,
            soporte_str="11.450",
            resistencia_str="12.000",
            tolerance_pct=0.20
        )
        self.assertFalse(is_coherent)
        self.assertIsNotNone(reason)
        # Debe haber reconciliado los niveles al entorno de 20.000
        self.assertTrue("19." in rec_sop or "20." in rec_sop)

    def test_audit_and_verify_report(self):
        sample_report = {
            "sentimiento_macro": {
                "indices": [
                    {
                        "nombre": "IBEX 35",
                        "precio_actual": "20.020,10 EUR",
                        "soporte_clave": "11.450",  # Nivel desfasado para probar la auditoría
                        "resistencia_clave": "12.000"
                    }
                ]
            },
            "analisis_empresas": {
                "nacionales": [
                    {
                        "nombre": "Iberdrola",
                        "menciones": 1,
                        "precio_actual": "23,70 EUR",
                        "soporte": "13.20€",  # Desfasado
                        "resistencia": "14.10€"
                    },
                    {
                        "nombre": "Banco Santander",
                        "menciones": 3,
                        "precio_actual": "11,09 EUR",
                        "soporte": "10,80€",  # Correcto
                        "resistencia": "11,50€"
                    }
                ]
            },
            "guion_podcast": [{"locutor": "Voz 1", "texto": "Hola mundo"}] * 16
        }

        audited = MarketReportValidator.audit_and_verify_report(sample_report)
        self.assertIn("_audit", audited)
        self.assertGreater(len(audited["_audit"]["reconciliations"]), 0)
        # Santander (3 menciones) debe estar primero antes de Iberdrola (1 mención)
        self.assertEqual(audited["analisis_empresas"]["nacionales"][0]["nombre"], "Banco Santander")
        # El soporte del IBEX 35 debió ser reconciliado
        self.assertNotIn("11.450", audited["sentimiento_macro"]["indices"][0]["soporte_clave"])

if __name__ == "__main__":
    unittest.main()
