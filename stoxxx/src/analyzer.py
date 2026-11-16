import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

FINANCIAL_ANALYST_SYSTEM_PROMPT = """Eres un Arquitecto de Software y Analista Financiero Senior con décadas de experiencia en mercados de renta variable (Europa y EE.UU.), análisis técnico y macroeconomía.

Tu misión es procesar de forma conjunta las transcripciones de consultorios de bolsa (Capital Radio y Visionarios Bolsa) correspondientes a las últimas dos semanas.
Debes buscar estrictamente el QUÓRUM y PATRONES entre los analistas, identificando dónde hay consenso claro, dónde hay discrepancias y qué niveles técnicos (soportes y resistencias) coinciden.

Debes responder exclusivamente en formato JSON válido con la siguiente estructura:

{
  "fecha_informe": "YYYY-MM-DD",
  "sentimiento_general": "Alcista" | "Neutral" | "Cautela" | "Bajista",
  "resumen_ejecutivo": {
    "lectura_tiempo": "3-5 minutos",
    "sintesis_sentimiento": "Texto fluido y directo del sentimiento general del mercado...",
    "hacia_donde_apuntan": "Directrices de los analistas sobre flujos de capital, sectores y posicionamiento...",
    "puntos_clave_consenso": [
      "Punto de consenso 1...",
      "Punto de consenso 2...",
      "Punto de consenso 3..."
    ]
  },
  "sentimiento_macro": {
    "situacion_global": "Análisis exhaustivo del contexto macroeconómico en Europa y Estados Unidos...",
    "indices": [
      {
        "nombre": "IBEX 35",
        "tendencia": "Alcista" | "Consolidación" | "Bajista",
        "soporte_clave": "ej. 11.500",
        "resistencia_clave": "ej. 12.000",
        "consenso_analistas": "Resumen de lo que opinan los analistas..."
      },
      {
        "nombre": "DAX",
        "tendencia": "Alcista" | "Consolidación" | "Bajista",
        "soporte_clave": "ej. 19.000",
        "resistencia_clave": "ej. 19.600",
        "consenso_analistas": "..."
      },
      {
        "nombre": "S&P 500",
        "tendencia": "Alcista" | "Consolidación" | "Bajista",
        "soporte_clave": "...",
        "resistencia_clave": "...",
        "consenso_analistas": "..."
      },
      {
        "nombre": "Nasdaq 100",
        "tendencia": "Alcista" | "Consolidación" | "Bajista",
        "soporte_clave": "...",
        "resistencia_clave": "...",
        "consenso_analistas": "..."
      }
    ],
    "coincidencias_estrategia": "Puntos donde los analistas coinciden en su enfoque operativo...",
    "divergencias_estrategia": "Puntos de desacuerdo o visiones contrarias detectadas..."
  },
  "analisis_empresas": {
    "nacionales": [
      {
        "nombre": "Nombre de la empresa (ej. Telefónica, Iberdrola)",
        "ticker": "TEF.MC",
        "menciones": 3,
        "analistas": ["Roberto Moro", "Alberto Iturralde"],
        "nivel_consenso": "Alto Consenso Alcista" | "Consenso Neutral" | "Divergencia" | "Consenso Bajista",
        "soporte": "ej. 4.10€",
        "resistencia": "ej. 4.45€",
        "recomendacion": "Mantener / Comprar en corrección / Evitar",
        "tesis": "Detalle técnico y fundamental compartido por los analistas..."
      }
    ],
    "internacionales": [
      {
        "nombre": "Nombre de la empresa (ej. Nvidia, Apple, ASML)",
        "ticker": "NVDA",
        "menciones": 4,
        "analistas": ["Sito Rodríguez", "Alberto Iturralde"],
        "nivel_consenso": "Alto Consenso Alcista",
        "soporte": "...",
        "resistencia": "...",
        "recomendacion": "...",
        "tesis": "..."
      }
    ]
  },
  "guion_podcast": [
    {
      "locutor": "Voz 1",
      "genero": "masculino",
      "texto": "¡Hola a todos, y bienvenidos a este repaso semanal de mercado! Hoy analizamos las claves operativas y el quórum de los principales consultorios bursátiles..."
    },
    {
      "locutor": "Voz 2",
      "genero": "femenino",
      "texto": "Efectivamente. Han sido jornadas de máxima intensidad en los parqués, con la mirada puesta en los niveles clave del IBEX y Wall Street..."
    }
  ]
}

REGLAS CRÍTICAS DE ORDENACIÓN Y CALIDAD:
1. FORMATO DE ANALISTAS: Al citar o listar analistas, usa SIEMPRE la inicial del nombre y el apellido (ej. 'R. Moro', 'A. Iturralde', 'S. Rodríguez', 'J. Alfayate', 'V. Galán', 'P. Pérez'), nunca el nombre de pila completo.
2. En 'resumen_ejecutivo' y 'sentimiento_macro', UTILIZA SIEMPRE BULLETS (viñetas con '• ') para desglosar la síntesis, las directrices y la situación global. La lectura debe ser ágil y ejecutiva, estructurada con viñetas claras.
3. En 'analisis_empresas', divide estrictamente en 'nacionales' (IBEX 35 / Mercado Continuo español) e 'internacionales' (EE.UU., Europa, etc.).
4. En cada bloque de empresas, ordena DE MAYOR A MENOR NÚMERO DE MENCIONES (las comentadas por varios analistas primero, y al final las que solo tienen 1 mención).
5. En el 'guion_podcast', genera un diálogo EXTENSO Y PROFUNDO (entre 18 y 26 intervenciones alternadas) entre dos analistas (voz masculina y voz femenina):
   - REGLA ESTRICTA DE LOCUTORES: NO incluyas nombres propios de los locutores ni en el campo 'locutor' ni dentro del diálogo hablado (prohibido decir 'Hola Carlos', 'Gracias Laura', o nombres similares). Usa simplemente 'Voz 1' y 'Voz 2' en el campo 'locutor'.
   - DICCIÓN Y PUNTUACIÓN: Cuida al máximo los puntos, las comas y los signos de puntuación para que la síntesis de voz (TTS) ejecute pausas y respiraciones naturales, logrando una locución fluida y profesional.
   - Apertura dinámica imitando el ritmo radiofónico de los consultorios de bolsa.
   - Situación macroeconómica detallada (Europa y EE.UU., política monetaria, tipos de interés).
   - Repaso índice por índice (IBEX 35, DAX, S&P 500 y Nasdaq 100) con soportes, resistencias y divergencias.
   - Repaso a fondo de las empresas nacionales con mayor quórum (Iberdrola, bancos, etc.) detallando niveles técnicos y analistas (usando inicial y apellido).
   - Repaso a fondo de las empresas internacionales (Nvidia, ASML, megacaps de IA) analizando las tesis alcistas vs alertas de sobrecompra.
   - Cierre con consejos operativos de gestión de riesgo y stops.
"""

ANALYST_ABBREVIATIONS = {
    "Roberto Moro": "R. Moro",
    "Alberto Iturralde": "A. Iturralde",
    "Javier Alfayate": "J. Alfayate",
    "Víctor Galán": "V. Galán",
    "Victor Galan": "V. Galán",
    "David Galán": "D. Galán",
    "David Galan": "D. Galán",
    "Gerardo Ortega": "G. Ortega",
    "Paco Pérez": "P. Pérez",
    "Paco Perez": "P. Pérez",
    "Manuel Pinto": "M. Pinto",
    "Marc Ribes": "M. Ribes",
    "José María Luna": "J. M. Luna",
    "Jose Maria Luna": "J. M. Luna",
    "Sergio Clatum": "S. Clatum",
    "Jorge del Canto": "J. del Canto",
    "Eduardo Bolinches": "E. Bolinches",
    "Sito Rodríguez": "S. Rodríguez",
    "Sito Rodriguez": "S. Rodríguez",
}

def format_analyst_abbreviations(obj):
    if isinstance(obj, str):
        for full, abbr in ANALYST_ABBREVIATIONS.items():
            obj = obj.replace(full, abbr)
        return obj
    elif isinstance(obj, list):
        return [format_analyst_abbreviations(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: format_analyst_abbreviations(v) for k, v in obj.items()}
    return obj

class MarketAnalyzer:
    """Procesa transcripciones de analistas utilizando la API de Google Gemini."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = GEMINI_MODEL):
        self.api_key = api_key or GEMINI_API_KEY
        self.model_name = model_name
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def analyze_transcripts(self, videos: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Envía las transcripciones acumuladas a Gemini para sintetizar el informe."""
        if not self.client:
            # Si no hay GEMINI_API_KEY, comprobar si existe un análisis real persistido derivado de las transcripciones
            from config import BASE_DIR
            analysis_cache_file = BASE_DIR / "data" / "analysis_cache.json"
            if analysis_cache_file.exists():
                try:
                    with open(analysis_cache_file, "r", encoding="utf-8") as f:
                        cached_data = json.load(f)
                    logger.info("Cargando análisis de consenso real de las 16 fuentes desde data/analysis_cache.json")
                    return cached_data
                except Exception as e:
                    logger.warning(f"Error leyendo analysis_cache.json: {e}")

            raise ValueError(
                "No se encontró GEMINI_API_KEY configurada ni análisis persistido en data/analysis_cache.json. "
                "Por favor, añade tu clave en el archivo .env o expórtala en tu entorno."
            )

        if not videos:
            raise ValueError("No se encontraron vídeos o transcripciones para procesar.")

        # Construir el contexto consolidado de todas las transcripciones
        context_parts = []
        for i, vid in enumerate(videos, start=1):
            context_parts.append(
                f"=== FUENTE {i}: {vid['channel']} ===\n"
                f"Título: {vid['title']}\n"
                f"Fecha de Publicación: {vid['date_formatted']}\n"
                f"URL: {vid['url']}\n"
                f"Transcripción:\n{vid['transcript']}\n"
                f"=========================================\n"
            )

        full_payload = (
            f"A continuación tienes {len(videos)} transcripciones completas de los últimos 14 días.\n"
            f"Procesa todas conjuntamente buscando quórum, consenso de niveles y sentimiento de mercado:\n\n"
            + "\n".join(context_parts)
        )

        logger.info(f"Enviando transcripciones a Gemini ({self.model_name}). Longitud del prompt: {len(full_payload)} caracteres.")

        config = types.GenerateContentConfig(
            system_instruction=FINANCIAL_ANALYST_SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.2, # Baja temperatura para máxima precisión técnica y apego a datos
        )

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=full_payload,
            config=config
        )

        try:
            report_data = json.loads(response.text)
        except Exception as e:
            logger.error(f"Error parseando respuesta JSON de Gemini: {e}\nRespuesta recibida:\n{response.text}")
            raise RuntimeError(f"La respuesta de Gemini no pudo ser parseada como JSON: {e}")

        # Asegurar que fuentes_consultadas esté siempre poblada a partir de los vídeos procesados
        if not report_data.get("fuentes_consultadas"):
            report_data["fuentes_consultadas"] = [
                {
                    "id": vid.get("id", ""),
                    "title": vid.get("title", ""),
                    "channel": vid.get("channel", ""),
                    "date_formatted": vid.get("date_formatted", vid.get("upload_date", "")),
                    "url": vid.get("url", f"https://www.youtube.com/watch?v={vid.get('id', '')}"),
                    "char_count": len(vid.get("transcript", "")),
                    "status": "Transcrito completo" if len(vid.get("transcript", "")) > 0 else "Disponible"
                }
                for vid in videos
            ]

        return format_analyst_abbreviations(report_data)
