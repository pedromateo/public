#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# STOXXX - Ejecutor Desatendido Periódico con Antigravity CLI (agy)
# ==============================================================================

# 1. Configuración del entorno para ejecución desatendida en cron
export HOME="${HOME:-/home/pit}"
export USER="${USER:-pit}"
export PATH="/home/pit/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# Auto-detectar socket de ssh-agent o keyring si estuviera activo en la sesión de usuario
if [ -z "$SSH_AUTH_SOCK" ]; then
    USER_ID="$(id -u)"
    POSSIBLE_SOCK="$(find /run/user/"$USER_ID" -name "*ssh*" -o -name "*agent*" 2>/dev/null | grep -E "agent|ssh" | head -n 1 || true)"
    if [ -n "$POSSIBLE_SOCK" ] && [ -S "$POSSIBLE_SOCK" ]; then
        export SSH_AUTH_SOCK="$POSSIBLE_SOCK"
    elif [ -f "$HOME/.ssh/environment" ]; then
        # Soporte para keychain o ssh-agent persistido
        # shellcheck disable=SC1090
        . "$HOME/.ssh/environment" >/dev/null 2>&1
    fi
fi

# Git across filesystem boundary si aplica
export GIT_DISCOVERY_ACROSS_FILESYSTEM=1

PROJECT_DIR="/home/pit/dev/public/stoxxx"
LOGS_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOGS_DIR"

TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
LOG_FILE="$LOGS_DIR/cron_stoxxx_${TIMESTAMP}.log"

echo "=== [$(date +'%Y-%m-%d %H:%M:%S')] Inicio de ejecución periódica STOXXX ===" >> "$LOG_FILE"
echo "Directorio de trabajo: $PROJECT_DIR" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# 2. Invocación de Antigravity CLI (agy) en modo desatendido
# Flags utilizadas:
#   --mode auto: El agente tiene autonomía para ejecutar herramientas y resolver incidencias
#   --dangerously-skip-permissions: Auto-aprueba herramientas sin requerir interacción humana
#   -p / --print: Ejecuta el prompt de forma no interactiva
AGY_BIN="/home/pit/.local/bin/agy"
if [ ! -x "$AGY_BIN" ]; then
    AGY_BIN="$(which agy || true)"
fi

if [ -z "$AGY_BIN" ] || [ ! -x "$AGY_BIN" ]; then
    echo "ERROR: No se encontró el binario 'agy' en el PATH ni en /home/pit/.local/bin/agy" >> "$LOG_FILE"
    exit 1
fi

PROMPT_TEXT="Ejecuta el pipeline completo de STOXXX en /home/pit/dev/public/stoxxx mediante el comando '.venv/bin/python main.py --push'. Verifica que la extracción de transcripciones, la maquetación del informe PDF, la síntesis del podcast MP3, la actualización de la web estática y el despliegue automático en GitHub Pages se completen con éxito. Si detectas algún problema recuperable, corrígelo y completa la publicación."

echo "Invocando agy en modo desatendido..." >> "$LOG_FILE"
"$AGY_BIN" \
    --mode auto \
    --dangerously-skip-permissions \
    -p "$PROMPT_TEXT" \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "=== [$(date +'%Y-%m-%d %H:%M:%S')] Fin de ejecución (Código de salida: $EXIT_CODE) ===" >> "$LOG_FILE"

# Opcional: Mantener únicamente los últimos 30 archivos de log para evitar saturación de disco
find "$LOGS_DIR" -name "cron_stoxxx_*.log" -type f -mtime +30 -delete 2>/dev/null || true

exit $EXIT_CODE
