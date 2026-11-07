import { describe, expect, it } from "vitest";
import type { FollowUp, QuestionView } from "@/contracts";
import {
  activeQuestionArrayIndex,
  canOpenQuestion,
  followUpStep,
  hasNextQuestionToOpen,
  questionPosition,
  visibleQuestions,
} from "../question-list";

function q(question_index: number, state: Partial<QuestionView["state"]> = {}): QuestionView {
  return {
    question_index,
    skill: "DB_OPTIMIZATION",
    tier: "INTERMEDIATE",
    focus: "FLOW",
    feynman_question: `Câu gốc ${question_index}`,
    state: { finished: false, ended_by: null, ...state },
  } as unknown as QuestionView;
}

const DROPPED = { finished: true, ended_by: "DROPPED" } as Partial<QuestionView["state"]>;
const DONE = { finished: true, ended_by: "ANSWER" } as Partial<QuestionView["state"]>;

describe("T-UI-09 — Run 3 câu, câu 2 DROPPED", () => {
  const run = [q(1), q(2, DROPPED), q(3)];

  it("hiện 2 câu, không còn câu DROPPED", () => {
    expect(visibleQuestions(run).map((x) => x.question_index)).toEqual([1, 3]);
  });

  it('"Câu 2/2" là câu 3 gốc', () => {
    expect(questionPosition(run, 3)).toEqual({ k: 2, n: 2 });
    expect(questionPosition(run, 1)).toEqual({ k: 1, n: 2 });
  });

  it("câu không có trong danh sách hiện ⇒ rơi về vị trí đầu, n vẫn đúng", () => {
    expect(questionPosition(run, 2)).toEqual({ k: 1, n: 2 });
    expect(questionPosition([], 1)).toEqual({ k: 1, n: 1 });
  });
});

describe("Câu sau tắt tới khi câu trước xong (Mục 6.2)", () => {
  it("câu đầu luôn mở; câu sau tắt khi câu trước chưa xong", () => {
    const run = [q(1), q(2)];
    expect(canOpenQuestion(run, 1)).toBe(true);
    expect(canOpenQuestion(run, 2)).toBe(false);
  });

  it("câu trước xong ⇒ câu sau mở, câu đã xong vẫn xem lại được", () => {
    const run = [q(1, DONE), q(2), q(3)];
    expect(canOpenQuestion(run, 1)).toBe(true);
    expect(canOpenQuestion(run, 2)).toBe(true);
    expect(canOpenQuestion(run, 3)).toBe(false);
  });

  it("câu DROPPED không chặn câu sau", () => {
    const run = [q(1, DONE), q(2, DROPPED), q(3)];
    expect(canOpenQuestion(run, 3)).toBe(true);
  });
});

describe('Nút "Câu tiếp theo" không vượt luật làm lần lượt', () => {
  it("câu hiện tại chưa xong ⇒ không có nút, kể cả khi còn câu sau", () => {
    expect(hasNextQuestionToOpen([q(1), q(2)], 0)).toBe(false);
  });

  it("câu hiện tại xong và còn câu sau ⇒ có nút", () => {
    expect(hasNextQuestionToOpen([q(1, DONE), q(2)], 0)).toBe(true);
  });

  it("câu sau đều DROPPED hoặc đang ở câu cuối ⇒ không có nút", () => {
    expect(hasNextQuestionToOpen([q(1, DONE), q(2, DROPPED)], 0)).toBe(false);
    expect(hasNextQuestionToOpen([q(1, DONE), q(2, DONE)], 1)).toBe(false);
  });

  it("nhảy qua câu DROPPED ở giữa", () => {
    expect(hasNextQuestionToOpen([q(1, DONE), q(2, DROPPED), q(3)], 0)).toBe(true);
  });
});

describe("Câu đang mở không bao giờ là câu DROPPED", () => {
  it("chưa chọn ⇒ câu chưa xong đầu, bỏ qua câu DROPPED", () => {
    expect(activeQuestionArrayIndex([q(1, DROPPED), q(2)], null)).toBe(1);
    expect(activeQuestionArrayIndex([q(1, DONE), q(2, DROPPED), q(3)], null)).toBe(2);
  });

  it("đang trỏ vào câu DROPPED ⇒ chuyển sang câu chưa xong đầu", () => {
    expect(activeQuestionArrayIndex([q(1, DROPPED), q(2)], 1)).toBe(1);
  });

  it("đã chọn câu hiện được ⇒ giữ nguyên, kể cả câu đã xong", () => {
    expect(activeQuestionArrayIndex([q(1, DONE), q(2)], 1)).toBe(0);
    expect(activeQuestionArrayIndex([q(1, DONE), q(2)], 2)).toBe(1);
  });

  it("mọi câu đã xong ⇒ câu hiện đầu tiên; rỗng hoặc toàn DROPPED ⇒ 0", () => {
    expect(activeQuestionArrayIndex([q(1, DROPPED), q(2, DONE)], null)).toBe(1);
    expect(activeQuestionArrayIndex([], null)).toBe(0);
    expect(activeQuestionArrayIndex([q(1, DROPPED)], null)).toBe(0);
  });
});

describe("T-UI-08 — Nút mở bước của gợi ý", () => {
  it("chỉ CODE_POINTER có step_index mới có nút", () => {
    const pointer: FollowUp = { type: "CODE_POINTER", question: "Xem lại", step_index: 2 };
    expect(followUpStep(pointer)).toBe(2);
    expect(followUpStep({ ...pointer, step_index: null })).toBeNull();
    expect(followUpStep({ ...pointer, type: "CONCEPT" })).toBeNull();
    expect(followUpStep(null)).toBeNull();
  });
});
