import type {
  GraphSkeletonNode,
  NodeStateView,
  NodeStatus,
} from "@/contracts";

export interface ProgressRowLike {
  node_id: string;
  status: Exclude<NodeStatus, "LOCKED"> | null;
  analysis_failed: boolean;
}

export type DerivedNodeState = Pick<
  NodeStateView,
  "node_id" | "status" | "has_warning" | "analysis_failed"
>;

/**
 * Suy ra trạng thái của các node trong đồ thị học tập (03 Mục 5.1).
 * Duyệt node theo thứ tự tô-pô theo prerequisites (hòa ⇒ node_id tăng dần).
 */
export function deriveNodeStates(
  skeleton: GraphSkeletonNode[],
  progressRows: ProgressRowLike[]
): Record<string, DerivedNodeState> {
  const result: Record<string, DerivedNodeState> = {};
  if (!skeleton || skeleton.length === 0) {
    return result;
  }

  const progressMap = new Map<string, ProgressRowLike>();
  for (const row of progressRows) {
    progressMap.set(row.node_id, row);
  }

  const nodeMap = new Map<string, GraphSkeletonNode>();
  for (const node of skeleton) {
    nodeMap.set(node.node_id, node);
  }

  // Xây dựng đồ thị phụ thuộc và bậc vào (in-degree)
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // parent -> list of children

  for (const node of skeleton) {
    inDegree.set(node.node_id, 0);
    dependents.set(node.node_id, []);
  }

  for (const node of skeleton) {
    const validPrereqs = (node.prerequisites ?? []).filter((pId) =>
      nodeMap.has(pId)
    );
    inDegree.set(node.node_id, validPrereqs.length);

    for (const pId of validPrereqs) {
      dependents.get(pId)?.push(node.node_id);
    }
  }

  // Các node có inDegree === 0 sẵn sàng duyệt
  const ready: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      ready.push(nodeId);
    }
  }
  ready.sort((a, b) => a.localeCompare(b));

  const visited = new Set<string>();

  const processNode = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return;
    }
    visited.add(nodeId);

    const row = progressMap.get(nodeId);
    const analysisFailed = Boolean(row?.analysis_failed);

    const prereqs = node.prerequisites ?? [];
    let allParentsCleared = true;
    let hasWarningFromParent = false;

    for (const pId of prereqs) {
      const pState = result[pId];
      if (!pState) {
        allParentsCleared = false;
        continue;
      }

      const isCleared =
        pState.status === "COMPLETED" ||
        pState.status === "FAILED" ||
        (pState.status === "AVAILABLE" && pState.analysis_failed);

      if (!isCleared) {
        allParentsCleared = false;
      }

      const isWarning =
        pState.status === "FAILED" ||
        (pState.status === "AVAILABLE" && pState.analysis_failed);

      if (isWarning) {
        hasWarningFromParent = true;
      }
    }

    let status: NodeStatus;
    if (row && row.status !== null && row.status !== undefined) {
      status = row.status;
    } else {
      status = allParentsCleared ? "AVAILABLE" : "LOCKED";
    }

    const hasWarning = status !== "LOCKED" && hasWarningFromParent;

    result[nodeId] = {
      node_id: nodeId,
      status,
      has_warning: hasWarning,
      analysis_failed: analysisFailed,
    };
  };

  while (ready.length > 0) {
    const currentId = ready.shift()!;
    processNode(currentId);

    const children = dependents.get(currentId) ?? [];
    for (const childId of children) {
      const currentDeg = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, currentDeg);
      if (currentDeg === 0) {
        ready.push(childId);
      }
    }
    ready.sort((a, b) => a.localeCompare(b));
  }

  // Phòng hờ chu trình hoặc node cô lập
  if (visited.size < skeleton.length) {
    const remaining = skeleton
      .filter((n) => !visited.has(n.node_id))
      .sort((a, b) => a.node_id.localeCompare(b.node_id));

    for (const rem of remaining) {
      processNode(rem.node_id);
    }
  }

  return result;
}
