import json
import logging
from pathlib import Path
from typing import Dict, Any, List
from jinja2 import Environment, FileSystemLoader
from config import (
    TEMPLATES_DIR,
    INDEX_HTML,
    HTML_DIR,
    REPORTS_JSON,
    BASE_DIR
)

logger = logging.getLogger(__name__)

class WebPublisher:
    """Generador y publicador de la web estática lista para GitHub Pages."""

    def __init__(self):
        self.env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
        self.index_template = self.env.get_template("index.html")
        self.detail_template = self.env.get_template("report_detail.html")

    def load_reports_metadata(self) -> List[Dict[str, Any]]:
        """Carga el historial de informes desde data/reports.json."""
        if REPORTS_JSON.exists():
            try:
                with open(REPORTS_JSON, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error leyendo {REPORTS_JSON}: {e}. Se inicializará vacío.")
        return []

    def save_reports_metadata(self, reports: List[Dict[str, Any]]):
        """Guarda la lista actualizada de informes en data/reports.json."""
        REPORTS_JSON.parent.mkdir(parents=True, exist_ok=True)
        with open(REPORTS_JSON, "w", encoding="utf-8") as f:
            json.dump(reports, f, ensure_ascii=False, indent=2)

    def publish(
        self,
        report_data: Dict[str, Any],
        date_str: str,
        videos_count: int,
        has_pdf: bool = True,
        has_audio: bool = True
    ) -> Dict[str, Path]:
        """Renderiza el informe detallado y actualiza la página principal index.html."""
        HTML_DIR.mkdir(parents=True, exist_ok=True)
        detail_file = HTML_DIR / f"report-{date_str}.html"

        # Rutas relativas para navegación interna en GitHub Pages
        pdf_rel_path = f"../pdf/informe-{date_str}.pdf" if has_pdf else None
        audio_rel_path = f"../audio/podcast-{date_str}.mp3" if has_audio else None

        # 1. Renderizar la página de detalle
        detail_html = self.detail_template.render(
            report=report_data,
            date=date_str,
            pdf_rel_path=pdf_rel_path,
            audio_rel_path=audio_rel_path
        )
        with open(detail_file, "w", encoding="utf-8") as f:
            f.write(detail_html)
        logger.info(f"Página de detalle generada: {detail_file}")

        # 2. Extraer top empresas con mayor quórum para la tarjeta del feed
        top_stocks = []
        nacionales = report_data.get("analisis_empresas", {}).get("nacionales", [])
        internacionales = report_data.get("analisis_empresas", {}).get("internacionales", [])
        
        all_companies = sorted(
            nacionales + internacionales,
            key=lambda c: c.get("menciones", 1),
            reverse=True
        )
        for comp in all_companies[:4]:
            top_stocks.append(f"{comp.get('nombre')} ({comp.get('menciones', 1)})")

        resumen_sintesis = report_data.get("resumen_ejecutivo", {}).get("sintesis_sentimiento", "")
        summary_snippet = (
            (resumen_sintesis[:220] + "...")
            if len(resumen_sintesis) > 220
            else resumen_sintesis
        )

        # 3. Actualizar el feed JSON
        reports_meta = self.load_reports_metadata()
        
        # Eliminar entrada si ya existía para esa fecha para evitar duplicados
        reports_meta = [r for r in reports_meta if r.get("date") != date_str]

        new_entry = {
            "date": date_str,
            "sentimiento_general": report_data.get("sentimiento_general", "Neutral"),
            "summary_snippet": summary_snippet,
            "top_stocks": top_stocks,
            "detail_url": f"reports/html/report-{date_str}.html",
            "pdf_url": f"reports/pdf/informe-{date_str}.pdf" if has_pdf else None,
            "audio_url": f"reports/audio/podcast-{date_str}.mp3" if has_audio else None,
            "videos_count": videos_count
        }

        # Insertar al inicio (orden cronológico inverso)
        reports_meta.insert(0, new_entry)
        self.save_reports_metadata(reports_meta)

        # 4. Re-renderizar index.html en la raíz
        index_html = self.index_template.render(
            reports=reports_meta
        )
        with open(INDEX_HTML, "w", encoding="utf-8") as f:
            f.write(index_html)
        logger.info(f"Página principal actualizada: {INDEX_HTML}")

        return {
            "detail": detail_file,
            "index": INDEX_HTML
        }
