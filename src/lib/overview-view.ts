import { mainPath } from "@/server/engine/graph/whitelist";
import type {
  ClientStaticEngineResult,
  StaticEngineResult,
  ArchitecturalLayer,
  ProjectArchetype,
  NodeAnalysisView,
  SessionProgress,
} from "@/contracts";

export interface OverviewFacts {
  archetype: ProjectArchetype;
  framework: string | null;
  tech_stack: string[];
  root_node_ids: string[];
  main_path_node_ids: string[];
  layer_map: Array<{ layer: ArchitecturalLayer; node_ids: string[] }>;
}

export interface DiscoveredOverview {
  done: number;
  total: number;
  patterns: Array<{ pattern: string; count: number }>;
  skills: string[];
  weak_points: Array<{ node_id: string; what: string; skill: string }>;
}

const LAYER_ORDER: ArchitecturalLayer[] = [
  "ENTRY_POINT",
  "MIDDLEWARE",
  "BUSINESS_LOGIC",
  "DATA_ACCESS",
  "ALGO_SETUP",
  "ALGO_EXECUTION",
  "ALGO_TERMINATION",
];

/**
 * Xây dựng facts tổng quan repo từ kết quả engine (D-71, T33).
 * Hàm thuần, không gọi API, không import React.
 */
export function buildOverviewFacts(
  result: ClientStaticEngineResult
): OverviewFacts {
  const archetype = result?.fingerprint?.archetype ?? "WEB_BACKEND";
  const framework = result?.fingerprint?.detected_framework ?? null;
  const tech_stack = result?.fingerprint?.tech_stack ?? [];

  const root_node_ids = (result?.nodes ?? [])
    .filter((n) => !n.prerequisites || n.prerequisites.length === 0)
    .map((n) => n.id);

  const main_path_node_ids = result
    ? mainPath(result as unknown as StaticEngineResult)
    : [];

  const layerNodesMap = new Map<ArchitecturalLayer, string[]>();

  for (const node of result?.nodes ?? []) {
    for (const step of node.trace_steps ?? []) {
      if (step.layer) {
        if (!layerNodesMap.has(step.layer)) {
          layerNodesMap.set(step.layer, []);
        }
        const list = layerNodesMap.get(step.layer)!;
        if (!list.includes(node.id)) {
          list.push(node.id);
        }
      }
    }
  }

  const sortedLayers = Array.from(layerNodesMap.keys()).sort((a, b) => {
    const idxA = LAYER_ORDER.indexOf(a);
    const idxB = LAYER_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const layer_map = sortedLayers.map((layer) => ({
    layer,
    node_ids: layerNodesMap.get(layer) ?? [],
  }));

  return {
    archetype,
    framework,
    tech_stack,
    root_node_ids,
    main_path_node_ids,
    layer_map,
  };
}

/**
 * Gom thông tin từ các bản phân tích AI đã có trong quá trình học (D-71, T34).
 * Hàm thuần, không gọi API, không import React.
 */
export function buildDiscovered(
  result: ClientStaticEngineResult | null | undefined,
  analyses: Record<string, NodeAnalysisView | "PENDING" | "FAILED"> | null | undefined,
  progress: SessionProgress | null | undefined
): DiscoveredOverview {
  const total = result?.nodes?.length ?? 0;

  let done = 0;
  for (const n of result?.nodes ?? []) {
    const a = analyses?.[n.id];
    const isObj = typeof a === "object" && a !== null;
    const isFailed = Boolean(progress?.nodes?.[n.id]?.analysis_failed);
    if (isObj || isFailed) {
      done++;
    }
  }

  const patternCounts = new Map<string, number>();
  const skillSet = new Set<string>();
  const weak_points: Array<{ node_id: string; what: string; skill: string }> = [];

  const nodeIds =
    result?.nodes?.map((n) => n.id) ?? Object.keys(analyses ?? {});

  for (const nid of nodeIds) {
    const a = analyses?.[nid];
    if (typeof a === "object" && a !== null) {
      const patterns = a.architecture?.patterns ?? [];
      const uniquePatterns = new Set(patterns);
      for (const p of uniquePatterns) {
        patternCounts.set(p, (patternCounts.get(p) ?? 0) + 1);
      }

      for (const s of a.skills ?? []) {
        if (s.skill) {
          skillSet.add(s.skill);
        }
      }

      for (const wp of a.weak_points ?? []) {
        weak_points.push({
          node_id: a.node_id || nid,
          what: wp.what,
          skill: wp.skill,
        });
      }
    }
  }

  const patterns = Array.from(patternCounts.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));

  const skills = Array.from(skillSet).sort();

  return {
    done,
    total,
    patterns,
    skills,
    weak_points,
  };
}
