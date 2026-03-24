# Odds — Setup Guide

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it "odds", choose a region (India - South Asia if available), set a DB password

## 2. Run the database schema

1. In your Supabase dashboard → **SQL Editor**
2. Open `supabase/schema.sql` from this repo
3. Paste the entire file and click **Run**

## 3. Enable Google OAuth

1. Supabase dashboard → **Authentication** → **Providers** → Google
2. Enable it
3. Create a Google OAuth app at [console.cloud.google.com](https://console.cloud.google.com):
   - New project → APIs & Services → Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Secret back into Supabase

## 4. Configure allowed redirect URLs

In Supabase → **Authentication** → **URL Configuration**:
- Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
- Redirect URLs: add `http://localhost:3000/**` and your prod URL

## 5. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Get values from Supabase → **Project Settings** → **API**:
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon/public key
- `NEXT_PUBLIC_SITE_URL` → `http://localhost:3000`

## 6. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 7. Make yourself admin

After signing in with your IITM Google account for the first time:

1. Supabase dashboard → **Table Editor** → `users` table
2. Find your row, set `is_admin = true`

You'll now see the **Admin** link in the navbar and can create/resolve markets.

## 8. Deploy to Vercel

```bash
vercel --prod
```

Add all env vars in Vercel project settings. Update `NEXT_PUBLIC_SITE_URL` to your Vercel URL, and add it to Supabase's allowed redirect URLs.

---

## How trading works

- Every user starts with **1000 OC** (Oddcoins)
- Shares are 1:1 with OC spent (spend 100 OC → get 100 shares)
- Market price = `YES pool / total pool` (displayed as probability %)
- On resolution, winning traders split the **entire pool** proportional to their shares
  - Payout = `(your_amount / winning_pool) × total_pool`
- Seeded pool OC is system-funded — no user's balance is affected

## Admin checklist

- [ ] Create a market with title, description, resolution criteria, category, closing date
- [ ] Seed YES/NO pools to set starting probability (default 50%)
- [ ] Close early if needed (stops trading)
- [ ] Resolve YES or NO — immediately distributes payouts to winners
