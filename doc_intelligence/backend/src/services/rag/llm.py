import os
from typing import Iterator, Optional

from openai import OpenAI
from anthropic import Anthropic
from ollama import Client
from google.genai import Client as GeminiClient

from schemas.env_schema import settings

# -------------------------
# Client setup
# -------------------------
def safe_openai_client() -> Optional[OpenAI]:
    key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if not key or not key.strip():
        return None
    return OpenAI(api_key=key)


def safe_claude_client() -> Optional[Anthropic]:
    key = settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")
    if not key or not key.strip():
        return None
    return Anthropic(api_key=key)


def safe_gemini_client():
    key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if key is None or key.strip() == "":
        return None
    return GeminiClient(api_key=key)

def safe_ollama_client() -> Client:
    host = settings.OLLAMA_HOST or os.getenv("OLLAMA_HOST")
    return Client(host=host) if host else Client()


client_openai = safe_openai_client()
client_claude = safe_claude_client()
client_gemini = safe_gemini_client()
client_ollama = safe_ollama_client()


class GenerationModel:
    """Prompt building + multi-provider generation with sane defaults."""
    def __init__(
        self, 
        rewrite_model: str,
        generation_model: str
    ):
        # -------------------------
        # Model config
        # -------------------------
        self.rewrite_model = rewrite_model
        self.generation_model = generation_model

    # -------------------------
    # Prompt builders
    # -------------------------
    def build_prompt(self, query: str, context: str) -> str:
        return (
            "You are a helpful assistant. Use ONLY the context below to answer the question.\n\n"
            f"Context:\n{context}\n\n"
            f"Question:\n{query}\n\n"
            "Answer:\n"
        )

    def _query_rephrase_prompt(self, query: str) -> str:
        return (
            "Correct only the grammar and spelling of the question below.\n"
            "Do not answer the question. Do not add explanations, preamble, or quotation marks.\n"
            "If the question is already grammatically correct, return it unchanged.\n\n"
            f"Question: {query}\n"
            "Corrected question:\n"
        )

    # -------------------------
    # Query rephrase (local, fast)
    # -------------------------
    def rephrase_query(self, query: str) -> str:
        prompt = self._query_rephrase_prompt(query)
        res = client_ollama.chat(
            model=self.rewrite_model,
            messages=[{"role": "user", "content": prompt}],
            stream=False,
            keep_alive=300,
        )
        return res["message"]["content"]

    # -------------------------
    # OpenAI (streaming)
    # -------------------------
    def generate_openai_stream(self, prompt: str) -> Iterator[str]:
        if client_openai is None:
            raise RuntimeError("OpenAI is not configured")

        stream = client_openai.chat.completions.create(
            model=self.generation_model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def generate_openai(self, prompt: str) -> str:
        return "".join(self.generate_openai_stream(prompt))

    # -------------------------
    # Claude (streaming)
    # -------------------------
    def generate_claude_stream(self, prompt: str) -> Iterator[str]:
        if client_claude is None:
            raise RuntimeError("Claude is not configured")

        with client_claude.messages.stream(
            model=self.generation_model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text_chunk in stream.text_stream:
                yield text_chunk

    def generate_claude(self, prompt: str) -> str:
        return "".join(self.generate_claude_stream(prompt))

    # -------------------------
    # Gemini (streaming)
    # -------------------------
    def generate_gemini_stream(self, prompt: str) -> Iterator[str]:
        if client_gemini is None:
            raise RuntimeError("Gemini is not configured")

        response = client_gemini.models.generate(
            model=self.generation_model,  # FIXED
            contents=prompt,
            stream=True,
        )

        for chunk in response:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text

    def generate_gemini(self, prompt: str) -> str:
        return "".join(self.generate_gemini_stream(prompt))

    # -------------------------
    # Ollama (local, streaming)
    # -------------------------
    def generate_ollama_stream(self, prompt: str) -> Iterator[str]:
        stream = client_ollama.chat(
            model=self.generation_model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            keep_alive=300,  # keep model loaded for 5 minutes
        )
        for chunk in stream:
            yield chunk["message"]["content"]

    def generate_ollama(self, prompt: str) -> str:
        return "".join(self.generate_ollama_stream(prompt))
