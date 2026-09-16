"""Shared Gemini call helper for the Agentic AI procurement workflow.

Deliberately self-contained rather than importing from routes/chat.py: chat.py
is a working, independently-owned route module, and reaching into its
module-level state to share a helper would couple two unrelated features for
a small amount of code reuse. The model-cascade-plus-fallback *pattern* is
copied intentionally (same idea as chat.py's _clean_reply/_fallback_reply),
so behaviour is consistent across the app; the few lines of logic are small
enough that duplicating them is simpler and safer than a cross-module import.

Gemini is used ONLY for natural-language text (explanations, drafted
messages) — never for numbers that feed a database write. If the API key is
missing or every model call fails, callers always get the deterministic
`fallback` text back, so the workflow never blocks on Gemini being available.
"""

import os
import re

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

_MODEL_CANDIDATES = [
    # "-latest" aliases first so this keeps working as the provider retires
    # dated model names (verified live against this API key: gemini-2.0-flash,
    # the model routes/chat.py's cascade also starts with, is already 404
    # Not Found as of this build — chat.py has the same latent issue).
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
]

# Same label-stripping safety net as chat.py — never let a bracketed internal
# label or raw model artifact reach the end user.
_LABEL_PATTERN = re.compile(
    r"^\s*\[.*?(Answer|Guidance|Fallback|Connected|Admin|Data|General|System|Draft|Agent)\S*?\]\s*",
    re.IGNORECASE,
)


def _clean(text: str) -> str:
    text = _LABEL_PATTERN.sub("", text).strip()
    lines = []
    for line in text.split("\n"):
        if line.strip().startswith("* "):
            line = line.replace("* ", "• ", 1)
        line = line.replace("**", "").replace("*", "")
        lines.append(line)
    return "\n".join(lines).strip()


def generate_text(prompt: str, fallback: str) -> tuple[str, bool]:
    """Try Gemini; always return usable text. Returns (text, used_gemini)."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_key_here":
        return fallback, False

    try:
        genai.configure(api_key=api_key)
        for model_name in _MODEL_CANDIDATES:
            try:
                model = genai.GenerativeModel(model_name=model_name)
                response = model.generate_content(prompt)
                if response and getattr(response, "text", None):
                    cleaned = _clean(response.text)
                    if cleaned:
                        return cleaned, True
            except Exception:
                continue
    except Exception:
        pass

    return fallback, False
