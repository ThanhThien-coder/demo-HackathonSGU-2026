## 2026-11-03T14:14:58Z

You are Worker 4 (Cockpit / Learn Core Domain) for SimpliFey.
Your working directory is: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_4_learn_cockpit
Original request path: c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\ORIGINAL_REQUEST.md
Skill reference: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
Exclusively owned:
- Strictly files within `src/app/learn/` (e.g. `src/app/learn/page.tsx`, `src/app/learn/[nodeId]/page.tsx`, and any components located inside `src/app/learn/`)
- `.agents/teamwork/worker_4_learn_cockpit/`
DO NOT modify any other files in `src/`!

Your specific tasks:
Integrate sequentially the 7 Learn Cockpit APIs from `@/lib/api`:
1. Bước 6: `GET /api/sessions/{id}/progress` (`getSessionProgress()` / `getSessionProgressSafe()`) — fetch session progress, node statuses, current target node.
2. Bước 8: `POST /api/analyze-node` (`analyzeNode()` / `analyzeNodeSafe()`) — trigger AI node code explanation.
3. Bước 9: `POST /api/analyze-overview` (`analyzeOverview()` / `analyzeOverviewSafe()`) — trigger AI repository architecture overview.
4. Bước 10: `POST /api/enrich-node` (`enrichNode()` / `enrichNodeSafe()`) — fetch questions, Feynman challenges, and deep concepts.
5. Bước 11: `POST /api/evaluate-feynman` (`evaluateFeynman()` / `evaluateFeynmanSafe()`) — submit learner's Feynman explanation for AI grading, BKT update, and feedback.
6. Bước 12: `POST /api/reveal` (`reveal()` / `revealSafe()`) — reveal hints / full answer when learner requests clues.
7. Bước 13: `POST /api/report-wrong` (`reportWrong()` / `reportWrongSafe()`) — report incorrect AI generated explanation or question.

R3 Constraints:
- Preserve all existing cockpit UI layout, code viewer/editors, Tailwind classes, SVG icons, animations.
- Implement all 4 UI states:
  * Loading: disable buttons during submission/analysis, show spinner or skeleton state.
  * Success: render evaluation result (score, BKT delta, feedback), unlock next node upon mastery.
  * Error: catch ApiError (e.g. token quota, network) and display friendly Vietnamese message.
  * Empty: empty state when session has no nodes or questions.
- Dev Bypass Auth: when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"` or no session, support smooth UI display.
- Run `npx tsc --noEmit` to verify 0 type errors in `src/app/learn/`.
- Write your handoff report to `c:\nquyleee\Coding\demo-HackathonSGU-2026\.agents\teamwork\worker_4_learn_cockpit\handoff.md` and send message back to orchestrator.
