import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import edge_tts
from config import AUDIO_DIR, TTS_PROVIDER, TTS_VOICE_MALE, TTS_VOICE_FEMALE

logger = logging.getLogger(__name__)

class PodcastGenerator:
    """Generador del podcast en formato MP3 con diálogo dual (hombre y mujer)."""

    def __init__(
        self,
        provider: str = TTS_PROVIDER,
        voice_male: str = TTS_VOICE_MALE,
        voice_female: str = TTS_VOICE_FEMALE
    ):
        self.provider = provider
        self.voice_male = voice_male
        self.voice_female = voice_female

    async def _synthesize_edge_turn(self, text: str, voice: str, output_path: Path) -> bool:
        """Sintetiza un turno de diálogo utilizando Edge-TTS."""
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(output_path))
            return True
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

    async def generate_podcast_async(
        self,
        guion: List[Dict[str, str]],
        date_str: str,
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """Genera el podcast completo combinando todos los turnos de diálogo."""
        target_dir = output_dir or AUDIO_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        final_mp3_path = target_dir / f"podcast-{date_str}.mp3"

        temp_files: List[Path] = []
        temp_dir = target_dir / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            logger.info(f"Iniciando síntesis del podcast ({len(guion)} intervenciones)...")

            for idx, turn in enumerate(guion):
                locutor = turn.get("locutor", "Analista")
                genero = turn.get("genero", "masculino").lower()
                texto = turn.get("texto", "").strip()

                if not texto:
                    continue

                temp_file = temp_dir / f"turn_{idx:03d}_{genero}.mp3"

                try:
                    if self.provider == "google":
                        self._synthesize_google_turn(texto, genero, temp_file)
                    else:
                        voice = self.voice_male if genero == "masculino" else self.voice_female
                        await self._synthesize_edge_turn(texto, voice, temp_file)
                except Exception as e:
                    logger.warning(f"No se pudo conectar con el servicio Edge-TTS: {e}. Continuando sin interrumpir...")

                if temp_file.exists() and temp_file.stat().st_size > 0:
                    temp_files.append(temp_file)
                    logger.debug(f"Turno {idx + 1}/{len(guion)} ({locutor} - {genero}) sintetizado.")

            if not temp_files:
                logger.warning("No se pudo conectar con el servicio Edge-TTS o generar fragmentos de audio. Continuando sin interrumpir...")
                return None

            # Unir todos los segmentos MP3
            logger.info(f"Ensamblando {len(temp_files)} fragmentos de audio en {final_mp3_path}...")
            with open(final_mp3_path, "wb") as outfile:
                for tf in temp_files:
                    if tf.exists():
                        with open(tf, "rb") as infile:
                            outfile.write(infile.read())

            logger.info(f"Podcast generado con éxito: {final_mp3_path} ({final_mp3_path.stat().st_size} bytes)")
            return final_mp3_path

        except Exception as e:
            logger.warning(f"No se pudo conectar con el servicio Edge-TTS: {e}. Continuando sin interrumpir...")
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
            logger.warning(f"No se pudo conectar con el servicio Edge-TTS: {e}. Continuando sin interrumpir...")
            return None
