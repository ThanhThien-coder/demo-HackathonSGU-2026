# BRIEFING — 2026-11-03T14:24:00Z

## Mission
Integrate Bước 4 (`POST /api/ingest`) and Bước 5 (`GET /api/sessions`) into Home and Roadmap pages (`src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`) with 4 complete UI states, Dev Bypass Auth, and 0 TypeScript errors.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa, specialist
- Working directory: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_2_home_roadmap
- Original parent: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Milestone: One-shot API Integration Pipeline - Worker 2 (Home & Roadmap Domain)

## 🔒 Key Constraints
- Exclusively owned files:
  - `src/app/page.tsx`
  - `src/app/roadmap/page.tsx`
  - `src/app/roadmap/[courseId]/page.tsx`
  - `.agents/teamwork/worker_2_home_roadmap/`
- DO NOT modify any other files in `src/`!
- DO NOT hardcode test results or create dummy facades; maintain genuine state & logic.
- Preserve all existing Tailwind classes, layout structure, Lottie animation (`animation-robot.json`), and SVG icons.
- Implement all 4 UI states: Loading, Success, Error, Empty.
- Dev Bypass Auth: when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"` or no session, support smooth UI display.
- Run `npx tsc --noEmit` to verify 0 type errors.

## Current Parent
- Conversation ID: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Updated: 2026-11-03T14:24:00Z

## Task Summary
- **What to build**:
  1. `src/app/page.tsx`:
     - Both GitHub URL and .zip file upload supported with drag-and-drop.
     - Validation: URL regex and `CONFIG.MAX_UPLOAD_BYTES` (4.5MB).
     - Live scanning progress overlay with elapsed seconds and stage indicators.
     - Vietnamese friendly error mapping according to `spec/30_UI.md`.
     - Smooth navigation to `/learn?session=${sessionId}` on success.
     - Recent Sessions ("Tiếp tục học") section consuming `getSessionsSafe()` with resume handler.
  2. `src/app/roadmap/page.tsx`:
     - Real session list consumption using `getSessionsSafe()`.
     - Complete 4 UI states: Shimmer skeleton (Loading), Error banner with retry (Error), Polished CTA placeholder (Empty), and RoadmapCardList with progress calculations (Success).
     - Dev Bypass Auth toggle support.
  3. `src/app/roadmap/[courseId]/page.tsx`:
     - Detailed session and node graph progression consumption (`getSessionsSafe()`, `getSessionProgressSafe()`).
     - Complete 4 UI states: Loading skeleton, Error alert, Empty roadmap placeholder, and LessonList with links to cockpit.
     - Clean fallback to `getCourseDetail` for demo courses.
- **Success criteria**:
  - Worker 2 files compile with 0 errors in `npx tsc --noEmit`.
  - All 304 unit tests in repository pass with 0 failures (`npm test`).
  - Layout and visual styling strictly preserved.
- **Interface contracts**: `spec/02_CONTRACTS.md`, `spec/03_API_VA_LUU_TRU.md`, `src/lib/api.ts`

## Key Decisions Made
- Embedded interactive scanner and recent session section in `src/app/page.tsx` to respect strict file write boundaries.
- Retained preset course details in `[courseId]` as fallback while prioritizing real backend sessions and node states.

## Change Tracker
- **Files modified**:
  - `src/app/page.tsx`: Ingest (URL + zip upload), scanner progress, recent sessions.
  - `src/app/roadmap/page.tsx`: Real sessions list with 4 UI states and bypass auth.
  - `src/app/roadmap/[courseId]/page.tsx`: Session detail and lessons progress with 4 UI states.
- **Build status**: PASS (0 type errors in Worker 2 files; all 304 tests passed).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: `npm test` -> 19 test files passed (304 tests passed).
- **Lint status**: Clean.
- **Tests added/modified**: Co-located logic validated against existing test suite.

## Loaded Skills
- **Source**: `C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md`
- **Local copy**: `.agents/teamwork/worker_2_home_roadmap/SKILL_simplifey-api-integrator.md`
- **Core methodology**: Safe API integration following 5-step checklist, 4 UI states (loading, success, error, empty), strict contract adherence, and tsc verification.
