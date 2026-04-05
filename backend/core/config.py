import os
from pathlib import Path
from dotenv import load_dotenv

# Load the shared root .env — works regardless of CWD
_root_env = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_root_env, override=True)

# Database Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

# Blockchain Config
RPC_URL = os.getenv("RPC_URL")
RPC_FALLBACK_URLS = [
    url.strip()
    for url in (os.getenv("RPC_FALLBACK_URLS") or "").split(",")
    if url.strip()
]
RPC_URLS = [url for url in [RPC_URL, *RPC_FALLBACK_URLS] if url]
RPC_TRUST_ENV = os.getenv("RPC_TRUST_ENV", "true").strip().lower() not in {"0", "false", "no", "off"}
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
OWNER_PRIVATE_KEY = os.getenv("OWNER_PRIVATE_KEY")

if OWNER_PRIVATE_KEY and not OWNER_PRIVATE_KEY.startswith("0x"):
    OWNER_PRIVATE_KEY = "0x" + OWNER_PRIVATE_KEY
