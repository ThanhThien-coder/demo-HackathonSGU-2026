import type { CourseDetail, LessonItem, LessonStatus } from "./types";
import type {
  LearningSessionSummary,
  SessionProgress,
  HybridArchitecturalNode,
} from "@/contracts";
import { topologicalOrder } from "@/store/workbench";

/**
 * Chuyển đổi dữ liệu phiên học thật (LearningSessionSummary, SessionProgress & HybridArchitecturalNode[])
 * thành đối tượng hiển thị danh sách bài học kiến trúc CourseDetail.
 */
export function buildSessionDetail(
  session: LearningSessionSummary,
  progress: SessionProgress,
  nodes: HybridArchitecturalNode[]
): CourseDetail {
  const nodeMap = new Map<string, HybridArchitecturalNode>(
    nodes.map((node) => [node.id, node])
  );

  const orderedIds = topologicalOrder(nodes);
  const orderedNodes: HybridArchitecturalNode[] = [];

  for (const id of orderedIds) {
    const node = nodeMap.get(id);
    if (node) {
      orderedNodes.push(node);
    }
  }

  // Đề phòng node nào chưa có trong orderedIds
  for (const node of nodes) {
    if (!orderedIds.includes(node.id)) {
      orderedNodes.push(node);
    }
  }

  const lessons: LessonItem[] = orderedNodes.map((node, idx) => {
    const nodeProgress = progress.nodes ? progress.nodes[node.id] : undefined;
    const nodeStatus = nodeProgress?.status;

    let status: LessonStatus = "locked";
    if (nodeStatus === "COMPLETED") {
      status = "completed";
    } else if (nodeStatus === "FAILED") {
      status = "failed";
    } else if (nodeStatus === "AVAILABLE") {
      status = "in-progress";
    } else {
      status = "locked";
    }

    const progressValue = status === "completed" ? 100 : 0;
    const stepNumber = idx + 1;

    return {
      id: node.id,
      stepNumber,
      title: `${stepNumber}. ${node.title}`,
      description: node.title_evidence,
      status,
      progress: progressValue,
      targetUrl: `/learn?session=${encodeURIComponent(
        session.session_id
      )}&node=${encodeURIComponent(node.id)}`,
    };
  });

  return {
    id: session.session_id,
    title: session.repo_name || "Lộ trình kiến trúc dự án",
    description: `Lộ trình học theo mã nguồn thực tế (Engine v${session.engine_version}) • Hoàn thành ${session.completed_count}/${session.total_nodes} bài`,
    lessons,
  };
}
