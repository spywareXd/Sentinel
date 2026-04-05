# 🛡️ SentinelDAO

SentinelDAO is an AI-driven moderation and decentralized enforcement system. This project uses Gemini-AI to scan chat messages, flag toxic content, and automatically enforce punishments through a blockchain-backed moderation workflow.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Python 3.11+** and **Node.js** installed. We use `uv` for lightning-fast Python package management.

### 2. Backend & API Setup
The backend serves as the "brain" for moderation cases and syncing with the blockchain.

```powershell
# Install dependencies
uv sync

# Start the API server
# (Host 0.0.0.0 allows external connection via tunnels)
uv run uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. AI Moderation Worker
The worker scans messages from Supabase in real-time using ToxicBERT and Gemini.

```powershell
# Start the message scanner
cd backend
uv run uvicorn api.main:app --reload --port 8000   
```



### 4. Public Tunnel (For Vercel / Remote Testing)
If your frontend is hosted on Vercel, you need to expose your local backend to the internet.

```powershell
# Create a public URL for your local port 8000
npx localtunnel --port 8000
```
*Note: Update your Vercel `NEXT_PUBLIC_BACKEND_URL` with the generated link.*

### 5. Frontend Dashboard
The Next.js dashboard for moderators to vote on cases.

```powershell
cd frontend
npm install
npm run dev
```

---

## 🏛️ Architecture
- **Frontend**: Next.js (TailwindCSS, Ethers.js, MetaMask)
- **Backend**: FastAPI (Python, LangChain, Gemini-AI)
- **Database**: Supabase (PostgreSQL with Automated Enforcement Triggers)
- **Blockchain**: Sepolia Ethereum Testnet