# Odds

Prediction market platform for IITM. Users trade shares on the outcomes of events using Oddcoins (OC). Supports binary (YES/NO) and multi-choice markets.

## Stack

- Next.js 16 · React 19 · TypeScript
- Supabase (Postgres + Auth)
- Tailwind CSS 4
- Deployed on Vercel

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

Auth is restricted to `@smail.iitm.ac.in` Google accounts.
