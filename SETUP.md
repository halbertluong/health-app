# Health Planner — Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account
- Anthropic API key
- Expo CLI + EAS CLI (for mobile)

## 1. Install dependencies

```bash
cd health-app
pnpm install
```

## 2. Supabase setup

1. Create a new Supabase project at supabase.com
2. Go to the SQL editor and run the full migration:
   `supabase/migrations/0001_initial_schema.sql`
3. Copy your project URL and anon key from Settings → API

## 3. Web environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (from Supabase → Settings → Database → Connection string)
- `ANTHROPIC_API_KEY` (from console.anthropic.com)

## 4. Mobile environment

```bash
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

Fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_API_URL` (your deployed Next.js URL, or http://localhost:3000 for local dev)

## 5. Run the web app

```bash
pnpm dev:web
# Open http://localhost:3000
```

## 6. Run the mobile app

```bash
pnpm dev:mobile
# Scan the QR code with Expo Go (limited) or a custom dev client
```

For Apple Health integration, you need a custom dev client:
```bash
cd apps/mobile
npx expo install react-native-health
eas build --profile development --platform ios
```

## 7. Deploy

**Web → Vercel:**
```bash
vercel --cwd apps/web
```

**Mobile → EAS:**
```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

## Project structure recap

```
health-app/
├── apps/web/          Next.js 14 — planning, recipes, grocery, review
├── apps/mobile/       Expo — today view, logging, grocery checklist
├── packages/types/    Shared TypeScript types
├── packages/validators/ Shared Zod schemas
├── packages/utils/    Macro calc, grocery aggregation, date helpers
├── packages/db/       Drizzle ORM schema + migrations
└── supabase/          SQL migrations
```

## Phase 2 next steps

- [ ] Mobile `log/manual.tsx` — food search + manual macro entry
- [ ] Mobile `log/quick-add.tsx` — recent/saved meals
- [ ] Mobile `log/ate-as-planned.tsx` — select today's planned slot
- [ ] Weekly Review page (web) — recharts planned vs actual
- [ ] Workout library CRUD (web)
- [ ] Pantry management page (web)

## Phase 3 next steps

- [ ] Refine AI food logging prompt for better accuracy
- [ ] Add meal-to-plan slot matching (link AI log to nearest planned slot)
- [ ] Portion estimation workflow improvements

## Phase 4 next steps

- [ ] `apps/mobile/lib/health-kit.ts` — HealthKit read/write
- [ ] Health sync screen + permissions
- [ ] Background sync job
