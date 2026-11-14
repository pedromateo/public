import pytest
import json
from pathlib import Path
from src.validators import MarketReportValidator
from src.extractor import YouTubeExtractor

def test_transcript_cache_save_and_load(tmp_path):
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
    assert saved_file.exists()
    assert saved_file.name == f"{video_id}.json"

    # Recuperar de caché sin red
    cached_text = extractor.get_transcript(video_id)
    assert cached_text == video_data["transcript"]

    # Cargar todos los cacheados dentro del horizonte
    all_cached = extractor.load_all_cached_transcripts()
    assert len(all_cached) == 1
    assert all_cached[0]["id"] == video_id

def test_technical_coherence_reconciliation():
    # Precio real de 20.000 vs soporte antiguo de 11.450 (desfase >20%)
    is_coherent, rec_sop, rec_res, reason = MarketReportValidator.verify_technical_coherence(
        price=20020.10,
        soporte_str="11.450",
        resistencia_str="12.000",
        tolerance_pct=0.20
    )
    assert not is_coherent
    assert reason is not None
    # Debe haber reconciliado los niveles al entorno de 20.000
    assert "19." in rec_sop or "20." in rec_sop

def test_audit_and_verify_report():
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
        "guion_podcast": [{"locutor": "Carlos", "texto": "Hola mundo"}] * 16
    }

    audited = MarketReportValidator.audit_and_verify_report(sample_report)
    assert "_audit" in audited
    assert len(audited["_audit"]["reconciliations"]) > 0
    # Santander (3 menciones) debe estar primero antes de Iberdrola (1 mención)
    assert audited["analisis_empresas"]["nacionales"][0]["nombre"] == "Banco Santander"
    # El soporte del IBEX 35 debió ser reconciliado
    assert "11.450" not in audited["sentimiento_macro"]["indices"][0]["soporte_clave"]
