# BRIEFING — 2026-11-03T14:14:00Z

## Mission
Lock the API Client contract in `src/lib/api.ts` by defining and exporting typed wrapper functions for all 13 API endpoints (Steps 1 to 13) according to `API_INTEGRATION_PROMPTS.md`, `spec/02_CONTRACTS.md`, and `spec/03_API_VA_LUU_TRU.md`.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_api_client
- Original parent: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Milestone: Phase 1 / Requirement R1 - API Client Contract Lock

## 🔒 Key Constraints
- File write ownership: ONLY `src/lib/api.ts` and directory `.agents/teamwork/worker_api_client/`.
- Do NOT touch UI files or `src/app/api/`.
- Must export typed wrapper functions for all 13 API endpoints (Steps 1 to 13).
- Must support Bearer token and `NEXT_PUBLIC_BYPASS_AUTH=true`.
- Zero type errors on `npx tsc --noEmit`.
- Integrity Mandate: genuine logic, real state and behavior, no shortcuts.

## Current Parent
- Conversation ID: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Updated: 2026-11-03T14:14:00Z

## Task Summary
- **What to build**: Typed wrapper functions and type re-exports in `src/lib/api.ts` for all 13 SimpliFey API endpoints.
- **Success criteria**: All 13 endpoints have typed wrappers matching contracts, tsc passes with 0 errors, vitest passes.
- **Interface contracts**: `docs/spec/02_CONTRACTS.md`, `src/contracts/api.ts`, `docs/spec/03_API_VA_LUU_TRU.md`.
- **Code layout**: `src/lib/api.ts`.

## Key Decisions Made
- Exported canonical contract types from `@/contracts` along with convenient aliases matching the dispatch prompts (`UserProfileResponse = MeResponse`, `SwitchPersonaRequest = PersonaRequest | { persona: PersonaMode }`, `SwitchPersonaResponse = PersonaResponse`, `DeleteUserResponse = void`, `SessionListResponse = SessionsResponse`, `SessionProgressResponse = ProgressResponse`, `SessionHistoryResponse = HistoryResponse`).
- Implemented robust overloads for `switchPersona` (accepts string `"NEWBIE"` or object `{ mode: "NEWBIE" }` or `{ persona: "NEWBIE" }`), `analyzeNode` (accepts object `{ session_id, node_id }` or parameters `sessionId, nodeId`), `analyzeOverview` (accepts object or `sessionId`), `enrichNode` (accepts object or `sessionId, nodeId, mode`), `reveal` / `revealAnswer`, and `deleteMe` / `deleteAccount`.
- Exported safe variants (`*Safe`) for each of the 13 API functions returning `ApiResult<T>` for components that prefer error objects over try-catch.
- Verified `npx tsc --noEmit` and `npx eslint src/lib/api.ts` with 0 errors.

## Artifact Index
- `.agents/teamwork/worker_api_client/DISPATCH.md` — Dispatch instructions
- `.agents/teamwork/worker_api_client/simplifey-api-integrator.SKILL.md` — Local copy of skill reference
- `.agents/teamwork/worker_api_client/progress.md` — Liveness and progress tracking
- `.agents/teamwork/worker_api_client/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: `src/lib/api.ts`
- **Build status**: clean (0 tsc errors, 304 vitest tests passing)
- **Pending issues**: none

## Quality Status
- **Build/test result**: pass (`npx tsc --noEmit` passed, `npm test` 304/304 passed)
- **Lint status**: `npx eslint src/lib/api.ts` clean (0 errors)
- **Tests added/modified**: verified existing test suite

## Loaded Skills
- **Source**: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md
- **Local copy**: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_api_client\simplifey-api-integrator.SKILL.md
- **Core methodology**: Quy trình chuẩn hóa và an toàn để tích hợp các API (Bước 0 đến 13) vào SimpliFey, tập trung hóa hàm gọi tại src/lib/api.ts dùng apiFetch, hỗ trợ Bearer token và dev mock / bypass auth, tuân thủ 100% contracts spec/02 và spec/03.
