import type { CourseDetail, LessonItem } from "./types";
import type { LearningSessionSummary, SessionProgress } from "@/lib/api";

/**
 * Chuyển đổi dữ liệu phiên học thật (LearningSessionSummary & SessionProgress)
 * thành đối tượng hiển thị danh sách bài học kiến trúc CourseDetail.
 */
export function buildSessionDetail(
  session: LearningSessionSummary,
  progress?: SessionProgress | null
): CourseDetail {
  const nodeEntries = progress?.nodes ? Object.entries(progress.nodes) : [];

  let lessons: LessonItem[] = [];

  if (nodeEntries.length > 0) {
    lessons = nodeEntries.map(([nodeId, nodeInfo], idx) => {
      const status =
        nodeInfo.status === "COMPLETED"
          ? "completed"
          : nodeInfo.status === "AVAILABLE"
          ? "in-progress"
          : "locked";

      return {
        id: nodeId,
        stepNumber: idx + 1,
        title: `${idx + 1}. Kiến trúc Node: ${nodeId}`,
        description:
          status === "completed"
            ? "Đã hoàn thành bài học và vượt qua kiểm thử Feynman"
            : status === "in-progress"
            ? "Bài học đang mở, sẵn sàng để nghiên cứu và trả lời câu hỏi"
            : "Đang khóa - Hoàn thành các node tiên quyết để mở khóa",
        status,
        progress:
          status === "completed" ? 100 : status === "in-progress" ? 50 : 0,
        targetUrl: `/learn?session=${encodeURIComponent(
          session.session_id
        )}&node=${encodeURIComponent(nodeId)}`,
      };
    });
  } else {
    const total = Math.max(session.total_nodes, 1);
    const completed = session.completed_count || 0;

    lessons = Array.from({ length: total }, (_, i) => {
      const stepNum = i + 1;
      const isCompleted = stepNum <= completed;
      const isInProgress = stepNum === completed + 1;
      const status = isCompleted
        ? "completed"
        : isInProgress
        ? "in-progress"
        : "locked";

      return {
        id: `${session.session_id}-node-${stepNum}`,
        stepNumber: stepNum,
        title: `${stepNum}. Module Kiến trúc ${stepNum}: Phân tích luồng thực thi`,
        description: isCompleted
          ? "Đã hoàn thành phân tích lát cắt kiến trúc"
          : isInProgress
          ? "Đang nghiên cứu và đối thoại kỹ thuật Feynman"
          : "Đang khóa - Hoàn thành bài trước để mở khóa",
        status,
        progress: isCompleted ? 100 : isInProgress ? 50 : 0,
        targetUrl: `/learn?session=${encodeURIComponent(session.session_id)}`,
      };
    });
  }

  return {
    id: session.session_id,
    title: session.repo_name || "Lộ trình kiến trúc dự án",
    description: `Lộ trình học theo mã nguồn thực tế (Engine v${session.engine_version}) • Hoàn thành ${session.completed_count}/${session.total_nodes} bài`,
    lessons,
  };
}
