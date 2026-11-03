# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Repo rules for every AI (Claude, Antigravity, …): @AGENTS.md. The `.kb/` folder is local to each machine and never committed (set up with `ak bat-dau`). When it is present, `.kb/README.md` holds the check commands and task protocol, and Claude's role is planner/reviewer: write tasks in `.kb/tasks/`, verify with `.kb/tools/` scripts instead of re-reading whole files, commit only what passed.

## Repository state

This is a **practice code repository** for the SimpliFey V2 Pro hackathon project (SGU 2026–2027, "Codebase Cognitive Twin"), copied from the old documentation repo so the team can rehearse the 21-hour build before the real round (round 2: 7–8/11/2026, assuming 12:00 07/11 → 09:00 08/11/2026; round 3: 09/11/2026). Implementation code **belongs here**: Next.js 15 app in `src/`, scripts in `package.json` (`dev`, `build`, `lint`, `typecheck`, `test` with vitest). The documentation lives under `docs/`; the same `spec/` and `doc-de-hieu/` are copied into `.kb/` for the ai-kit workflow.

Code by following the specs and the per-role task cards in `docs/quy-trinh-code-21h/`. Rehearse the competition rules (`docs/references/thele.md`) as if real: small commits, no bulk commit of pre-written code, every member commits their own work. The AI never commits or pushes on its own; a human commits after review.

Spec changes go through `docs/spec/00_QUYET_DINH.md`.

## Project in one paragraph

Turns a public GitHub repo (or uploaded `.zip`) into a deterministic map of up to 20 cross-file architectural slices (pure code, 0 tokens, target < 1.5 s), then uses Gemini at **4 calls** — `analyze-node` (skills + strengths + weak points, shared cache), `analyze-overview`, `enrich-node` (questions per weak skill), `evaluate-feynman` (grading + 3-level hints) — and a server-side BKT learner model over 16 skills stored in Supabase Postgres. Stack: Next.js 15, ReactFlow, Monaco, Tree-sitter WASM, Zustand, Supabase.

## Directory map

- `src/` — application code (Next.js App Router). Tree and library versions: `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` §15, §16.
- `docs/quy-trinh-code-21h/` — 21-hour build plan per role (`vai-A` … `vai-E`), one card per task.
- Everything below lives under `docs/` (paths are relative to `docs/`; the `.kb/` copy uses the same relative paths).
- `spec/` — **the only normative source.** Read the root `README.md` for the per-role reading order.
  - `00_QUYET_DINH.md` — decisions (D-xx), defaults awaiting confirmation, open questions (Q-xx). The only place that may say "proposed / pending".
  - `01_KIEN_TRUC_VA_LUONG.md` — invariants INV-01..13, components, flows, node & question lifecycles, where data lives.
  - `02_CONTRACTS.md` — **all** TypeScript types, every API request/response, all error codes, and the single `CONFIG` constants table.
  - `03_API_VA_LUU_TRU.md` — endpoints, Postgres schema, RLS, transactions, state derivation.
  - `04_KIEN_TRUC_TRIEN_KHAI.md` — deployment architecture, Supabase, logging, CI/CD, competition repo tree, tech stack.
  - `05_HA_TANG_CLOUD.md` — hạ tầng Google Cloud Run (cấu hình, bảo mật, đóng gói, dự phòng Vercel; sau này thêm CI/CD deploy, staging, Vertex, ngân sách).
  - `10_ENGINE_INGEST.md`, `11_ENGINE_DO_THI.md`, `12_ENGINE_MAU_ENTRY.md` (entry pattern catalogue per framework/language) — Tiers 0–2 (role B).
  - `20_AI_GOI_VA_PROMPT.md`, `21_AI_KIEM_VA_DUYET.md`, `22_BKT_VA_KE_HOACH_CAU_HOI.md` — AI calls, guardrails, BKT & question planning (role C).
  - `30_UI.md` — UI (role D). `50_TEST_VA_FIXTURE.md` — fixtures, end-to-end scenarios, Definition of Done.
- `pitch/` — demo script, judge Q&A, roadmap. **Not used for coding**; when it disagrees with `spec/`, `spec/` wins.
- `doc-de-hieu/` — plain-language walkthroughs, deployment setup guide, and the 21-hour build plan (`07_ke_hoach_21h.md`, the source for the schedule).
- `references/` — competition rules (`thele.md`) and an algorithm textbook (illustrative only).
- `archive/` — superseded documents (including everything before the 2026-10-28 consolidation in `archive/2026-10-28_truoc-hop-nhat/`, and the stale visual prototype in `archive/prototype/`). **Not authoritative**; don't cite or "fix" them.

## Rules when editing specs

- One fact, one place: types live only in `spec/02_CONTRACTS.md` (exception: a type marked `// nội bộ` and used in a single spec file may stay in that file; anything crossing the API, stored in the DB, or used by ≥ 2 spec files must be in `spec/02`); numbers only in its `CONFIG` table (and in "Test bắt buộc" sections / `50`). Other files refer by name (`CONFIG.MASTERED_MIN`, `HybridArchitecturalNode`, rule IDs like `ENG-12`).
- To change a decision: edit the D-xx row in `spec/00_QUYET_DINH.md` first, then the files it points to.
- Preserve the invariants in `spec/01_KIEN_TRUC_VA_LUONG.md` §2 (INV-01..13). Key ones: 1 node = 1 cross-file slice; Zero-Trust; no full source files stored (only sliced node snippets per session, D-59); server is the only writer of learning progress; Tab 1 shows strengths and AI-labelled weak points, answers revealed only when a question finishes; every AI text passes the guardrail (it blocks invented names / out-of-repo tech, not wrong meaning — never claim 100%); no AST fallback question; only TS/JS and Python are verified languages; deterministic engine; never claim to have invented BKT / PageRank / Compound AI / Tree-sitter repo-maps.
- Spec files are normative: no rationale essays, metaphors, pitch text or history inside `spec/` (those go to `pitch/` or `archive/`). Keep each spec file ≤ ~40 KB (exceptions: `spec/20` ≤ 47 433, `spec/02` ≤ 45 000, `spec/21` ≤ 43 000 bytes).
- All latency / token / cost numbers are targets or estimates until measured (`spec/02_CONTRACTS.md` §1.1).

## Working conventions

- Code must match `spec/02_CONTRACTS.md` (types, API shapes, error codes, `CONFIG`); do not invent names or numbers. Before reporting done, run `npm run typecheck`, `npm run lint` and `npm test`.
- Never read, print or commit `.env*` files (only `.env.example` is tracked).
- Docs are written in Vietnamese with Mermaid diagrams and occasional LaTeX; keep that language and style. Prefer relative links.
- Edit in the main working directory; do not create git worktrees (stray copies exist under `.claude/worktrees/`, ignore them).
