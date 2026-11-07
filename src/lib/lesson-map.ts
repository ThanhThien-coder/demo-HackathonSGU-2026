// Dữ liệu cho bản đồ bài học dạng danh sách nhóm: spec 30 Mục 4, D-84, D-85.
import type {
  ClientStaticEngineResult,
  GraphEdge,
  HybridArchitecturalNode,
  NodeStatus,
  RepoOverviewView,
  SessionProgress,
  StaticEngineResult,
} from "@/contracts";
import { deriveNodeStates, type DerivedNodeState } from "@/lib/derive";
import { mainPath } from "@/server/engine/graph/whitelist";

export interface LessonGroupView {
  group_id: string;
  name: string;
  node_ids: string[];
  recommended: boolean; // Chứa mainPath(result)[0]: nhãn "★ Nên học trước", mở sẵn
}

export type LessonNodeState = Pick<
  DerivedNodeState,
  "status" | "has_warning" | "analysis_failed"
>;

export type CardAction =
  | { kind: "OPEN" }
  | { kind: "TOAST"; message: string };

const STANDALONE_GROUP_ID = "group-standalone";
const STANDALONE_KEY = "Học riêng";

/** Đoạn đầu của route trong title_evidence, bỏ `api` và `v1` như ENG-119. */
function routeHeadOf(evidence: string): string | null {
  const route = /^[A-Z]+\s+(\/\S*)/.exec(evidence)?.[1];
  if (!route) return null;
  const segments = route
    .split("/")
    .filter((seg) => /^[A-Za-z0-9_-]+$/.test(seg))
    .filter((seg) => seg.toLowerCase() !== "api" && !/^v\d+$/i.test(seg));
  return segments[0] ?? null;
}

/**
 * Bundle Offline cũ chưa có `groups` (D-21 phần tất định): gom theo đầu route.
 * Bài thuật toán, bài không có cạnh, bài không có route vào Học riêng như ENG-119.
 */
function fallbackGroups(nodes: HybridArchitecturalNode[], edges: GraphEdge[]) {
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]));
  const byHead = new Map<string, string[]>();
  const standalone: string[] = [];
  for (const node of nodes) {
    const head = routeHeadOf(node.title_evidence ?? "")?.toLowerCase();
    if (!head || node.node_type === "ALGORITHMIC_CORE" || !connected.has(node.id)) {
      standalone.push(node.id);
      continue;
    }
    byHead.set(head, [...(byHead.get(head) ?? []), node.id]);
  }
  const groups = [...byHead].map(([key, node_ids]) => ({
    group_id: `group-route-${key}`,
    key,
    node_ids,
  }));
  return standalone.length > 0
    ? [...groups, { group_id: STANDALONE_GROUP_ID, key: STANDALONE_KEY, node_ids: standalone }]
    : groups;
}

export function lessonGroups(
  result: ClientStaticEngineResult,
  overview: RepoOverviewView | null
): LessonGroupView[] {
  const known = new Set(result.nodes.map((n) => n.id));
  const source = result.groups?.length
    ? result.groups
    : fallbackGroups(result.nodes, result.edges);
  const first = mainPath(result as unknown as StaticEngineResult)[0];
  const aiNames = new Map(
    (overview?.ai?.groups ?? []).map((g) => [g.group_id, g.name])
  );
  return source
    .map((group) => ({
      group_id: group.group_id,
      name: aiNames.get(group.group_id) ?? group.key,
      node_ids: group.node_ids.filter((id) => known.has(id)),
      recommended: group.node_ids.includes(first),
    }))
    .filter((group) => group.node_ids.length > 0);
}

export function groupOfNode(
  groups: LessonGroupView[],
  nodeId: string
): LessonGroupView | undefined {
  return groups.find((g) => g.node_ids.includes(nodeId));
}

/**
 * Người học chưa bấm nhóm thì nhóm nên học trước mở sẵn. Tính lúc vẽ, không lưu sẵn,
 * vì store giữ `result` phiên cũ tới khi phiên mới tải xong.
 */
export function isGroupOpen(
  open: Record<string, boolean>,
  group: LessonGroupView
): boolean {
  return open[group.group_id] ?? group.recommended;
}

/** Mở bài thì mở nhóm của bài. Không đổi gì thì trả lại đúng object cũ. */
export function openGroupsAfter(
  open: Record<string, boolean>,
  groups: LessonGroupView[],
  nodeId: string | null
): Record<string, boolean> {
  const group = nodeId ? groupOfNode(groups, nodeId) : undefined;
  if (!group || open[group.group_id]) return open;
  return { ...open, [group.group_id]: true };
}

/** Trạng thái từ progress, chưa có thì suy từ prerequisites như lúc mới vào trang. */
export function nodeStatesOf(
  nodes: HybridArchitecturalNode[],
  progress: SessionProgress | null
): Record<string, LessonNodeState> {
  const derived = deriveNodeStates(
    nodes.map((n) => ({
      node_id: n.id,
      title: n.title,
      is_capstone: Boolean(n.is_capstone),
      prerequisites: n.prerequisites ?? [],
    })),
    []
  );
  const states: Record<string, LessonNodeState> = {};
  for (const node of nodes) {
    const fallback: LessonNodeState = progress
      ? { status: "LOCKED", has_warning: false, analysis_failed: false }
      : derived[node.id];
    states[node.id] = progress?.nodes?.[node.id] ?? fallback;
  }
  return states;
}

/** Cha đã thông theo derive.ts: xong, chưa đạt, hoặc phân tích lỗi (D-03). */
function isCleared(state: LessonNodeState | undefined): boolean {
  if (!state) return false;
  return (
    state.status === "COMPLETED" ||
    state.status === "FAILED" ||
    (state.status === "AVAILABLE" && state.analysis_failed)
  );
}

export function blockedBy(
  node: HybridArchitecturalNode,
  states: Record<string, LessonNodeState>
): string[] {
  return (node.prerequisites ?? []).filter((id) => !isCleared(states[id]));
}

/** Cha làm bài này có ⚠: chưa đạt hoặc phân tích lỗi. */
export function weakParents(
  node: HybridArchitecturalNode,
  states: Record<string, LessonNodeState>
): string[] {
  return (node.prerequisites ?? []).filter((id) => {
    const state = states[id];
    return Boolean(state) && isCleared(state) && state.status !== "COMPLETED";
  });
}

/** D-85: bài gốc có cạnh ra mang chip "Bắt đầu". */
export function startNodeIds(
  nodes: HybridArchitecturalNode[],
  edges: GraphEdge[]
): Set<string> {
  const sources = new Set(edges.map((e) => e.source));
  return new Set(
    nodes
      .filter((n) => (n.prerequisites ?? []).length === 0 && sources.has(n.id))
      .map((n) => n.id)
  );
}

export function cardAction(status: NodeStatus, blockedNames: string[]): CardAction {
  if (status !== "LOCKED") return { kind: "OPEN" };
  return { kind: "TOAST", message: `Cần xong: ${blockedNames.join(", ")}` };
}
