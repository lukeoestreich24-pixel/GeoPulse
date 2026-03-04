# GeoPulse 🌍

> Real-time global geopolitical risk tracker — powered by GDELT, Next.js 14, and Supabase!

GeoPulse displays a live heatmap of geopolitical risk by country. It fetches data from the [GDELT Project](https://www.gdeltproject.org/) every hour, calculates risk scores, and shows them on an interactive map with per-country event breakdowns.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Database | Supabase (Postgres) |
| Map | Leaflet.js via react-leaflet |
| Data | GDELT 2.0 (free, no API key) |
| Cron | Vercel Cron Jobs |
| Deploy | Vercel |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/geopulse.git
cd geopulse
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **Database → SQL Editor**
3. Copy and run the entire contents of `supabase/schema.sql`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=your-random-secret   # openssl rand -hex 32
```

Get your keys from Supabase: **Project Settings → API**.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Seed initial data

Trigger the update endpoint once to populate the map:

```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/update-events
```

Or open it in a browser (remove auth check in dev mode if needed).

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial GeoPulse commit"
git remote add origin https://github.com/your-username/geopulse.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the `geopulse` repo
3. Add all environment variables from `.env.example` in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
4. Deploy

### 3. Cron Job (automatic — no setup needed)

The `vercel.json` already configures an hourly cron:

```json
{
  "crons": [{ "path": "/api/update-events", "schedule": "0 * * * *" }]
}
```

Vercel automatically sends a `Bearer <CRON_SECRET>` header when calling the cron endpoint.

> **Note:** Vercel cron jobs require a **Pro plan** for production. On the free Hobby plan, you can manually trigger `GET /api/update-events` or set up an external cron service (e.g., [cron-job.org](https://cron-job.org)) to call the endpoint hourly.

---

## Project Structure

```
geopulse/
├── app/
│   ├── api/
│   │   ├── countries/route.ts        # GET all countries with risk scores
│   │   ├── events/route.ts           # GET events for a country
│   │   └── update-events/route.ts    # Cron: fetch GDELT + update DB
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Server component: loads countries
├── components/
│   ├── CountrySidebar.tsx            # Slide-in panel with country details
│   ├── Header.tsx                    # Top bar
│   ├── Legend.tsx                    # Map legend
│   ├── LeafletMap.tsx                # Leaflet map (client-only)
│   └── MapClient.tsx                 # Client wrapper + state management
├── lib/
│   ├── countries.ts                  # FIPS code → name/lat/lng lookup
│   ├── gdelt.ts                      # GDELT fetch + normalization + risk formula
│   └── supabase.ts                   # Supabase client (anon + admin)
├── supabase/
│   └── schema.sql                    # Full DB schema with RLS
├── types/
│   └── index.ts                      # Shared TypeScript types
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                       # Cron configuration
```

---

## Risk Score Formula

```
risk_score = min(100, (events_last_48h × 5) + (avg_intensity × 2))
```

- **events_last_48h**: count of GDELT events for this country in the last 48 hours
- **avg_intensity**: average intensity (0–100, derived from GDELT's Goldstein scale × 10)
- Score is capped at **100**

---

## Data Source

GeoPulse uses the **GDELT 2.0 Events dataset**, updated every 15 minutes.  
Only events with these CAMEO event codes are ingested:

| Category | Codes |
|---|---|
| Military / Conflict | 19x, 20x |
| Protest | 14x |
| Sanctions | 17x |
| Threats | 18x |

Only events with a **negative Goldstein scale** (destabilizing) are kept.  
All events older than **7 days** are automatically deleted on each cron run.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only — keep secret!) |
| `CRON_SECRET` | Random secret to protect the cron endpoint |

---

## License

MIT
