/**
 * src/server/ai/guard/analysis.ts
 *
 * Kiểm bản phân tích node (GUARD-10) theo spec 21 Mục 3.
 */

import {
  ARCHITECTURE_PATTERNS,
  CONFIG,
  SWE_SKILLS,
  type AnalysisSkill,
  type AnalysisWeakPoint,
  type ArchitecturePattern,
  type GuardIssue,
  type HybridArchitecturalNode,
  type NodeAnalysis,
  type NodeAnalysisRaw,
  type StaticEngineResult,
} from "@/contracts";
import { findForbidden, forbiddenKeywords } from "./forbidden";
import { invalidLineRefs, stepLines, symbolInStep } from "./lines";
import { checkNames, nodeScope } from "./names";
import { nodeCodeText } from "./text";

export function checkAnalysis(
  raw: NodeAnalysisRaw,
  node: HybridArchitecturalNode,
  graph: StaticEngineResult,
  issues: GuardIssue[] = []
): NodeAnalysis | null {
  const n = node.trace_steps.length;
  const st = (k: number) =>
    Number.isInteger(k) && k >= 1 && k <= n ? node.trace_steps[k - 1] : null;

  // A1: Kiểm tra kỹ năng
  const skills: AnalysisSkill[] = [];
  for (const s of raw.skills) {
    const step = st(s.step);
    if (
      (SWE_SKILLS as readonly string[]).includes(s.skill) &&
      step &&
      symbolInStep(s.symbol, step) &&
      !skills.some((k) => k.skill === s.skill)
    ) {
      skills.push(s);
    } else {
      issues.push({
        code: "A1",
        step: step ? s.step : undefined,
        name: s.symbol,
      });
    }
  }
  skills.splice(CONFIG.ANALYSIS_MAX_SKILLS);
  if (skills.length < CONFIG.ANALYSIS_MIN_SKILLS) {
    issues.push({ code: "A1" });
    return null;
  }

  // A2: Kiểm tra mẫu kiến trúc
  const patterns = [
    ...new Set(
      raw.architecture.patterns.map((p) =>
        (ARCHITECTURE_PATTERNS as readonly string[]).includes(p) ? p : "OTHER"
      )
    ),
  ].slice(0, CONFIG.ANALYSIS_MAX_PATTERNS) as ArchitecturePattern[];
  if (patterns.length === 0) patterns.push("OTHER");

  // A3: Kiểm tra điểm dở
  const weak: AnalysisWeakPoint[] = [];
  for (const w of raw.weak_points) {
    const step = st(w.step);
    if (
      !step ||
      !skills.some((k) => k.skill === w.skill) ||
      !symbolInStep(w.symbol, step)
    ) {
      issues.push({
        code: "A3",
        step: step ? w.step : undefined,
        name: w.symbol,
      });
    } else if (
      weak.filter((x) => x.skill === w.skill).length <
      CONFIG.WEAK_POINTS_PER_SKILL_MAX
    ) {
      weak.push(w);
    }
  }

  // A4: Kiểm tra điểm hay
  const strengths = raw.strengths.filter(
    (s, i, a) => st(s.step) && a.findIndex((x) => x.step === s.step) === i
  );

  // A5: Kiểm tra các bước
  const stepNums = raw.steps.map((s) => s.step).sort((a, b) => a - b);
  const stepsOk =
    stepNums.length === n && stepNums.every((v, i) => v === i + 1);

  // A6: Kiểm tra chữ
  const texts = [
    raw.architecture.summary,
    ...raw.steps.map((s) => s.text),
    ...strengths.map((s) => s.text),
    ...weak.flatMap((w) => [w.what, w.consequence]),
    ...skills.map((s) => s.reason),
  ];
  const all = Array.from({ length: n }, (_, i) => i + 1);
  const a6: GuardIssue[] = [
    ...checkNames(texts, nodeScope(node, graph)).map((name) => ({
      code: "A6" as const,
      name,
    })),
    ...findForbidden(
      texts,
      forbiddenKeywords(graph.fingerprint, nodeCodeText(node))
    ).map((name) => ({ code: "A6" as const, name })),
    ...(texts.some(
      (t) =>
        t.trim().length === 0 ||
        invalidLineRefs(t, stepLines(node, all)).length > 0
    )
      ? [{ code: "A6" as const }]
      : []),
  ];

  if (!stepsOk) issues.push({ code: "A5" });
  issues.push(...a6);
  const textOk = stepsOk && a6.length === 0;
  if (!textOk) issues.push({ code: "A7" });

  return textOk
    ? {
        node_id: node.id,
        skills,
        architecture: { patterns, summary: raw.architecture.summary },
        steps: [...raw.steps].sort((a, b) => a.step - b.step),
        strengths,
        weak_points: weak,
        skeleton_only: false,
      }
    : {
        node_id: node.id,
        skills: skills.map((s) => ({ ...s, reason: "" })),
        architecture: { patterns, summary: "" },
        steps: [],
        strengths: [],
        weak_points: [],
        skeleton_only: true,
      };
}
