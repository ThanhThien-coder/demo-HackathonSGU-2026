# Project: SimpliFey 13 API Integration Pipeline

## Architecture
- Client API layer: `src/lib/api.ts` (centralized typed fetcher with Bearer auth, bypass auth, typed contracts from `@/contracts`).
- Domain UI:
  - Header & Profile: `src/components/layout/Navbar.tsx`, `src/components/layout/SettingsDropdown.tsx`, store if needed.
  - Home & Roadmap: `src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`.
  - Report & Analytics: `src/app/report/page.tsx`.
  - Learn Cockpit: `src/app/learn/` (e.g. `src/app/learn/page.tsx`, `src/app/learn/[nodeId]/page.tsx`, or relevant components in `src/app/learn/`).

## Feature Inventory
| # | Step | Endpoint | Description | Milestone | File Scope |
|---|------|----------|-------------|-----------|------------|
| 1 | Step 1 | GET /api/me | Lấy thông tin user profile & persona | M1, M2 (W1, W3) | src/lib/api.ts, Navbar, SettingsDropdown, report |
| 2 | Step 2 | POST /api/demo/persona | Chuyển đổi persona demo | M1, M2 (W1) | src/lib/api.ts, SettingsDropdown |
| 3 | Step 3 | DELETE /api/me | Xóa dữ liệu học / reset profile | M1, M2 (W1) | src/lib/api.ts, SettingsDropdown |
| 4 | Step 4 | POST /api/ingest | Ingest repo link hoặc zip file | M1, M2 (W2) | src/lib/api.ts, page.tsx |
| 5 | Step 5 | GET /api/sessions | Lấy danh sách session học | M1, M2 (W2) | src/lib/api.ts, roadmap/page.tsx, roadmap/[courseId] |
| 6 | Step 6 | GET /api/sessions/{id}/progress | Lấy chi tiết tiến độ session & nodes | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 7 | Step 7 | GET /api/sessions/{id}/history | Lấy lịch sử hội thoại / phiên học | M1, M2 (W3) | src/lib/api.ts, src/app/report/page.tsx |
| 8 | Step 8 | POST /api/analyze-node | Phân tích giải thích node code | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 9 | Step 9 | POST /api/analyze-overview | Phân tích tổng quan kiến trúc repo | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 10 | Step 10 | POST /api/enrich-node | Bổ sung kiến thức chuyên sâu node | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 11 | Step 11 | POST /api/evaluate-feynman | Đánh giá lời giải thích Feynman | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 12 | Step 12 | POST /api/reveal | Gợi ý / giải mã manh mối | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |
| 13 | Step 13 | POST /api/report-wrong | Báo cáo kiến thức chưa chính xác | M1, M2 (W4) | src/lib/api.ts, src/app/learn/ |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | API Client Contract Lock | `src/lib/api.ts` (Steps 1-13 endpoints, apiFetch, Bearer, bypass auth, contracts) | None | DONE |
| M2 | Domain Parallel Integration | 4 Isolated Workers: W1 (Profile/Header), W2 (Home/Roadmap), W3 (Report/Analytics), W4 (Cockpit/Learn) | M1 | DONE |
| M3 | Quality Gate & Self-healing | Auditor verification (`npx tsc --noEmit` = 0 errors) | M2 | DONE |
| M4 | Final Acceptance Report | 4-section report synthesis | M3 | DONE |

## Code Layout & File Boundaries
- Worker 1 owns: `src/components/layout/Navbar.tsx`, `src/components/layout/SettingsDropdown.tsx`, and user state store if any.
- Worker 2 owns: `src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`.
- Worker 3 owns: `src/app/report/page.tsx` (and related report components if any).
- Worker 4 owns: `src/app/learn/**`.
- Phase 1 Worker owns: `src/lib/api.ts`.
