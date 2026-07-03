# PIBG SK Kementah — Parent–Teacher Appointment System

Appointment booking for SK Kementah PIBG. Parents verify with **No. Sijil Lahir** only (no account). Teachers and admins use email login.

## Setup

**Requires Node.js ≥ 20.9** (Next.js 16). This repo includes `.node-version` for [fnm](https://github.com/Schniz/fnm) / nvm.

```bash
cd ~/Projects/pibg-sk-kementah
eval "$(fnm env)"   # or: nvm use (if using nvm)
fnm install         # installs version from .node-version if missing
fnm use
node -v             # should be v20.x
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skkementah.edu.my | admin123 |
| Teacher | guru@skkementah.edu.my | guru123 |

**Sample birth cert numbers (parent booking):**
- `XXXXXX-XX-XXXX`
- `120501-10-5015`
- `150812-08-5032`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — seed demo data
- `npm run db:reset` — reset DB and re-seed

## Stack

Next.js 16, Prisma (SQLite), NextAuth, Tailwind, shadcn/ui, Recharts
