/**
 * src/server/ai/guard/overview.ts
 *
 * Kiểm tổng quan repo (GUARD-11) theo spec 21 Mục 4.
 */

import {
  ARCHITECTURE_PATTERNS,
  type ArchitecturalLayer,
  type ArchitecturePattern,
  type GuardIssue,
  type NodeAnalysis,
  type RepoOverviewRaw,
  type StaticEngineResult,
} from "@/contracts";
import { findForbidden, forbiddenKeywords } from "./forbidden";
import { invalidLineRefs } from "./lines";
import { checkNames, repoScope } from "./names";
import { nodeCodeText } from "./text";

// Danh sách tầng kiến trúc hợp lệ // nội bộ
const LAYERS: readonly ArchitecturalLayer[] = [
  "ENTRY_POINT",
  "MIDDLEWARE",
  "BUSINESS_LOGIC",
  "DATA_ACCESS",
  "ALGO_SETUP",
  "ALGO_EXECUTION",
  "ALGO_TERMINATION",
] as const;

/**
 * Kiểm tra và làm sạch bản tổng quan thô từ AI (GUARD-11).
 * 1. architecture_style ngoài danh mục ⇒ "OTHER".
 * 2. layers: layer phải là ArchitecturalLayer; nodes chỉ giữ id có thật và có bước mang layer đó;
 *    trùng layer ⇒ giữ mục đầu; nodes rỗng ⇒ bỏ mục.
 * 3. notes: nodes chỉ giữ id có thật; giữ nhận xét khi còn ≥ 1 node và mọi node trong đó
 *    có bản phân tích với weak_points.length > 0; ngược lại gạch.
 * 4. Chữ (summary, main_flow, layers[].role, notes[].text còn giữ):
 *    O1 rỗng · O2 tên sai · O3 từ cấm · O4 có số dòng;
 *    sai ⇒ thêm GuardIssue rồi null.
 *
 * Không mutate raw; trả bản mới.
 */
export function checkOverview(
  raw: RepoOverviewRaw,
  graph: StaticEngineResult,
  analyses: Record<string, NodeAnalysis>,
  issues: GuardIssue[] = []
): RepoOverviewRaw | null {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // 1. architecture_style ngoài danh mục ⇒ "OTHER"
  const architectureStyle: ArchitecturePattern = (
    ARCHITECTURE_PATTERNS as readonly string[]
  ).includes(raw.architecture_style)
    ? raw.architecture_style
    : "OTHER";

  // 2. layers:
  // layer phải là ArchitecturalLayer; nodes chỉ giữ id có thật và có bước mang layer đó;
  // trùng layer ⇒ giữ mục đầu; nodes rỗng ⇒ bỏ mục.
  const cleanLayers: Array<{
    layer: ArchitecturalLayer;
    role: string;
    nodes: string[];
  }> = [];
  const seenLayers = new Set<ArchitecturalLayer>();

  for (const item of raw.layers) {
    if (!(LAYERS as readonly string[]).includes(item.layer)) {
      continue;
    }
    if (seenLayers.has(item.layer)) {
      continue;
    }
    seenLayers.add(item.layer);

    const validNodes = item.nodes.filter((nodeId) => {
      const node = nodeMap.get(nodeId);
      return Boolean(node && node.trace_steps.some((st) => st.layer === item.layer));
    });

    if (validNodes.length > 0) {
      cleanLayers.push({
        layer: item.layer,
        role: item.role,
        nodes: validNodes,
      });
    }
  }

  // 3. notes:
  // nodes chỉ giữ id có thật; giữ nhận xét khi còn ≥ 1 node và mọi node trong đó
  // có bản phân tích với weak_points.length > 0; ngược lại gạch.
  const cleanNotes: Array<{ text: string; nodes: string[] }> = [];

  for (const item of raw.notes) {
    const validNodes = item.nodes.filter((nodeId) => nodeMap.has(nodeId));
    if (
      validNodes.length >= 1 &&
      validNodes.every((nodeId) => {
        const analysis = analyses[nodeId];
        return Boolean(analysis && analysis.weak_points && analysis.weak_points.length > 0);
      })
    ) {
      cleanNotes.push({
        text: item.text,
        nodes: validNodes,
      });
    }
  }

  // 4. Chữ (summary, main_flow, layers[].role, notes[].text còn giữ)
  const texts = [
    raw.summary,
    raw.main_flow,
    ...cleanLayers.map((l) => l.role),
    ...cleanNotes.map((n) => n.text),
  ];

  const emptyIssues: GuardIssue[] = texts.some((t) => t.trim().length === 0)
    ? [{ code: "O1" }]
    : [];

  const badNames = checkNames(texts, repoScope(graph));
  const nameIssues: GuardIssue[] = badNames.map((name) => ({
    code: "O2",
    name,
  }));

  const allCodeText = graph.nodes.map(nodeCodeText).join("\n");
  const forbiddenTechWords = forbiddenKeywords(graph.fingerprint, allCodeText);
  const badForbidden = findForbidden(texts, forbiddenTechWords);
  const forbiddenIssues: GuardIssue[] = badForbidden.map((name) => ({
    code: "O3",
    name,
  }));

  const emptyAllowed = new Set<number>();
  const lineIssues: GuardIssue[] = texts.some(
    (t) => invalidLineRefs(t, emptyAllowed).length > 0
  )
    ? [{ code: "O4" }]
    : [];

  const textIssues = [
    ...emptyIssues,
    ...nameIssues,
    ...forbiddenIssues,
    ...lineIssues,
  ];

  if (textIssues.length > 0) {
    issues.push(...textIssues);
    return null;
  }

  return {
    architecture_style: architectureStyle,
    summary: raw.summary,
    layers: cleanLayers,
    main_flow: raw.main_flow,
    notes: cleanNotes,
  };
}
