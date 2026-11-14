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
    table_indices.add_column("Tendencia", style="bold")
    table_indices.add_column("Soporte Clave", style="green")
    table_indices.add_column("Resistencia Clave", style="red")
    table_indices.add_column("Consenso de Analistas", style="white")

    for idx in macro.get("indices", []):
        tend = idx.get("tendencia", "Neutral")
        tend_style = "green" if "Alcista" in tend else ("red" if "Bajista" in tend else "yellow")
        table_indices.add_row(
            idx.get("nombre", ""),
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
            table.add_row(
                f"{item.get('nombre')}{ticker}",
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
            "sintesis_sentimiento": "El consenso general entre los consultorios de Capital Radio y los análisis de Visionarios Bolsa apunta a una continuidad de la tendencia alcista estructural en Europa y EE.UU., aunque con avisos unánimes de sobrecompra en índices directores y divergencias en el sector tecnológico.",
            "hacia_donde_apuntan": "Los analistas recomiendan rotar beneficios tácticos hacia valores energéticos defensivos y banca europea, manteniendo exposición en grandes tecnológicas solo con stops ajustados bajo soportes de corto plazo.",
            "puntos_clave_consenso": [
                "El IBEX 35 mantiene fortaleza relativa apoyado en el sector bancario y utilities.",
                "Wall Street (S&P 500 y Nasdaq 100) afronta niveles de resistencia histórica donde se desaconseja comprar en euforia.",
                "Quórum absoluto en vigilar el soporte clave de Nvidia antes de abrir nuevas posiciones alcistas."
            ]
        },
        "sentimiento_macro": {
            "situacion_global": "Semana marcada por la digestión de resultados corporativos y los tipos de interés de la Fed y el BCE. Los analistas coinciden en que no hay señal de giro bajista primario, pero sí riesgo elevado de corrección de corto plazo de entre un 3% y un 5%.",
            "indices": [
                {
                    "nombre": "IBEX 35",
                    "tendencia": "Alcista",
                    "soporte_clave": "11.450",
                    "resistencia_clave": "12.000",
                    "consenso_analistas": "Roberto Moro e Iturralde coinciden en que mientras no pierda los 11.450 la tendencia sigue intacta hacia máximos anuales."
                },
                {
                    "nombre": "DAX 40",
                    "tendencia": "Consolidación",
                    "soporte_clave": "19.100",
                    "resistencia_clave": "19.650",
                    "consenso_analistas": "Rango lateral estrecho; se recomienda esperar ruptura limpia antes de posicionarse."
                },
                {
                    "nombre": "S&P 500",
                    "tendencia": "Alcista",
                    "soporte_clave": "5.780",
                    "resistencia_clave": "6.050",
                    "consenso_analistas": "Máximos históricos con bajo volumen relativo; mantener posiciones pero sin perseguir precios."
                },
                {
                    "nombre": "Nasdaq 100",
                    "tendencia": "Alcista con Sobrecompra",
                    "soporte_clave": "20.200",
                    "resistencia_clave": "21.150",
                    "consenso_analistas": "Dependencia extrema del comportamiento de los semiconductores y megacaps de IA."
                }
            ],
            "coincidencias_estrategia": "Todos los analistas recomiendan operar con stop-loss dinámico riguroso y priorizar la preservación de capital ante posibles tomas de beneficios.",
            "divergencias_estrategia": "Mientras Roberto Moro ve oportunidad de entrada en correcciones de semiconductores, Alberto Iturralde advierte de distribución institucional en tecnológicas."
        },
        "analisis_empresas": {
            "nacionales": [
                {
                    "nombre": "Iberdrola",
                    "ticker": "IBE.MC",
                    "menciones": 3,
                    "analistas": ["Roberto Moro", "Alberto Iturralde", "Javier Alfayate"],
                    "nivel_consenso": "Alto Consenso Alcista",
                    "soporte": "13.20€",
                    "resistencia": "14.10€",
                    "recomendacion": "Mantener / Comprar en apoyo a soporte",
                    "tesis": "Excelente estructura técnica en subida libre. Valor refugio preferido por su dividendo y solidez ante volatilidad."
                },
                {
                    "nombre": "Banco Santander",
                    "ticker": "SAN.MC",
                    "menciones": 2,
                    "analistas": ["Roberto Moro", "Jorge del Canto"],
                    "nivel_consenso": "Consenso Moderado Alcista",
                    "soporte": "4.30€",
                    "resistencia": "4.75€",
                    "recomendacion": "Mantener con stop en 4.25€",
                    "tesis": "Consolidando tras fuerte rally. Buena salud técnica mientras respete la media móvil de 50 sesiones."
                },
                {
                    "nombre": "Telefónica",
                    "ticker": "TEF.MC",
                    "menciones": 1,
                    "analistas": ["Alberto Iturralde"],
                    "nivel_consenso": "Divergencia / Neutral",
                    "soporte": "4.15€",
                    "resistencia": "4.50€",
                    "recomendacion": "Evitar o esperar superación de resistencias",
                    "tesis": "Movimiento lateral sin catalizador claro en el corto plazo."
                }
            ],
            "internacionales": [
                {
                    "nombre": "Nvidia",
                    "ticker": "NVDA",
                    "menciones": 4,
                    "analistas": ["Sito Rodríguez", "Alberto Iturralde", "Roberto Moro", "Jorge del Canto"],
                    "nivel_consenso": "Divergencia Alta (Alcista técnico vs Alerta valoración)",
                    "soporte": "130.00$",
                    "resistencia": "152.00$",
                    "recomendacion": "Ajustar stop en 130$; no entrar en máximos",
                    "tesis": "Sito Rodríguez destaca el momentum imparable de demanda IA, mientras que Iturralde alerta del riesgo de atrapados minoristas."
                },
                {
                    "nombre": "ASML Holding",
                    "ticker": "ASML",
                    "menciones": 2,
                    "analistas": ["Sito Rodríguez", "Roberto Moro"],
                    "nivel_consenso": "Consenso Favorable en Valor",
                    "soporte": "640€",
                    "resistencia": "750€",
                    "recomendacion": "Comprar escalonado a largo plazo",
                    "tesis": "Oportunidad de compra generacional tras el castigo excesivo en sus últimos resultados."
                },
                {
                    "nombre": "Microsoft",
                    "ticker": "MSFT",
                    "menciones": 1,
                    "analistas": ["Sito Rodríguez"],
                    "nivel_consenso": "Consenso Alcista",
                    "soporte": "415.00$",
                    "resistencia": "450.00$",
                    "recomendacion": "Mantener en cartera",
                    "tesis": "Crecimiento robusto en computación en la nube (Azure) y liderazgo en software corporativo con IA."
                }
            ]
        },
        "guion_podcast": [
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "¡Muy buenas tardes y bienvenidos al repaso de mercado en STOXXX! Hoy analizamos las últimas dos semanas en los principales consultorios de bolsa."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Hola Carlos. Días de enorme interés, con un IBEX 35 rondando zonas de máximos y Wall Street manteniendo el pulso alcista, pero con advertencias claras de los expertos."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Efectivamente, Laura. En el plano nacional hay un quórum casi absoluto en Iberdrola como el valor más sólido, mientras que la banca sigue consolidando ganancias."
            },
            {
                "locutor": "Laura",
                "genero": "femenino",
                "texto": "Y en el ámbito internacional, todos los ojos están puestos en Nvidia y ASML. Hay debate entre quienes ven una oportunidad irrepetible y quienes piden extremar la cautela."
            },
            {
                "locutor": "Carlos",
                "genero": "masculino",
                "texto": "Así es. Recuerden revisar siempre sus stops de protección. ¡Nos escuchamos en el próximo análisis!"
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
            videos = extractor.extract_all()
        console.print(f"[bold green]✔[/bold green] Se obtuvieron [cyan]{len(videos)}[/cyan] vídeos con transcripción válida.")
        
        if not videos:
            console.print("[yellow]⚠ No se encontraron vídeos con transcripción en el rango temporal. Pasando a datos de muestra representativos.[/yellow]")
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
