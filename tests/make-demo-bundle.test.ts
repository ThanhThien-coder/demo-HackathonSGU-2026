// Sinh public/demo/mock_bundle.json cho chế độ Offline (30 Mục 8). Chỉ chạy khi MAKE_BUNDLE=1.
// Bản đồ + vết dựng bằng engine thật trên repo mẫu shop-api; văn bản AI trong bundle do NGƯỜI VIẾT TAY (không gọi Gemini)
// và được cổng gác checkAnalysis / checkOverview kiểm lại. recorded_from.model ghi rõ "viết tay".
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  EnrichNodeResponse, EvaluateFeynmanResponse, HybridArchitecturalNode, NodeAnalysis, NodeStateView, OfflineMockBundle, PersonaMode,
  QuestionPlanItem, QuestionState, RevealResponse, RunQuestion, SWESkill,
} from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { PERSONAS } from "@/contracts/learner";
import { toAnalysisView } from "@/server/ai/analyze";
import { ANALYSES, BANK } from "@/server/ai/__fixtures__/shop-ai";
import { checkAnalysis, checkOverview } from "@/server/ai/guard/checks";
import { buildGraph, mainPath, toClientResult } from "@/server/engine";
import { processArchive } from "@/server/engine/ingest";
import { shopZip } from "@/server/engine/__fixtures__/shop-api";
import { deriveNodeStates } from "@/lib/derive";
import { planNodeQuestions } from "@/lib/plan";
import { overallTier } from "@/lib/bkt-engine";

const T = (id: string) => id;

describe.runIf(process.env.MAKE_BUNDLE === "1")("tạo gói demo Offline", () => {
  it("ghi public/demo/mock_bundle.json", async () => {
    const graph = await buildGraph(processArchive(shopZip(), { repo_name: "shop-api", repo_key: "demo/shop-api", source: "ZIP", ref: null, ref_label: "main", explicit_subdir: null }));
    const analysesRaw: Record<string, NodeAnalysis> = {};
    const views: OfflineMockBundle["analyses"] = {};
    for (const node of graph.nodes) {
      const spec = ANALYSES[node.title];
      expect(spec, `thiếu mô tả cho ${node.title}`).toBeTruthy();
      const raw = {
        skills: spec.skills.map(([skill, step, symbol, reason]) => ({ skill, step, symbol, reason })),
        architecture: { patterns: ["LAYERED" as const], summary: spec.summary },
        steps: node.trace_steps.map((s, i) => ({ step: s.step_number, text: spec.steps[i] ?? "Bước xử lý dữ liệu." })),
        strengths: spec.strengths.map(([step, text]) => ({ step, text })),
        weak_points: spec.weak.map(([skill, step, symbol, what, consequence]) => ({ skill, step, symbol, what, consequence })),
      };
      const checked = checkAnalysis(raw, node, graph);
      expect(checked && !checked.skeleton_only, `${node.title} phải qua cổng gác`).toBe(true);
      analysesRaw[node.id] = checked!;
      views[node.id] = toAnalysisView(checked!, node, graph);
    }

    const overviewRaw = checkOverview({
      architecture_style: "LAYERED", summary: "Repo bán hàng chia thành route, service và repo; xác thực dùng chung qua middleware.",
      layers: [{ layer: "ENTRY_POINT", role: "Nhận yêu cầu HTTP.", nodes: graph.nodes.map((n) => n.id) }, { layer: "DATA_ACCESS", role: "Đọc và ghi dữ liệu.", nodes: graph.nodes.map((n) => n.id) }],
      main_flow: "Bắt đầu từ node có ít phụ thuộc nhất rồi đi dần tới thanh toán.",
      notes: [{ text: "Khóa ký token viết thẳng trong code.", nodes: [graph.nodes.find((n) => n.title === "User Profile")!.id] }],
    }, graph, analysesRaw);
    expect(overviewRaw).toBeTruthy();

    const client = toClientResult(graph);
    const skeleton = graph.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone }));
    const derived = deriveNodeStates(skeleton, []);
    const nodesState: Record<string, NodeStateView> = Object.fromEntries(Object.entries(derived).map(([id, d]) => [id, { ...d, last_run: null }]));
    const session_id = "offline-demo";
    const ingest = { session_id, result: client, progress: { session_id, nodes: nodesState, tokens_used: 0 }, analyses: views, resumed: false, from_cache: true };

    const enrich: OfflineMockBundle["enrich"] = {};
    const scripted: OfflineMockBundle["scripted_answers"] = {};
    const reveals: OfflineMockBundle["reveals"] = {};
    const now = Date.now();
    for (const persona of Object.keys(PERSONAS) as PersonaMode[]) {
      const cfg = PERSONAS[persona];
      const skills = Object.fromEntries((["HTTP_ROUTING", "DTO_VALIDATION", "AUTH_SECURITY", "DEPENDENCY_INJECTION", "LAYERED_SEPARATION", "DB_OPTIMIZATION", "ASYNC_CONCURRENCY", "TRANSACTION_INTEGRITY", "ERROR_HANDLING", "STATE_MANAGEMENT", "ALGORITHMIC_COMPLEXITY", "MEMORY_MANAGEMENT", "API_CONTRACT_DESIGN", "CACHING_STRATEGY", "RATE_LIMIT_RESILIENCE", "DATA_SERIALIZATION"] as SWESkill[]).map((s) => [s, { skill: s, p_mastery: cfg.initial_p_mastery, last_practiced_at: now - cfg.days_idle * CONFIG.MS_PER_DAY, practice_count: 1, correct_count: 1 }]));
      void overallTier(skills as never, now);
      for (const node of graph.nodes) {
        const plan: QuestionPlanItem[] = planNodeQuestions(analysesRaw[node.id], skills as never, now, node.trace_steps.length);
        const R = `${node.id}:LEARN:${persona}`;
        const bank = BANK[node.title];
        const questions = plan.map((p) => {
          const qa = bank[p.skill] ?? Object.values(bank)[0]!;
          const state: QuestionState = { question_index: p.question_index, feynman_question: qa.q, skill: p.skill, tier: p.tier, focus: p.focus, attempts_used: 0, finished: false, outcome: null, ended_by: null, disputed: false, reveal: null };
          return { question_index: p.question_index, skill: p.skill, tier: p.tier, focus: p.focus, feynman_question: qa.q, state, qa, p };
        });
        const placeholderNode: NodeStateView = { node_id: node.id, status: "AVAILABLE", has_warning: false, analysis_failed: false, last_run: null };
        enrich[R] = { node_id: node.id, run_id: `offline-run-${R}`, mode: "LEARN", questions: questions.map((x) => ({ question_index: x.question_index, skill: x.skill, tier: x.tier, focus: x.focus, feynman_question: x.feynman_question, state: x.state })), node_state: placeholderNode, tokens_used: 0 } satisfies EnrichNodeResponse;
        for (const q of questions) {
          const { qa } = q;
          const reveal = { reference_answer: qa.ref, must_have_points: qa.points, fix: qa.fix };
          reveals[`${R}:${q.question_index}`] = { question: { ...q.state, finished: true, outcome: "FAILED", ended_by: "SKIP", reveal }, skill_change: { skill: q.skill, p_before: 0, p_after: 0, outcome: "FAILED" }, node_state: placeholderNode, unlocked_node_ids: [] } satisfies RevealResponse;
          const resp = (attempt: number, passed: boolean): EvaluateFeynmanResponse => {
            const last = attempt >= CONFIG.MAX_ATTEMPTS_PER_QUESTION;
            const type = q.tier === "NOVICE" ? "CODE_POINTER" : q.tier === "ARCHITECT" ? "CONCEPT" : attempt === 1 ? "CONCEPT" : "CODE_POINTER";
            const stepIdx = q.p.step_indices[Math.floor((q.p.step_indices.length - 1) / 2)];
            return {
              question_index: q.question_index, attempt_number: attempt, core_accuracy: passed ? 88 : 35, simplicity: passed ? 80 : 40, intent: "ANSWER", is_passed: passed,
              points_covered: qa.points.map(() => passed), feedback: passed ? "Bạn đã nêu đúng các ý chính. Làm tốt lắm!" : last ? "Chưa đạt ở lượt cuối. Hãy xem đáp án tham khảo bên dưới." : "Bạn đã đi đúng một phần. Hãy xem gợi ý bên dưới rồi bổ sung thêm.",
              detected_jargons: [], follow_up: passed || last ? null : { type, question: type === "CODE_POINTER" ? qa.hint2 : qa.hint1, step_index: type === "CODE_POINTER" ? stepIdx : null },
              question: { ...q.state, attempts_used: attempt, finished: passed || last, outcome: passed ? (attempt === 1 ? "PASS_FIRST" : "PASS_AFTER_HINT") : last ? "FAILED" : null, ended_by: passed || last ? "ANSWER" : null, reveal: passed || last ? reveal : null },
              skill_change: null, node_state: placeholderNode, unlocked_node_ids: [], tokens_used: 0,
            };
          };
          for (let a = 1; a <= CONFIG.MAX_ATTEMPTS_PER_QUESTION; a++) {
            scripted[`${R}:${q.question_index}:${a}`] = [{ answer: qa.good, response: resp(a, true) }, { answer: qa.bad, response: resp(a, false) }];
          }
        }
      }
    }

    const bundle: OfflineMockBundle = {
      bundle_version: "1",
      recorded_from: { repo: "demo/shop-api (mẫu viết tay, engine thật)", snapshot_id: client.snapshot.snapshot_id, engine_version: CONFIG.ENGINE_VERSION, prompt_version: CONFIG.PROMPT_VERSION, model: "viết tay — chưa ghi từ Gemini", recorded_at: now },
      ingest, analyses: views,
      overview: { facts: { archetype: graph.fingerprint.archetype, framework: graph.fingerprint.detected_framework, tech_stack: graph.fingerprint.tech_stack, root_node_ids: graph.nodes.filter((n) => n.prerequisites.length === 0).map((n) => n.id).sort(), main_path_node_ids: mainPath(graph.nodes, graph.edges) }, ai: overviewRaw },
      enrich, scripted_answers: scripted, reveals,
    };
    mkdirSync("public/demo", { recursive: true });
    writeFileSync("public/demo/mock_bundle.json", JSON.stringify(bundle));
    void T; void ({} as HybridArchitecturalNode); void ({} as RunQuestion);
  });
});
