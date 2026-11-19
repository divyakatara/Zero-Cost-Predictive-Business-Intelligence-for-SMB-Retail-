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
    # dated model names. The list is checked against the account's own
    # list_models(): gemini-2.0-flash, gemini-1.5-flash-latest,
    # gemini-1.5-flash, gemini-1.5-pro and gemini-pro no longer exist and were
    # removed, because a retired name only adds a failed round trip before the
    # fallback is reached.
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-pro-latest",
]

# Bound every Gemini call. Without this the SDK retries a failing request with
# its own backoff (measured: ~31s for one 429), and the cascade above multiplies
# that, so a key that is out of quota used to stall the caller for minutes
# before the deterministic fallback was reached. Keep this comfortably above a
# normal flash response (1-5s) so a working key is unaffected.
GEMINI_TIMEOUT_SECONDS = 20
REQUEST_OPTIONS = {"timeout": GEMINI_TIMEOUT_SECONDS}

# Quota/credential failures are about the API key, not the model, so trying the
# next candidate cannot help: stop the cascade and fall back immediately.
try:
    from google.api_core import exceptions as _google_exceptions

    ACCOUNT_LEVEL_ERRORS = (
        _google_exceptions.ResourceExhausted,
        _google_exceptions.PermissionDenied,
        _google_exceptions.Unauthenticated,
    )
except ImportError:  # pragma: no cover - google-api-core ships with the SDK
    ACCOUNT_LEVEL_ERRORS = ()

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
                response = model.generate_content(prompt, request_options=REQUEST_OPTIONS)
                if response and getattr(response, "text", None):
                    cleaned = _clean(response.text)
                    if cleaned:
                        return cleaned, True
            except ACCOUNT_LEVEL_ERRORS:
                break  # the key is out of quota or not permitted: no model will work
            except Exception:
                continue
    except Exception:
        pass

    return fallback, False
