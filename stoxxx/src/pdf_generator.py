import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from fpdf import FPDF
from config import PDF_DIR

logger = logging.getLogger(__name__)

class StoxxxPDF(FPDF):
    """Clase personalizada FPDF para informes financieros profesionales."""

    def __init__(self, date_str: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.date_str = date_str
        self.setup_fonts()
        self.set_auto_page_break(auto=True, margin=15)

    def setup_fonts(self):
        """Configura fuentes TrueType Unicode para soportar el símbolo del euro y caracteres españoles."""
        font_candidates = [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
            ("/usr/share/fonts/truetype/freefont/FreeSans.ttf", "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"),
        ]

        self.font_family = "Helvetica"
        for regular, bold in font_candidates:
            if os.path.exists(regular) and os.path.exists(bold):
                try:
                    self.add_font("StoxxxFont", "", regular)
                    self.add_font("StoxxxFont", "B", bold)
                    self.font_family = "StoxxxFont"
                    break
                except Exception as e:
                    logger.debug(f"No se pudo cargar la fuente {regular}: {e}")

    def header(self):
        if self.page_no() == 1:
            return  # La primera página tiene su propia cabecera de portada
        self.set_font(self.font_family, "B", 8)
        self.set_text_color(100, 116, 139) # Slate 500
        self.cell(0, 6, f"STOXXX FINANCIAL INTELLIGENCE | INFORME BURSÁTIL ({self.date_str})", border=0, align="L")
        self.ln(8)
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font(self.font_family, "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(100, 10, "Informe automatizado bajo demanda. No constituye recomendación financiera.", align="L")
        self.cell(90, 10, f"Página {self.page_no()} de {{nb}}", align="R")


class PDFReportGenerator:
    """Generador de informes financieros maquetados en formato PDF."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or PDF_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, report_data: Dict[str, Any], date_str: str) -> Path:
        """Renderiza los datos estructurados en un documento PDF profesional."""
        pdf_path = self.output_dir / f"informe-{date_str}.pdf"
        pdf = StoxxxPDF(date_str)
        pdf.alias_nb_pages()
        pdf.add_page()

        font = pdf.font_family

        # === CABECERA PRINCIPAL ===
        pdf.set_fill_color(15, 23, 42) # Slate 900
        pdf.rect(10, 10, 190, 26, "F")

        pdf.set_xy(15, 14)
        pdf.set_font(font, "B", 16)
        pdf.set_text_color(248, 250, 252) # White/Slate 50
        pdf.cell(0, 8, "STOXXX FINANCIAL REPORT", ln=True)

        pdf.set_xy(15, 23)
        pdf.set_font(font, "", 9)
        pdf.set_text_color(148, 163, 184) # Slate 400
        pdf.cell(0, 6, f"Consenso de Consultorios de Bolsa & Análisis Cuantitativo | Fecha: {date_str}", ln=True)

        pdf.set_xy(10, 40)

        # Sentimiento general badge
        sentimiento = report_data.get("sentimiento_general", "Neutral")
        pdf.set_font(font, "B", 10)
        pdf.set_fill_color(241, 245, 249) # Slate 100
        pdf.set_text_color(30, 41, 59)
        pdf.cell(50, 8, f"SENTIMIENTO GLOBAL:", border=1, fill=True, align="L")
        
        # Color según sentimiento
        if "Alcista" in sentimiento:
            pdf.set_text_color(16, 185, 129) # Verde
        elif "Bajista" in sentimiento:
            pdf.set_text_color(239, 68, 68) # Rojo
        else:
            pdf.set_text_color(245, 158, 11) # Ámbar

        pdf.cell(50, 8, f" {sentimiento.upper()}", border=1, ln=True, align="L")
        pdf.ln(5)

        # === 1. RESUMEN EJECUTIVO ===
        resumen = report_data.get("resumen_ejecutivo", {})
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 8, "1. RESUMEN EJECUTIVO (Lectura rápida de 3-5 minutos)", ln=True)
        pdf.set_draw_color(59, 130, 246) # Blue 500
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)

        # Caja de resumen
        pdf.set_font(font, "", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.set_fill_color(248, 250, 252)
        sintesis = resumen.get("sintesis_sentimiento", "")
        if sintesis:
            pdf.multi_cell(190, 5, sintesis, border=0, fill=True)
            pdf.ln(2)

        hacia_donde = resumen.get("hacia_donde_apuntan", "")
        if hacia_donde:
            pdf.set_font(font, "B", 9)
            pdf.cell(0, 5, "Hacia dónde apuntan los analistas:", ln=True)
            pdf.set_font(font, "", 9)
            pdf.multi_cell(190, 5, hacia_donde)
            pdf.ln(2)

        puntos_consenso = resumen.get("puntos_clave_consenso", [])
        if puntos_consenso:
            pdf.set_font(font, "B", 9)
            pdf.cell(0, 5, "Puntos de mayor consenso:", ln=True)
            pdf.set_font(font, "", 9)
            for pt in puntos_consenso:
                pdf.cell(6, 5, "•", align="C")
                pdf.multi_cell(184, 5, pt)
            pdf.ln(4)

        # === 2. SENTIMIENTO DE MERCADO Y VISIÓN MACRO ===
        macro = report_data.get("sentimiento_macro", {})
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 8, "2. SENTIMIENTO DE MERCADO Y VISIÓN MACRO", ln=True)
        pdf.set_draw_color(59, 130, 246)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)

        situacion = macro.get("situacion_global", "")
        if situacion:
            pdf.set_font(font, "", 9)
            pdf.set_text_color(51, 65, 85)
            pdf.multi_cell(190, 5, situacion)
            pdf.ln(3)

        # Tabla de Índices
        indices = macro.get("indices", [])
        if indices:
            pdf.set_font(font, "B", 8)
            pdf.set_fill_color(226, 232, 240) # Slate 200
            pdf.set_text_color(15, 23, 42)
            pdf.cell(35, 7, "Índice", border=1, fill=True)
            pdf.cell(28, 7, "Tendencia", border=1, fill=True)
            pdf.cell(28, 7, "Soporte", border=1, fill=True)
            pdf.cell(28, 7, "Resistencia", border=1, fill=True)
            pdf.cell(71, 7, "Consenso de Analistas", border=1, fill=True, ln=True)

            pdf.set_font(font, "", 8)
            for idx in indices:
                pdf.cell(35, 6, idx.get("nombre", ""), border=1)
                pdf.cell(28, 6, idx.get("tendencia", ""), border=1)
                pdf.cell(28, 6, idx.get("soporte_clave", ""), border=1)
                pdf.cell(28, 6, idx.get("resistencia_clave", ""), border=1)
                pdf.cell(71, 6, idx.get("consenso_analistas", "")[:45] + "...", border=1, ln=True)
            pdf.ln(4)

        coincidencias = macro.get("coincidencias_estrategia", "")
        if coincidencias:
            pdf.set_font(font, "B", 9)
            pdf.cell(0, 5, "Coincidencias en la estrategia operativa:", ln=True)
            pdf.set_font(font, "", 9)
            pdf.multi_cell(190, 5, coincidencias)
            pdf.ln(2)

        divergencias = macro.get("divergencias_estrategia", "")
        if divergencias:
            pdf.set_font(font, "B", 9)
            pdf.cell(0, 5, "Divergencias detectadas entre analistas:", ln=True)
            pdf.set_font(font, "", 9)
            pdf.multi_cell(190, 5, divergencias)
            pdf.ln(5)

        # === 3. ANÁLISIS DE EMPRESAS (ORDENADAS POR QUÓRUM) ===
        pdf.add_page()
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 8, "3. ANÁLISIS DE EMPRESAS (Ordenadas por Nivel de Quórum)", ln=True)
        pdf.set_draw_color(59, 130, 246)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

        empresas_data = report_data.get("analisis_empresas", {})

        def render_company_block(title: str, companies: List[Dict[str, Any]]):
            pdf.set_font(font, "B", 11)
            pdf.set_fill_color(241, 245, 249)
            pdf.set_text_color(30, 41, 59)
            pdf.cell(190, 7, f"  {title.upper()}", border=1, fill=True, ln=True)
            pdf.ln(2)

            if not companies:
                pdf.set_font(font, "I", 9)
                pdf.cell(0, 6, "No se registraron menciones en este bloque.", ln=True)
                pdf.ln(2)
                return

            for comp in companies:
                # Comprobar salto de página si queda poco espacio
                if pdf.get_y() > 240:
                    pdf.add_page()

                nombre = comp.get("nombre", "Empresa")
                ticker = comp.get("ticker", "")
                menciones = comp.get("menciones", 1)
                analistas = ", ".join(comp.get("analistas", []))
                consenso = comp.get("nivel_consenso", "Neutral")
                soporte = comp.get("soporte", "N/D")
                resistencia = comp.get("resistencia", "N/D")
                recomendacion = comp.get("recomendacion", "")
                tesis = comp.get("tesis", "")

                # Fila de Título de la Empresa
                pdf.set_font(font, "B", 9)
                pdf.set_text_color(15, 23, 42)
                header_text = f"{nombre} ({ticker})  |  Menciones: {menciones}  |  Consenso: {consenso}"
                pdf.cell(190, 6, header_text, border="T", ln=True)

                pdf.set_font(font, "", 8)
                pdf.set_text_color(71, 85, 105)
                pdf.cell(190, 5, f"Analistas: {analistas}   •   Soporte: {soporte}   •   Resistencia: {resistencia}", ln=True)
                
                if recomendacion:
                    pdf.set_font(font, "B", 8)
                    pdf.set_text_color(30, 58, 138)
                    pdf.cell(190, 5, f"Estrategia sugerida: {recomendacion}", ln=True)

                if tesis:
                    pdf.set_font(font, "", 8)
                    pdf.set_text_color(51, 65, 85)
                    pdf.multi_cell(190, 4.5, tesis)

                pdf.ln(2)

        # Bloque 1: Valores Nacionales
        nacionales = empresas_data.get("nacionales", [])
        render_company_block("Bloque A: Valores Nacionales (IBEX 35 / Mercado Continuo)", nacionales)
        pdf.ln(4)

        # Bloque 2: Valores Internacionales
        internacionales = empresas_data.get("internacionales", [])
        render_company_block("Bloque B: Valores Internacionales (Nasdaq, DAX, NYSE, etc.)", internacionales)

        # Guardar archivo PDF
        pdf.output(str(pdf_path))
        logger.info(f"Informe PDF generado con éxito en: {pdf_path}")
        return pdf_path
