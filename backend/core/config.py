import os
from dotenv import load_dotenv

# Load environment variables once here
load_dotenv()

# Database Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

# Blockchain Config
RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
OWNER_PRIVATE_KEY = os.getenv("OWNER_PRIVATE_KEY")

if OWNER_PRIVATE_KEY and not OWNER_PRIVATE_KEY.startswith("0x"):
    OWNER_PRIVATE_KEY = "0x" + OWNER_PRIVATE_KEY
