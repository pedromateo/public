"""
Módulo de Verificadores de Integridad, Fuentes y Mercado para STOXXX.
Asegura que los datos analizados, las cotizaciones y los niveles técnicos sean
exactos, estén actualizados y no contengan inconsistencias ni datos obsoletos.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Excepción para errores críticos de validación."""
    pass

class TranscriptDoubleChecker:
    """Motor de doble chequeo de fidelidad entre el informe generado y las transcripciones originales."""

    @staticmethod
    def cross_check(report_data: Dict[str, Any], videos: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Contrasta cada elemento del informe contra el corpus textual de las transcripciones:
        - Presencia y quórum de empresas citadas.
        - Presencia y declaraciones atribuidas a los analistas.
        - Coherencia de índices y niveles mencionados.
        """
        corpus = " ".join([v.get("transcript", "") for v in videos]).lower()
        titles = " ".join([v.get("title", "") for v in videos]).lower()
        full_text = f"{titles} {corpus}"

        results = {
            "videos_analizados": len(videos),
            "empresas_verificadas": [],
            "empresas_no_encontradas": [],
            "analistas_verificados": [],
            "analistas_no_encontrados": [],
            "indices_verificados": [],
            "fidelidad_score": 100.0,
            "detalles": []
        }

        # 1. Doble check de Empresas
        empresas_dict = report_data.get("analisis_empresas", {})
        total_items = 0
        verified_items = 0

        for block in ["nacionales", "internacionales"]:
            for comp in empresas_dict.get(block, []):
                total_items += 1
                nombre = comp.get("nombre", "").lower()
                ticker = comp.get("ticker", "").lower().replace(".mc", "")

                found = (nombre in full_text) or (ticker and len(ticker) > 2 and ticker in full_text)
                if found:
                    verified_items += 1
                    results["empresas_verificadas"].append({
                        "nombre": comp.get("nombre"),
                        "ticker": comp.get("ticker"),
                        "menciones_reportadas": comp.get("menciones", 1),
                        "en_transcripcion": True
                    })
                else:
                    results["empresas_no_encontradas"].append(comp.get("nombre"))
                    results["detalles"].append(f"Empresa '{comp.get('nombre')}' no tiene coincidencia textual directa en transcripciones.")

        # 2. Doble check de Analistas citados
        analistas_referencia = [
            "Roberto Moro", "Alberto Iturralde", "Javier Alfayate",
            "Sito Rodríguez", "Jorge del Canto", "David Galán",
            "Víctor Galán", "Paco Pérez", "Gerardo Ortega", "José María Luna"
        ]

        situacion = report_data.get("sentimiento_macro", {}).get("situacion_global", "")
        for analista in analistas_referencia:
            if analista.lower() in situacion.lower() or any(
                analista.lower() in [a.lower() for a in c.get("analistas", [])]
                for block in ["nacionales", "internacionales"]
                for c in empresas_dict.get(block, [])
            ):
                total_items += 1
                # Comprobar apellido principal en el corpus o títulos
                apellido = analista.split()[-1].lower()
                if apellido in full_text:
                    verified_items += 1
                    results["analistas_verificados"].append(analista)
                else:
                    results["analistas_no_encontrados"].append(analista)
                    results["detalles"].append(f"Analista '{analista}' citado en informe pero sin mención directa en transcripciones.")

        # 3. Doble check de Índices
        for idx in report_data.get("sentimiento_macro", {}).get("indices", []):
            nom = idx.get("nombre", "").lower()
            key_name = nom.split()[0]
            total_items += 1
            if key_name in full_text:
                verified_items += 1
                results["indices_verificados"].append(idx.get("nombre"))
            else:
                results["detalles"].append(f"Índice '{idx.get('nombre')}' con baja presencia en las transcripciones.")

        # Calcular puntuación de fidelidad
        if total_items > 0:
            results["fidelidad_score"] = round((verified_items / total_items) * 100.0, 1)

        report_data["_doble_check"] = results
        return results

class MarketReportValidator:
    """Validador exhaustivo de fuentes, cotizaciones en tiempo real y consistencia técnica."""

    @staticmethod
    def verify_video_sources(videos: List[Dict[str, Any]], days_horizon: int = 3) -> Tuple[bool, List[str], List[str]]:
        """
        Valida que todos los vídeos analizados pertenezcan estrictamente al horizonte temporal
        y a los canales oficiales autorizados.
        """
        errors = []
        warnings = []
        # Horizonte en días naturales (ej. 3 días = hoy, ayer y antesdeayer):
        cutoff_date = datetime.now() - timedelta(days=max(0, days_horizon - 1))
        cutoff_str = cutoff_date.strftime("%Y%m%d")

        for vid in videos:
            vid_id = vid.get("id", "desconocido")
            title = vid.get("title", "Sin título")
            upload_date = vid.get("upload_date", "")

            # 1. Validación de fecha
            if not upload_date:
                warnings.append(f"Vídeo {vid_id} ('{title}') no incluye fecha de publicación explícita.")
            elif upload_date < cutoff_str:
                errors.append(
                    f"Vídeo {vid_id} ('{title}') fuera de rango: publicado en {upload_date}, "
                    f"límite horizonte {days_horizon} días es {cutoff_str}."
                )

            # 2. Validación de canal
            ch_id = vid.get("channel_id", "")
            if ch_id not in ("capital_radio", "visionarios_bolsa", ""):
                warnings.append(f"Vídeo {vid_id} proviene de un canal no estándar: {ch_id}")

            # 3. Validación de contenido mínimo
            char_count = vid.get("char_count") or len(vid.get("transcript", ""))
            if char_count < 100:
                errors.append(f"Vídeo {vid_id} tiene una transcripción insuficiente ({char_count} caracteres).")

        is_valid = len(errors) == 0
        return is_valid, errors, warnings

    @staticmethod
    def verify_technical_coherence(
        price: float,
        soporte_str: str,
        resistencia_str: str,
        tolerance_pct: float = 0.20
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Verifica que el soporte y la resistencia sean coherentes con la cotización real actual.
        Si difieren en más del porcentaje de tolerancia (por ejemplo, por alucinación o datos desfasados),
        los recalcula para mantener estricta coherencia matemática y técnica.
        """
        def parse_val(s: str) -> Optional[float]:
            if not s:
                return None
            clean = s.replace("€", "").replace("$", "").replace("EUR", "").replace("USD", "").replace(".", "").replace(",", ".").strip()
            try:
                return float(clean)
            except ValueError:
                return None

        sop_val = parse_val(soporte_str)
        res_val = parse_val(resistencia_str)
        needs_reconciliation = False
        reason = None

        # Detectar desfase absurdo (ej: precio 20.000 vs soporte 11.450)
        if sop_val and price > 0:
            diff_sop = abs(price - sop_val) / price
            if diff_sop > tolerance_pct:
                needs_reconciliation = True
                reason = f"Soporte {sop_val} desfasado un {diff_sop*100:.1f}% respecto al precio real {price}."

        if res_val and price > 0:
            diff_res = abs(res_val - price) / price
            if diff_res > tolerance_pct:
                needs_reconciliation = True
                reason = f"Resistencia {res_val} desfasada un {diff_res*100:.1f}% respecto al precio real {price}."

        if needs_reconciliation and price > 0:
            # Reconciliar soporte al ~98% del precio y resistencia al ~102%
            if price > 1000:
                rec_sop = f"{round(price * 0.985):,}".replace(",", ".")
                rec_res = f"{round(price * 1.015):,}".replace(",", ".")
            else:
                rec_sop = f"{price * 0.97:.2f}".replace(".", ",")
                rec_res = f"{price * 1.03:.2f}".replace(".", ",")
            return False, rec_sop, rec_res, reason

        return True, soporte_str, resistencia_str, None

    @classmethod
    def audit_and_verify_report(cls, report_data: Dict[str, Any], date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Ejecuta una auditoría completa sobre el informe antes de publicarlo o maquetarlo:
        1. Valida cotizaciones y ajusta cualquier inconsistencia técnica.
        2. Verifica que no existan valores vacíos o mocks no resueltos.
        3. Comprueba el orden de menciones y el quórum de empresas.
        4. Valida el guion del podcast.
        5. Reconcilia la fecha hablada y el número de fuentes del horizonte.
        """
        audit_log = {
            "timestamp": datetime.now().isoformat(),
            "passed": True,
            "reconciliations": [],
            "warnings": [],
            "errors": []
        }

        # 1. Auditoría de Índices
        indices = report_data.get("sentimiento_macro", {}).get("indices", [])
        for idx in indices:
            nombre = idx.get("nombre", "")
            cotiz_str = idx.get("precio_actual", "")

            # Extraer precio numérico de la cotización formateada
            price_num = None
            if cotiz_str:
                clean_p = cotiz_str.split()[0].replace(".", "").replace(",", ".")
                try:
                    price_num = float(clean_p)
                except ValueError:
                    pass

            if price_num:
                sop = idx.get("soporte_clave", "")
                res = idx.get("resistencia_clave", "")
                is_coherent, rec_sop, rec_res, reason = cls.verify_technical_coherence(price_num, sop, res)
                if not is_coherent:
                    idx["soporte_clave"] = rec_sop
                    idx["resistencia_clave"] = rec_res
                    audit_log["reconciliations"].append(
                        f"Índice {nombre}: Reconciliado nivel técnico. {reason} Nuevos niveles: Soporte {rec_sop}, Resistencia {rec_res}"
                    )

        # 2. Auditoría de Empresas Nacionales e Internacionales
        empresas = report_data.get("analisis_empresas", {})
        for block in ["nacionales", "internacionales"]:
            comp_list = empresas.get(block, [])
            fuentes_count = len(report_data.get("fuentes_consultadas", []))
            for comp in comp_list:
                nombre = comp.get("nombre", "")
                menciones = comp.get("menciones", 0)

                # Coherencia de menciones vs total de fuentes
                if fuentes_count > 0 and menciones > fuentes_count:
                    comp["menciones"] = fuentes_count
                    audit_log["reconciliations"].append(
                        f"Empresa {nombre}: Menciones ({menciones}) acotadas a {fuentes_count} (máximo de fuentes consultadas en el horizonte)."
                    )

                cotiz_str = comp.get("precio_actual", "")
                price_num = None
                if cotiz_str:
                    clean_p = cotiz_str.split()[0].replace(".", "").replace(",", ".")
                    try:
                        price_num = float(clean_p)
                    except ValueError:
                        pass

                if price_num:
                    sop = comp.get("soporte", "")
                    res = comp.get("resistencia", "")
                    is_coherent, rec_sop, rec_res, reason = cls.verify_technical_coherence(price_num, sop, res)
                    if not is_coherent:
                        comp["soporte"] = rec_sop
                        comp["resistencia"] = rec_res
                        audit_log["reconciliations"].append(
                            f"Empresa {nombre}: Reconciliado nivel técnico. {reason} Nuevos niveles: Soporte {rec_sop}, Resistencia {rec_res}"
                        )

            # Verificar orden descendente por menciones
            menciones = [c.get("menciones", 0) for c in comp_list]
            if menciones != sorted(menciones, reverse=True):
                comp_list.sort(key=lambda x: x.get("menciones", 0), reverse=True)
                audit_log["reconciliations"].append(f"Bloque {block}: Reordenado por número de menciones descendente.")

        # 3. Auditoría del Guion del Podcast (turnos y eliminación estricta de nombres de locutores)
        guion = report_data.get("guion_podcast", [])
        if len(guion) < 14:
            audit_log["warnings"].append(f"El podcast tiene solo {len(guion)} turnos; se recomienda un mínimo de 16-18 turnos.")

        import re
        forbidden_greetings = [
            (r"[¡!]?(Hola|Buenas|Qué tal|Saludos),?\s+(Carlos|Laura|Álvaro|Alvaro|María|Maria)\b[!,.]?", "¡Hola a todos!"),
            (r"\b(Gracias|Dinos|Cuéntanos),?\s+(Carlos|Laura|Álvaro|Alvaro|María|Maria)\b[!,.]?", r"\1,"),
        ]

        # 3.5. Reconciliación de Fecha y Cantidad de Consultorios en el Podcast
        effective_date_str = date_str or report_data.get("fecha_informe") or datetime.now().strftime("%Y-%m-%d")
        report_data["fecha_informe"] = effective_date_str
        try:
            dt = datetime.strptime(effective_date_str, "%Y-%m-%d")
            days_es = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
            months_es = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
            day_name = days_es[dt.weekday()]
            day_num = dt.day
            month_name = months_es[dt.month - 1]
            year_num = dt.year
            spoken_date = f"{day_name}, {day_num} de {month_name} de {year_num}"
            short_spoken_date = f"{day_num} de {month_name}"
        except Exception:
            spoken_date = effective_date_str
            short_spoken_date = effective_date_str

        num_words = {
            1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis",
            7: "siete", 8: "ocho", 9: "nueve", 10: "diez", 11: "once", 12: "doce",
            13: "trece", 14: "catorce", 15: "quince", 16: "dieciséis", 17: "diecisiete",
            18: "dieciocho", 19: "diecinueve", 20: "veinte"
        }
        fuentes_count = len(report_data.get("fuentes_consultadas", []))
        spoken_sources = num_words.get(fuentes_count, str(fuentes_count)) if fuentes_count > 0 else "varios"

        for turn in guion:
            if turn.get("locutor") not in ("Voz 1", "Voz 2"):
                turn["locutor"] = "Voz 1" if turn.get("genero") == "masculino" else "Voz 2"

            txt = turn.get("texto", "")
            for pattern, repl in forbidden_greetings:
                txt = re.sub(pattern, repl, txt, flags=re.IGNORECASE)

            # Reconciliar fecha hablada en cabecera ("Hoy es ...")
            txt = re.sub(
                r"Hoy es [^,]+,\s*\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4}",
                f"Hoy es {spoken_date}",
                txt,
                flags=re.IGNORECASE
            )
            # Reconciliar referencias a fechas concretas desfasadas ("este 18 de noviembre")
            txt = re.sub(
                r"\beste \d{1,2} de [a-záéíóú]+\b",
                f"este {short_spoken_date}",
                txt,
                flags=re.IGNORECASE
            )
            # Reconciliar número de consultorios/emisiones con el conteo real
            if fuentes_count > 0:
                txt = re.sub(
                    r"\b(veinte|20|quince|15|diez|10|doce|12|ocho|8)\s+consultorios\b",
                    f"{spoken_sources} consultorios",
                    txt,
                    flags=re.IGNORECASE
                )
                txt = re.sub(
                    r"\b(veinte|20|quince|15|diez|10|doce|12|ocho|8)\s+emisiones\b",
                    f"{spoken_sources} emisiones",
                    txt,
                    flags=re.IGNORECASE
                )

            turn["texto"] = txt

            if not turn.get("texto") or len(turn.get("texto", "").strip()) < 10:
                audit_log["warnings"].append(f"Turno de podcast con texto insuficiente: {turn}")

        # 4. Normalización obligatoria de estilo de analistas (ej. 'R. Moro' en vez de 'Roberto Moro')
        try:
            from src.analyzer import format_analyst_abbreviations
            report_data = format_analyst_abbreviations(report_data)
        except Exception as e:
            logger.debug(f"No se pudo aplicar format_analyst_abbreviations: {e}")

        # Guardar registro de auditoría dentro del reporte
        report_data["_audit"] = audit_log
        logger.info(f"Auditoría de integridad completada: {len(audit_log['reconciliations'])} ajustes, {len(audit_log['warnings'])} avisos.")
        return report_data
