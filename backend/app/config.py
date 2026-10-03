"""Backend-only secrets. Blank configuration intentionally selects standard insights."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
def gemini_settings():
    return os.getenv("GEMINI_API_KEY", "").strip(), os.getenv("GEMINI_MODEL", "").strip()
