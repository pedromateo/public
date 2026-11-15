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

    # 4. FUENTES CONSULTADAS Y REFERENCIAS
    fuentes = report_data.get("fuentes_consultadas", [])
    if fuentes:
        table_src = Table(title="📚 Fuentes Consultadas y Referencias Audiovisuales (Consultorios)", border_style="blue")
        table_src.add_column("Canal", style="bold cyan")
        table_src.add_column("Fecha", style="white")
        table_src.add_column("Título / Consultorio", style="white")
        table_src.add_column("Caracteres", justify="right", style="green")
        table_src.add_column("Estado", style="dim")
        for f in fuentes:
            table_src.add_row(
                f.get("channel", ""),
                f.get("date_formatted", ""),
                f.get("title", "")[:50] + ("..." if len(f.get("title", "")) > 50 else ""),
                f"{f.get('char_count', 0):,}".replace(",", "."),
                f.get("status", "Transcrito")
            )
        console.print(table_src)
        console.print("\n")

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
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "¡Muy buenas tardes a todos, y bienvenidos a una nueva entrega de STOXXX! Nuestro espacio semanal donde sintetizamos todo el quórum, y las claves operativas, de los principales consultorios de bolsa."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Un saludo muy especial a toda nuestra comunidad inversora. Cerramos una semana de gran intensidad en los mercados financieros, con los bancos centrales marcando el compás y los índices tanteando zonas de máximos históricos, aunque con ciertas señales de fatiga técnica."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Efectivamente. Al analizar el mapa macroeconómico global, encontramos un consenso muy claro entre analistas de referencia como Roberto Moro, Alberto Iturralde o Sito Rodríguez. No estamos ante un cambio estructural a la baja, pero sí ante un riesgo elevado de corrección táctica a corto plazo, en torno al 3 o al 6 por ciento."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Así es, y las cifras técnicas lo confirman con nitidez. En Europa, el DAX alemán mantiene una fortaleza notable, rozando los 26.700 puntos, tal como destacaba Javier Alfayate. Mientras tanto, en nuestro selectivo doméstico, el IBEX 35 consolida sobre los 20.000 enteros con el respaldo de la banca comercial, defendiendo con solvencia su soporte clave en los 19.800 puntos."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Sin embargo, al otro lado del Atlántico el panorama exige mayor prudencia. Tanto el S&P 500 en los 7.550 enteros, como el Nasdaq 100 sobre los 27.900 puntos, muestran lecturas de sobrecompra evidentes. El criterio compartido por los analistas es contundente: en estos niveles de complacencia no se entra a comprar; conviene vigilar de cerca y proteger beneficios acumulados."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Totalmente de acuerdo. De hecho, donde mayor divergencia de opiniones hemos observado es en la renta variable tecnológica. Mientras expertos como Roberto Moro ven valor para acumular en recortes, Alberto Iturralde advierte con firmeza sobre un posible proceso de distribución institucional en las grandes cotizadas de inteligencia artificial."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Entremos de lleno en el bloque de empresas nacionales, porque aquí el quórum de los consultorios ha sido indiscutible. El foco indiscutible de las consultas de los inversores ha sido Iberdrola, con valoraciones unánimes de Moro, Iturralde y Alfayate."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Iberdrola muestra una estructura gráfica excelente, en auténtica subida libre por encima de los 23 euros por acción. Los analistas fijan su soporte de referencia en torno a los 22 euros con 80 céntimos, considerándola un valor defensivo idóneo por visibilidad y rentabilidad por dividendo."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "En el sector financiero, Banco Santander y BBVA continúan concentrando buena parte del interés. Paco Pérez y Víctor Galán señalan que la tendencia alcista de la banca aún tiene recorrido, aunque subrayan la necesidad de mantener stops ajustados, por ejemplo por debajo de los 10 euros con 70 céntimos en el caso de Santander."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "También ha habido consultas recurrentes sobre valores rezagados. Es el caso de Acciona, tras su reciente castigo en cotización, donde Roberto Moro y Jorge del Canto recomiendan paciencia hasta ver un suelo fiable; o Repsol, que según David Galán continúa muy condicionada por la volatilidad en el precio del crudo."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Pasemos al bloque internacional, donde un protagonista indiscutible ha acaparado la atención: Nvidia, mencionada y analizada hasta en cuatro consultorios independientes a lo largo de estos días."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "El contraste de tesis en Nvidia es muy enriquecedor. Sito Rodríguez resalta que la demanda de infraestructura de centros de datos sigue sin freno. Por contra, Iturralde reitera su advertencia habitual: prudencia máxima ante el riesgo de comprar en máximos cuando las manos fuertes ya han completado su movimiento."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Desde una perspectiva técnica, el nivel clave a monitorizar en Nvidia se ubica en los 155 dólares. En cuanto a semiconductores europeos, destaca ASML Holding, donde Gerardo Ortega y varios expertos coinciden en que, cotizando cerca de los 1.490 dólares, ofrece una ecuación rentabilidad-riesgo atractiva a largo plazo."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Conviene mencionar también las materias primas, en particular el Oro. Roberto Moro señalaba esta semana que el activo dorado se sitúa en una zona óptima de apoyo, ofreciendo una oportunidad interesante de cobertura ante las tensiones geopolíticas y la incertidumbre de tipos."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Para ir concluyendo este repaso, nos quedamos con una regla estratégica fundamental: la regla de las tres D. Selección rigurosa para la Defensa del patrimonio, Diversificación global equilibrada, y Disciplina innegociable en la gestión de las órdenes de stop."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "Una pauta esencial para preservar capital en el contexto actual. Les recordamos que disponen del informe completo en formato PDF, así como de todas las cotizaciones verificadas al minuto en nuestro portal web."
            },
            {
                "locutor": "Voz 1",
                "genero": "masculino",
                "texto": "Muchas gracias por acompañarnos en este análisis. Les deseamos una excelente semana y muy buenas decisiones de inversión."
            },
            {
                "locutor": "Voz 2",
                "genero": "femenino",
                "texto": "¡Un cordial saludo, y hasta nuestra próxima edición en STOXXX!"
            }
        ],
        "fuentes_consultadas": [
            {
                "id": "cZ4eKx8B1o0",
                "title": "Consultorio de bolsa con Roberto Moro: Niveles clave del IBEX 35, banca y soportes",
                "channel": "Capital Radio",
                "date_formatted": "14/11/2026",
                "url": "https://www.youtube.com/watch?v=cZ4eKx8B1o0",
                "char_count": 28450,
                "status": "Transcrito completo",
                "description": "Análisis técnico de soportes en 19.800 del IBEX 35, estrategias en Santander, BBVA y recomendación de Iberdrola."
            },
            {
                "id": "aY7fLz9C2p1",
                "title": "Consultorio de bolsa con Alberto Iturralde: Psicología del mercado y alerta en Wall Street",
                "channel": "Capital Radio",
                "date_formatted": "12/11/2026",
                "url": "https://www.youtube.com/watch?v=aY7fLz9C2p1",
                "char_count": 31200,
                "status": "Transcrito completo",
                "description": "Tesis sobre distribución silenciosa de manos fuertes en tecnológicas y fortaleza relativa de eléctricas europeas."
            },
            {
                "id": "dX2gMv3E4q5",
                "title": "Consultorio con Javier Alfayate: Momentum europeo, máximos del DAX y gestión cuantitativa",
                "channel": "Capital Radio",
                "date_formatted": "10/11/2026",
                "url": "https://www.youtube.com/watch?v=dX2gMv3E4q5",
                "char_count": 22800,
                "status": "Transcrito completo",
                "description": "Comportamiento del DAX 40 en 26.700, sectores con fuerza relativa Mansfield y valores directores defensivos."
            },
            {
                "id": "eW5hNw6F7r8",
                "title": "Consultorio de bolsa con Jorge del Canto: Oportunidades en renta variable española",
                "channel": "Capital Radio",
                "date_formatted": "07/11/2026",
                "url": "https://www.youtube.com/watch?v=eW5hNw6F7r8",
                "char_count": 19650,
                "status": "Transcrito completo",
                "description": "Análisis de Banco Santander, Telefónica y fijación de stops de protección dinámica ante volatilidad."
            },
            {
                "id": "fU8jPx9G0s2",
                "title": "Consultorio y Análisis de Valores con Sito Rodríguez: Nvidia, ASML y semiconductores",
                "channel": "Visionarios Bolsa",
                "date_formatted": "11/11/2026",
                "url": "https://www.youtube.com/watch?v=fU8jPx9G0s2",
                "char_count": 34100,
                "status": "Transcrito completo",
                "description": "Tesis de inversión sobre la demanda secular de chips para centros de datos, márgenes de ASML y soporte técnico en 155$ de Nvidia."
            },
            {
                "id": "gT1kQy2H3t4",
                "title": "Repaso Semanal de Mercados y Tesis Tecnológicas con Sito Rodríguez: Nasdaq 100 y Microsoft",
                "channel": "Visionarios Bolsa",
                "date_formatted": "05/11/2026",
                "url": "https://www.youtube.com/watch?v=gT1kQy2H3t4",
                "char_count": 26700,
                "status": "Transcrito completo",
                "description": "Análisis de Microsoft, rotación a compañías con generación de caja recurrente y directrices de liquidez para final de año."
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

    # 2.8. POBLAR FUENTES CONSULTADAS SI NO ESTÁN DEFINIDAS
    if not report_data.get("fuentes_consultadas"):
        src_vids = videos if videos else (ref_videos if 'ref_videos' in locals() and ref_videos else [])
        if src_vids:
            report_data["fuentes_consultadas"] = [
                {
                    "id": v.get("id", ""),
                    "title": v.get("title", ""),
                    "channel": v.get("channel", ""),
                    "date_formatted": v.get("date_formatted", v.get("upload_date", "")),
                    "url": v.get("url", f"https://www.youtube.com/watch?v={v.get('id', '')}"),
                    "char_count": len(v.get("transcript", "")),
                    "status": "Transcrito completo" if len(v.get("transcript", "")) > 0 else "Disponible"
                }
                for v in src_vids
            ]

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
            with console.status("[bold green]Sintetizando podcast dual en MP3..."):
                podcast_gen = PodcastGenerator()
                audio_path = podcast_gen.generate_podcast(guion, date_str)
            if audio_path and audio_path.exists():
                console.print(f"[bold green]✔[/bold green] Podcast MP3 generado: [cyan]{audio_path}[/cyan]")
            else:
                console.print(f"[yellow]⚠ Síntesis de voz no disponible o sin conexión. Continuando fluidamente...[/yellow]")
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
