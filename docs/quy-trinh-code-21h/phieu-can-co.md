# Phiếu cần có trước — bảng tra cho AI

> Sinh bằng `node .kb/tools/phieu-can-co.mjs <thư mục quy-trinh-code-21h> --ghi`. Không sửa tay, sửa phiếu rồi chạy lại.

## Luật

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại. Thiếu phiếu nào thì **DỪNG**, báo người dùng thiếu gì và đó là việc của vai nào. **KHÔNG** tự làm thay, **KHÔNG** tạo task.

## Cách kiểm

1. Lấy danh sách ở dòng "Phiếu này cần" trong prompt (hoặc cột "Cần có trước" của phiếu đang làm ở bảng dưới).
2. Với từng mã phiếu, tra cột "File phiếu tạo ra" và chạy `git ls-files <file>` trên nhánh hiện tại. Đủ file thì phiếu đó đã có. Thiếu dù một file thì coi như phiếu đó chưa có.
3. "Lát dọc 1" = A07, B07, C06, D06. "Lát dọc 2" = A10, C08, D08.
4. Báo theo mẫu: `Thiếu <mã> (<vai>): chưa có <file>`. Một dòng một phiếu.

## Ngoại lệ (không dừng, chỉ báo)

- Phiếu ghi kèm cách chờ, như "trong lúc chờ thì mock", "dùng fixture", "test bằng mock", "chạy song song": báo phiếu đó chưa có rồi nhắc làm theo cách chờ ghi trong phiếu.
- Phiếu ghi "bước N cần X" với N từ 2 trở lên (bước trong task, ví dụ A05, E07): vẫn tạo task, nhưng báo rõ bước N phải chờ X. Riêng "Bước 1 cần X" (B01, C01, E01) thì Bước 1 chính là bước tạo task, nên thiếu X vẫn DỪNG.
- Phiếu ghi "trên nhánh riêng" (ví dụ A09 trong A12): kiểm bằng `git branch -a --list "*<mã>*"` thay cho `git ls-files`.
- Phiếu làm tay không có file (E06, E09) và điều kiện không phải phiếu (việc dựng trước ngày thi, Bước 0 của `01_deploy`): không kiểm được bằng git. Hỏi người dùng đã xong chưa, chưa thì DỪNG.

## Bảng

| Phiếu | Vai | Cần có trước | File phiếu tạo ra |
| :-- | :-- | :-- | :-- |
| A01 | A — Trưởng tích hợp | Bước 0 trong `.kb/doc-de-hieu/01_deploy.md` Mục 3 | `package.json`<br>`package-lock.json`<br>`tsconfig.json`<br>`next.config.ts`<br>`postcss.config.mjs`<br>`eslint.config.mjs`<br>`vitest.config.ts`<br>`.gitignore`<br>`.env.example`<br>`README.md`<br>`LICENSE`<br>`src/app/layout.tsx`<br>`src/app/page.tsx`<br>`src/app/globals.css`<br>`src/app/api/health/route.ts` |
| A02 | A — Trưởng tích hợp | A01 (khung code trên main) | `src/contracts/` |
| A03 | A — Trưởng tích hợp | A01 (khung code trên main); WIF, Secrets, Environment production dựng trước ngày thi | `.github/workflows/ci.yml`<br>`.github/workflows/security.yml`<br>`.github/workflows/deploy.yml`<br>`.github/dependabot.yml` |
| A04 | A — Trưởng tích hợp | A02 (contracts đã merge) | `supabase/migrations/0001_init.sql`<br>`src/server/db.ts`<br>`src/server/auth.ts`<br>`src/server/errors.ts`<br>`src/server/log.ts`<br>`src/app/auth/callback/route.ts`<br>`src/app/api/me/route.ts`<br>`src/server/__tests__/errors.test.ts` |
| A05 | A — Trưởng tích hợp | A04 (database, auth); bước 3 cần C03 (src/lib/derive.ts) | `src/server/session.ts`<br>`src/server/cache.ts`<br>`src/server/quota.ts`<br>`src/server/progress.ts`<br>`src/app/api/sessions/route.ts`<br>`src/app/api/sessions/[id]/progress/route.ts`<br>`src/server/__tests__/session.test.ts` |
| A06 | A — Trưởng tích hợp | A05 (phiên, cache), B04 (`runIngest`, xong 17:30; trước đó test bằng mock); `runEngine` (B07, 20:00) thì test bằng mock | `src/app/api/ingest/route.ts`<br>`src/server/session.ts`<br>`src/app/api/__tests__/ingest.test.ts` |
| A07 | A — Trưởng tích hợp | A06 (ingest), C06 (hàm phân tích; trong lúc chờ thì mock) | `src/app/api/analyze-node/route.ts`<br>`src/app/api/__tests__/analyze-node.test.ts` |
| A08 | A — Trưởng tích hợp | A07 (analyze-node), C03 (planNodeQuestions), C07 (đặt câu hỏi; trong lúc chờ thì mock) | `src/server/enrich.ts`<br>`src/app/api/enrich-node/route.ts`<br>`src/app/api/__tests__/enrich-node.test.ts` |
| A09 | A — Trưởng tích hợp | A03 (CI/CD) | `Dockerfile`<br>`.dockerignore`<br>`next.config.ts` |
| A10 | A — Trưởng tích hợp | A08, C02, E03, E04; C08 (chấm, xong 00:00; trong lúc chờ thì mock `gradeWithAI`) | `src/server/evaluate.ts`<br>`src/server/reveal.ts`<br>`src/server/progress.ts`<br>`src/app/api/evaluate-feynman/route.ts`<br>`src/app/api/reveal/route.ts`<br>`src/app/api/__tests__/evaluate.test.ts` |
| A11 | A — Trưởng tích hợp | A10 (evaluate, reveal) | `src/server/report.ts`<br>`src/server/persona.ts`<br>`src/app/api/report-wrong/route.ts`<br>`src/app/api/demo/persona/route.ts`<br>`src/app/api/sessions/[id]/history/route.ts`<br>`src/app/api/__tests__/con-lai.test.ts` |
| A12 | A — Trưởng tích hợp | A09 (Dockerfile trên nhánh riêng), A11 (agy chạy lúc bạn ngủ) | `.github/workflows/deploy.yml` |
| B01 | B — Engine | Bước 1 cần A01 (khung code trên main); bước 3 cần A02 (kiểu `LanguageAdapter`, `LanguageId`, `LanguageSupportTier` trong `src/contracts`; trong lúc chờ thì vẫn viết, PR merge sau A02) | `public/grammars/`<br>`src/server/engine/graph/registry.ts`<br>`src/server/engine/graph/parser.ts`<br>`src/server/engine/graph/__tests__/parser.test.ts` |
| B02 | B — Engine | A02 (contracts đã merge) | `src/server/engine/ingest/types.ts`<br>`src/server/engine/ingest/url.ts`<br>`src/server/engine/ingest/probe.ts`<br>`src/server/engine/ingest/refs.ts`<br>`src/server/engine/ingest/download.ts`<br>`src/server/engine/ingest/snapshot.ts`<br>`src/server/engine/ingest/__tests__/tai.test.ts` |
| B03 | B — Engine | B02, B01 (`LANGUAGE_REGISTRY`, `KNOWN_NO_GRAMMAR` để phân loại đuôi file) | `src/server/engine/ingest/types.ts`<br>`src/server/engine/ingest/unzip.ts`<br>`src/server/engine/ingest/prune.ts`<br>`src/server/engine/ingest/priority.ts`<br>`src/server/engine/ingest/fingerprint.ts`<br>`src/server/engine/ingest/__tests__/loc.test.ts` |
| B04 | B — Engine | B03, E03 (`maskSensitive` đã merge) | `src/server/engine/ingest/types.ts`<br>`src/server/engine/ingest/special.ts`<br>`src/server/engine/ingest/secrets.ts`<br>`src/server/engine/ingest/fingerprint.ts`<br>`src/server/engine/ingest/index.ts`<br>`src/server/engine/ingest/__tests__/van-tay.test.ts` |
| B05 | B — Engine | B01, B04 | `src/server/engine/graph/types.ts`<br>`src/server/engine/graph/registry.ts`<br>`src/server/engine/graph/parser.ts`<br>`src/server/engine/graph/symbols.ts`<br>`src/server/engine/graph/resolvers/`<br>`src/server/engine/graph/callgraph.ts`<br>`src/server/engine/graph/degraded.ts`<br>`queries/`<br>`src/server/engine/graph/__tests__/tang1.test.ts` |
| B06 | B — Engine | B05 | `src/server/engine/graph/types.ts`<br>`src/server/engine/graph/tarjan.ts`<br>`src/server/engine/graph/pagerank.ts`<br>`src/server/engine/graph/complexity.ts`<br>`src/server/engine/graph/slicing.ts`<br>`src/server/engine/graph/__tests__/lat-cat.test.ts` |
| B07 | B — Engine | B06 | `src/server/engine/graph/types.ts`<br>`src/server/engine/graph/nodes.ts`<br>`src/server/engine/graph/degraded.ts`<br>`src/server/engine/graph/naming.ts`<br>`src/server/engine/graph/unclebob.ts`<br>`src/server/engine/graph/layout.ts`<br>`src/server/engine/graph/whitelist.ts`<br>`src/server/engine/graph/index.ts`<br>`src/server/engine/index.ts`<br>`src/server/engine/graph/__tests__/node.test.ts` |
| B08 | B — Engine | B07, A06; chạy song song E06 (Vai E chạy repo demo và báo lỗi engine) | `src/server/engine/` (thư mục, trừ `__fixtures__/` của Vai E)<br>`src/server/engine/__tests__/repo-demo.test.ts` |
| B09 | B — Engine | B08 | `src/server/engine/ingest/types.ts`<br>`src/server/engine/ingest/selective.ts`<br>`src/server/engine/ingest/download.ts`<br>`src/server/engine/ingest/index.ts`<br>`src/server/engine/ingest/__tests__/chon-loc.test.ts` |
| B10 | B — Engine | B09 | `src/server/engine/graph/types.ts`<br>`src/server/engine/graph/registry.ts`<br>`src/server/engine/graph/resolvers/`<br>`src/server/engine/graph/callgraph.ts`<br>`src/server/engine/ingest/fingerprint.ts`<br>`queries/`<br>`src/server/engine/graph/__tests__/entry.test.ts` |
| C01 | C — AI + BKT | Bước 1 cần A01 | `src/server/ai/gemini.ts`<br>`src/server/ai/__tests__/gemini.test.ts` |
| C02 | C — AI + BKT | A02 (contracts đã merge) | `src/lib/bkt-engine.ts`<br>`src/lib/__tests__/bkt-engine.test.ts` |
| C03 | C — AI + BKT | C02 | `src/lib/plan.ts`<br>`src/lib/derive.ts`<br>`src/lib/__tests__/plan.test.ts`<br>`src/lib/__tests__/derive.test.ts` |
| C04 | C — AI + BKT | C01, A02 (contracts đã merge) | `src/server/ai/gemini.ts`<br>`src/server/ai/prompts/common.ts`<br>`src/server/ai/schemas.ts`<br>`src/server/ai/__tests__/gemini.test.ts`<br>`src/server/ai/__tests__/common.test.ts` |
| C05 | C — AI + BKT | C04, E03 (`src/server/ai/guard/forbidden.ts` đã merge), E02 (fixture AI đã merge) | `src/server/ai/guard/text.ts`<br>`src/server/ai/guard/names.ts`<br>`src/server/ai/guard/lines.ts`<br>`src/server/ai/guard/analysis.ts`<br>`src/server/ai/guard/log.ts`<br>`src/server/ai/guard/__tests__/loi.test.ts` |
| C06 | C — AI + BKT | C05 | `src/server/ai/analyze.ts`<br>`src/server/ai/prompts/analyze.ts`<br>`src/server/ai/__tests__/analyze.test.ts` |
| C07 | C — AI + BKT | C06, C03 | `src/server/ai/questions.ts`<br>`src/server/ai/prompts/questions.ts`<br>`src/server/ai/guard/questions.ts`<br>`src/server/ai/__tests__/questions.test.ts` |
| C08 | C — AI + BKT | C07, E04 (`src/server/ai/guard/injection.ts` đã merge) | `src/server/ai/grade.ts`<br>`src/server/ai/prompts/grade.ts`<br>`src/server/ai/guard/followup.ts`<br>`src/server/ai/__tests__/grade.test.ts` |
| C09 | C — AI + BKT | C06, A05 (phiên, cache, quota), A07 (route `analyze-node` làm mẫu) | `src/server/ai/overview.ts`<br>`src/server/ai/prompts/overview.ts`<br>`src/server/ai/guard/overview.ts`<br>`src/app/api/analyze-overview/route.ts`<br>`src/server/ai/__tests__/overview.test.ts`<br>`src/app/api/__tests__/analyze-overview.test.ts` |
| C10 | C — AI + BKT | C09, E08 (kết quả chạy duyệt lần 1 của Vai E) | `scripts/record-bundle.ts`<br>`public/demo/mock_bundle.json` |
| D01 | D — Giao diện | A01 (khung code trên main) | `src/app/layout.tsx`<br>`src/app/page.tsx`<br>`src/app/globals.css` |
| D02 | D — Giao diện | A02 (contracts đã merge) | `src/store/workbench.ts`<br>`src/lib/api.ts`<br>`src/lib/messages.ts`<br>`src/lib/__tests__/messages.test.ts` |
| D03 | D — Giao diện | D02, E01 (fixture `shop-api`) | `src/components/canvas/DagCanvas.tsx`<br>`src/components/canvas/CanvasToolbar.tsx`<br>`src/components/canvas/GraphNodeCard.tsx`<br>`src/app/dev/page.tsx` |
| D04 | D — Giao diện | D03 | `src/components/code/CodePane.tsx`<br>`src/components/code/slice-model.ts`<br>`src/components/code/__tests__/slice-model.test.ts` |
| D05 | D — Giao diện | D04, E02 (fixture AI) | `src/components/cockpit/Cockpit.tsx`<br>`src/components/cockpit/XRayTab.tsx`<br>`src/components/cockpit/SkillChips.tsx`<br>`src/components/cockpit/StepList.tsx`<br>`src/components/cockpit/AlgoStepper.tsx`<br>`src/components/cockpit/OverviewTab.tsx`<br>`src/app/dev/page.tsx` |
| D06 | D — Giao diện | A04, A05, A06; A07 (`analyze-node`, xong 20:00; trong lúc chờ thì Tab 1 dùng fixture) | `src/components/landing/Landing.tsx`<br>`src/components/landing/RepoInput.tsx`<br>`src/components/landing/ZipDropzone.tsx`<br>`src/components/landing/ResumeList.tsx`<br>`src/components/landing/IngestOverlay.tsx`<br>`src/components/header/AppHeader.tsx`<br>`src/app/page.tsx`<br>`src/store/workbench.ts`<br>`src/components/cockpit/XRayTab.tsx` |
| D07 | D — Giao diện | D06, E04 (`similarity`); A08 (`enrich-node`, xong 22:00; trong lúc chờ thì dùng fixture câu hỏi của Vai E) | `src/components/cockpit/FeynmanTab.tsx`<br>`src/components/cockpit/QuestionCard.tsx`<br>`src/components/cockpit/AnswerBox.tsx`<br>`src/components/cockpit/HintCard.tsx`<br>`src/components/cockpit/RevealPanel.tsx`<br>`src/components/cockpit/SkillChangeChip.tsx`<br>`src/components/cockpit/RunSummary.tsx` |
| D08 | D — Giao diện | D07, C02, C03; A10 (`evaluate-feynman`, `reveal`, xong 00:00; trong lúc chờ thì dùng fixture chấm của Vai E) | `src/store/workbench.ts`<br>`src/lib/offline.ts`<br>`src/components/header/AppHeader.tsx`<br>`src/lib/__tests__/offline.test.ts` |
| D09 | D — Giao diện | D08 | `src/app/history/page.tsx`<br>`src/components/header/AccountMenu.tsx`<br>`src/components/header/PersonaMenu.tsx`<br>`src/components/header/TokenMeter.tsx`<br>`src/components/cockpit/ReportWrongDialog.tsx`<br>`src/app/layout.tsx` |
| D10 | D — Giao diện | D09, C09 (tổng quan thật) | `src/app/dev/page.tsx`<br>`src/components/` |
| E01 | E — Kiểm thử, demo, slide | Bước 1 cần A03 bước 1–2 đã merge | `src/server/engine/__fixtures__/shop-api.json` |
| E02 | E — Kiểm thử, demo, slide | A02, E01 | `src/server/ai/__fixtures__/analysis-n3.json`<br>`src/server/ai/__fixtures__/overview.json`<br>`src/server/ai/__fixtures__/questions-n3.json`<br>`src/server/ai/__fixtures__/grading-n3-q1.json`<br>`src/__tests__/fixtures.test.ts` |
| E03 | E — Kiểm thử, demo, slide | A02 | `src/server/ai/guard/forbidden.ts`<br>`src/lib/moderation.ts`<br>`src/server/ai/guard/__tests__/forbidden.test.ts`<br>`src/lib/__tests__/moderation.test.ts` |
| E04 | E — Kiểm thử, demo, slide | A02 | `src/server/ai/guard/injection.ts`<br>`src/lib/similarity.ts`<br>`src/server/ai/guard/__tests__/injection.test.ts`<br>`src/lib/__tests__/similarity.test.ts` |
| E05 | E — Kiểm thử, demo, slide | C02, C03 | `src/__tests__/kich-ban-ham.test.ts`<br>`review/loi_da_gap.md`<br>`review/cau_tra_loi_mau.md`<br>`review/ket_qua_duyet.md` |
| E06 | E — Kiểm thử, demo, slide | Lát dọc 1 (A07, B07, C06, D06 lên `main` lúc 20:00; trễ thì chờ Vai A báo) | — (phiếu làm tay, không có Được ghi) |
| E07 | E — Kiểm thử, demo, slide | E05; bước 2 cần Lát dọc 2 | `scripts/review-run.ts`<br>`review/loi_da_gap.md` |
| E08 | E — Kiểm thử, demo, slide | E07 | `review/ket_qua_duyet.md`<br>`review/loi_da_gap.md`<br>`src/__tests__/xuyen-module.test.ts` |
| E09 | E — Kiểm thử, demo, slide | C10 (bundle), D10 | — (phiếu làm tay, không có Được ghi) |
| E10 | E — Kiểm thử, demo, slide | E09 | `review/ket_qua_duyet.md` |
