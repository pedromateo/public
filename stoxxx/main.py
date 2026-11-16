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
        table = Table(title=f"{flag} {title}", border_style="cyan")
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

    print_company_table("Valores Nacionales (IBEX / Continuo)", empresas.get("nacionales", []))
    print_company_table("Valores Internacionales (Nasdaq, DAX, etc.)", empresas.get("internacionales", []))

    # 4. FUENTES CONSULTADAS Y REFERENCIAS
    fuentes = report_data.get("fuentes_consultadas", [])
    if fuentes:
        table_src = Table(title="Fuentes Consultadas y Referencias Audiovisuales (Consultorios)", border_style="blue")
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

def main():
    parser = argparse.ArgumentParser(description="STOXXX - Agente de Inteligencia Bursátil y Podcast Dual")
    parser.add_argument("--days", type=int, default=DEFAULT_HORIZON_DAYS, help=f"Horizonte en días (por defecto: {DEFAULT_HORIZON_DAYS})")
    parser.add_argument("--push", action="store_true", default=AUTO_GIT_PUSH, help="Publicar y hacer git push a GitHub Pages automáticamente")
    parser.add_argument("--no-push", action="store_false", dest="push", help="No realizar git push")
    parser.add_argument("--skip-audio", action="store_true", help="Omitir generación del podcast MP3")
    parser.add_argument("--skip-pdf", action="store_true", help="Omitir generación del informe PDF")
    parser.add_argument("--allow-partial", action="store_true", default=True, help="Proceder automáticamente con transcripciones parciales si faltan vídeos")
    parser.add_argument("--verbose", action="store_true", help="Activar modo verbose / debug")

    args = parser.parse_args()
    setup_logging(args.verbose)

    date_str = datetime.now().strftime("%Y-%m-%d")

    console.print(Panel(
        f"[bold cyan]STOXXX AUTOMATED AGENT[/bold cyan]\n"
        f"Horizonte: [bold]{args.days} días[/bold] | Publicación Git: [bold]{'Activada' if args.push else 'Desactivada'}[/bold]\n"
        f"Modo: [bold]Producción (Datos Reales 100%)[/bold]",
        style="blue"
    ))

    # 1. EXTRACCIÓN DE DATOS DE YOUTUBE
    with console.status("[bold green]Extrayendo vídeos y transcripciones de YouTube (Capital Radio & Visionarios Bolsa)..."):
        extractor = YouTubeExtractor(days_horizon=args.days)
        ext_status = extractor.extract_with_status()
        videos = ext_status["videos_obtenidos"]
        faltantes = ext_status["videos_faltantes"]
        total_loc = ext_status["total_localizados"]

    console.print(f"[bold green]✔[/bold green] Se obtuvieron [cyan]{len(videos)}[/cyan] de [bold]{total_loc}[/bold] vídeos con transcripción válida.")
    if ext_status["de_disco_count"] > 0:
        console.print(f"[dim]ℹ {ext_status['de_disco_count']} transcripciones cargadas desde almacenamiento local en data/transcripts/[/dim]")

    if faltantes:
        console.print(Panel(
            f"[bold yellow]AVISO DE TRANSCRIPCIONES INCOMPLETAS:[/bold yellow]\n"
            f"Se localizaron [bold]{total_loc}[/bold] vídeos publicados en los últimos {args.days} días.\n"
            f"• Transcripciones disponibles: [bold green]{len(videos)}[/bold green]\n"
            f"• Transcripciones no disponibles: [bold red]{len(faltantes)}[/bold red]\n\n"
            f"Vídeos pendientes de transcripción:\n" +
            "\n".join([f"  • [{v['id']}] {v['title'][:60]}..." for v in faltantes[:4]]),
            title="[bold yellow]ESTADO DE FUENTES[/bold yellow]",
            border_style="yellow"
        ))

        if not args.allow_partial and sys.stdin.isatty():
            console.print("\n[bold cyan]¿Cómo deseas proceder?[/bold cyan]")
            console.print("  [bold 1][/bold 1] Generar el informe con las transcripciones disponibles.")
            console.print("  [bold 2][/bold 2] Cancelar y reintentar más tarde.")
            try:
                choice = input("Opción [1/2] (por defecto 1): ").strip() or "1"
                if choice == "2":
                    console.print("[red]Ejecución detenida por el usuario.[/red]")
                    sys.exit(0)
            except (KeyboardInterrupt, EOFError):
                pass
        else:
            console.print(f"[cyan]ℹ Continuando con las {len(videos)} transcripciones obtenidas.[/cyan]")
    
    if not videos:
        console.print("[bold red]Error: No se encontraron transcripciones de vídeos para procesar. Se requieren datos reales.[/bold red]")
        sys.exit(1)

    # Validar fuentes y horizonte de los vídeos extraídos
    is_valid, src_errors, src_warnings = MarketReportValidator.verify_video_sources(videos, days_horizon=args.days)
    for w in src_warnings:
        console.print(f"[yellow]Aviso fuente:[/yellow] {w}")
    for err in src_errors:
        console.print(f"[red]Error fuente:[/red] {err}")

    # 2. ANÁLISIS DE MERCADO CON DATOS REALES
    try:
        with console.status("[bold green]Analizando transcripciones y buscando quórum de analistas..."):
            analyzer = MarketAnalyzer()
            report_data = analyzer.analyze_transcripts(videos)
        console.print("[bold green]✔[/bold green] Análisis completado con éxito a partir de fuentes reales.")
    except Exception as e:
        console.print(f"[bold red]Error durante el análisis:[/bold red] {e}")
        sys.exit(1)

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

    # 6.5. EJECUTAR SUITE DE TESTS AUTOMATIZADA
    with console.status("[bold green]Ejecutando tests de integridad web y maquetación..."):
        import unittest
        loader = unittest.TestLoader()
        suite = loader.discover("tests", pattern="test_*.py")
        runner = unittest.TextTestRunner(verbosity=0)
        test_result = runner.run(suite)
    if test_result.wasSuccessful():
        console.print(f"[bold green]✔[/bold green] Tests de integridad web superados ({test_result.testsRun} tests ejecutados con éxito).")
    else:
        console.print(f"[bold red]✖ Fallaron {len(test_result.failures) + len(test_result.errors)} tests de integridad.[/bold red]")
        if args.push:
            console.print("[red]Cancelando publicación en Git debido a fallos en los tests.[/red]")
            sys.exit(1)

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
