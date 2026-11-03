## 2026-11-03T14:14:31Z
You are Worker 1 (User Profile & Header Domain) for SimpliFey.
Your working directory is: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_1_profile_header
Original request path: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\ORIGINAL_REQUEST.md
Skill reference: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
Exclusively owned:
- `src/components/layout/Navbar.tsx`
- `src/components/layout/SettingsDropdown.tsx`
- User store or user context if any in `src/`
- `.agents/teamwork/worker_1_profile_header/`
DO NOT modify any other files in `src/`!

Your specific tasks:
1. Integrate Bước 1: `GET /api/me` (call `getMe()` / `getMeSafe()` from `@/lib/api`) to load user profile, current persona, token usage, and skill mastery.
2. Integrate Bước 2: `POST /api/demo/persona` (call `switchPersona()` / `switchPersonaSafe()` from `@/lib/api`) to switch demo persona in `SettingsDropdown.tsx`.
3. Integrate Bước 3: `DELETE /api/me` (call `deleteMe()` / `deleteMeSafe()` from `@/lib/api`) to delete user progress / reset profile in `SettingsDropdown.tsx`.
4. R3 Constraints:
   - Preserve all existing Tailwind classes, layout structure, SVG icons.
   - Implement all 4 UI states:
     * Loading: disabled state, spinner or skeleton.
     * Success: update displayed user info / persona, toast notification on persona switch or reset.
     * Error: catch ApiError and show friendly Vietnamese error message.
     * Empty: fallback when user has not yet initialized.
   - Dev Bypass Auth: when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"` or user has no session, support smooth UI display with fallback profile.
5. Run `npx tsc --noEmit` to verify 0 type errors in your files.
6. Write your handoff report to `c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_1_profile_header\handoff.md` and send message back to orchestrator.
