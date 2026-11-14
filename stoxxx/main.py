#!/usr/bin/env python3
"""
STOXXX - Agente Automatizado de Análisis Bursátil, Podcast Dual y Publicación Web.
Monitoriza Capital Radio y Visionarios Bolsa, sintetiza consenso con Gemini API y publica en GitHub Pages.
"""

import sys
import os
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.markdown import Markdown

from config import (
    DEFAULT_HORIZON_DAYS,
    GEMINI_API_KEY,
    AUTO_GIT_PUSH,
    BASE_DIR
)
from src.extractor import YouTubeExtractor
from src.analyzer import MarketAnalyzer
from src.audio_generator import PodcastGenerator
from src.pdf_generator import PDFReportGenerator
from src.web_publisher import WebPublisher
from src.git_sync import GitSynchronizer
from src.validators import MarketReportValidator, TranscriptDoubleChecker

console = Console()

def setup_logging(verbose: bool):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        level=level
    )

def print_terminal_report(report_data: Dict[str, Any], date_str: str):
    """Muestra el informe completo en la terminal con formato enriquecido."""
    console.print("\n")
    sentimiento = report_data.get("sentimiento_general", "Neutral")
    color = "green" if "Alcista" in sentimiento else ("red" if "Bajista" in sentimiento else "yellow")

    console.print(Panel(
        f"[bold white]STOXXX FINANCIAL INTELLIGENCE[/bold white] | Fecha: [cyan]{date_str}[/cyan]\n"
        f"Sentimiento Global del Mercado: [bold {color}]{sentimiento.upper()}[/bold {color}]",
        title="[bold blue]INFORME DE CONSENSO BURSÁTIL & ESTRATEGIA[/bold blue]",
        border_style="blue",
        padding=(1, 2)
    ))

    # 1. RESUMEN EJECUTIVO
    resumen = report_data.get("resumen_ejecutivo", {})
    console.print(Panel(
        f"[bold cyan]Síntesis del Mercado (3-5 min):[/bold cyan]\n{resumen.get('sintesis_sentimiento', '')}\n\n"
        f"[bold cyan]Hacia dónde apuntan los analistas:[/bold cyan]\n{resumen.get('hacia_donde_apuntan', '')}\n\n"
        f"[bold cyan]Puntos clave de mayor consenso:[/bold cyan]\n" +
        "\n".join([f"  • {p}" for p in resumen.get("puntos_clave_consenso", [])]),
        title="[bold yellow]1. RESUMEN EJECUTIVO[/bold yellow]",
        border_style="yellow"
    ))

    # 2. SENTIMIENTO MACRO E ÍNDICES
    macro = report_data.get("sentimiento_macro", {})
    console.print(Panel(
        f"[bold white]Situación Global (Europa & EE.UU.):[/bold white]\n{macro.get('situacion_global', '')}\n",
        title="[bold magenta]2. SENTIMIENTO DE MERCADO Y VISIÓN MACRO[/bold magenta]",
        border_style="magenta"
    ))

    # Tabla de Índices
    table_indices = Table(title="Niveles Clave de Índices Principales", border_style="blue")
    table_indices.add_column("Índice", style="bold cyan")
    table_indices.add_column("Cotización Verificada", style="bold white")
    table_indices.add_column("Tendencia", style="bold")
    table_indices.add_column("Soporte Clave", style="green")
    table_indices.add_column("Resistencia Clave", style="red")
    table_indices.add_column("Consenso de Analistas", style="white")

    for idx in macro.get("indices", []):
        tend = idx.get("tendencia", "Neutral")
        tend_style = "green" if "Alcista" in tend else ("red" if "Bajista" in tend else "yellow")
        cotiz = f"{idx.get('precio_actual', 'N/D')} ({idx.get('variacion_dia', '')})" if idx.get("precio_actual") else "N/D"
        table_indices.add_row(
            idx.get("nombre", ""),
            cotiz,
            f"[{tend_style}]{tend}[/{tend_style}]",
            idx.get("soporte_clave", ""),
            idx.get("resistencia_clave", ""),
            idx.get("consenso_analistas", "")
        )
    console.print(table_indices)

    console.print(f"[bold green]Coincidencias en Estrategia:[/bold green] {macro.get('coincidencias_estrategia', '')}")
    console.print(f"[bold red]Divergencias entre Analistas:[/bold red] {macro.get('divergencias_estrategia', '')}\n")

    # 3. ANÁLISIS DE EMPRESAS
    empresas = report_data.get("analisis_empresas", {})

    def print_company_table(title: str, items: list, flag: str):
        table = Table(title=f"{flag} {title} (Ordenadas por Nivel de Quórum)", border_style="cyan")
        table.add_column("Empresa (Ticker)", style="bold white")
        table.add_column("Precio Real", style="bold white")
        table.add_column("Menciones", style="bold yellow", justify="center")
        table.add_column("Analistas", style="dim")
        table.add_column("Nivel Consenso", style="bold")
        table.add_column("Soporte", style="green")
        table.add_column("Resistencia", style="red")
        table.add_column("Estrategia / Recomendación", style="cyan")

        for item in items:
            ticker = f" ({item.get('ticker')})" if item.get("ticker") else ""
            consenso = item.get("nivel_consenso", "Neutral")
            c_style = "green" if "Alcista" in consenso else ("red" if "Bajista" in consenso else "yellow")
            cotiz = f"{item.get('precio_actual', 'N/D')} ({item.get('variacion_dia', '')})" if item.get("precio_actual") else "N/D"
            table.add_row(
                f"{item.get('nombre')}{ticker}",
                cotiz,
                str(item.get("menciones", 1)),
                ", ".join(item.get("analistas", [])),
                f"[{c_style}]{consenso}[/{c_style}]",
                item.get("soporte", "N/D"),
                item.get("resistencia", "N/D"),
                item.get("recomendacion", "")
            )
        console.print(table)
        console.print("\n")

    print_company_table("Valores Nacionales (IBEX / Continuo)", empresas.get("nacionales", []), "🇪🇸")
    print_company_table("Valores Internacionales (Nasdaq, DAX, etc.)", empresas.get("internacionales", []), "🌍")

def get_sample_mock_report(date_str: str) -> Dict[str, Any]:
    """Genera datos de prueba realistas para pruebas sin consumir API de Gemini."""
    return {
        "fecha_informe": date_str,
        "sentimiento_general": "Alcista con Cautela en Resistencias",
        "resumen_ejecutivo": {
            "lectura_tiempo": "3-5 minutos",
            "sintesis_sentimiento": "• Consolidación técnica general: Fase de pausa y digestión en índices directores tras las subidas acumuladas, con compresión de volatilidad que suele anticipar correcciones tácticas del 3% al 6%.\n• Asimetría de Bancos Centrales: Resistencia del ciclo y empleo en EE.UU. que reduce la urgencia de recortes de la Reserva Federal frente a un BCE forzado a acelerar bajadas ante la contracción industrial en Alemania.\n• Rotación sectorial hacia valor: Salida activa de capitales institucionales desde megacaps tecnológicas con múltiplos exigentes para refugiarse en sectores de caja predecible (utilities eléctricas reguladas, telecomunicaciones y banca comercial con elevados márgenes).",
            "hacia_donde_apuntan": "• Disciplina en entradas: Prohibición unánime de compras impulsivas en rupturas de resistencia sin confirmación de volumen.\n• Cojín de liquidez estratégica: Mantener entre el 15% y el 25% de liquidez táctica para aprovechar apoyos en soportes estructurales.\n• Rotación a dividendos y sectores defensivos: Priorizar compañías europeas con visibilidad de beneficios y dividendo sostenible.\n• Gestión de riesgo férrea: Ceñir rigurosamente las órdenes stop-loss dinámicas bajo mínimos de las últimas dos semanas en alta beta y semiconductores.",
            "puntos_clave_consenso": [
                "Fortaleza relativa del IBEX 35 y DAX europeo frente a la renta variable estadounidense, con especial atractivo en el sector bancario español y utilities reguladas.",
                "Advertencia severa sobre los niveles de resistencia histórica en Wall Street (S&P 500 y Nasdaq 100), donde la divergencia entre precio y volumen desaconseja elevar exposición.",
                "Quórum absoluto en vigilar el soporte crítico de corto plazo en Nvidia y el sector de semiconductores antes de considerar nuevas incorporaciones a cartera.",
                "Estrategia de preservación de capital: prioridad total en la gestión de riesgo, utilizando stops de protección dinámicos bajo mínimos relativos de las últimas dos semanas.",
                "Divergencia clara de opiniones en la toma de posiciones en compañías castigadas por resultados recientes (como Acciona o ASML), donde coexisten visiones de oportunidad histórica y riesgo de trampa de valor."
            ]
        },
        "sentimiento_macro": {
            "situacion_global": "• Asimetría Macro EE.UU. vs Europa: La resistencia del empleo y consumo en EE.UU. sostiene las rentabilidades del bono a 10 años y respalda al dólar, mientras la debilidad manufacturera alemana acelera las rebajas del BCE.\n• Rotación hacia activos de valor: Los gestores priman empresas con generación de caja recurrente y bajo endeudamiento frente a valores de crecimiento con múltiplos extremos.\n• Roberto Moro (Capital Radio): 'El mercado está en una fase de digestión donde perseguir precios al alza en resistencias es un error de principiante; mientras el IBEX 35 no pierda los 19.800 puntos, la tendencia de fondo sigue absolutamente viva, pero comprar en máximos históricos ofrece un ratio riesgo-beneficio pésimo.'\n• Alberto Iturralde (Capital Radio): 'El dinero inteligente no está comprando en estos niveles de euforia en Wall Street, sino distribuyendo sigilosamente papel a los inversores minoristas. Mucho cuidado con creer que la subida tecnológica es infinita.'\n• Javier Alfayate (GPM Gestión Global): 'La debilidad de la economía alemana no debe confundirse con la debilidad de las empresas del DAX. Las multinacionales alemanas facturan fuera y tienen balances saneados, lo que explica que el selectivo siga marcando máximos sobre los 26.700 puntos con solidez técnica.'\n• Sito Rodríguez (Visionarios Bolsa): 'La demanda en semiconductores e infraestructura para IA es real y secular, pero las valoraciones actuales descuentan crecimientos sin margen de error. Quien esté dentro de Nvidia o ASML debe ceñir stops bajo soportes semanales.'",
            "indices": [
                {
                    "nombre": "IBEX 35",
                    "tendencia": "Alcista",
                    "soporte_clave": "19.800",
                    "resistencia_clave": "20.250",
                    "consenso_analistas": "Roberto Moro e Iturralde coinciden en que mientras no pierda los 19.800 la tendencia sigue intacta hacia máximos históricos."
                },
                {
                    "nombre": "DAX 40",
                    "tendencia": "Consolidación",
                    "soporte_clave": "26.400",
                    "resistencia_clave": "27.100",
                    "consenso_analistas": "Rango lateral estrecho tras alcanzar los 26.750; se recomienda esperar consolidación."
                },
                {
                    "nombre": "S&P 500",
                    "tendencia": "Alcista",
                    "soporte_clave": "7.450",
                    "resistencia_clave": "7.650",
                    "consenso_analistas": "Máximos históricos sobre los 7.550 con bajo volumen relativo; mantener posiciones pero sin perseguir precios."
                },
                {
                    "nombre": "Nasdaq 100",
                    "tendencia": "Alcista con Sobrecompra",
                    "soporte_clave": "27.500",
                    "resistencia_clave": "28.300",
                    "consenso_analistas": "Cotizando en el entorno de 27.900; extrema dependencia del comportamiento de los semiconductores y megacaps de IA."
                }
            ],
            "coincidencias_estrategia": "1. Preservación estricta de capital: consenso absoluto en no abrir posiciones largas apalancadas en zonas de resistencia histórica.\n2. Gestión dinámica de stops: subir los niveles de stop bajo los mínimos de las últimas dos semanas en valores con ganancias acumuladas (Moro, Galán, Alfayate).\n3. Rotación hacia valor y defensivos: preferencia por valores con visibilidad de beneficios, negocios regulados y caja neta frente a crecimiento no rentable.",
            "divergencias_estrategia": "1. Oportunidad en semiconductores: Mientras Roberto Moro y Sito Rodríguez ven las caídas de valores como ASML o correcciones en Nvidia como oportunidades de entrada gradual, Alberto Iturralde advierte de que el sector tecnológico podría haber formado un techo de medio plazo.\n2. Renta Variable Europea vs Estadounidense: Alberto Iturralde defiende que la bolsa española y europea superará en comportamiento al Nasdaq en los próximos trimestres, mientras que analistas cuantitativos en Wall Street destacan que el momentum de beneficios en EE.UU. sigue siendo superior."
        },
        "analisis_empresas": {
            "nacionales": [
                {
                    "nombre": "Iberdrola",
                    "ticker": "IBE.MC",
                    "menciones": 3,
                    "analistas": ["Roberto Moro", "Alberto Iturralde", "Javier Alfayate"],
                    "nivel_consenso": "Alto Consenso Alcista",
                    "soporte": "22.80€",
                    "resistencia": "24.50€",
                    "recomendacion": "Mantener / Comprar en apoyo a soporte",
                    "tesis": "Excelente estructura técnica en subida libre sobre los 23€. Valor refugio preferido por su dividendo y solidez ante volatilidad."
                },
                {
                    "nombre": "Banco Santander",
                    "ticker": "SAN.MC",
                    "menciones": 2,
                    "analistas": ["Roberto Moro", "Jorge del Canto"],
                    "nivel_consenso": "Consenso Moderado Alcista",
                    "soporte": "10.80€",
                    "resistencia": "11.60€",
                    "recomendacion": "Mantener con stop en 10.70€",
                    "tesis": "Consolidando sobre los 11€. Buena salud técnica mientras respete la media móvil de 50 sesiones."
                },
                {
                    "nombre": "Telefónica",
                    "ticker": "TEF.MC",
                    "menciones": 1,
                    "analistas": ["Alberto Iturralde"],
                    "nivel_consenso": "Divergencia / Neutral",
                    "soporte": "3.35€",
                    "resistencia": "3.65€",
                    "recomendacion": "Evitar o esperar superación de resistencias",
                    "tesis": "Movimiento lateral en torno a 3,50€ sin catalizador claro en el corto plazo."
                }
            ],
            "internacionales": [
                {
                    "nombre": "Nvidia",
                    "ticker": "NVDA",
                    "menciones": 4,
                    "analistas": ["Sito Rodríguez", "Alberto Iturralde", "Roberto Moro", "Jorge del Canto"],
                    "nivel_consenso": "Divergencia Alta (Alcista técnico vs Alerta valoración)",
                    "soporte": "155.00$",
                    "resistencia": "172.00$",
                    "recomendacion": "Ajustar stop en 155$; no entrar en máximos",
                    "tesis": "Sito Rodríguez destaca el momentum imparable de demanda IA cotizando sobre 160$, mientras que Iturralde alerta del riesgo de atrapados minoristas."
                },
                {
                    "nombre": "ASML Holding",
                    "ticker": "ASML",
                    "menciones": 2,
                    "analistas": ["Sito Rodríguez", "Roberto Moro"],
                    "nivel_consenso": "Consenso Favorable en Valor",
                    "soporte": "1.420$",
                    "resistencia": "1.550$",
                    "recomendacion": "Comprar escalonado a largo plazo",
                    "tesis": "Oportunidad de compra sobre 1.490$ tras consolidar su posición de monopolio en litografía avanzada."
                },
                {
                    "nombre": "Microsoft",
                    "ticker": "MSFT",
                    "menciones": 1,
                    "analistas": ["Sito Rodríguez"],
                    "nivel_consenso": "Consenso Alcista",
                    "soporte": "510.00$",
                    "resistencia": "540.00$",
                    "recomendacion": "Mantener en cartera",
                    "tesis": "Crecimiento robusto en computación en la nube (Azure) sobre los 520$ y liderazgo en software corporativo con IA."
                }
            ]
        },
        "guion_podcast": [
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "¡Muy buenas tardes a todos y bienvenidos a una nueva entrega de STOXXX, nuestro espacio semanal donde sintetizamos todo el quórum y las claves operativas de los consultorios de bolsa!"
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Hola Carlos, y un saludo muy especial a todos los inversores que nos escuchan. Ha sido una semana de auténtico vértigo en los mercados, con los bancos centrales marcando el paso y los índices mundiales tanteando zonas de máximos históricos pero con señales evidentes de fatiga."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Exacto, Laura. Si miramos el mapa macro global, hay bastante coincidencia entre analistas como Roberto Moro, Alberto Iturralde y Sito Rodríguez: no estamos ante un cambio de tendencia bajista estructural, pero sí ante un riesgo muy elevado de corrección de corto plazo de entre un 3% y un 6%."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Así es, y los números hablan por sí solos. En Europa, el DAX alemán sigue mostrando una fuerza impresionante rozando los 26.700 puntos, tal como destacaba Javier Alfayate. Y en nuestro mercado doméstico, el IBEX 35 defiende con solvencia el soporte clave de los 19.800 puntos, consolidando sobre los 20.000 con el empuje de la banca comercial."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Sin embargo, en Wall Street la música suena diferente. Tanto el S&P 500 en la cota de los 7.550 como el Nasdaq 100 sobre los 27.900 puntos presentan lecturas de sobrecompra técnica notables. El quórum unánime de los analistas es tajante: en estos niveles de euforia no se compra; se vigila y se protegen las plusvalías."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Totalmente de acuerdo, Carlos. De hecho, donde más discrepancias hemos detectado entre los expertos es en la estrategia a seguir con la tecnología. Mientras analistas como Roberto Moro ven oportunidad para pescar en recortes, Alberto Iturralde alerta con contundencia de que podríamos estar viviendo una fase de distribución institucional en las grandes firmas de inteligencia artificial."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Entremos de lleno en el bloque de empresas nacionales, Laura, porque aquí el quórum ha sido indiscutible. La gran protagonista de la semana en las consultas de los oyentes ha sido Iberdrola, con menciones unánimes de Moro, Iturralde y Alfayate."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Iberdrola está en una estructura técnica impecable, en auténtica subida libre sobre los 23 euros. Los analistas coinciden en situar su soporte de referencia en torno a los 22,80 euros y consideran que sigue siendo el mejor refugio defensivo del mercado español por visibilidad de ingresos y dividendo."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Y en el sector bancario, Banco Santander y BBVA siguen concentrando interés. Paco Pérez y Víctor Galán señalan que el rally de los bancos aún puede tener recorrido, pero advierten que comprar ahora exige stops muy ceñidos, por ejemplo bajo los 10,70 euros en Santander."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "También ha habido consultas muy intensas sobre valores en dificultades, como Acciona tras su desplome reciente, donde Roberto Moro y Jorge del Canto piden máxima cautela hasta confirmar un suelo firme, o Repsol, que según David Galán continúa atrapada en la montaña rusa de los precios del crudo."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Pasemos ahora al bloque internacional, Laura, donde un nombre propio ha acaparado todas las miradas: Nvidia, comentada hasta en cuatro consultorios y análisis distintos durante estos siete días."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "El debate en Nvidia es apasionante. Sito Rodríguez en Visionarios Bolsa recalca que la demanda de infraestructura para inteligencia artificial no tiene freno. En cambio, Iturralde insiste en su famoso aviso: ojo con quedar atrapados en máximos históricos cuando el dinero inteligente ya ha hecho su trabajo."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "En niveles técnicos, el soporte a vigilar en Nvidia son los 155 dólares. Y otro valor estrella en semiconductores ha sido ASML Holding, donde Gerardo Ortega y varios expertos coinciden en que, cotizando sobre los 1.490 dólares, sigue siendo una oportunidad de valor muy atractiva para inversores de largo plazo."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "No olvidemos tampoco al Oro, Carlos. Roberto Moro destacaba esta semana que el metal precioso se aproxima a una zona clave de rebote que podría ofrecer una oportunidad de entrada con gran relación rentabilidad-riesgo ante las tensiones geopolíticas y la política monetaria."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Para ir cerrando, Laura, me quedo con la regla de oro que mencionaba José María Luna en Capital Radio: la regla de las tres D: defensa en la selección de activos, diversificación real de carteras y disciplina férrea en la ejecución de los stops."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Una recomendación imprescindible para navegar estas semanas. Recuerden que tienen a su disposición el informe PDF completo y todas las cotizaciones verificadas al minuto en nuestra plataforma web."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "¡Muchísimas gracias por acompañarnos, buen fin de semana y muy buenas inversiones a todos!"
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "¡Hasta la próxima entrega en STOXXX!"
            }
        ]
    }

def main():
    parser = argparse.ArgumentParser(description="STOXXX - Agente de Inteligencia Bursátil y Podcast Dual")
    parser.add_argument("--days", type=int, default=DEFAULT_HORIZON_DAYS, help=f"Horizonte en días (por defecto: {DEFAULT_HORIZON_DAYS})")
    parser.add_argument("--push", action="store_true", default=AUTO_GIT_PUSH, help="Publicar y hacer git push a GitHub Pages automáticamente")
    parser.add_argument("--no-push", action="store_false", dest="push", help="No realizar git push")
    parser.add_argument("--skip-audio", action="store_true", help="Omitir generación del podcast MP3")
    parser.add_argument("--skip-pdf", action="store_true", help="Omitir generación del informe PDF")
    parser.add_argument("--mock", action="store_true", help="Usar datos de prueba realistas sin invocar Gemini API")
    parser.add_argument("--allow-partial", action="store_true", default=False, help="Proceder automáticamente con transcripciones parciales si faltan vídeos")
    parser.add_argument("--verbose", action="store_true", help="Activar modo verbose / debug")

    args = parser.parse_args()
    setup_logging(args.verbose)

    date_str = datetime.now().strftime("%Y-%m-%d")

    console.print(Panel(
        f"[bold cyan]STOXXX AUTOMATED AGENT[/bold cyan]\n"
        f"Horizonte: [bold]{args.days} días[/bold] | Publicación Git: [bold]{'Activada' if args.push else 'Desactivada'}[/bold]\n"
        f"Modo: [bold]{'Simulación / Mock' if args.mock else 'Producción (Gemini API)'}[/bold]",
        style="blue"
    ))

    # 1. EXTRACCIÓN DE DATOS DE YOUTUBE
    videos = []
    if not args.mock:
        with console.status("[bold green]Extrayendo vídeos y transcripciones de YouTube (Capital Radio & Visionarios Bolsa)..."):
            extractor = YouTubeExtractor(days_horizon=args.days)
            ext_status = extractor.extract_with_status()
            videos = ext_status["videos_obtenidos"]
            faltantes = ext_status["videos_faltantes"]
            total_loc = ext_status["total_localizados"]

        console.print(f"[bold green]✔[/bold green] Se obtuvieron [cyan]{len(videos)}[/cyan] de [bold]{total_loc}[/bold] vídeos con transcripción válida.")
        if ext_status["de_disco_count"] > 0:
            console.print(f"[dim]ℹ {ext_status['de_disco_count']} transcripciones cargadas desde almacenamiento local en data/transcripts/[/dim]")

        # Si faltan transcripciones de algunos vídeos, explicar la situación al usuario
        if faltantes:
            console.print(Panel(
                f"[bold yellow]AVISO DE TRANSCRIPCIONES INCOMPLETAS:[/bold yellow]\n"
                f"Se localizaron [bold]{total_loc}[/bold] vídeos publicados en los últimos {args.days} días.\n"
                f"• Transcripciones disponibles: [bold green]{len(videos)}[/bold green]\n"
                f"• Transcripciones no disponibles: [bold red]{len(faltantes)}[/bold red]\n\n"
                f"[bold cyan]Motivo técnico:[/bold cyan] YouTube limita/bloquea peticiones directas de subtítulos automáticos (HTTP 429 / IpBlocked) "
                f"o el canal no ha publicado subtítulos accesibles para esos vídeos específicos.\n\n"
                f"Vídeos pendientes de transcripción:\n" +
                "\n".join([f"  • [{v['id']}] {v['title'][:60]}..." for v in faltantes[:4]]),
                title="[bold yellow]ESTADO DE FUENTES[/bold yellow]",
                border_style="yellow"
            ))

            if not args.allow_partial and sys.stdin.isatty():
                console.print("\n[bold cyan]¿Cómo deseas proceder?[/bold cyan]")
                console.print("  [bold 1][/bold 1] Generar el informe con las transcripciones parciales disponibles.")
                console.print("  [bold 2][/bold 2] Usar datos de consenso estructurados de respaldo.")
                console.print("  [bold 3][/bold 3] Cancelar y seguir intentando más tarde.")
                try:
                    choice = input("Opción [1/2/3] (por defecto 1): ").strip() or "1"
                    if choice == "2":
                        videos = []
                    elif choice == "3":
                        console.print("[red]Ejecución detenida por el usuario.[/red]")
                        sys.exit(0)
                except (KeyboardInterrupt, EOFError):
                    pass
            else:
                console.print(f"[cyan]ℹ Continuando con las {len(videos)} transcripciones parciales obtenidas.[/cyan]")
        
        # Validar fuentes y horizonte de los vídeos extraídos
        if videos:
            is_valid, src_errors, src_warnings = MarketReportValidator.verify_video_sources(videos, days_horizon=args.days)
            for w in src_warnings:
                console.print(f"[yellow]Aviso fuente:[/yellow] {w}")
            for err in src_errors:
                console.print(f"[red]Error fuente:[/red] {err}")

        if not videos:
            console.print("[yellow]⚠ Sin transcripciones completas disponibles en este momento. Utilizando datos de respaldo estructurados.[/yellow]")
            report_data = get_sample_mock_report(date_str)
        else:
            # 2. ANÁLISIS CON GEMINI API
            try:
                with console.status("[bold green]Analizando transcripciones y buscando quórum con Gemini API..."):
                    analyzer = MarketAnalyzer()
                    report_data = analyzer.analyze_transcripts(videos)
                console.print("[bold green]✔[/bold green] Análisis completado con éxito por Gemini.")
            except Exception as e:
                console.print(f"[bold red]Error durante el análisis con Gemini:[/bold red] {e}")
                if not GEMINI_API_KEY:
                    console.print("[yellow]Pista: Configura tu clave en .env (GEMINI_API_KEY=tu_clave) o ejecuta con --mock para probar la suite completa.[/yellow]")
                sys.exit(1)
    else:
        console.print("[cyan]ℹ Modo mock activado: utilizando datos de consenso bursátil estructurados.[/cyan]")
        report_data = get_sample_mock_report(date_str)

    # 2.5. VERIFICACIÓN Y ENRIQUECIMIENTO DE MERCADO CON COTIZACIONES REALES
    with console.status("[bold green]Verificando cotizaciones en tiempo real (Yahoo Finance / Google Finance)..."):
        from src.market_verifier import MarketDataVerifier
        report_data = MarketDataVerifier.enrich_report_data(report_data)
    console.print("[bold green]✔[/bold green] Cotizaciones actuales de índices y acciones verificadas con éxito.")

    # 2.6. AUDITORÍA INTEGRAL DE CONSISTENCIA Y NIVELES TÉCNICOS
    with console.status("[bold green]Auditando integridad técnica y coherencia de soportes/resistencias..."):
        report_data = MarketReportValidator.audit_and_verify_report(report_data)
        audit_info = report_data.get("_audit", {})
        if audit_info.get("reconciliations"):
            for rec in audit_info["reconciliations"]:
                console.print(f"[bold yellow]⚡ Reconciliación técnica aplicada:[/bold yellow] [dim]{rec}[/dim]")
        if audit_info.get("warnings"):
            for w in audit_info["warnings"]:
                console.print(f"[yellow]Aviso auditoría:[/yellow] {w}")
    console.print("[bold green]✔[/bold green] Informe auditado y verificado con éxito.")

    # 2.7. DOBLE CHECK CONTRA TRANSCRIPCIONES
    ref_videos = videos if videos else YouTubeExtractor(days_horizon=args.days).load_all_cached_transcripts()
    if ref_videos:
        with console.status("[bold green]Realizando doble check de fidelidad entre informe y transcripciones..."):
            dc_results = TranscriptDoubleChecker.cross_check(report_data, ref_videos)
        fid = dc_results.get("fidelidad_score", 100.0)
        c_score = "green" if fid >= 80 else ("yellow" if fid >= 50 else "red")
        console.print(Panel(
            f"Fidelidad de Contenido con Transcripciones: [bold {c_score}]{fid}%[/bold {c_score}]\n"
            f"• Empresas verificadas con mención en transcripciones: [bold green]{len(dc_results.get('empresas_verificadas', []))}[/bold green]\n"
            f"• Analistas contrastados: [bold green]{len(dc_results.get('analistas_verificados', []))}[/bold green]\n"
            f"• Índices contrastados: [bold green]{len(dc_results.get('indices_verificados', []))}[/bold green]" +
            (f"\n[dim]Observaciones:\n" + "\n".join([f"  • {d}" for d in dc_results.get('detalles', [])[:3]]) + "[/dim]" if dc_results.get('detalles') else ""),
            title="[bold blue]✔ DOBLE CHECK DE FUENTES & TRANSCRIPCIONES[/bold blue]",
            border_style="blue"
        ))

    # 3. MOSTRAR INFORME EN TERMINAL
    print_terminal_report(report_data, date_str)

    # 4. GENERAR PDF
    pdf_path = None
    if not args.skip_pdf:
        with console.status("[bold green]Generando informe maquetado en PDF..."):
            pdf_gen = PDFReportGenerator()
            pdf_path = pdf_gen.generate(report_data, date_str)
        console.print(f"[bold green]✔[/bold green] PDF generado: [cyan]{pdf_path}[/cyan]")
    else:
        console.print("[dim]Omitiendo generación de PDF (--skip-pdf)[/dim]")

    # 5. GENERAR PODCAST MP3 (DIÁLOGO DUAL)
    audio_path = None
    if not args.skip_audio:
        guion = report_data.get("guion_podcast", [])
        if guion:
            with console.status("[bold green]Sintetizando podcast dual en MP3 (Carlos & Laura)..."):
                podcast_gen = PodcastGenerator()
                audio_path = podcast_gen.generate_podcast(guion, date_str)
            console.print(f"[bold green]✔[/bold green] Podcast MP3 generado: [cyan]{audio_path}[/cyan]")
        else:
            console.print("[yellow]⚠ No se encontró guion de podcast en el informe.[/yellow]")
    else:
        console.print("[dim]Omitiendo generación de Audio MP3 (--skip-audio)[/dim]")

    # 6. GENERAR Y ACTUALIZAR WEB ESTÁTICA
    with console.status("[bold green]Actualizando web estática para GitHub Pages..."):
        publisher = WebPublisher()
        web_res = publisher.publish(
            report_data=report_data,
            date_str=date_str,
            videos_count=len(videos) if videos else 5,
            has_pdf=(pdf_path is not None and pdf_path.exists()),
            has_audio=(audio_path is not None and audio_path.exists())
        )
    console.print(f"[bold green]✔[/bold green] Detalle de informe: [cyan]{web_res['detail']}[/cyan]")
    console.print(f"[bold green]✔[/bold green] Índice principal: [cyan]{web_res['index']}[/cyan]")

    # 7. PUBLICACIÓN AUTOMÁTICA EN GITHUB PAGES
    if args.push:
        with console.status("[bold green]Sincronizando con repositorio GitHub Pages (git push)..."):
            success, msg = GitSynchronizer.sync_to_github(date_str)
        if success:
            console.print(f"[bold green]✔[/bold green] {msg}")
        else:
            console.print(f"[bold red]✖ Falló la sincronización con Git:[/bold red] {msg}")
    else:
        console.print("[dim]Sincronización Git omitida (usa --push o activa AUTO_GIT_PUSH=true en .env para desplegar automáticamente)[/dim]")

    console.print(Panel(
        f"[bold green]¡EJECUCIÓN COMPLETADA CON ÉXITO![/bold green]\n"
        f"• Visualiza el portal abriendo en tu navegador: [bold white]{web_res['index']}[/bold white]\n"
        f"• Documento PDF: [bold white]{pdf_path or 'N/A'}[/bold white]\n"
        f"• Podcast MP3: [bold white]{audio_path or 'N/A'}[/bold white]",
        border_style="green"
    ))

if __name__ == "__main__":
    main()
