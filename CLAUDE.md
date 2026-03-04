# Hamid Library

## Project Overview
A personal open-source university course library. Every course Hamid takes gets turned into a global library with teachings, presentations, resources, and more. Shared with ~10 university peers. Free and open to university students.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Hosting:** Vercel (Pro plan)
- **Database:** PostgreSQL (Neon — serverless Postgres, free tier)
- **ORM:** Drizzle ORM (postgres-js driver)
- **Auth:** Neon Auth (`@neondatabase/auth`) — managed auth, email/password sign up & sign in
- **Email:** AutoSend (transactional emails for auth verification, password reset)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Content:** Notion-style block editor — structured JSON stored in database
- **Animations:** Framer Motion (micro-animations + page transitions) + Framer Motion Plus components
- **i18n:** Multi-language support — English, Persian (فارسی), Turkish (Türkçe)
- **Fonts:** Self-hosted custom fonts with unicode-range auto-detection (same method as GTA VI Iran)
- **Language:** TypeScript
- **Domain:** libraryyy.com

## User Flow
1. **Landing page** — simple, no scroll. "Hamid Library" title + login button. That's it.
2. **Auth** — sign up / sign in (Neon Auth handles UI + logic)
3. **Dashboard** (`/dashboard`) — two illustrated cards: "My Studies" + "Courses"
   - **Courses** (`/dashboard/courses`) — major cards grid
   - **Major** (`/dashboard/courses/[majorSlug]`) — courses for that major
   - **Course** (`/dashboard/courses/[majorSlug]/[courseSlug]`) — course detail (3-tab placeholder)
   - **My Studies** (`/dashboard/me`) — student progress (placeholder)
   - **Settings** (`/dashboard/users`) — account settings
4. **Course page** (`/course/[slug]`) — three tabs:
   - **Teaching** — study material. Notion-style rich content (text, images, components). Students read/learn here.
   - **Presentation** — hidden by default. Hamid activates from admin when presenting in class. Once presented, stays visible forever.
   - **Exam/Practice** — multiple exam versions per course. Variety of question types (multiple choice, etc.). Students practice, get instant scores.
5. **Student dashboard** — personal progress tracking. Scores, improvement over time per course. Visual history of practice results.
6. **Admin** (`/admin`) — Hamid only. Full control: analytics, user management, content CRUD, exam management, presentation toggle, stats.

## Architecture
- SSR-first with Next.js App Router
- Server Components by default, Client Components only when needed
- No file storage — professor PDFs are discussed with Claude, restructured, and published as clean content to database
- All data lives in the database as structured JSON content (Notion-style blocks)
- Content supports: text, images, embedded components — flexible enough for rich course pages
- Admin panel for Hamid to manage everything (no professor access for now)
- Auth required for sign-up/sign-in so university students can access the library

## Design Principles
- Superfast and lightweight — minimal bundle size
- Clean, simple, minimal UI (shadcn/ui style)
- **Always design both desktop AND mobile-optimized layouts** — mobile-first responsive
- No over-engineering — keep it simple
- **Everything center-aligned** on student-facing pages (titles, components, content blocks)
- Same centered layout for all languages — no RTL/LTR switching, just translate the text
- Can use Pencil MCP for design/prototyping
- **Title Case** everywhere — all headings, buttons, labels, nav items use Title Case
- **No icons/emojis** unless absolutely needed — if icons are needed, use **Phosphor Duotone** only

## Animations & Motion (Framer Motion — universal)
Every component must use consistent Framer Motion animations. This is non-negotiable.
- **Reveal animations** — **pure opacity fade only** (`initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}`). NO slide/translate (`y`, `x`) on reveal. Duration 0.5–0.8s with stagger delays.
- **Exit animations** — pure opacity fade out (`exit={{ opacity: 0 }}`), same duration
- **Page transitions** — `AnimatePresence mode="wait"` with FrozenRouter pattern (see below)
- **Easing** — `[0.25, 0.46, 0.45, 0.94]` everywhere (no linear), consistent across entire app
- **Micro-interactions** — button hovers, card hovers (`whileHover={{ scale: 1.02 }}`), tab switches, toggle animations
- **Universal motion config** — shared easing + duration values across the entire app
- **Framer Motion Plus** components where applicable

### Page Transitions (FrozenRouter pattern — REQUIRED)
Next.js App Router swaps `children` immediately on navigation, breaking exit animations. Use the FrozenRouter pattern in `components/PageTransition.tsx`:
```tsx
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

function FrozenRouter({ children }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}
```
Wrap page content with `<AnimatePresence mode="wait"><motion.div key={pathname}><FrozenRouter>{children}</FrozenRouter></motion.div></AnimatePresence>`. This freezes old content during exit so it fades out properly before new content fades in. Shared layout elements (top bar, nav) go OUTSIDE the PageTransition in the layout so they persist across navigations.

## UX Polish
- **Skeleton UI** — every loading state shows skeletons, never blank screens
- **Pagination** — for all lists/grids
- **Rate limiting** — external Redis-backed service (see Rate Limiting section below)
- **Virtualization** — for long lists if needed (smooth performance)
- **Smooth scrolling** — Framer Motion smooth scroll or native smooth scroll throughout
- **No janky loads** — no sudden content pops, no harsh transitions, everything feels buttery

## Dark Mode
- Same system as "let-it-happen" project
- `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`
- OKLCH color palette with smooth 0.5s CSS transitions on theme switch
- CSS `@property` declarations for animatable custom properties
- Framer Motion animated toggle button (Sun/Moon icons, rotate + scale animations)
- localStorage persistence via next-themes
- `suppressHydrationWarning` on `<html>` + mounted check in toggle

## Fonts
- Self-hosted in `public/fonts/` (no Google Fonts CDN)
- Same method as GTA VI Iran project
- Unicode-range based auto-detection: browser picks the right font per character
- Separate font faces for Latin (English/Turkish) and Arabic/Persian scripts
- Variable fonts where possible for smaller file sizes
- `font-display: swap` for performance
- Locale-aware preloading in layout

### Font Families
**Latin (English/Turkish):**
- **Geist** — modern, soft sans-serif for body text (variable weight 100-900, by Vercel, use via `next/font`)
- **Cooper BT Light** — classic/royal serif for headings and display text

**Persian:**
- **SGKara** — self-hosted (`public/fonts/SGKara-Regular.ttf`), unicode-range auto-detection for Arabic/Persian glyphs

## i18n
- Three languages: English (en), Persian (fa), Turkish (tr)
- Route-based locale detection (e.g. `/en/`, `/fa/`, `/tr/`)
- All UI strings externalized for translation
- Translations done manually with Claude — no third-party translation service
- Same centered layout for all languages, no RTL/LTR differences

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
- Neon project ID: `soft-tree-52094235`
- Connection string in `DATABASE_URL` env var
- Drizzle ORM with postgres-js driver
- Auth tables managed by Neon Auth in `neon_auth` schema (not in our schema)

### Tables
**Auth (Neon Auth — managed, in `neon_auth` schema):**
- user, session, account, verification, organization, member, invitation, jwks, project_config

**App (our schema, in `public`):**
- `course` — id, title, description, semester, professor, cover_image, created_by, timestamps
- `material` — id, course_id, title, type (teaching/presentation/exam), content (structured JSON blocks), order, created_by, timestamps
- More tables TBD: exam_question, exam_attempt, exam_result, student_progress

## Rate Limiting
External Redis-backed service at `https://r.verifisere.com` using sliding window algorithm. Fails open (never blocks users if service is down).

### Endpoints
- `POST /api/check` — body: `{ key, limit, window }` → response: `{ allowed, remaining, retryAfter }`
- `POST /api/reset` — body: `{ key }` → 200 OK
- Auth: `Authorization: Bearer <RATE_LIMITER_TOKEN>`
- Timeout: 3 seconds

### Two files needed
1. `lib/rate-limit.ts` — core client: `rateLimit()`, `multiTierRateLimit()`, `resetRateLimit()`, presets
2. `lib/api-rate-limit.ts` — Next.js wrapper: `withRateLimit()` HOF, `checkRateLimit()` inline, `getClientIP()`, presets

### Presets
- AUTH: 5 req / 5 min (login, signup, OTP)
- ADMIN: 30 req / 1 min
- PUBLIC_READ: 60 req / 1 min
- PUBLIC_WRITE: 20 req / 1 min
- STORAGE: 500 req / 1 min
- UPLOAD: 10 req / 1 min
- WEBHOOK: 200 req / 1 min
- HEALTH: 120 req / 1 min
- EXPENSIVE: 15 req / 1 min (search, analytics)

### Usage
```typescript
// HOF wrapper
export const GET = withRateLimit(handler, APIRateLimits.PUBLIC_READ)

// Inline check
const limited = await checkRateLimit(request, APIRateLimits.AUTH)
if (limited) return limited
```
Key format: `api:{path}:{ip}`. IP detection trusts Vercel/Cloudflare headers first, falls back to x-forwarded-for.

## Project Structure
```
app/
  layout.tsx                    # Root layout
  page.tsx                      # Landing page
  globals.css                   # Global styles (Tailwind)
  api/auth/[...path]/route.ts   # Neon Auth API routes
lib/
  auth.ts                       # Neon Auth server config
  auth-client.ts                # Neon Auth client
  db.ts                         # Drizzle database instance
  rate-limit.ts                 # Rate limit core client
  api-rate-limit.ts             # Next.js rate limit wrapper
database/
  schema.ts                     # Drizzle schema (PostgreSQL, app tables only)
  migrations/                   # Generated migrations
middleware.ts                   # Auth middleware (protects /dashboard/*)
```

## Static Assets (Cloudflare R2)
- **Bucket:** `hamid-lib-assets` (EEUR region)
- **Custom domain:** `https://lib.thevibecodedcompany.com` (Cloudflare CDN)
- **Fallback:** `https://pub-7d1b6a5df85a4e308714a375e9ac81f7.r2.dev`
- Images stored as optimized WebP (resized + compressed via `cwebp`)
- Upload via: `npx wrangler r2 object put hamid-lib-assets/<path> --file=<local> --content-type=image/webp --remote`
- Current assets: `images/courses.webp`, `images/my-studies.webp`, `images/back.webp`

## Environment Variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEON_AUTH_BASE_URL` — Neon Auth endpoint URL
- `NEON_AUTH_COOKIE_SECRET` — Cookie secret (32+ chars)
- `AUTOSEND_API_KEY` — AutoSend API key for transactional emails
- `AUTOSEND_FROM_EMAIL` — Sender email address
- `RATE_LIMITER_URL` — Rate limit service URL (`https://r.verifisere.com`)
- `RATE_LIMITER_TOKEN` — Bearer token for rate limit service

## SEO & Metadata
- Proper favicon (SVG + PNG fallbacks + apple-touch-icon)
- Full metadata in layout: title, description, OpenGraph, Twitter cards
- `manifest.json` (PWA-ready web app manifest)
- Cookie-based session tracking across sessions
- Proper `robots.txt` and `sitemap.xml`

## MCP Servers
- Multiple MCP servers are available (Neon, Vercel, Playwright, shadcn, Cloudflare, Pencil, etc.)
- **Always prefer MCP tools over web search** when the MCP can answer the question or perform the task (e.g., use Neon MCP for database docs, Vercel MCP for deployment info, shadcn MCP for component lookup)
- Only fall back to web search if no relevant MCP tool exists for the task

## Notes
- **Next.js 16:** `middleware.ts` has been deprecated and renamed to `proxy.ts` — don't confuse them. Use `proxy.ts` for request interception/routing.
- This is a personal project, not commercial — ~10 university students
- Keep dependencies minimal
- Path alias: `@/*` maps to project root
- Hosted on Vercel Pro plan
- Admin is Hamid only — no professor roles for now
- Content workflow: professor PDFs → discuss with Claude → structured content → publish to DB
