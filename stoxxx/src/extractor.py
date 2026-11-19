import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from config import YOUTUBE_CHANNELS, TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

class YouTubeExtractor:
    """
    Extractor de vídeos y transcripciones de canales de bolsa en YouTube.
    Gestiona la persistencia y control de versiones en el repositorio de GitHub (data/transcripts/)
    para asegurar máxima trazabilidad histórica, reproducibilidad y auditoría sin consumo redundante de red.
    """

    def __init__(self, days_horizon: int = 3, cache_dir: Optional[Path] = None):
        self.days_horizon = days_horizon
        # Horizonte en días naturales (ej. 3 días = hoy, ayer y antesdeayer):
        self.cutoff_date = datetime.now() - timedelta(days=max(0, days_horizon - 1))
        self.cutoff_str = self.cutoff_date.strftime("%Y%m%d")
        self.cache_dir = cache_dir or TRANSCRIPTS_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.transcript_api = YouTubeTranscriptApi()

    def get_cached_transcript(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Recupera la transcripción versionada en data/transcripts/ si existe."""
        cache_file = self.cache_dir / f"{video_id}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("transcript") and len(data["transcript"]) > 50:
                        logger.info(f"Transcripción cargada desde repositorio local para vídeo {video_id} ('{data.get('title', '')}')")
                        return data
            except Exception as e:
                logger.warning(f"Error leyendo transcripción en caché {cache_file}: {e}")
        return None

    def save_cached_transcript(self, video_data: Dict[str, Any]) -> Path:
        """Guarda la transcripción y metadatos en un fichero JSON versionado para seguimiento en GitHub."""
        video_id = video_data["id"]
        cache_file = self.cache_dir / f"{video_id}.json"
        payload = {
            "id": video_id,
            "title": video_data.get("title", ""),
            "channel": video_data.get("channel", ""),
            "channel_id": video_data.get("channel_id", ""),
            "upload_date": video_data.get("upload_date", ""),
            "date_formatted": video_data.get("date_formatted", ""),
            "url": video_data.get("url", f"https://www.youtube.com/watch?v={video_id}"),
            "char_count": len(video_data.get("transcript", "")),
            "saved_at": datetime.now().isoformat(),
            "transcript": video_data.get("transcript", "")
        }
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        logger.info(f"Transcripción guardada en fichero: {cache_file} ({payload['char_count']} caracteres)")
        return cache_file

    def get_channel_videos(self, channel_cfg: Dict[str, Any], max_items: int = 40) -> List[Dict[str, Any]]:
        """Extrae la lista de vídeos recientes que cumplen con la fecha y palabras clave."""
        channel_name = channel_cfg["name"]
        channel_url = channel_cfg["url"]
        keywords = [k.lower() for k in channel_cfg.get("keywords", [])]

        ydl_opts = {
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "playlist_items": f"1-{max_items}",
            "extract_flat": False,
            "ignoreerrors": True,
        }

        matched_videos = []

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                res = ydl.extract_info(channel_url, download=False)
                entries = res.get("entries", []) if res else []

                for entry in entries:
                    if not entry:
                        continue
                    video_id = entry.get("id")
                    title = entry.get("title", "")
                    upload_date = entry.get("upload_date")  # YYYYMMDD
                    
                    if not video_id or not upload_date:
                        continue

                    # Filtrar por fecha
                    if upload_date < self.cutoff_str:
                        continue

                    # Filtrar por palabras clave si están definidas
                    if keywords:
                        title_lower = title.lower()
                        if not any(k in title_lower for k in keywords):
                            continue

                    matched_videos.append({
                        "id": video_id,
                        "title": title,
                        "upload_date": upload_date,
                        "date_formatted": f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:]}",
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "channel": channel_name,
                        "channel_id": channel_cfg["id"]
                    })

        except Exception as e:
            logger.error(f"Error extrayendo vídeos de {channel_name}: {e}")

        return matched_videos

    def get_transcript(self, video_id: str, video_meta: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Descarga o recupera de fichero local la transcripción de un vídeo."""
        # 1. Comprobar si ya existe en fichero guardado en la carpeta de transcripciones
        cached = self.get_cached_transcript(video_id)
        if cached:
            return cached["transcript"]

        # 2. Si no está en disco, intentar descarga directa de YouTube
        text = None
        try:
            fetched = self.transcript_api.fetch(video_id, languages=("es", "es-ES", "es-419"))
            text = " ".join([snippet.text.strip() for snippet in fetched.snippets if snippet.text.strip()])
        except Exception:
            try:
                transcript_list = self.transcript_api.list(video_id)
                transcript = None
                for t in transcript_list:
                    if t.language_code.startswith("es"):
                        transcript = t
                        break
                if not transcript:
                    for t in transcript_list:
                        if t.is_translatable:
                            transcript = t.translate("es")
                            break

                if transcript:
                    fetched = transcript.fetch()
                    text = " ".join([snippet.text.strip() for snippet in fetched.snippets if snippet.text.strip()])
            except Exception as inner_e:
                logger.warning(f"No se pudo descargar transcripción online para {video_id}: {inner_e}")

        # 3. Si se obtuvo, persistir inmediatamente a fichero
        if text and len(text) > 50:
            meta = video_meta.copy() if video_meta else {}
            meta["id"] = video_id
            meta["transcript"] = text
            self.save_cached_transcript(meta)
            return text

        return None

    def load_all_cached_transcripts(self) -> List[Dict[str, Any]]:
        """Carga todas las transcripciones en disco que pertenezcan al horizonte temporal."""
        cached_list = []
        if not self.cache_dir.exists():
            return []
        
        for json_file in self.cache_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    u_date = data.get("upload_date", "")
                    if u_date and u_date >= self.cutoff_str:
                        cached_list.append(data)
            except Exception as e:
                logger.debug(f"Error leyendo {json_file}: {e}")

        # Ordenar por fecha descendente
        cached_list.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
        return cached_list

    def extract_with_status(self) -> Dict[str, Any]:
        """
        Extrae vídeos y transcripciones de todos los canales y devuelve un estado completo:
        - videos_obtenidos: lista de vídeos con transcripción válida.
        - videos_faltantes: lista de vídeos cuya transcripción no pudo descargarse.
        - total_localizados: total de vídeos encontrados en el horizonte.
        - de_disco_count: cantidad recuperada de ficheros locales.
        - descargados_count: cantidad descargada nueva de la red.
        """
        videos_obtenidos = []
        videos_faltantes = []
        de_disco_count = 0
        descargados_count = 0
        total_localizados = 0

        for channel in YOUTUBE_CHANNELS:
            vids = self.get_channel_videos(channel)
            total_localizados += len(vids)
            logger.info(f"Canal {channel['name']}: {len(vids)} vídeos localizados en los últimos {self.days_horizon} días.")

            for video in vids:
                cached = self.get_cached_transcript(video["id"])
                if cached:
                    video["transcript"] = cached["transcript"]
                    video["char_count"] = len(cached["transcript"])
                    videos_obtenidos.append(video)
                    de_disco_count += 1
                else:
                    transcript = self.get_transcript(video["id"], video_meta=video)
                    if transcript and len(transcript) > 100:
                        video["transcript"] = transcript
                        video["char_count"] = len(transcript)
                        videos_obtenidos.append(video)
                        descargados_count += 1
                    else:
                        videos_faltantes.append({
                            "id": video["id"],
                            "title": video["title"],
                            "channel": video.get("channel", ""),
                            "url": video.get("url", "")
                        })

        # Si no hubo vídeos nuevos descargados pero tenemos cacheados en disco dentro del rango
        if not videos_obtenidos:
            cached_available = self.load_all_cached_transcripts()
            if cached_available:
                logger.info(f"Se reutilizan {len(cached_available)} transcripciones persistidas en {self.cache_dir}")
                videos_obtenidos = cached_available
                de_disco_count = len(cached_available)

        return {
            "total_localizados": total_localizados,
            "videos_obtenidos": videos_obtenidos,
            "videos_faltantes": videos_faltantes,
            "de_disco_count": de_disco_count,
            "descargados_count": descargados_count
        }

    def extract_all(self) -> List[Dict[str, Any]]:
        """Extrae vídeos y transcripciones de todos los canales, usando caché de disco como prioridad."""
        status = self.extract_with_status()
        return status["videos_obtenidos"]
