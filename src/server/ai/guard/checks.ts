// 21 Mục 3–5 — checkAnalysis (GUARD-10), checkOverview (GUARD-11), checkQuestions (GUARD-12).
import { CONFIG } from "@/contracts/config";
import { ARCHITECTURE_PATTERNS, SWE_SKILLS } from "@/contracts/base";
import type {
  AnalysisSkill, AnalysisWeakPoint, ArchitecturalLayer, GeneratedQuestionRaw, GuardIssue, HybridArchitecturalNode,
  NodeAnalysis, NodeAnalysisRaw, QuestionPlanItem, RepoOverviewRaw, StaticEngineResult,
} from "@/contracts";
import {
  LANGUAGE_WORDS, checkNames, findForbidden, forbiddenKeywords, identWords, invalidLineRefs, nodeCodeText, nodeScope, norm,
  normText, repoScope, backticks, stepLines, symbolInStep, IDENT_RE,
} from "./text";

const LAYERS: ArchitecturalLayer[] = ["ENTRY_POINT", "MIDDLEWARE", "BUSINESS_LOGIC", "DATA_ACCESS", "ALGO_SETUP", "ALGO_EXECUTION", "ALGO_TERMINATION"];

export function checkAnalysis(raw: NodeAnalysisRaw, node: HybridArchitecturalNode, graph: StaticEngineResult, issues: GuardIssue[] = []): NodeAnalysis | null {
  const n = node.trace_steps.length;
  const st = (k: number) => (Number.isInteger(k) && k >= 1 && k <= n ? node.trace_steps[k - 1] : null);
  const skills: AnalysisSkill[] = []; // A1
  for (const s of raw.skills ?? []) {
    const step = st(s.step);
    if ((SWE_SKILLS as readonly string[]).includes(s.skill) && step && symbolInStep(s.symbol, step) && !skills.some((k) => k.skill === s.skill)) skills.push(s);
    else issues.push({ code: "A1", step: step ? s.step : undefined, name: s.symbol });
  }
  skills.splice(CONFIG.ANALYSIS_MAX_SKILLS);
  if (skills.length < CONFIG.ANALYSIS_MIN_SKILLS) { issues.push({ code: "A1" }); return null; }
  const patterns = [...new Set((raw.architecture?.patterns ?? []).map((p) => ((ARCHITECTURE_PATTERNS as readonly string[]).includes(p) ? p : "OTHER")))]
    .slice(0, CONFIG.ANALYSIS_MAX_PATTERNS) as NodeAnalysis["architecture"]["patterns"]; // A2
  if (patterns.length === 0) patterns.push("OTHER");
  const weak: AnalysisWeakPoint[] = []; // A3
  for (const w of raw.weak_points ?? []) {
    const step = st(w.step);
    if (!step || !skills.some((k) => k.skill === w.skill) || !symbolInStep(w.symbol, step)) issues.push({ code: "A3", step: step ? w.step : undefined, name: w.symbol });
    else if (weak.filter((x) => x.skill === w.skill).length < CONFIG.WEAK_POINTS_PER_SKILL_MAX) weak.push(w);
  }
  const strengths = (raw.strengths ?? []).filter((s, i, a) => st(s.step) && a.findIndex((x) => x.step === s.step) === i); // A4
  const stepNums = (raw.steps ?? []).map((s) => s.step).sort((a, b) => a - b); // A5
  const stepsOk = stepNums.length === n && stepNums.every((v, i) => v === i + 1);
  const summary = raw.architecture?.summary ?? "";
  const texts = [summary, ...(raw.steps ?? []).map((s) => s.text), ...strengths.map((s) => s.text),
    ...weak.flatMap((w) => [w.what, w.consequence]), ...skills.map((s) => s.reason)]; // A6
  const all = Array.from({ length: n }, (_, i) => i + 1);
  const a6: GuardIssue[] = [
    ...checkNames(texts, nodeScope(node, graph)).map((name) => ({ code: "A6" as const, name })),
    ...findForbidden(texts, forbiddenKeywords(graph.fingerprint, nodeCodeText(node))).map((name) => ({ code: "A6" as const, name })),
    ...(texts.some((t) => !t || t.trim().length === 0 || invalidLineRefs(t, stepLines(node, all)).length > 0) ? [{ code: "A6" as const }] : []),
  ];
  if (!stepsOk) issues.push({ code: "A5" });
  issues.push(...a6);
  const textOk = stepsOk && a6.length === 0;
  if (!textOk) issues.push({ code: "A7" });
  return textOk
    ? { node_id: node.id, skills, architecture: { patterns, summary }, steps: [...raw.steps].sort((a, b) => a.step - b.step), strengths, weak_points: weak, skeleton_only: false }
    : { node_id: node.id, skills: skills.map((s) => ({ ...s, reason: "" })), architecture: { patterns, summary: "" }, steps: [], strengths: [], weak_points: [], skeleton_only: true }; // A7
}

export function checkOverview(raw: RepoOverviewRaw, graph: StaticEngineResult, analyses: Record<string, NodeAnalysis>, issues: GuardIssue[] = []): RepoOverviewRaw | null {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const style = (ARCHITECTURE_PATTERNS as readonly string[]).includes(raw.architecture_style) ? raw.architecture_style : "OTHER";
  const seenLayer = new Set<string>();
  const layers: RepoOverviewRaw["layers"] = [];
  for (const l of raw.layers ?? []) {
    if (!LAYERS.includes(l.layer) || seenLayer.has(l.layer)) continue;
    const ids = (l.nodes ?? []).filter((id) => byId.get(id)?.trace_steps.some((s) => s.layer === l.layer));
    if (ids.length === 0) continue;
    seenLayer.add(l.layer);
    layers.push({ layer: l.layer, role: l.role, nodes: ids });
  }
  const notes: RepoOverviewRaw["notes"] = [];
  for (const nt of raw.notes ?? []) {
    const ids = (nt.nodes ?? []).filter((id) => byId.has(id));
    if (ids.length > 0 && ids.every((id) => (analyses[id]?.weak_points.length ?? 0) > 0)) notes.push({ text: nt.text, nodes: ids });
  }
  const texts = [raw.summary, raw.main_flow, ...layers.map((l) => l.role), ...notes.map((x) => x.text)];
  const bad: GuardIssue[] = [];
  if (texts.slice(0, 2).some((t) => !t || t.trim().length === 0)) bad.push({ code: "O1" });
  const code = graph.nodes.map(nodeCodeText).join("\n");
  checkNames(texts, repoScope(graph)).forEach((name) => bad.push({ code: "O2", name }));
  findForbidden(texts, forbiddenKeywords(graph.fingerprint, code)).forEach((name) => bad.push({ code: "O3", name }));
  if (texts.some((t) => invalidLineRefs(t ?? "", new Set()).length > 0)) bad.push({ code: "O4" });
  if (bad.length > 0) { issues.push(...bad); return null; }
  return { architecture_style: style as RepoOverviewRaw["architecture_style"], summary: raw.summary, layers, main_flow: raw.main_flow, notes };
}

export interface QuestionCheck { item: QuestionPlanItem; question: GeneratedQuestionRaw | null; issues: GuardIssue[] }

function flowSteps(answer: string, node: HybridArchitecturalNode, stepIdx: number[]): number {
  const codeOf = (i: number) => { const s = node.trace_steps[i - 1]; return s ? identWords(`${s.function_name}\n${s.snippet}`) : new Set<string>(); };
  let common = new Set<string>();
  if (stepIdx.length >= 2) {
    common = new Set(codeOf(stepIdx[0]));
    for (const i of stepIdx.slice(1)) { const c = codeOf(i); common = new Set([...common].filter((w) => c.has(w))); }
  }
  const bs = backticks(answer);
  let count = 0;
  for (const i of stepIdx) {
    const s = node.trace_steps[i - 1]; if (!s) continue;
    const words = codeOf(i);
    const hit = bs.some((b) => s.file_path === b || s.file_path.endsWith("/" + b) ||
      (b.match(IDENT_RE) ?? []).filter((w) => !LANGUAGE_WORDS.has(w.toLowerCase())).some((w) => words.has(norm(w)) && !common.has(norm(w))));
    if (hit) count++;
  }
  return count;
}

export function checkQuestions(raw: { questions: GeneratedQuestionRaw[] }, items: QuestionPlanItem[], node: HybridArchitecturalNode,
  graph: StaticEngineResult, analysis: NodeAnalysis): QuestionCheck[] {
  const scope = nodeScope(node, graph);
  const forb = forbiddenKeywords(graph.fingerprint, nodeCodeText(node));
  return items.map((item, i) => {
    const q = raw.questions?.[i] ?? null;
    const issues: GuardIssue[] = [];
    const pos = i + 1;
    if (!q || q.skill !== item.skill) { issues.push({ code: "Q1", question: pos }); return { item, question: null, issues }; }
    const pts = q.must_have_points ?? [];
    const ptsOk = pts.length >= CONFIG.MUST_HAVE_POINTS_MIN && pts.length <= CONFIG.MUST_HAVE_POINTS_MAX && pts.every((p) => p && p.trim()) && new Set(pts.map(normText)).size === pts.length;
    if (!q.feynman_question?.trim() || !q.reference_answer?.trim() || !q.fix?.trim() || !ptsOk) issues.push({ code: "Q2", question: pos });
    const main = [q.feynman_question ?? "", q.reference_answer ?? "", ...pts];
    checkNames(main, scope).forEach((name) => issues.push({ code: "Q3", question: pos, name }));
    const allowed = stepLines(node, item.step_indices);
    if (main.slice(0, 1).concat(main.slice(1)).some((t) => invalidLineRefs(t, allowed).length > 0)) issues.push({ code: "Q4", question: pos });
    findForbidden([...main, q.fix ?? ""], forb).forEach((name) => issues.push({ code: "Q5", question: pos, name }));
    if (item.focus === "WEAKNESS") {
      const wp = analysis.weak_points.find((w) => w.skill === item.skill);
      const words = identWords(`${q.feynman_question} ${q.reference_answer}`);
      const lastWord = wp ? norm((wp.symbol.match(IDENT_RE) ?? []).pop() ?? "") : "";
      if (!wp || !lastWord || !words.has(lastWord)) issues.push({ code: "Q6", question: pos });
    }
    if (item.focus === "FLOW" && flowSteps(q.reference_answer ?? "", node, item.step_indices) < Math.min(CONFIG.FLOW_ANSWER_MIN_STEPS, item.step_indices.length)) issues.push({ code: "Q7", question: pos });
    if (item.focus === "CHANGE") {
      const ok = backticks(q.reference_answer ?? "").some((b) => node.files.some((f) => f === b || f.endsWith("/" + b)));
      if (!ok) issues.push({ code: "Q8", question: pos });
    }
    return { item, question: issues.length === 0 ? q : null, issues };
  });
}
