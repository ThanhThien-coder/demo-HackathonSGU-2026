import { mainPath } from "@/server/engine/graph/whitelist";
import type {
  ClientStaticEngineResult,
  StaticEngineResult,
  ProjectArchetype,
  RepoOverviewView,
  SessionProgress,
} from "@/contracts";

export interface OverviewFacts {
  archetype: ProjectArchetype;
  framework: string | null;
  tech_stack: string[];
  root_node_ids: string[];
  main_path_node_ids: string[];
}

export interface OverviewGroupView {
  group_id: string;
  name: string;
  node_ids: string[];
}

/** mainPath chịu được result thiếu edges (bundle cũ, dữ liệu dở) // nội bộ */
const safeMainPath = (result: ClientStaticEngineResult): string[] =>
  (result.nodes ?? []).length > 0
    ? mainPath({ ...result, edges: result.edges ?? [] } as unknown as StaticEngineResult)
    : [];

/**
 * Xây dựng facts tổng quan repo từ kết quả engine (D-71, D-83).
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

  const main_path_node_ids = result ? safeMainPath(result) : [];

  return {
    archetype,
    framework,
    tech_stack,
    root_node_ids,
    main_path_node_ids,
  };
}

function extractRoutePrefix(titleEvidence: string | null | undefined): string | null {
  if (!titleEvidence || !titleEvidence.includes("/")) {
    return null;
  }
  const slashIdx = titleEvidence.indexOf("/");
  const pathPart = titleEvidence.substring(slashIdx);
  const rawSegments = pathPart
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const segments = [...rawSegments];
  while (segments.length > 1 && /^(api|v\d+)$/i.test(segments[0])) {
    segments.shift();
  }

  if (segments.length === 0) {
    return null;
  }

  return segments[0];
}

/**
 * Gom nhóm các bài học để hiển thị trên bức tranh chung (D-84, Việc 2).
 */
export function overviewGroups(
  result: ClientStaticEngineResult | null | undefined,
  overview: RepoOverviewView | "PENDING" | null | undefined
): OverviewGroupView[] {
  if (!result || !result.nodes || result.nodes.length === 0) {
    return [];
  }

  // result.groups có phần tử ⇒ giữ đúng thứ tự engine; name = overview.ai.groups[].name cùng group_id, thiếu ⇒ key; node_ids chép nguyên
  if (result.groups && result.groups.length > 0) {
    return result.groups.map((g) => {
      const aiGroup =
        overview && typeof overview === "object" && overview.ai?.groups
          ? overview.ai.groups.find((aiG) => aiG.group_id === g.group_id)
          : undefined;
      return {
        group_id: g.group_id,
        name: aiGroup?.name || g.key,
        node_ids: [...g.node_ids],
      };
    });
  }

  // result.groups thiếu hoặc rỗng (engine chưa có B-40) ⇒ nhóm dự phòng
  const routeGroupsMap = new Map<string, OverviewGroupView>();
  const routeGroupOrder: string[] = [];
  const standaloneNodeIds: string[] = [];

  const edges = result.edges ?? [];

  for (const node of result.nodes) {
    const isAlgo =
      node.node_type === "ALGORITHMIC_CORE" ||
      (node as unknown as { archetype?: string }).archetype === "ALGORITHMIC_CORE";

    const hasEdge = edges.some(
      (e) => e.source === node.id || e.target === node.id
    );

    const routePrefix = extractRoutePrefix(node.title_evidence);

    if (isAlgo || !hasEdge || !routePrefix) {
      standaloneNodeIds.push(node.id);
    } else {
      const groupId = "group-route-" + routePrefix;
      if (!routeGroupsMap.has(groupId)) {
        const aiGroup =
          overview && typeof overview === "object" && overview.ai?.groups
            ? overview.ai.groups.find((aiG) => aiG.group_id === groupId)
            : undefined;

        routeGroupsMap.set(groupId, {
          group_id: groupId,
          name: aiGroup?.name || routePrefix,
          node_ids: [],
        });
        routeGroupOrder.push(groupId);
      }
      routeGroupsMap.get(groupId)!.node_ids.push(node.id);
    }
  }

  const resultGroups: OverviewGroupView[] = routeGroupOrder.map(
    (id) => routeGroupsMap.get(id)!
  );

  if (standaloneNodeIds.length > 0) {
    const aiStandalone =
      overview && typeof overview === "object" && overview.ai?.groups
        ? overview.ai.groups.find((aiG) => aiG.group_id === "group-standalone")
        : undefined;

    resultGroups.push({
      group_id: "group-standalone",
      name: aiStandalone?.name || "Học riêng",
      node_ids: standaloneNodeIds,
    });
  }

  return resultGroups;
}

/**
 * Tạm cho D18; D17 thêm displayTitle ở derive.ts thì thay.
 */
export function overviewNodeTitle(
  result: ClientStaticEngineResult | null | undefined,
  overview: RepoOverviewView | "PENDING" | null | undefined,
  nodeId: string
): string {
  if (overview && typeof overview === "object" && overview.ai?.node_titles) {
    const aiTitle = overview.ai.node_titles.find((t) => t.node_id === nodeId)?.title;
    if (aiTitle) return aiTitle;
  }
  const node = result?.nodes?.find((n) => n.id === nodeId);
  if (node?.title) return node.title;
  return nodeId;
}

/**
 * Câu tóm tắt dự phòng khi chưa có nhận định AI (D-71, Việc 2).
 */
export function overviewFallback(
  result: ClientStaticEngineResult | null | undefined,
  facts?: OverviewFacts | null
): string {
  const repoName = result?.repo_name || "Repo";
  const n = result?.nodes?.length ?? 0;
  const m = overviewGroups(result, null).length;
  const framework = facts?.framework?.trim();
  if (framework) {
    return `${repoName} dùng ${framework} có ${n} bài, chia thành ${m} nhóm.`;
  }
  return `${repoName} có ${n} bài, chia thành ${m} nhóm.`;
}

/**
 * Tìm bài học bắt đầu cho người học (Việc 2).
 */
export function startNodeId(
  result: ClientStaticEngineResult | null | undefined,
  progress: SessionProgress | null | undefined
): string | null {
  if (!result) return null;
  const mp = safeMainPath(result);
  if (mp.length > 0 && mp[0]) {
    return mp[0];
  }
  const groups = overviewGroups(result, null);
  for (const group of groups) {
    for (const id of group.node_ids) {
      if (progress?.nodes?.[id]?.status === "AVAILABLE") {
        return id;
      }
    }
  }
  return null;
}
