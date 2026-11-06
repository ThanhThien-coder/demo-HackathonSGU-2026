import type {
  ClientStaticEngineResult,
  EntityOp,
  HybridArchitecturalNode,
  LanguageSupportTier,
  NodeAnalysisView,
  RepoOverviewView,
  SessionProgress,
} from "@/contracts";
import { overviewNodeTitle } from "./overview-view";

export const ENTITY_OP_LABELS: Record<EntityOp, string> = {
  CREATE: "Tạo",
  READ: "Đọc",
  UPDATE: "Sửa",
  DELETE: "Xóa",
};

export interface RoleCardView {
  node_id: string;
  title: string;
  evidence: string;
  is_capstone: boolean;
  has_warning: boolean;
  is_algorithmic: boolean;
  support_tier: LanguageSupportTier;
  role: string | null;
  prerequisites: Array<{ node_id: string; title: string }>;
  unlocks: Array<{ node_id: string; title: string }>;
  entities: Array<{ name: string; ops: string[] }>;
}

/**
 * Tách câu 1 của văn bản theo dấu ., !, ? theo sau là khoảng trắng; giữ dấu câu (D-84).
 */
function extractFirstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.search(/[.!?]\s+/);
  if (match !== -1) {
    return trimmed.slice(0, match + 1).trim();
  }
  return trimmed;
}

/**
 * Xây dựng dữ liệu cho Thẻ vai trò (UI-41, D-84).
 * Hàm thuần, không React.
 */
export function buildRoleCard(
  node: HybridArchitecturalNode,
  result?: ClientStaticEngineResult | null,
  analysis?: NodeAnalysisView | "PENDING" | "FAILED" | null,
  overview?: RepoOverviewView | "PENDING" | null,
  progress?: SessionProgress | null
): RoleCardView {
  const node_id = node.id;
  const title = overviewNodeTitle(result, overview, node_id);
  const evidence = node.title_evidence ?? "";
  const is_capstone = Boolean(node.is_capstone);
  const has_warning = Boolean(progress?.nodes?.[node_id]?.has_warning);
  const is_algorithmic =
    (node as unknown as { archetype?: string }).archetype === "ALGORITHMIC_CORE" ||
    node.node_type === "ALGORITHMIC_CORE";
  const support_tier = node.support_tier;

  // role = câu 1 của analysis.architecture.summary khi analysis là object và !analysis.skeleton_only và summary có chữ; còn lại null
  let role: string | null = null;
  if (
    analysis &&
    typeof analysis === "object" &&
    !analysis.skeleton_only &&
    typeof analysis.architecture?.summary === "string" &&
    analysis.architecture.summary.trim().length > 0
  ) {
    role = extractFirstSentence(analysis.architecture.summary);
  }

  // prerequisites = node.prerequisites có trong result.nodes, giữ thứ tự, tên theo overviewNodeTitle
  const existingNodeIds = new Set(result?.nodes?.map((n) => n.id) ?? []);
  const prerequisites: Array<{ node_id: string; title: string }> = (
    node.prerequisites ?? []
  )
    .filter((pId) => existingNodeIds.has(pId))
    .map((pId) => ({
      node_id: pId,
      title: overviewNodeTitle(result, overview, pId),
    }));

  // unlocks = result.edges có source = node.id, lấy target không trùng, theo thứ tự cạnh, tên theo overviewNodeTitle
  const unlocks: Array<{ node_id: string; title: string }> = [];
  const seenTargets = new Set<string>();
  for (const edge of result?.edges ?? []) {
    if (edge.source === node_id && !seenTargets.has(edge.target)) {
      seenTargets.add(edge.target);
      unlocks.push({
        node_id: edge.target,
        title: overviewNodeTitle(result, overview, edge.target),
      });
    }
  }

  // entities = (node.entities ?? []), mỗi mục { name, ops: ops.map(o => ENTITY_OP_LABELS[o]) }
  const entities: Array<{ name: string; ops: string[] }> = (
    node.entities ?? []
  ).map((e) => ({
    name: e.name,
    ops: (e.ops ?? []).map((op) => ENTITY_OP_LABELS[op] ?? op),
  }));

  return {
    node_id,
    title,
    evidence,
    is_capstone,
    has_warning,
    is_algorithmic,
    support_tier,
    role,
    prerequisites,
    unlocks,
    entities,
  };
}
