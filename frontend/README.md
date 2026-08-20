# AI Product Assistant — Frontend

Next.js 16 chat UI for the AI Product Assistant. Sends queries to the FastAPI backend and displays AI-generated answers with product cards.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variable

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

1. Import this repository into Vercel and select `frontend` as the **Root Directory**.
2. Set the `NEXT_PUBLIC_API_URL` environment variable:
   - For AWS EC2: `https://api.yourdomain.com`
   - For Hugging Face Spaces: `https://your-space-name.hf.space`
3. Deploy — Vercel auto-detects Next.js 16.
