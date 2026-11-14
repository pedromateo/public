import subprocess
import logging
from typing import Tuple

from config import BASE_DIR

logger = logging.getLogger(__name__)

class GitSynchronizer:
    """Maneja la sincronización automática de Git para GitHub Pages."""

    @staticmethod
    def sync_to_github(date_str: str) -> Tuple[bool, str]:
        """Ejecuta git add, git commit y git push automáticamente."""
        try:
            # 1. Comprobar si hay cambios en el directorio del proyecto
            status_res = subprocess.run(
                ["git", "status", "--porcelain", "."],
                cwd=str(BASE_DIR),
                capture_output=True,
                text=True,
                check=True
            )

            if not status_res.stdout.strip():
                logger.info("No se detectaron cambios pendientes en el árbol de trabajo de Git.")
                return True, "Árbol limpio, nada que publicar."

            # 2. git add
            logger.info("Añadiendo archivos modificados a Git staging...")
            subprocess.run(
                ["git", "add", "."],
                cwd=str(BASE_DIR),
                check=True,
                capture_output=True,
                text=True
            )

            # 3. git commit
            commit_msg = f"feat(stoxxx): publicar informe bursátil {date_str} [skip ci]"
            logger.info(f"Creando commit: '{commit_msg}'...")
            subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=str(BASE_DIR),
                check=True,
                capture_output=True,
                text=True
            )

            # 4. git push
            logger.info("Enviando cambios a GitHub (git push origin main)...")
            push_res = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=str(BASE_DIR),
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
