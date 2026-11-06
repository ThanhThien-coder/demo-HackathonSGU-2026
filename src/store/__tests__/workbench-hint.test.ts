import { beforeEach, describe, expect, it } from "vitest";
import { useWorkbenchStore } from "../workbench";

describe("T-UI-08 — Gợi ý trỏ về tour (UI-32b)", () => {
  beforeEach(() => {
    const state = useWorkbenchStore.getState();
    useWorkbenchStore.setState({
      active_tab: "FEYNMAN",
      active_step: 1,
      active_question_index: 3,
      ui: {
        ...state.ui,
        xray_stage: "SUMMARY",
        return_question: false,
        drafts: { "run-1:3": "nháp đang viết" },
      },
    });
  });

  it('"Mở Bước 2 trong tour" ⇒ sang X-Ray, tour bước 2, có băng quay lại', () => {
    useWorkbenchStore.getState().openHintStep(2);
    const state = useWorkbenchStore.getState();
    expect(state.active_tab).toBe("XRAY");
    expect(state.active_step).toBe(2);
    expect(state.ui.xray_stage).toBe("TOUR");
    expect(state.ui.return_question).toBe(true);
  });

  it('"Quay lại câu hỏi" ⇒ về đúng câu, nháp còn, băng tắt', () => {
    useWorkbenchStore.getState().openHintStep(2);
    useWorkbenchStore.getState().setActiveTab("FEYNMAN");
    const state = useWorkbenchStore.getState();
    expect(state.active_tab).toBe("FEYNMAN");
    expect(state.active_question_index).toBe(3);
    expect(state.ui.drafts["run-1:3"]).toBe("nháp đang viết");
    expect(state.ui.return_question).toBe(false);
  });

  it("chuyển bước trong tour khi đang xem lại vẫn giữ băng", () => {
    useWorkbenchStore.getState().openHintStep(2);
    useWorkbenchStore.getState().goToStep(3);
    expect(useWorkbenchStore.getState().ui.return_question).toBe(true);
  });

  it("quay lại bài đã có run ⇒ giữ câu chưa xong đầu, không để null", () => {
    useWorkbenchStore.setState({
      runs: {
        "bai-a": {
          questions: [
            { question_index: 1, state: { finished: true, ended_by: "DROPPED" } },
            { question_index: 2, state: { finished: true, ended_by: "ANSWER" } },
            { question_index: 3, state: { finished: false, ended_by: null } },
          ],
        } as never,
      },
    });
    useWorkbenchStore.getState().setActiveNode("bai-a");
    expect(useWorkbenchStore.getState().active_question_index).toBe(3);
  });

  it("bài chưa có run ⇒ active_question_index vẫn null", () => {
    useWorkbenchStore.setState({ runs: {} });
    useWorkbenchStore.getState().setActiveNode("bai-moi");
    expect(useWorkbenchStore.getState().active_question_index).toBeNull();
  });

  it("đổi bài ⇒ tắt băng", () => {
    useWorkbenchStore.getState().openHintStep(2);
    useWorkbenchStore.getState().setActiveNode("slice-cart");
    expect(useWorkbenchStore.getState().ui.return_question).toBe(false);
  });
});
