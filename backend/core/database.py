from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SECRET_KEY

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)