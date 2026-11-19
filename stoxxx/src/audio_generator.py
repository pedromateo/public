import asyncio
import logging
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
import edge_tts
from config import AUDIO_DIR, TTS_PROVIDER, TTS_VOICE_MALE, TTS_VOICE_FEMALE

logger = logging.getLogger(__name__)

# Mapeo de abreviaturas de analistas a nombres completos para síntesis de voz natural
try:
    from src.analyzer import ANALYST_ABBREVIATIONS
except ImportError:
    ANALYST_ABBREVIATIONS = {}

ANALYST_EXPANSIONS: Dict[str, str] = {
    abbr: name for name, abbr in ANALYST_ABBREVIATIONS.items()
}
# Ampliaciones canónicas adicionales
ANALYST_EXPANSIONS.update({
    "D. Galán": "David Galán",
    "D. Galan": "David Galán",
    "M. Pinto": "Manuel Pinto",
    "R. Moro": "Roberto Moro",
    "A. Iturralde": "Alberto Iturralde",
    "J. Alfayate": "Javier Alfayate",
    "V. Galán": "Víctor Galán",
    "V. Galan": "Víctor Galán",
    "G. Ortega": "Gerardo Ortega",
    "P. Pérez": "Paco Pérez",
    "P. Perez": "Paco Pérez",
    "M. Ribes": "Marc Ribes",
    "J. M. Luna": "José María Luna",
    "J.M. Luna": "José María Luna",
    "S. Clatum": "Sergio Clatum",
    "J. del Canto": "Jorge del Canto",
    "E. Bolinches": "Eduardo Bolinches",
    "S. Rodríguez": "Sito Rodríguez",
    "S. Rodriguez": "Sito Rodríguez",
})

# Abreviaturas comunes en español para locución fluida
COMMON_ABBREVIATIONS = [
    (r"\bEE\.UU\.", "Estados Unidos"),
    (r"\bEE\. UU\.", "Estados Unidos"),
    (r"\bEUA\b", "Estados Unidos"),
    (r"\bp\.?\s*ej\.?", "por ejemplo"),
    (r"\baprox\.", "aproximadamente"),
    (r"\bn[úu]m\.", "número"),
    (r"\bn[º°]\b", "número"),
    (r"\bN[º°]\b", "número"),
    (r"\bvs\.?\b", "frente a"),
    (r"\bSr\.", "Señor"),
    (r"\bSra\.", "Señora"),
    (r"\bDña\.", "Doña"),
    (r"\bDr\.", "Doctor"),
    (r"\bDra\.", "Doctora"),
    (r"\bpág\.", "página"),
    (r"\bpágs\.", "páginas"),
]


def clean_tts_text(text: str) -> str:
    """
    Sanitiza y normaliza el texto antes de la síntesis TTS para evitar pausas abruptas,
    saltos de línea artificiales y entonaciones rotas.
    """
    if not text:
        return ""

    # 1. Normalizar saltos de línea y retornos de carro a espacios simples
    # (En Edge-TTS, cualquier \n o \r genera un SentenceBoundary artificial con pausa de ~1s)
    cleaned = re.sub(r"[\r\n]+", " ", text)

    # 2. Reemplazo de iniciales y analistas por sus nombres completos
    # Ordenado de mayor a menor longitud para que 'J. M. Luna' se reemplace antes que 'M. Luna'
    for abbr in sorted(ANALYST_EXPANSIONS.keys(), key=len, reverse=True):
        pattern = r"(?<!\w)" + re.escape(abbr) + r"(?!\w)"
        cleaned = re.sub(pattern, ANALYST_EXPANSIONS[abbr], cleaned)

    # 3. Tratamiento de 'etc.' preservando puntuación de fin de frase
    cleaned = re.sub(r"\betc\.\s*,", "etcétera,", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\betc\.(?=\s+[a-záéíóúñ])", "etcétera", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\betc\.", "etcétera.", cleaned, flags=re.IGNORECASE)

    # 4. Abreviaturas comunes
    for pattern, repl in COMMON_ABBREVIATIONS:
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    # 5. Limpieza de elementos markdown
    cleaned = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", cleaned)
    cleaned = re.sub(r"_{1,3}(.*?)_{1,3}", r"\1", cleaned)
    cleaned = re.sub(r"`(.*?)`", r"\1", cleaned)

    # 6. Puntos en iniciales sueltas restantes (evita 'X... pausa... Gómez')
    cleaned = re.sub(r"(?<=\b[A-Z])\.(?=\s+[A-Z][a-záéíóúñ])", "", cleaned)

    # Caso específico para patrones de tipo 'tres D. Rigurosa'
    cleaned = re.sub(r"(?<=\btres D)\.(?=\s+)", ":", cleaned)

    # 7. Eliminar puntos suspensivos que inducen pausas anormalmente largas
    cleaned = re.sub(r"\.{3,}", ".", cleaned)

    # 8. Normalizar espacios múltiples
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned


class PodcastGenerator:
    """Generador del podcast en formato MP3 con diálogo dual (hombre y mujer)."""

    def __init__(
        self,
        provider: str = TTS_PROVIDER,
        voice_male: str = TTS_VOICE_MALE,
        voice_female: str = TTS_VOICE_FEMALE,
        inter_turn_silence_ms: int = 350
    ):
        self.provider = provider
        self.voice_male = voice_male
        self.voice_female = voice_female
        self.inter_turn_silence_ms = inter_turn_silence_ms
        self.ffmpeg_available = shutil.which("ffmpeg") is not None
        if not self.ffmpeg_available:
            logger.warning("ffmpeg no encontrado en el sistema. Se usará concatenación simple de archivos.")

    def clean_text(self, text: str) -> str:
        """Sanitiza el texto de un turno para síntesis fluida."""
        return clean_tts_text(text)

    def save_script_markdown(
        self,
        guion: List[Dict[str, str]],
        date_str: str,
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """
        Guarda el guion del podcast en formato Markdown (.md) junto al archivo MP3.
        No accesible desde la web pública; accesible directamente vía repositorio Git.
        """
        if not guion:
            return None
        target_dir = output_dir or AUDIO_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        md_path = target_dir / f"podcast-{date_str}.md"

        lines = [
            f"# Guion del Podcast - {date_str}",
            "",
            f"- **Fecha:** {date_str}",
            "- **Formato:** Diálogo dual (Voz 1 - Masculino, Voz 2 - Femenino)",
            f"- **Archivo de audio asociado:** `podcast-{date_str}.mp3`",
            f"- **Total de intervenciones:** {len(guion)}",
            "",
            "---",
            "",
            "### Diálogo",
            "",
        ]

        for turn in guion:
            locutor = turn.get("locutor", "Locutor")
            texto = turn.get("texto", "").strip()
            lines.append(f"**{locutor}**: {texto}\n")

        md_path.write_text("\n".join(lines), encoding="utf-8")
        logger.info(f"Guion del podcast guardado en Markdown: {md_path}")
        return md_path

    async def _synthesize_edge_turn(self, text: str, voice: str, output_path: Path) -> bool:
        """Sintetiza un turno de diálogo utilizando Edge-TTS."""
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(output_path))
            return output_path.exists() and output_path.stat().st_size > 0
        except Exception as e:
            logger.warning(f"No se pudo conectar con el servicio Edge-TTS: {e}. Continuando sin interrumpir...")
            return False

    def _synthesize_google_turn(self, text: str, gender: str, output_path: Path):
        """Sintetiza un turno utilizando Google Cloud Text-to-Speech si está disponible."""
        try:
            from google.cloud import texttospeech
            client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(text=text)

            voice_name = "es-ES-Neural2-B" if gender == "masculino" else "es-ES-Neural2-C"
            ssml_gender = (
                texttospeech.SsmlVoiceGender.MALE
                if gender == "masculino"
                else texttospeech.SsmlVoiceGender.FEMALE
            )

            voice = texttospeech.VoiceSelectionParams(
                language_code="es-ES",
                name=voice_name,
                ssml_gender=ssml_gender,
            )

            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )

            response = client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            with open(output_path, "wb") as out:
                out.write(response.audio_content)

        except Exception as e:
            logger.warning(f"Google Cloud TTS no disponible o falló ({e}). Usando Edge-TTS como fallback.")
            voice = self.voice_male if gender == "masculino" else self.voice_female
            asyncio.run(self._synthesize_edge_turn(text, voice, output_path))

    def _trim_and_pad_segment(self, input_path: Path, output_path: Path, is_last: bool = False) -> bool:
        """
        Elimina silencios muertos iniciales y comprime cualquier silencio interno o final
        excesivo (>350ms) a una duración controlada y fluida (aprox. 350ms).
        Para el último turno, añade una breve salida suave.
        """
        if not self.ffmpeg_available or not input_path.exists() or input_path.stat().st_size == 0:
            return False

        pause_sec = self.inter_turn_silence_ms / 1000.0
        filter_complex = (
            f"silenceremove=start_periods=1:start_duration=0.03:start_threshold=-40dB,"
            f"silenceremove=stop_periods=-1:stop_duration={pause_sec:.2f}:stop_threshold=-35dB"
        )
        if is_last:
            filter_complex += ",apad=pad_dur=0.5"

        cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-af", filter_complex,
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            str(output_path)
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            return res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0
        except Exception as e:
            logger.debug(f"Fallo al procesar audio con ffmpeg: {e}")
            return False

    def _concat_audio_segments(self, segment_paths: List[Path], output_path: Path) -> bool:
        """Concatena los fragmentos de audio en el archivo final utilizando ffmpeg o concatenación directa."""
        if not segment_paths:
            return False

        if self.ffmpeg_available:
            list_file = output_path.parent / "concat_list.txt"
            try:
                with open(list_file, "w", encoding="utf-8") as f:
                    for sp in segment_paths:
                        f.write(f"file '{sp.resolve()}'\n")

                cmd = [
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(list_file),
                    "-c:a", "libmp3lame",
                    "-b:a", "128k",
                    str(output_path)
                ]
                res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
                if list_file.exists():
                    list_file.unlink()
                if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                    return True
            except Exception as e:
                logger.warning(f"Error en concatenación con ffmpeg: {e}. Usando concatenación cruda.")
                if list_file.exists():
                    list_file.unlink()

        # Fallback a concatenación cruda
        with open(output_path, "wb") as outfile:
            for tf in segment_paths:
                if tf.exists():
                    with open(tf, "rb") as infile:
                        outfile.write(infile.read())
        return output_path.exists() and output_path.stat().st_size > 0

    async def generate_podcast_async(
        self,
        guion: List[Dict[str, str]],
        date_str: str,
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """Genera el podcast completo combinando todos los turnos de diálogo con pausas fluidas y limpias."""
        target_dir = output_dir or AUDIO_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        final_mp3_path = target_dir / f"podcast-{date_str}.mp3"

        # Guardar automáticamente el guion en formato Markdown (.md) junto al MP3
        self.save_script_markdown(guion, date_str, target_dir)

        temp_files: List[Path] = []
        processed_files: List[Path] = []
        temp_dir = target_dir / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            logger.info(f"Iniciando síntesis del podcast ({len(guion)} intervenciones)...")

            valid_turns = []
            for idx, turn in enumerate(guion):
                locutor = turn.get("locutor", "Analista")
                genero = turn.get("genero", "masculino").lower()
                raw_text = turn.get("texto", "").strip()
                cleaned_text = self.clean_text(raw_text)

                if cleaned_text:
                    valid_turns.append((idx, locutor, genero, cleaned_text))

            total_turns = len(valid_turns)
            for turn_i, (idx, locutor, genero, texto) in enumerate(valid_turns):
                raw_temp_file = temp_dir / f"raw_turn_{idx:03d}_{genero}.mp3"
                proc_temp_file = temp_dir / f"proc_turn_{idx:03d}_{genero}.mp3"
                temp_files.append(raw_temp_file)
                temp_files.append(proc_temp_file)

                is_last = (turn_i == total_turns - 1)

                try:
                    if self.provider == "google":
                        self._synthesize_google_turn(texto, genero, raw_temp_file)
                    else:
                        voice = self.voice_male if genero == "masculino" else self.voice_female
                        await self._synthesize_edge_turn(texto, voice, raw_temp_file)
                except Exception as e:
                    logger.warning(f"Error en síntesis del turno {idx}: {e}. Continuando...")

                if raw_temp_file.exists() and raw_temp_file.stat().st_size > 0:
                    # Aplicar recorte de silencios inicial/final y añadir pausa conversacional
                    trimmed = self._trim_and_pad_segment(raw_temp_file, proc_temp_file, is_last=is_last)
                    chosen_file = proc_temp_file if trimmed else raw_temp_file
                    processed_files.append(chosen_file)
                    logger.debug(f"Turno {idx + 1}/{len(guion)} ({locutor} - {genero}) sintetizado y ajustado.")

            if not processed_files:
                logger.warning("No se pudo sintetizar ningún fragmento de audio.")
                return None

            # Ensamblar todos los segmentos
            logger.info(f"Ensamblando {len(processed_files)} fragmentos de audio en {final_mp3_path}...")
            success = self._concat_audio_segments(processed_files, final_mp3_path)

            if success and final_mp3_path.exists():
                logger.info(f"Podcast generado con éxito: {final_mp3_path} ({final_mp3_path.stat().st_size} bytes)")
                return final_mp3_path
            else:
                logger.warning("Fallo al generar el archivo final del podcast.")
                return None

        except Exception as e:
            logger.warning(f"Error durante la generación del podcast: {e}. Continuando sin interrumpir...")
            return None

        finally:
            # Limpiar archivos temporales
            for tf in temp_files:
                if tf.exists():
                    try:
                        tf.unlink()
                    except Exception:
                        pass
            if temp_dir.exists():
                try:
                    temp_dir.rmdir()
                except Exception:
                    pass

    def generate_podcast(
        self,
        guion: List[Dict[str, str]],
        date_str: str,
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """Punto de entrada síncrono para generar el podcast."""
        try:
            return asyncio.run(self.generate_podcast_async(guion, date_str, output_dir))
        except Exception as e:
            logger.warning(f"Error al ejecutar síntesis síncrona: {e}. Continuando sin interrumpir...")
            return None
