import type { FollowUp, QuestionView } from "@/contracts";

/** D15 — logic thuần của danh sách câu hỏi (spec/30 Mục 6.2). Không phụ thuộc React để test được. */

function isDropped(question: QuestionView): boolean {
  return question.state?.ended_by === "DROPPED";
}

/** Câu `DROPPED` ẩn hẳn (D-81). Dữ liệu run giữ nguyên, chỉ không hiện. */
export function visibleQuestions(questions: QuestionView[]): QuestionView[] {
  return questions.filter((q) => !isDropped(q));
}

/** `{k}` đánh lại từ 1, `{n}` = số câu còn lại sau khi ẩn. */
export function questionPosition(
  questions: QuestionView[],
  questionIndex: number
): { k: number; n: number } {
  const visible = visibleQuestions(questions);
  const position = visible.findIndex((q) => q.question_index === questionIndex);
  return { k: Math.max(position, 0) + 1, n: Math.max(visible.length, 1) };
}

/** Làm lần lượt: câu sau tắt tới khi mọi câu hiện phía trước đã xong. */
export function canOpenQuestion(questions: QuestionView[], questionIndex: number): boolean {
  const visible = visibleQuestions(questions);
  const position = visible.findIndex((q) => q.question_index === questionIndex);
  return position >= 0 && visible.slice(0, position).every((q) => q.state?.finished);
}

/**
 * Vị trí trong `questions` của câu đang mở: đúng câu đã chọn nếu nó hiện được, không thì câu chưa
 * xong đầu tiên. Không bao giờ dừng ở câu `DROPPED`, vì câu đó không còn gì hiện trên màn hình.
 */
export function activeQuestionArrayIndex(
  questions: QuestionView[],
  activeQuestionIndex: number | null | undefined
): number {
  const selected = questions.find((q) => q.question_index === activeQuestionIndex);
  const visible = visibleQuestions(questions);
  const target =
    selected && !isDropped(selected)
      ? selected
      : (visible.find((q) => !q.state?.finished) ?? visible[0]);
  return target ? questions.indexOf(target) : 0;
}

/** "Câu tiếp theo" chỉ có khi câu đang mở đã xong và phía sau còn câu hiện được. */
export function hasNextQuestionToOpen(questions: QuestionView[], activeArrayIndex: number): boolean {
  if (!questions[activeArrayIndex]?.state?.finished) return false;
  return questions.slice(activeArrayIndex + 1).some((q) => !isDropped(q));
}

/** Bước mà nút "Mở Bước {n} trong tour" trỏ tới; gợi ý không phải `CODE_POINTER` thì không có nút. */
export function followUpStep(followUp: FollowUp | null | undefined): number | null {
  if (followUp?.type !== "CODE_POINTER") return null;
  return followUp.step_index;
}
