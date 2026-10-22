from types import SimpleNamespace

from src.services.rag.stream_markers import (
    THINK_END,
    THINK_START,
    mark_thinking,
    message_field,
)


def run(pairs):
    return list(mark_thinking(pairs))


def test_answer_only_has_no_markers():
    assert run([("", "Hel"), ("", "lo")]) == ["Hel", "lo"]


def test_thinking_is_wrapped_and_closed_before_answer():
    out = run([("let me ", ""), ("think", ""), ("", "Answer"), ("", "!")])
    assert out == [THINK_START, "let me ", "think", THINK_END, "Answer", "!"]


def test_stream_that_ends_while_thinking_is_closed():
    assert run([("hmm", "")]) == [THINK_START, "hmm", THINK_END]


def test_chunk_with_both_thinking_and_content():
    assert run([("t", "a")]) == [THINK_START, "t", THINK_END, "a"]


def test_markers_are_single_control_characters():
    assert len(THINK_START) == len(THINK_END) == 1
    assert THINK_START != THINK_END


def test_message_field_supports_dicts_and_model_objects():
    assert message_field({"content": "hi"}, "content") == "hi"
    assert message_field({"content": "hi"}, "thinking") == ""
    assert message_field({"thinking": None}, "thinking") == ""
    assert message_field(None, "content") == ""
    assert message_field(SimpleNamespace(thinking="reasoning"), "thinking") == "reasoning"


def test_ollama_stream_uses_reasoning_context_setting_and_model_objects(monkeypatch):
    from src.services.rag import llm

    captured = {}

    def chat(**kwargs):
        captured.update(kwargs)
        return iter(
            [
                SimpleNamespace(
                    message=SimpleNamespace(thinking="reason", content="answer")
                )
            ]
        )

    monkeypatch.setattr(llm, "client_ollama", SimpleNamespace(chat=chat))
    monkeypatch.setattr(llm.settings, "OLLAMA_NUM_CTX", 4096)

    stream = llm.GenerationModel(None, "qwen").generate_ollama_stream(
        "prompt", think=True
    )

    assert list(stream) == [THINK_START, "reason", THINK_END, "answer"]
    assert captured["think"] is True
    assert captured["options"] == {"num_ctx": 4096}
