import logging
from pathlib import Path
from pydantic import BaseModel

LOG_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "models"
    / "error_logs"
)

LOG_DIR.mkdir(parents=True, exist_ok=True)


# Error logger
error_logger = logging.getLogger("app_error")
error_logger.setLevel(logging.ERROR)

if not error_logger.handlers:
    error_handler = logging.FileHandler(LOG_DIR / "errors.log")

    error_handler.setFormatter(
        logging.Formatter(
            "\n\n====================================\n"
            "%(asctime)s | %(levelname)s | %(message)s"
        )
    )

    error_logger.addHandler(error_handler)


# Timing logger
timing_logger = logging.getLogger("app_timing")
timing_logger.setLevel(logging.INFO)

if not timing_logger.handlers:
    timing_handler = logging.FileHandler(LOG_DIR / "timer.log")

    timing_handler.setFormatter(
        logging.Formatter(
            "\n\n====================================\n"
            "%(asctime)s | %(message)s"
        )
    )

    timing_logger.addHandler(timing_handler)


def generate_logs(error: Exception | str, endpoint: str):
    error_logger.error(
        f"Endpoint: {endpoint} | "
        f"Error Type: {type(error).__name__} | "
        f"Error: {error}"
    )


class GenerationTiming(BaseModel):
    rewrite_s: float
    retrieve_s: float
    first_chunk_s: float | None = None
    first_answer_s: float | None = None
    total_s: float
    think: bool

def log_generation_time(data: GenerationTiming):
    timing_logger.info(
        "answer timing | rewrite=%.1fs retrieve=%.1fs "
        "first_chunk=%s first_answer=%s total=%.1fs think=%s",
        data.rewrite_s,
        data.retrieve_s,
        "n/a" if data.first_chunk_s is None else f"{data.first_chunk_s:.1f}s",
        "n/a" if data.first_answer_s is None else f"{data.first_answer_s:.1f}s",
        data.total_s,
        data.think,
    )