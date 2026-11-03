## 2026-11-03T13:59:35Z
You are the API Client Specialist for SimpliFey.
Your working directory is: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_api_client
Original request path: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\ORIGINAL_REQUEST.md
Skill reference: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your specific task (Phase 1 / Requirement R1):
1. Lock the API Client contract in `src/lib/api.ts` by defining and exporting typed wrapper functions for all 13 API endpoints (Steps 1 to 13) according to `API_INTEGRATION_PROMPTS.md`, `spec/02_CONTRACTS.md`, and `spec/03_API_VA_LUU_TRU.md`.
2. Inspect `@/contracts` (or `src/contracts/`) to import the exact TypeScript types for request/response bodies:
   - Step 1: `GET /api/me` -> `getMe(): Promise<UserProfileResponse>`
   - Step 2: `POST /api/demo/persona` -> `switchPersona(persona: PersonaId | SwitchPersonaRequest): Promise<SwitchPersonaResponse>`
   - Step 3: `DELETE /api/me` -> `deleteMe(): Promise<DeleteUserResponse>`
   - Step 4: `POST /api/ingest` -> `ingestRepo(data: IngestRequest | FormData): Promise<IngestResponse>`
   - Step 5: `GET /api/sessions` -> `getSessions(params?: { status?: SessionStatus; limit?: number; offset?: number }): Promise<SessionListResponse>`
   - Step 6: `GET /api/sessions/{id}/progress` -> `getSessionProgress(sessionId: string): Promise<SessionProgressResponse>`
   - Step 7: `GET /api/sessions/{id}/history` -> `getSessionHistory(sessionId: string): Promise<SessionHistoryResponse>`
   - Step 8: `POST /api/analyze-node` -> `analyzeNode(data: AnalyzeNodeRequest): Promise<AnalyzeNodeResponse>`
   - Step 9: `POST /api/analyze-overview` -> `analyzeOverview(data: AnalyzeOverviewRequest): Promise<AnalyzeOverviewResponse>`
   - Step 10: `POST /api/enrich-node` -> `enrichNode(data: EnrichNodeRequest): Promise<EnrichNodeResponse>`
   - Step 11: `POST /api/evaluate-feynman` -> `evaluateFeynman(data: EvaluateFeynmanRequest): Promise<EvaluateFeynmanResponse>`
   - Step 12: `POST /api/reveal` -> `reveal(data: RevealRequest): Promise<RevealResponse>`
   - Step 13: `POST /api/report-wrong` -> `reportWrong(data: ReportWrongRequest): Promise<ReportWrongResponse>`
   (Also export safe versions or options if useful).
3. Ensure `apiFetch` continues to support Bearer token and `NEXT_PUBLIC_BYPASS_AUTH=true`.
4. Run `npx tsc --noEmit` to verify `src/lib/api.ts` compiles cleanly with 0 type errors.
5. Write your handoff report to `c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_api_client\handoff.md` and send message back to orchestrator.

File write ownership: ONLY `src/lib/api.ts` and your directory `.agents/teamwork/worker_api_client/`. Do NOT touch UI files or `src/app/api/`.
