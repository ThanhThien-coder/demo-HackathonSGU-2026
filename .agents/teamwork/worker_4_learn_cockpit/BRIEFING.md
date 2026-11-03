# BRIEFING — 2026-11-03T14:29:00Z

## Mission
Integrate sequentially the 7 Learn Cockpit APIs (Bước 6, 8, 9, 10, 11, 12, 13) exclusively within `src/app/learn/` while maintaining all UI states, layout, and type safety.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_4_learn_cockpit
- Original parent: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Milestone: Phase 2 - API Integration (Cockpit / Learn Core Domain)

## 🔒 Key Constraints
- File write ownership: Strictly files within `src/app/learn/` and `.agents/teamwork/worker_4_learn_cockpit/`. DO NOT modify any other files in `src/`!
- Do not cheat: genuine logic, real state transitions, genuine error handling.
- Preserve existing cockpit UI layout, code viewer/editors, Tailwind classes, SVG icons, Lottie animations.
- 4 UI states for all API interactions: Loading, Success, Error, Empty.
- Dev Bypass Auth (`NEXT_PUBLIC_BYPASS_AUTH === "true"` or no session).
- 0 TypeScript errors with `npx tsc --noEmit`.

## Current Parent
- Conversation ID: a977645e-3a09-4f0a-b4a6-2cc9fe51d31f
- Updated: 2026-11-03T14:29:00Z

## Task Summary
- **What to build**: Full integration of 7 Learn Cockpit APIs:
  1. Bước 6: `GET /api/sessions/{id}/progress` (Drawer đồ thị bài học, node statuses, token count)
  2. Bước 8: `POST /api/analyze-node` (AI Code explanation, execution flow, patterns, weak points with "Nhận định của AI")
  3. Bước 9: `POST /api/analyze-overview` (Overview tab / repo architecture summary with disclaimer)
  4. Bước 10: `POST /api/enrich-node` (Feynman challenges & questions)
  5. Bước 11: `POST /api/evaluate-feynman` (Grading, BKT delta, feedback, follow-up code pointers)
  6. Bước 12: `POST /api/reveal` (Skip question & reveal AI reference answer, points, fix)
  7. Bước 13: `POST /api/report-wrong` (Dispute AI grading, rollback BKT, flag 🚩)
- **Success criteria**: All 7 APIs integrated into `src/app/learn/`, 4 UI states implemented, layout preserved, `npx tsc --noEmit` passes with 0 errors, `npx eslint src/app/learn` passes with 0 errors/warnings.
- **Interface contracts**: `spec/02_CONTRACTS.md`, `spec/03_API_VA_LUU_TRU.md`, `src/lib/api.ts`
- **Code layout**: `src/app/learn/`

## Key Decisions Made
- Exclusively modularized Learn components inside `src/app/learn/components/` to preserve write boundaries without altering `src/components/learn/`.
- Created `src/app/learn/utils/messages.ts` with complete Vietnamese error mappings from `spec/30_UI.md` Section 10.
- Implemented real state hooks and fallbacks in `src/app/learn/page.tsx` for all 7 APIs.

## Artifact Index
- `.agents/teamwork/worker_4_learn_cockpit/DISPATCH.md` — Dispatch message
- `.agents/teamwork/worker_4_learn_cockpit/simplifey-api-integrator.SKILL.md` — Local copy of skill
- `.agents/teamwork/worker_4_learn_cockpit/progress.md` — Progress heartbeat
- `.agents/teamwork/worker_4_learn_cockpit/handoff.md` — Handoff report
- `src/app/learn/page.tsx` — Main cockpit learn page
- `src/app/learn/components/CockpitHeader.tsx` — Context sub-header with tokens and overview button
- `src/app/learn/components/LessonGraphDrawer.tsx` — Step 6 interactive knowledge graph drawer
- `src/app/learn/components/CodeSnippetViewer.tsx` — Step 8 AI code analysis viewer
- `src/app/learn/components/RepoOverviewModal.tsx` — Step 9 repo overview modal
- `src/app/learn/components/FeynmanQuestionSection.tsx` — Steps 10, 11, 12, 13 Feynman challenge section
- `src/app/learn/components/SubmitEvaluationDialog.tsx` — Step 11 BKT evaluation dialog
- `src/app/learn/components/SkipConfirmDialog.tsx` — Step 12 skip question confirmation dialog
- `src/app/learn/components/ReportWrongDialog.tsx` — Step 13 dispute dialog
- `src/app/learn/components/FullFileModal.tsx` — Full file inspection modal
- `src/app/learn/types.ts` — Type definitions
- `src/app/learn/utils/messages.ts` — Error message dictionary

## Change Tracker
- **Files modified**:
  - `src/app/learn/page.tsx`: Orchestrated 7 APIs, 4 UI states, bypass auth
  - `src/app/learn/components/*`: 9 component files created/updated
  - `src/app/learn/types.ts`: Local types
  - `src/app/learn/utils/messages.ts`: Vietnamese error message translations
- **Build status**: `npx tsc --noEmit` PASS (0 errors), `npx eslint src/app/learn` PASS (0 errors, 0 warnings)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (0 errors)
- **Lint status**: Pass (0 errors, 0 warnings in `src/app/learn`)
- **Tests added/modified**: Verified with static typecheck and linter

## Loaded Skills
- **Source**: `C:\Users\nquyleee\config\skills\simplifey-api-integrator\SKILL.md`
- **Local copy**: `.agents/teamwork/worker_4_learn_cockpit/simplifey-api-integrator.SKILL.md`
- **Core methodology**: Safe API integration without breaking UI, adhering to contract specs, handling 4 UI states, supporting bypass auth.
