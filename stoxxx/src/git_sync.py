import os
import subprocess
import logging
from typing import Tuple

from config import BASE_DIR, TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

class GitSynchronizer:
    """Maneja la sincronización automática de Git para GitHub Pages y la persistencia de transcripciones e informes."""

    @staticmethod
    def sync_to_github(date_str: str) -> Tuple[bool, str]:
        """Ejecuta git add (incluyendo transcripciones), git commit y git push automáticamente."""
        try:
            # Configurar entorno para soportar particiones y contenedores
            git_env = os.environ.copy()
            git_env["GIT_DISCOVERY_ACROSS_FILESYSTEM"] = "1"

            # 1. Comprobar si hay cambios en el directorio del proyecto
            status_res = subprocess.run(
                ["git", "status", "--porcelain", "."],
                cwd=str(BASE_DIR),
                env=git_env,
                capture_output=True,
                text=True,
                check=True
            )

            if not status_res.stdout.strip():
                logger.info("No se detectaron cambios pendientes en el árbol de trabajo de Git.")
                return True, "Árbol limpio, nada que publicar."

            # 2. git add (incluyendo data/transcripts explícitamente y todo el proyecto)
            logger.info("Añadiendo archivos modificados y transcripciones a Git staging...")
            subprocess.run(
                ["git", "add", "."],
                cwd=str(BASE_DIR),
                env=git_env,
                check=True,
                capture_output=True,
                text=True
            )

            if TRANSCRIPTS_DIR.exists():
                subprocess.run(
                    ["git", "add", str(TRANSCRIPTS_DIR)],
                    cwd=str(BASE_DIR),
                    env=git_env,
                    check=True,
                    capture_output=True,
                    text=True
                )

            # 3. git commit
            commit_msg = f"feat(stoxxx): publicar informe bursátil y transcripciones {date_str}"
            logger.info(f"Creando commit: '{commit_msg}'...")
            subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=str(BASE_DIR),
                env=git_env,
                check=True,
                capture_output=True,
                text=True
            )

            # 4. git push
            logger.info("Enviando cambios a GitHub (git push origin main)...")
            push_res = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=str(BASE_DIR),
                env=git_env,
                capture_output=True,
                text=True,
                check=True
            )

            success_msg = f"Cambios publicados con éxito en GitHub Pages: {push_res.stdout.strip()}"
            logger.info(success_msg)
            return True, success_msg

        except subprocess.CalledProcessError as e:
            err_msg = f"Error en la sincronización de Git: {e.stderr or e.stdout or str(e)}"
            logger.error(err_msg)
            return False, err_msg
        except Exception as e:
            err_msg = f"Excepción durante git push: {e}"
            logger.error(err_msg)
            return False, err_msg
