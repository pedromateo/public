import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Directorios de salida
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
PDF_DIR = REPORTS_DIR / "pdf"
AUDIO_DIR = REPORTS_DIR / "audio"
HTML_DIR = REPORTS_DIR / "html"
REPORTS_JSON = DATA_DIR / "reports.json"
INDEX_HTML = BASE_DIR / "index.html"
TEMPLATES_DIR = BASE_DIR / "templates"

# Asegurar existencia de directorios
for directory in [DATA_DIR, REPORTS_DIR, PDF_DIR, AUDIO_DIR, HTML_DIR, TEMPLATES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Canales de YouTube a monitorizar
YOUTUBE_CHANNELS = [
    {
        "id": "capital_radio",
        "name": "Capital Radio - Consultorios de Bolsa",
        "url": "https://www.youtube.com/@CapitalRadioB/videos",
        "keywords": [
            "consultorio", "bolsa", "iturralde", "moro", "alfayate", 
            "ortega", "ibex", "mercado", "valores"
        ]
    },
    {
        "id": "visionarios_bolsa",
        "name": "Visionarios Bolsa",
        "url": "https://www.youtube.com/@VisionariosBolsa/videos",
        "keywords": [] # Todos los vídeos del canal en el horizonte
    }
]

# Configuración de ejecución
DEFAULT_HORIZON_DAYS = int(os.getenv("DAYS_HORIZON", "14"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Configuración TTS
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge").lower()
TTS_VOICE_MALE = os.getenv("TTS_VOICE_MALE", "es-ES-AlvaroNeural")
TTS_VOICE_FEMALE = os.getenv("TTS_VOICE_FEMALE", "es-ES-ElviraNeural")

# Git deployment
AUTO_GIT_PUSH = os.getenv("AUTO_GIT_PUSH", "false").lower() in ("true", "1", "yes")
