import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from config import PDF_DIR

logger = logging.getLogger(__name__)

# Dimensiones A4 estándar en mm
PAGE_WIDTH = 210
PAGE_HEIGHT = 297
MARGIN = 12
PRINT_WIDTH = PAGE_WIDTH - (MARGIN * 2)  # 186 mm
RIGHT_MARGIN_X = MARGIN + PRINT_WIDTH    # 198 mm

class StoxxxPDF(FPDF):
    """Clase personalizada FPDF para informes financieros profesionales con maquetación estricta de márgenes."""

    def __init__(self, date_str: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.date_str = date_str
        self.set_margins(MARGIN, MARGIN, MARGIN)
        self.setup_fonts()
        self.set_auto_page_break(auto=True, margin=15)

    def setup_fonts(self):
        """Configura fuentes TrueType Unicode para soportar el símbolo del euro y caracteres españoles."""
        font_candidates = [
            (
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
            ),
            (
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
            ),
            (
                "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf",
            ),
        ]

        self.font_family = "Helvetica"
        for regular, bold, italic, bold_italic in font_candidates:
            if os.path.exists(regular) and os.path.exists(bold):
                try:
                    self.add_font("StoxxxFont", "", regular)
                    self.add_font("StoxxxFont", "B", bold)
                    if os.path.exists(italic):
                        self.add_font("StoxxxFont", "I", italic)
                    else:
                        self.add_font("StoxxxFont", "I", regular)
                    if os.path.exists(bold_italic):
                        self.add_font("StoxxxFont", "BI", bold_italic)
                    else:
                        self.add_font("StoxxxFont", "BI", bold)
                    self.font_family = "StoxxxFont"
                    break
                except Exception as e:
                    logger.debug(f"No se pudo cargar la fuente {regular}: {e}")

    def header(self):
        if self.page_no() == 1:
            return  # La primera página tiene su propia cabecera de portada
        self.set_font(self.font_family, "B", 8)
        self.set_text_color(100, 116, 139) # Slate 500
        self.set_x(MARGIN)
        self.cell(PRINT_WIDTH, 6, f"STOXXX FINANCIAL INTELLIGENCE | INFORME BURSÁTIL ({self.date_str})", border=0, align="L")
        self.ln(7)
        self.set_draw_color(226, 232, 240)
        self.line(MARGIN, self.get_y(), RIGHT_MARGIN_X, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font(self.font_family, "", 8)
        self.set_text_color(148, 163, 184)
        self.set_x(MARGIN)
        self.cell(110, 8, "Informe automatizado bajo demanda. No constituye recomendación financiera.", align="L")
        self.cell(PRINT_WIDTH - 110, 8, f"Página {self.page_no()} de {{nb}}", align="R")


class PDFReportGenerator:
    """Generador de informes financieros maquetados en formato PDF con diseño editorial y márgenes estrictos."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or PDF_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, report_data: Dict[str, Any], date_str: str) -> Path:
        """Renderiza los datos estructurados en un documento PDF profesional sin desbordamientos de márgenes."""
        pdf_path = self.output_dir / f"informe-{date_str}.pdf"
        pdf = StoxxxPDF(date_str)
        pdf.alias_nb_pages()
        pdf.add_page()

        font = pdf.font_family

        # === CABECERA PRINCIPAL (PORTADA) ===
        pdf.set_fill_color(15, 23, 42) # Slate 900
        pdf.rect(MARGIN, MARGIN, PRINT_WIDTH, 26, "F")

        pdf.set_xy(MARGIN + 5, MARGIN + 4)
        pdf.set_font(font, "B", 16)
        pdf.set_text_color(248, 250, 252) # White
        pdf.cell(PRINT_WIDTH - 10, 8, "STOXXX FINANCIAL REPORT", ln=True)

        pdf.set_xy(MARGIN + 5, MARGIN + 14)
        pdf.set_font(font, "", 8.5)
        pdf.set_text_color(148, 163, 184) # Slate 400
        pdf.cell(PRINT_WIDTH - 10, 6, f"Consenso de Consultorios de Bolsa & Análisis Cuantitativo | Fecha: {date_str}", ln=True)

        pdf.set_xy(MARGIN, 42)

        # Sentimiento general badge
        sentimiento = report_data.get("sentimiento_general", "Neutral")
        pdf.set_font(font, "B", 9.5)
        pdf.set_fill_color(241, 245, 249) # Slate 100
        pdf.set_text_color(30, 41, 59)
        pdf.cell(50, 8, "SENTIMIENTO GLOBAL:", border=1, fill=True, align="L")
        
        # Color según sentimiento
        if "Alcista" in sentimiento:
            pdf.set_text_color(16, 185, 129) # Verde
        elif "Bajista" in sentimiento:
            pdf.set_text_color(239, 68, 68) # Rojo
        else:
            pdf.set_text_color(245, 158, 11) # Ámbar

        pdf.cell(PRINT_WIDTH - 50, 8, f" {sentimiento.upper()}", border=1, ln=True, align="L")
        pdf.ln(5)

        # Helper para imprimir viñetas respetando márgenes
        def print_bullet_block(items: List[str], prefix_label: str = ""):
            if prefix_label:
                pdf.set_x(MARGIN)
                pdf.set_font(font, "B", 9)
                pdf.set_text_color(15, 23, 42)
                pdf.cell(PRINT_WIDTH, 5, prefix_label, ln=True)
            pdf.set_font(font, "", 8.5)
            pdf.set_text_color(51, 65, 85)
            for it in items:
                clean = it.lstrip("•-0123456789. ").strip()
                if clean:
                    pdf.set_x(MARGIN)
                    pdf.multi_cell(PRINT_WIDTH, 4.5, f"•  {clean}")
            pdf.ln(2.5)

        # === 1. RESUMEN EJECUTIVO ===
        resumen = report_data.get("resumen_ejecutivo", {})
        pdf.set_x(MARGIN)
        pdf.set_font(font, "B", 11.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(PRINT_WIDTH, 7, "1. RESUMEN EJECUTIVO (Lectura rápida: 3-5 minutos)", ln=True)
        pdf.set_draw_color(59, 130, 246) # Blue 500
        pdf.line(MARGIN, pdf.get_y(), RIGHT_MARGIN_X, pdf.get_y())
        pdf.ln(3)

        sintesis = resumen.get("sintesis_sentimiento", "")
        if sintesis:
            lines = [l for l in sintesis.split("\n") if l.strip()]
            print_bullet_block(lines, "Síntesis del Mercado:")

        hacia_donde = resumen.get("hacia_donde_apuntan", "")
        if hacia_donde:
            lines = [l for l in hacia_donde.split("\n") if l.strip()]
            print_bullet_block(lines, "Hacia dónde apuntan los analistas:")

        puntos_consenso = resumen.get("puntos_clave_consenso", [])
        if puntos_consenso:
            print_bullet_block(puntos_consenso, "Puntos de mayor consenso:")

        # === 2. SENTIMIENTO DE MERCADO Y VISIÓN MACRO ===
        macro = report_data.get("sentimiento_macro", {})
        pdf.set_x(MARGIN)
        pdf.set_font(font, "B", 11.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(PRINT_WIDTH, 7, "2. SENTIMIENTO DE MERCADO Y VISIÓN MACRO", ln=True)
        pdf.set_draw_color(59, 130, 246)
        pdf.line(MARGIN, pdf.get_y(), RIGHT_MARGIN_X, pdf.get_y())
        pdf.ln(3)

        situacion = macro.get("situacion_global", "")
        if situacion:
            lines = [l for l in situacion.split("\n") if l.strip()]
            print_bullet_block(lines, "Situación Global & Citas de los Analistas:")

        # Tabla de Índices (Ancho total = 186 mm)
        indices = macro.get("indices", [])
        if indices:
            pdf.set_x(MARGIN)
            pdf.set_font(font, "B", 8)
            pdf.set_fill_color(226, 232, 240) # Slate 200
            pdf.set_text_color(15, 23, 42)
            pdf.cell(38, 7, "Índice", border=1, fill=True)
            pdf.cell(26, 7, "Tendencia", border=1, fill=True)
            pdf.cell(26, 7, "Soporte", border=1, fill=True)
            pdf.cell(26, 7, "Resistencia", border=1, fill=True)
            pdf.cell(70, 7, "Consenso de Analistas", border=1, fill=True, ln=True)

            pdf.set_font(font, "", 7.5)
            for idx in indices:
                pdf.set_x(MARGIN)
                nom = idx.get("nombre", "")
                if idx.get("precio_actual"):
                    nom = f"{nom} ({idx.get('precio_actual')})"
                pdf.cell(38, 6, nom[:24], border=1)
                pdf.cell(26, 6, idx.get("tendencia", "")[:16], border=1)
                pdf.cell(26, 6, idx.get("soporte_clave", "")[:16], border=1)
                pdf.cell(26, 6, idx.get("resistencia_clave", "")[:16], border=1)
                consenso_txt = idx.get("consenso_analistas", "")
                pdf.cell(70, 6, (consenso_txt[:44] + "...") if len(consenso_txt) > 44 else consenso_txt, border=1, ln=True)
            pdf.ln(3.5)

        coincidencias = macro.get("coincidencias_estrategia", "")
        if coincidencias:
            lines = [l for l in coincidencias.split("\n") if l.strip()]
            print_bullet_block(lines, "Coincidencias en la estrategia operativa:")

        divergencias = macro.get("divergencias_estrategia", "")
        if divergencias:
            lines = [l for l in divergencias.split("\n") if l.strip()]
            print_bullet_block(lines, "Divergencias detectadas entre analistas:")

        # === 3. ANÁLISIS DE EMPRESAS ===
        pdf.add_page()
        pdf.set_x(MARGIN)
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(PRINT_WIDTH, 8, "3. ANÁLISIS DE EMPRESAS", ln=True)
        pdf.set_draw_color(59, 130, 246)
        pdf.line(MARGIN, pdf.get_y(), RIGHT_MARGIN_X, pdf.get_y())
        pdf.ln(4)

        empresas_data = report_data.get("analisis_empresas", {})

        def render_company_block(title: str, companies: List[Dict[str, Any]]):
            pdf.set_x(MARGIN)
            pdf.set_font(font, "B", 10.5)
            pdf.set_fill_color(241, 245, 249) # Slate 100
            pdf.set_text_color(30, 41, 59)
            pdf.cell(PRINT_WIDTH, 7, f"  {title.upper()}", border=1, fill=True, ln=True)
            pdf.ln(2.5)

            if not companies:
                pdf.set_x(MARGIN)
                pdf.set_font(font, "I", 8.5)
                pdf.cell(PRINT_WIDTH, 6, "No se registraron menciones en este bloque.", ln=True)
                pdf.ln(2)
                return

            for comp in companies:
                # Comprobar salto de página si queda poco espacio
                if pdf.get_y() > 235:
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

                # 1. Cabecera de la Empresa (Nombre + Ticker a la izquierda, Menciones y Cotización a la derecha)
                pdf.set_x(MARGIN)
                pdf.set_font(font, "B", 9)
                pdf.set_text_color(15, 23, 42)
                ticker_str = f" ({ticker})" if ticker else ""
                left_title = f"{nombre}{ticker_str}"
                
                precio_info = f" | Cotiz: {comp.get('precio_actual')} ({comp.get('variacion_dia')})" if comp.get("precio_actual") else ""
                right_meta = f"Menciones: {menciones}{precio_info}"

                pdf.cell(100, 6, left_title, border="T", align="L")
                pdf.set_font(font, "B", 8)
                pdf.set_text_color(71, 85, 105)
                pdf.cell(PRINT_WIDTH - 100, 6, right_meta, border="T", align="R", ln=True)

                # 2. Consenso y Niveles Clave (multi_cell para evitar desbordes)
                pdf.set_x(MARGIN)
                pdf.set_font(font, "", 8)
                pdf.set_text_color(30, 41, 59)
                pdf.multi_cell(PRINT_WIDTH, 4.5, f"Consenso: {consenso}   •   Soporte: {soporte}   •   Resistencia: {resistencia}")

                # 3. Analistas (multi_cell para envolver si son muchos)
                if analistas:
                    pdf.set_x(MARGIN)
                    pdf.set_font(font, "I", 7.5)
                    pdf.set_text_color(100, 116, 139)
                    pdf.multi_cell(PRINT_WIDTH, 4, f"Analistas: {analistas}")

                # 4. Recomendación / Estrategia
                if recomendacion:
                    pdf.set_x(MARGIN)
                    pdf.set_font(font, "B", 8)
                    pdf.set_text_color(30, 58, 138)
                    pdf.multi_cell(PRINT_WIDTH, 4.5, f"Estrategia sugerida: {recomendacion}")

                # 5. Tesis
                if tesis:
                    pdf.set_x(MARGIN)
                    pdf.set_font(font, "", 8)
                    pdf.set_text_color(51, 65, 85)
                    pdf.multi_cell(PRINT_WIDTH, 4.2, f"Tesis: {tesis}")

                pdf.ln(3)

        # Bloque A: Valores Nacionales
        nacionales = empresas_data.get("nacionales", [])
        render_company_block("Bloque A: Valores Nacionales (IBEX 35 / Mercado Continuo)", nacionales)
        pdf.ln(3)

        # Bloque B: Valores Internacionales
        internacionales = empresas_data.get("internacionales", [])
        render_company_block("Bloque B: Valores Internacionales (Nasdaq, DAX, NYSE, etc.)", internacionales)

        # === 4. FUENTES CONSULTADAS Y REFERENCIAS ===
        pdf.add_page()
        pdf.set_x(MARGIN)
        pdf.set_font(font, "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(PRINT_WIDTH, 8, "4. FUENTES CONSULTADAS Y REFERENCIAS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(59, 130, 246)
        pdf.line(MARGIN, pdf.get_y(), RIGHT_MARGIN_X, pdf.get_y())
        pdf.ln(3)

        pdf.set_font(font, "", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.set_x(MARGIN)
        pdf.multi_cell(
            PRINT_WIDTH, 4.2,
            "Relación completa de consultorios de bolsa, emisiones audiovisuales y análisis técnicos analizados "
            "exhaustivamente para la extracción de consensos, niveles operativos de soporte/resistencia y recomendaciones estratégicas.",
            new_x=XPos.LMARGIN, new_y=YPos.NEXT
        )
        pdf.ln(3)

        fuentes = report_data.get("fuentes_consultadas", [])
        for i, fuente in enumerate(fuentes, 1):
            if pdf.get_y() > 240:
                pdf.add_page()

            titulo = fuente.get("title", f"Fuente audiovisual #{i}")
            canal = fuente.get("channel", "Canal Especializado")
            fecha = fuente.get("date_formatted", fuente.get("upload_date", "Fecha reciente"))
            url = fuente.get("url", "")
            chars = fuente.get("char_count", 0)
            status = fuente.get("status", "Transcrito completo")
            chars_str = f"{chars:,} caracteres".replace(",", ".") if chars else "Verificado"

            # Fila de cabecera de la fuente (Canal a la izq, Fecha y Estado a la dcha)
            pdf.set_x(MARGIN)
            pdf.set_font(font, "B", 7.5)
            pdf.set_fill_color(241, 245, 249) # Slate 100
            pdf.set_text_color(30, 41, 59)
            
            canal_text = f"  [{canal.upper()}]"
            meta_text = f"{fecha}  •  {status} ({chars_str})  "
            
            pdf.cell(100, 5.5, canal_text, border=1, fill=True)
            pdf.cell(PRINT_WIDTH - 100, 5.5, meta_text, border=1, fill=True, align="R", ln=True)

            # Título del vídeo
            pdf.set_x(MARGIN)
            pdf.set_font(font, "B", 8)
            pdf.set_text_color(15, 23, 42)
            pdf.multi_cell(PRINT_WIDTH, 4.2, f"• {titulo}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

            # Enlace URL si está disponible
            if url:
                pdf.set_x(MARGIN)
                pdf.set_font(font, "", 7)
                pdf.set_text_color(37, 99, 235) # Blue 600
                pdf.cell(PRINT_WIDTH, 4, f"   YouTube: {url}", link=url, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

            desc = fuente.get("description", "")
            if desc:
                pdf.set_x(MARGIN)
                pdf.set_font(font, "I", 7)
                pdf.set_text_color(100, 116, 139)
                pdf.multi_cell(PRINT_WIDTH, 3.8, f"   Temas: {desc}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

            pdf.ln(2.5)

        # Resumen metodológico al pie
        if pdf.get_y() > 250:
            pdf.add_page()
        pdf.ln(2)
        pdf.set_font(font, "I", 7)
        pdf.set_text_color(148, 163, 184)
        pdf.set_x(MARGIN)
        pdf.multi_cell(
            PRINT_WIDTH, 3.8,
            "Nota metodológica: STOXXX procesa de forma cruzada las transcripciones textuales completas de los consultorios "
            "citados mediante modelos de lenguaje avanzados y algoritmos de quórum, contrastando los niveles técnicos "
            "directamente contra las cotizaciones en tiempo real del mercado.",
            new_x=XPos.LMARGIN, new_y=YPos.NEXT
        )

        # Guardar archivo PDF
        pdf.output(str(pdf_path))
        logger.info(f"Informe PDF generado con éxito en: {pdf_path}")
        return pdf_path
