#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# agenda.murcia - Ejecutor Desatendido Periódico con Antigravity CLI (agy)
# ==============================================================================

# 1. Configuración del entorno para ejecución desatendida en cron
export HOME="${HOME:-/home/pit}"
export USER="${USER:-pit}"
export PATH="/home/pit/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export GIT_DISCOVERY_ACROSS_FILESYSTEM=1
export AGENDA_WORKERS="${AGENDA_WORKERS:-24}"

# Auto-detectar socket de ssh-agent o keyring si estuviera activo en la sesión de usuario
if [ -z "${SSH_AUTH_SOCK:-}" ]; then
    USER_ID="$(id -u)"
    POSSIBLE_SOCK="$(find /run/user/"$USER_ID" -name "*ssh*" -o -name "*agent*" 2>/dev/null | grep -E "agent|ssh" | head -n 1 || true)"
    if [ -n "$POSSIBLE_SOCK" ] && [ -S "$POSSIBLE_SOCK" ]; then
        export SSH_AUTH_SOCK="$POSSIBLE_SOCK"
    elif [ -f "$HOME/.ssh/environment" ]; then
        # Soporte para keychain o ssh-agent persistido
        # shellcheck disable=SC1090
        . "$HOME/.ssh/environment" >/dev/null 2>&1 || true
    fi
fi

PROJECT_DIR="/home/pit/dev/public/agendamurcia"
LOGS_DIR="$PROJECT_DIR/logs"
LOCK_FILE="/tmp/agendamurcia_cron.lock"
mkdir -p "$LOGS_DIR"

# 2. Bloqueo exclusivo para evitar ejecuciones simultáneas
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Ejecución omitida: ya hay otra instancia en curso ($LOCK_FILE bloqueado)." >> "$LOGS_DIR/cron_general.log"
    exit 0
fi

TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
LOG_FILE="$LOGS_DIR/cron_agendamurcia_${TIMESTAMP}.log"

echo "=== [$(date +'%Y-%m-%d %H:%M:%S')] Inicio de ejecución periódica agenda.murcia ===" >> "$LOG_FILE"
echo "Directorio de trabajo: $PROJECT_DIR (AGENDA_WORKERS=$AGENDA_WORKERS)" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# 3. Localizar binario agy
AGY_BIN="/home/pit/.local/bin/agy"
if [ ! -x "$AGY_BIN" ]; then
    AGY_BIN="$(which agy || true)"
fi

if [ -z "$AGY_BIN" ] || [ ! -x "$AGY_BIN" ]; then
    echo "ERROR: No se encontró el binario 'agy' en el PATH ni en /home/pit/.local/bin/agy" >> "$LOG_FILE"
    exit 1
fi

# 4. Invocación de Antigravity CLI (agy) en modo desatendido
PROMPT_TEXT="Ejecuta la actualización periódica de agenda.murcia siguiendo exactamente estos pasos:
1. En /home/pit/dev/public, comprueba si hay cambios locales sin commitear en agendamurcia/; si no los hay, ejecuta 'git pull --rebase'.
2. En /home/pit/dev/public/agendamurcia, ejecuta '.venv/bin/python scrape.py' y revisa la salida en stderr por si alguna fuente falló.
3. Revisa en events.json los eventos nuevos cuya categoría principal sea \"Otros\" (primera etiqueta de 'categorias') y clasifícalos en config.json (clasificacion.etiquetas_manuales o excluir). Sin búsqueda web de eventos nuevos.
4. Repasa events.json para detectar y fusionar posibles duplicados (añadiendo alias en config.json -> recintos.alias / recintos.direcciones o ajustando consolidate.py si procede).
5. Si se modificó config.json o consolidate.py, regenera con '.venv/bin/python scrape.py --retag'.
6. Ejecuta '.venv/bin/python -m pytest tests -q' y verifica que todos los tests pasan.
7. Si hay cambios en agendamurcia/, haz 'git add' de agendamurcia/events.json, agendamurcia/events.js, agendamurcia/config.json (y agendamurcia/consolidate.py si se tocó), 'git commit -m \"chore(agendamurcia): actualizar eventos\"' y 'git push'."

echo "Invocando agy en modo desatendido..." >> "$LOG_FILE"
if "$AGY_BIN" \
    --mode auto \
    --dangerously-skip-permissions \
    --print-timeout 45m \
    -p "$PROMPT_TEXT" \
    >> "$LOG_FILE" 2>&1; then
    EXIT_CODE=0
else
    EXIT_CODE=$?
fi

echo "=== [$(date +'%Y-%m-%d %H:%M:%S')] Fin de ejecución (Código de salida: $EXIT_CODE) ===" >> "$LOG_FILE"

# Rotación de logs: eliminar cron_agendamurcia_*.log con más de 30 días
find "$LOGS_DIR" -name "cron_agendamurcia_*.log" -type f -mtime +30 -delete 2>/dev/null || true

exit "$EXIT_CODE"
