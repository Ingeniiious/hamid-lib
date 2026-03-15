# Hamid Library

## PRIORITY RULES (ALWAYS FOLLOW — NEVER SKIP)

1. **Database: ALWAYS use Neon MCP** — For ALL database operations (queries, migrations, schema inspection, docs lookup), ALWAYS use the Neon MCP tools (`mcp__Neon__run_sql`, `mcp__Neon__run_sql_transaction`, etc.) first. There is NO `DATABASE_URL` locally — `npm run db:migrate` will fail. Use Neon MCP for everything database-related.

2. **Brand color: `#5227FF`** — All primary buttons, CTAs, and interactive accent elements use `bg-[#5227FF]` with `text-white hover:opacity-90 disabled:opacity-50`. This is the brand purple. Never use a different color for primary actions.

3. **Center alignment for i18n** — ALL text, inputs, labels, dropdowns, and content blocks use **center/middle alignment** (`text-center`, `justify-center`, `items-center`, `mx-auto`). NO left-align, NO right-align. This is the i18n strategy: center alignment means the same layout works for LTR (English, Turkish) and RTL (Persian) without any `dir` switching. Applies to every page, every component.

4. **Pill-shaped inputs & buttons** — All inputs, selects, and buttons use `rounded-full` (pill shape). Larger containers/cards use `rounded-2xl` or `rounded-3xl`. Never use sharp corners.

5. **No mobile zoom on inputs** — Viewport is set to `maximumScale: 1, userScalable: false` in `app/layout.tsx` to prevent iOS Safari auto-zoom on input focus. Already configured globally — do not override.

6. **Static assets: Use Cloudflare MCP or Wrangler for R2** — For uploading, listing, or managing files in the R2 bucket (`hamid-lib-assets`), use the Cloudflare MCP tools (`mcp__cloudflare-api__*`) or Wrangler CLI (`npx wrangler r2 object put ...`). Both have full access to R2 and other Cloudflare services.

---

## Project Overview
An open-source, community-driven university course library following a contribution-based model. Students contribute their own course documents, which are reviewed, moderated, and used as a foundation to create original study resources: examples, practices, presentations, study guides, and mock exams. The platform does NOT host university course materials directly (to avoid legal issues). All published content is original work created from verified student contributions. Free and open to university students.

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

## Content Model (Student Contributions)
- **Students are the source** — they contribute course documents from their universities
- **Contributor verification** — students must verify their university email to become Contributors
- **Professor/teacher contributors** — professors can become Core Contributors by verifying their university email + identity (student confirmation on course pages)
- **Moderation** — all contributions are reviewed, compared across multiple submissions, and verified before use
- **Platform-created content** — based on verified contributions, original study resources are created (examples, practices, presentations, mock exams). This content belongs to the platform.
- **Content workflow:** student contributions → moderation & verification → discuss with Claude → structured original content → publish to DB

## Architecture
- SSR-first with Next.js App Router
- Server Components by default, Client Components only when needed
- All data lives in the database as structured JSON content (Notion-style blocks)
- Content supports: text, images, embedded components — flexible enough for rich course pages
- Admin panel for Hamid to manage everything (professor Core Contributor role planned)
- Auth required for sign-up/sign-in so university students can access the library

## Design Principles
- Superfast and lightweight — minimal bundle size
- Clean, simple, minimal UI (shadcn/ui style)
- **Always design both desktop AND mobile-optimized layouts** — mobile-first responsive
- No over-engineering — keep it simple
- **Everything center-aligned** — ALL text, inputs, labels, content use center alignment (see Priority Rule #3). This is the i18n strategy for handling RTL/LTR without switching.
- **Brand color `#5227FF`** — all primary buttons and CTAs (see Priority Rule #2)
- **Pill-shaped** — all inputs, selects, buttons use `rounded-full` (see Priority Rule #4)
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

## Professor Rating System
Public-facing professor & course rating system. Students rate professors at specific universities for specific courses. **These pages are PUBLIC (no auth required)** for maximum SEO — Google-indexable professor/course review pages.

### Routes (public, SSR for SEO)
- `/professors` — browse/search all professors
- `/professors/[slug]` — professor profile page (ratings, reviews, courses taught, university)
- `/universities/[slug]` — university page (all professors + average ratings)
- `/universities/[slug]/[courseSlug]` — course at university (all professors who teach it + ratings)

### Core Features
- **Star rating** (1-5) per review — overall quality, difficulty, would-take-again
- **Written reviews** — students write text reviews (moderated before public)
- **Tags** — predefined tags per review (e.g., "clear lectures", "tough grader", "helpful office hours", "heavy workload")
- **Course-specific** — ratings are tied to professor + course + university (a professor may teach multiple courses)
- **Auth required to rate** — students must be logged in to submit a review (prevents spam)
- **Anonymous reviews** — reviewer identity is NOT shown publicly (privacy)
- **Moderation** — reviews go through admin moderation before publishing (prevent abuse/defamation)
- **Aggregate scores** — average rating, total reviews, rating distribution displayed on professor page
- **No editing after moderation** — once published, reviews are final (prevents gaming)

### SEO Strategy
- **Public SSR pages** — professor/university/course pages are Server Components, fully rendered HTML for crawlers
- **Structured data** — JSON-LD `Review`, `AggregateRating`, `EducationalOrganization` schema markup
- **Meta tags** — dynamic OpenGraph + Twitter cards per professor/university page
- **Sitemap** — auto-generated sitemap entries for all professor/university pages
- **URL structure** — clean slugs: `/professors/john-doe-mit`, `/universities/mit`
- **Internal linking** — professor pages link to university, courses link to professors, etc.
- **Target keywords** — "[professor name] reviews", "[university] professor ratings", "[course] at [university]"

### Database Tables (TBD)
- `professor` — id, name, slug, university_id, department, bio, created_at
- `professor_course` — professor_id, course_id (many-to-many)
- `professor_review` — id, professor_id, course_id, user_id, overall_rating, difficulty_rating, would_take_again, review_text, tags, status (pending/approved/rejected), created_at
- May also need `university` table if not reusing `faculty.university`

### Key Decisions
- Public pages = NO auth wall. Anyone can browse ratings. Only submitting requires login.
- Reviews are anonymous publicly but tied to user_id internally (for moderation/abuse prevention)
- Admin approves/rejects reviews from `/admin/reviews`
- Rate limiting on review submission (1 review per professor per user, 5 reviews per day max)

## AI Teachers' Council (Core System — In Progress)
The AI Council is the platform's content engine. It replaces manual content creation with an automated multi-model pipeline that produces verified study content from student-contributed sources. This is the **key differentiator from Google NotebookLM** — content is created ONCE and served to all students (not per-user), at a fraction of the cost.

### Full Pipeline Architecture (2 stages)

```
Student uploads any file (PDF/DOCX/PPTX/image/video)
  ↓
STAGE 1: Content Extraction Pipeline (pre-AI Council)
  Phase 1 — Deterministic extraction (no AI, free)
    PDF → pdf-parse (text) + pdf-lib (images)
    DOCX → mammoth (text + images + tables)
    PPTX → adm-zip + XML parsing (slides + speaker notes + media)
    Image → sharp (resize/optimize)
  Phase 2 — Multimodal AI extraction (Kimi K2.5 vision, cheap)
    Classify images: content diagram / equation / photo / decorative junk
    OCR handwritten notes, whiteboard photos, scanned PDFs
    Extract equations → LaTeX
    Process video keyframes
    Cost: ~$0.01-0.05 per contribution
  → Flatten to structured markdown sourceContent
  ↓
STAGE 2: AI Council Pipeline (5-model verification)
  1. Kimi K2.5 (Creator) → 2. ChatGPT (Reviewer) → 3. Claude (Enricher)
  → 4. Gemini (Validator) → 5. Grok (Fact Checker)
  → Publish verified content
```

### Stage 1: Content Extraction Pipeline

**Why this exists:** Student contributions are messy — PDFs with masked titles, photos of handwritten notes, PowerPoints with hidden speaker notes, scanned documents with no text layer. The extraction pipeline normalizes ALL input formats into clean structured markdown before the AI Council touches it.

**Supported input formats:**
- **PDF** — text layer extraction + embedded image extraction. Scanned/image-only PDFs detected automatically and sent to Kimi K2.5 multimodal for OCR.
- **DOCX** — text, tables, headings, embedded images via `mammoth`
- **PPTX** — slide-by-slide text + titles + speaker notes + embedded media via `adm-zip` + XML parsing
- **Images** (JPEG, PNG, WebP) — photos of handwritten notes, whiteboard captures, scanned documents → Kimi K2.5 multimodal OCR
- **Videos** (MP4, MOV) — keyframe extraction via Kimi K2.5 multimodal (no ffmpeg needed)

**Kimi K2.5 Multimodal capabilities (used in extraction):**
- Model: `kimi-k2.5`, base URL: `https://api.moonshot.ai/v1`
- Supports images: PNG, JPEG, WebP, GIF (base64 encoded, unlimited count, max 100MB total request)
- Supports videos: MP4, MOV, AVI, WebM (base64 encoded)
- 256K context window
- Pricing: $0.60/M input (cache miss), $0.10/M (cache hit), $3.00/M output — extremely cheap for bulk extraction
- **FIXED parameters:** temperature=0.6 (non-thinking), thinking={"type":"disabled"} for extraction. Custom values cause errors.
- **No Tesseract needed** — Kimi handles OCR natively, cheaper and more reliable on serverless
- **No ffmpeg needed** — Kimi processes video directly via base64

**Image classification strategy:**
- Each extracted image sent to Kimi with classification prompt
- Categories: content diagram, mathematical equation, photo of notes, decorative/logo/junk
- Decorative images discarded, content images get AI-generated text descriptions
- Equations extracted as LaTeX
- Batch multiple images per request for efficiency

**Output format (sourceContent):** Structured markdown with sections:
```markdown
# Source: [fileName]
## Text Content
[Full extracted text by page/slide]
## Tables
[Preserved table structures]
## Image Descriptions
[Kimi-generated descriptions of content-relevant images]
## Speaker Notes (PPTX only)
[Hidden speaker notes from slides]
## Warnings
[Extraction issues: low quality images, approximate table structures, etc.]
```

**Extraction database table:**
```
extraction_job — tracks extraction progress per contribution
  Fields: contribution_id, course_id, status, extracted_content (JSONB),
          source_content (flattened text), pending_images, processed_images,
          extraction_cost_usd, extraction_tokens, error_message, retry_count
```

**Extraction cron:** `/api/cron/extraction` runs every 2 minutes (same cadence as pipeline cron). Each invocation handles one phase:
- Invocation 1: Download file from R2 + deterministic extraction (Phase 1)
- Invocation 2+: Process image batches via Kimi multimodal (Phase 2)
- Final: Flatten to sourceContent → auto-create pipeline job via `createJob()`

**NPM packages for extraction:**
- `pdf-parse` — PDF text extraction (lightweight, uses pdf.js internally)
- `mammoth` — DOCX to HTML/text (zero native dependencies)
- `adm-zip` — PPTX unzipping (PPTX = ZIP of XML files)
- `sharp` — image processing/resizing (already installed)
- `pdf-lib` — PDF image extraction (already installed)

### Stage 2: AI Council Pipeline (5 models)

**Model Chain (in order):**
1. **Kimi K2.5** (Moonshot AI) — **Creator**. Cheap, good at edu content. Generates initial structured content from extracted source. Bulk token work at $0.60/M input. **Runs real-time** (instant content generation).
2. **GPT-5.4** (OpenAI) — **Reviewer**. Reviews for accuracy, completeness, clarity, pedagogical quality. Returns verdict + issues. $2.50/M input, $15/M output (1.05M context, 128K output).
3. **Claude Opus 4.6** (Anthropic) — **Enricher**. Adds examples, deepens explanations, refines language, fills gaps. $5/M input, $25/M output.
4. **Gemini 3.1 Pro** (Google) — **Validator**. Validates factual accuracy, internal consistency, source fidelity. Returns verdict + issues.
5. **Grok** (xAI) — **Fact Checker**. Cross-references claims against real-world knowledge. Final verification.

**Execution Strategy — Hybrid Real-time + Batch + Webhooks:**
- **Step 1 (Kimi Creator):** Runs real-time via standard API. User gets initial content instantly.
- **Steps 2-5 (GPT-5.4, Claude, Gemini, Grok):** Run via **Batch API** (50% discount, up to 24h processing). User sees "Other teachers are reviewing your content..." — the review delay is a feature, not a bug. Builds trust and saves 50% on 4/5 models.
- **Batch pricing:** GPT-5.4 batch = $1.25/$7.50, Claude Opus batch = $2.50/$12.50, Gemini batch = $1/$6, etc.

**Webhook-driven pipeline chain:**
When a batch job finishes, the provider fires a webhook → our handler processes the result and immediately submits the NEXT model's batch job. No polling, no cron delays — each teacher passes the baton to the next.

```
Kimi (real-time) completes
  → submit GPT-5.4 batch job (webhook: /api/webhooks/ai-pipeline/openai)
  → OpenAI webhook fires when done
    → process result, submit Claude Opus batch (webhook: /api/webhooks/ai-pipeline/anthropic)
    → Anthropic webhook fires when done
      → process result, submit Gemini batch (webhook: /api/webhooks/ai-pipeline/google)
      → Google webhook fires when done
        → process result, submit Grok batch (webhook: /api/webhooks/ai-pipeline/xai)
        → xAI webhook fires when done
          → process result → all teachers done → publish content
```

**Webhook endpoints:**
- `POST /api/webhooks/ai-pipeline/openai` — receives OpenAI batch completion
- `POST /api/webhooks/ai-pipeline/anthropic` — receives Anthropic batch completion
- `POST /api/webhooks/ai-pipeline/google` — receives Google batch completion
- `POST /api/webhooks/ai-pipeline/xai` — receives xAI batch completion

**Webhook security:** Each provider has its own signature/secret verification:
- OpenAI: webhook signing secret (configured in dashboard)
- Anthropic: webhook signature verification
- Google: API key / service account verification
- xAI: webhook secret header

**Fallback:** Cron (`/api/cron/ai-pipeline`) still runs every 2 min as a safety net — picks up any batch jobs that completed but whose webhook failed (network issues, timeouts, etc.). Belt and suspenders.

**Key principle:** Each model reviews INDEPENDENTLY — no shared context between models = genuine peer review. When all agree → content is verified. If disagreement → flag for re-processing.

**Two correctness layers:**
- Teacher-specific: what the professor taught in their specific way
- Universal truth: math formulas, scientific facts any model can verify

### Output Types (matching/exceeding Google NotebookLM)
- Study guides (rich text)
- Flashcards (`{front, back, tags}[]`)
- Quizzes (`{question, options, correct, explanation}[]`)
- Mock exams (5 variants — each council member produces one)
- Podcast scripts (multi-language, timestamped for TTS)
- Video overview scripts
- Mind maps (React Flow nodes/edges format)
- Infographics
- Slide decks
- Data tables
- Reports
- Interactive course sections

### Database Tables
```
extraction_job      — tracks file extraction (Phase 1 + 2) per contribution
ai_model_config     — model settings, costs, roles, pipeline order
pipeline_job        — tracks each source through the council (status, cost, version)
pipeline_step       — each model's execution (input/output/verdict/tokens/cost)
generated_content   — final published content (structured JSON + media URLs + rich text)
content_challenge   — student challenges to published content (AI council re-evaluates)
```

### Execution Model (Vercel-compatible)
- **Step 1 (Kimi Creator):** Real-time execution via standard API, triggered by cron or extraction completion.
- **Steps 2-5 (Batch + Webhooks):** Each step submits a batch job to the provider. When the batch completes, the provider sends a webhook to our endpoint. The webhook handler processes the result, updates the pipeline step, and immediately submits the next batch job to the next provider. This creates a chain reaction: each teacher passes the baton to the next.
- **Cron as fallback:** `/api/cron/ai-pipeline` still runs every 2 min — catches any batch completions where the webhook failed (network issues, etc.). Also handles Step 1 (Kimi real-time).
- `/api/cron/extraction` — extraction pipeline (file → structured text), runs every 2 min.
- After all steps pass → publish `generated_content` rows
- **Resilience:** max 3 retries per step. If a reviewer fails, pipeline can proceed with remaining reviewers (degraded). If creator fails, pipeline waits for retry.
- **Webhook handlers** verify provider signatures before processing. Each returns 200 immediately, then processes async.

### File Structure
```
lib/ai/
  types.ts              — shared types (ModelSlug, ContentType, multimodal messages, etc.)
  client.ts             — unified AI client (router dispatches to providers)
  orchestrator.ts       — council pipeline engine (create job, process step, publish)
  prompts.ts            — all system prompts per role × 12 content types
  cost.ts               — token/cost calculation helpers
  providers/
    kimi.ts             — Moonshot/Kimi K2.5 (OpenAI-compatible, non-thinking mode)
    openai.ts           — OpenAI/ChatGPT client
    anthropic.ts        — Anthropic/Claude client
    gemini.ts           — Google Generative AI client
    grok.ts             — xAI/Grok client (OpenAI-compatible)
  extraction/
    types.ts            — extraction-specific types (ExtractedContent, ExtractedImage, etc.)
    pdf.ts              — PDF text + image extraction
    docx.ts             — DOCX text + image + table extraction
    pptx.ts             — PPTX slides + speaker notes + media extraction
    image.ts            — image prep/resize for Kimi multimodal
    video.ts            — video processing via Kimi multimodal
    multimodal-kimi.ts  — Kimi K2.5 vision calls (OCR, classification, description)
    orchestrator.ts     — extraction pipeline state machine

app/api/cron/ai-pipeline/route.ts        — council pipeline cron handler (fallback for missed webhooks + Kimi real-time)
app/api/cron/extraction/route.ts         — extraction pipeline cron handler
app/api/webhooks/ai-pipeline/
  openai/route.ts                        — OpenAI batch completion webhook (GPT-5.4 → triggers Claude)
  anthropic/route.ts                     — Anthropic batch completion webhook (Claude → triggers Gemini)
  google/route.ts                        — Google batch completion webhook (Gemini → triggers Grok)
  xai/route.ts                           — xAI batch completion webhook (Grok → triggers publish)
app/(main)/admin/ai-council/             — admin UI (pipeline visualization, jobs, stats)
```

### Environment Variables (AI Council)
- `KIMI_API_KEY` — Moonshot AI (Kimi) API key
- `OPENAI_API_KEY` — OpenAI API key
- `ANTHROPIC_API_KEY` — Anthropic API key
- `GOOGLE_AI_API_KEY` — Google Generative AI API key (also used for Nano Banana 2 image generation)
- `XAI_API_KEY` — xAI (Grok) API key
- `ELEVENLABS_API_KEY` — ElevenLabs API key (podcast audio generation)
- `CRON_SECRET` — Vercel cron authentication secret

### Content Generation Services (Phase 6)

**Image Generation:**
- **Nano Banana 2** (`gemini-3.1-flash-image-preview`) — Google AI, same `GOOGLE_AI_API_KEY`. 131K input / 32K output tokens. Per image: $0.045 (0.5K), $0.067 (1K), $0.101 (2K).
- **Grok Imagine** (`grok-imagine-image`) — xAI, same `XAI_API_KEY`. $0.02/image (standard), $0.07/image (pro). 300 RPM. Cheapest option.

**Video Generation:**
- **Grok Imagine Video** (`grok-imagine-video`) — xAI, same `XAI_API_KEY`. $0.05/second. 60 RPM.

**Text-to-Speech (Podcast Audio):**
- **ElevenLabs** — best voice quality, especially for multilingual (en/fa/tr). Creator plan ($22/mo).
  - `eleven_v3` — best quality, 70+ languages, 5K char limit (~5 min audio). For final published podcasts.
  - `eleven_flash_v2_5` — fast/cheap, 32 languages, 40K char limit (~40 min audio). For draft previews.
  - Pricing: ~$220/M chars (v3), ~$110/M chars (Flash). 100K v3 + 200K Flash chars included/mo.
- **Grok TTS** — xAI, same `XAI_API_KEY`. $4.20/M chars. 50x cheaper than ElevenLabs but lower voice quality. Good for draft/preview audio, not final published podcasts.
- **Strategy:** ElevenLabs for final published podcasts (best voices, multilingual). Grok TTS for draft previews / internal testing.

**xAI/Grok Full Model Lineup (for reference):**
- `grok-4.20-beta-0309-non-reasoning` — flagship, $2/$6 per M, 2M context (our Fact Checker)
- `grok-4.20-beta-0309-reasoning` — same price, with reasoning tokens
- `grok-4-1-fast-non-reasoning` — $0.20/$0.50 per M, 2M context (budget alternative)
- `grok-code-fast-1` — $0.20/$1.50 per M, 256K context (code-specific)
- `grok-imagine-image` — $0.02/image, `grok-imagine-image-pro` — $0.07/image
- `grok-imagine-video` — $0.05/sec
- Grok TTS — $4.20/M chars (beta)
- Grok Batch API — 50% off all models
- Knowledge cutoff: November 2024

### Student Challenge System
Students can challenge published content by commenting on specific sections. The AI council re-evaluates the challenged content — if the student is right, the content is corrected. If not, the council explains why the content is correct. Admin has final say.

### Content Accumulation & Versioning Architecture (decided 2026-03-15)

**Core rule: Full 5-model pipeline always. No cost cutting.** Content is generated once, served to thousands across semesters. ~$1-2 per run is an investment.

#### Hybrid Accumulation (Approach 1 + 2)
- **First contribution:** Full pipeline → initial study guide with topic-based sections
- **Subsequent contributions:** Section-based merge:
  1. Kimi classifies new content by topic (cheap)
  2. For each topic: exists → MERGE that section only, new → CREATE section
  3. Only changed/new sections go through the 5-model council
  4. Stitch back into full guide
- Cost scales with what changed, not total weeks. Context stays ~80K tokens.

#### Multi-File Upload
- **One big file:** Extract → full pipeline → done
- **Bulk upload (all at once):** Extract all in parallel → combine → full pipeline
- **Incremental (week by week):** Extract → topic classify → section-based merge
- Pipeline auto-detects fresh course vs. adding to existing content.

#### Content Strategy Per Type
ALL content reflects full accumulated course. Consistent quality regardless of upload method.
- **Study Guide, Report:** Section-based merge (add/expand per topic)
- **Flashcards:** Append new cards, keep existing
- **Quizzes, Mock Exams:** Regenerate covering ALL material. Tag each question by topic for flexible filtering ("quiz me on Inflation", "mock exam Weeks 1-6")
- **Podcast, Video:** Regenerate comprehensive version. Keep ALL previous versions labeled by coverage scope
- **Mind Map, Infographic, Slide Deck:** Regenerate from accumulated content
- **Data Table, Interactive:** Append new entries/blocks

#### Nothing Archived, Everything Labeled
- Every generated piece labeled with coverage scope ("Covers: Week 1-6", "Covers: Full Course")
- No replacing, no deleting — we paid for it, we keep it
- Students see all versions, filtered/organized by scope

#### On-Demand Generation
Students can request custom-scoped content:
- "Mock exam for midterm (Weeks 1-6)"
- "Flashcards on Chapter 3 topics"
- System checks: exists → serve. Doesn't exist → generate, save, label.
- Next student with same request gets it instantly. Library grows organically.

#### Semester Versioning (Git-like)
- Each semester = like a Git tag. Previous semester content stays as public archive.
- New semester contributions: compare with previous semester's source
- Small diff → section-based update (efficient). Big diff → fresh generation.
- All historical content remains accessible. Platform = public archive of course evolution.

#### Course Page UI (4 tabs)
- **Learn:** Study Guide, Report, Slide Deck, Interactive Section
- **Practice:** Flashcards, Quiz, Mind Map, Data Table, Infographic
- **Exam:** Mock Exam (separate tab — different UX: timed, scored, formal)
- **Media:** Podcast, Video Script

### Implementation Phases
1. **Foundation** ✅ — DB schema (5 tables) + `lib/ai/types.ts` + unified AI client
2. **Providers** ✅ — Kimi, OpenAI, Anthropic, Gemini, Grok provider implementations
3. **Pipeline Engine** ✅ — Orchestrator + prompts + cron handler
4. **Content Extraction** ✅ — Extraction pipeline (PDF/DOCX/PPTX/image/video → structured text)
5. **Admin UI** ✅ — AI Council admin pages (jobs list, stats, job detail, publish flow)
6. **Content Generation** — Output type generators + course page rendering
7. **Student Challenges** — Challenge submission UI + re-evaluation pipeline
8. **Accumulator Pipeline** — Section-based merge + multi-file upload + semester versioning
9. **On-Demand Generation** — Student request system for custom-scoped content

### Cost Model
- **Kimi** does 90% of token work at ~1/10th the price — runs real-time (instant for users)
- **Steps 2-5 via Batch API** — 50% off: GPT-5.4 batch $1.25/$7.50, Claude Opus batch $2.50/$12.50, Gemini batch $1/$6, Grok batch $1/$3
- Extraction: ~$0.01-0.05 per contribution (Kimi multimodal for images/OCR)
- Reviewers only process diffs/confirmations (small token load)
- Content generated ONCE, served to 10,000+ students at $0 marginal cost
- Cost tracked per step, per job, per course, with configurable ceiling per job
- **Estimated cost per content piece (batch):** ~$0.05-0.30 total across all 5 models

---

## Notes
- **Next.js 16:** `middleware.ts` has been deprecated and renamed to `proxy.ts` — don't confuse them. Use `proxy.ts` for request interception/routing.
- **Target: 10,000+ users in first 6 months** — university-scale project aiming for university sponsorship and wide adoption. ALWAYS build for scale, never treat this as a small/hobby project.
- Keep dependencies minimal
- Path alias: `@/*` maps to project root
- Hosted on Vercel Pro plan
- Admin is Hamid only — professor Core Contributor role planned
- Content workflow: student contributions → moderation → Claude → original structured content → publish to DB
