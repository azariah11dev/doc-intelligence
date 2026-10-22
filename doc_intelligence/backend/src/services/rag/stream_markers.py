"""Helpers for streaming a model's reasoning alongside its answer."""

from collections.abc import Iterable, Iterator
from typing import Any

THINK_START = "\u0002"
THINK_END = "\u0003"


def message_field(message: Any, name: str) -> Any:
    """Read a field from an Ollama message represented as a dict or model."""
    if isinstance(message, dict):
        value = message.get(name)
    else:
        value = getattr(message, name, None)
    return value or ""


def mark_thinking(pairs: Iterable[tuple[str, str]]) -> Iterator[str]:
    """Wrap reasoning text in markers, closing it before answer text."""
    in_think = False
    for thinking, content in pairs:
        if thinking:
            if not in_think:
                in_think = True
                yield THINK_START
            yield thinking
        if content:
            if in_think:
                in_think = False
                yield THINK_END
            yield content
    if in_think:
        yield THINK_END
