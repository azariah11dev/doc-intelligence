import logging
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "error_logs"
LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger("app")
logger.setLevel(logging.ERROR)

if not logger.handlers:
    handler = logging.FileHandler(LOG_DIR / "errors.log")

    formatter = logging.Formatter(
        "\n\n====================================\n"
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    handler.setFormatter(formatter)
    logger.addHandler(handler)


def generate_logs(error: Exception | str, endpoint: str):
    logger.exception(
        f"Endpoint: {endpoint} | "
        f"Error Type: {type(error).__name__} | "
        f"Error: {error}"
    )