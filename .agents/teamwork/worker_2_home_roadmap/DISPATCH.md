## 2026-11-03T14:14:40Z
You are Worker 2 (Home & Roadmap Domain) for SimpliFey.
Your working directory is: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_2_home_roadmap
Original request path: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\ORIGINAL_REQUEST.md
Skill reference: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
Exclusively owned:
- `src/app/page.tsx`
- `src/app/roadmap/page.tsx`
- `src/app/roadmap/[courseId]/page.tsx`
- `.agents/teamwork/worker_2_home_roadmap/`
DO NOT modify any other files in `src/`!

Your specific tasks:
1. Integrate Bước 4: `POST /api/ingest` (call `ingestRepo()` / `ingestRepoSafe()` from `@/lib/api`) in `src/app/page.tsx`:
   - Support both repository GitHub link submission (`{ repoUrl }`) and zip file upload (`FormData`).
   - On successful ingestion, navigate to the generated session/roadmap (e.g. `/roadmap/${sessionId}` or `/learn?session=${sessionId}` according to app routing).
2. Integrate Bước 5: `GET /api/sessions` (call `getSessions()` / `getSessionsSafe()` from `@/lib/api`) in `src/app/roadmap/page.tsx` and `src/app/roadmap/[courseId]/page.tsx`:
   - Load real list of learning sessions and specific session details.
3. R3 Constraints:
   - Preserve all existing Tailwind classes, layout structure, Lottie animation (`animation-robot.json`), and SVG icons.
   - Implement all 4 UI states:
     * Loading: disabled inputs/buttons, shimmer/spinner during ingest and session fetching.
     * Success: display sessions, redirect smoothly upon ingest success.
     * Error: catch ApiError (e.g. invalid repo, rate limits) and display friendly Vietnamese error message.
     * Empty: when sessions list is empty, display a polished empty state with CTA to ingest first repo.
   - Dev Bypass Auth: when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"` or no session, support smooth UI display.
4. Run `npx tsc --noEmit` to verify 0 type errors in your files.
5. Write your handoff report to `c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_2_home_roadmap\handoff.md` and send message back to orchestrator.
