# AI Product Assistant — Frontend

Next.js chat UI for the AI Product Assistant. Sends queries to the FastAPI backend and displays AI-generated answers with product cards.

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

> In production (Vercel), set this to your HuggingFace Spaces backend URL.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

1. Push this `frontend/` folder as a repo
2. Import into Vercel
3. Set the `NEXT_PUBLIC_API_URL` environment variable to your HuggingFace Spaces backend URL
4. Deploy — Vercel auto-detects Next.js
