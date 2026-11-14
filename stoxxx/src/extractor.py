import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from config import YOUTUBE_CHANNELS

logger = logging.getLogger(__name__)

class YouTubeExtractor:
    """Extractor de vídeos y transcripciones de canales de bolsa en YouTube."""

    def __init__(self, days_horizon: int = 14):
        self.days_horizon = days_horizon
        self.cutoff_date = datetime.now() - timedelta(days=days_horizon)
        self.transcript_api = YouTubeTranscriptApi()

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
        cutoff_str = self.cutoff_date.strftime("%Y%m%d")

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
                    if upload_date < cutoff_str:
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

    def get_transcript(self, video_id: str) -> Optional[str]:
        """Descarga la transcripción en español (o inglés con traducción) de un vídeo."""
        try:
            # Intento directo en español
            fetched = self.transcript_api.fetch(video_id, languages=("es", "es-ES", "es-419"))
            text = " ".join([snippet.text.strip() for snippet in fetched.snippets if snippet.text.strip()])
            return text
        except Exception:
            # Fallback a listado para buscar alternativas o autotraducción
            try:
                transcript_list = self.transcript_api.list(video_id)
                transcript = None
                
                # Intentar manual o generado en español
                for t in transcript_list:
                    if t.language_code.startswith("es"):
                        transcript = t
                        break
                
                # Si no hay español, intentar traducir al español
                if not transcript:
                    for t in transcript_list:
                        if t.is_translatable:
                            transcript = t.translate("es")
                            break

                if transcript:
                    fetched = transcript.fetch()
                    text = " ".join([snippet.text.strip() for snippet in fetched.snippets if snippet.text.strip()])
                    return text
            except Exception as inner_e:
                logger.warning(f"No se pudo obtener transcripción para {video_id}: {inner_e}")
                return None

        return None

    def extract_all(self) -> List[Dict[str, Any]]:
        """Extrae vídeos y transcripciones de todos los canales configurados."""
        results = []
        for channel in YOUTUBE_CHANNELS:
            videos = self.get_channel_videos(channel)
            logger.info(f"Canal {channel['name']}: {len(videos)} vídeos localizados en los últimos {self.days_horizon} días.")
            
            for video in videos:
                transcript = self.get_transcript(video["id"])
                if transcript and len(transcript) > 100:
                    video["transcript"] = transcript
                    video["char_count"] = len(transcript)
                    results.append(video)
                else:
                    logger.warning(f"Vídeo omitido por falta de transcripción: {video['title']}")

        return results
