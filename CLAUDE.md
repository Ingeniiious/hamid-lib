# Hamid Library

## Project Overview
A personal open-source university course library. Every course Hamid takes gets turned into a global library with teachings, presentations, resources, and more. Shared with university peers.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Hosting:** Vercel (Pro plan)
- **Database:** PostgreSQL (Neon — serverless Postgres, free tier)
- **ORM:** Drizzle ORM (postgres-js driver)
- **Auth:** Better Auth (Drizzle adapter) — email/password sign up & sign in
- **UI:** shadcn/ui + Tailwind CSS v4
- **Language:** TypeScript
- **Domain:** library.hamidproject.xyz (subdomain on Vercel)

## Architecture
- SSR-first with Next.js App Router
- Server Components by default, Client Components only when needed
- All data is dynamic — CMS-style admin for adding/editing courses, materials, presentations
- Auth required for sign-up/sign-in so university students can access the library

## Design Principles
- Superfast and lightweight — minimal bundle size
- Clean, simple, minimal UI (shadcn/ui style)
- Mobile-friendly
- No over-engineering — keep it simple

## Key Commands
- `npm run dev` — local dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — run migrations
- `npm run db:push` — push schema to database
- `npm run db:studio` — open Drizzle Studio

## Database
- PostgreSQL via Neon (serverless Postgres, free tier)
- Connection string in `DATABASE_URL` env var
- Drizzle ORM with postgres-js driver

### Tables
**Auth (Better Auth):**
- `user` — id, name, email, email_verified, image, role, timestamps
- `session` — id, token, expires_at, user_id, ip_address, user_agent, timestamps
- `account` — id, account_id, provider_id, user_id, password (hashed), tokens, timestamps
- `verification` — id, identifier, value, expires_at, timestamps

**App:**
- `course` — id, title, description, semester, professor, cover_image, created_by, timestamps
- `material` — id, course_id, title, type (note/presentation/document/link/video), content, file_url, order, created_by, timestamps

## Project Structure
```
app/
  layout.tsx        # Root layout
  page.tsx          # Home page
  globals.css       # Global styles (Tailwind)
  api/auth/[...all]/route.ts  # Better Auth API routes
lib/
  auth.ts           # Better Auth server config
  auth-client.ts    # Better Auth client
  db.ts             # Drizzle database instance
database/
  schema.ts         # Drizzle schema (PostgreSQL)
  migrations/       # Generated migrations
```

## Environment Variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth secret key
- `BETTER_AUTH_URL` — Base URL for auth (e.g. https://library.hamidproject.xyz)

## Notes
- This is a personal project, not commercial — ~10 university students
- Keep dependencies minimal
- Path alias: `@/*` maps to project root
- Hosted on Vercel Pro plan
