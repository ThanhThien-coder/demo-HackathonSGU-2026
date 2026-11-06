import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useWorkbenchStore,
  topologicalOrder,
} from "../workbench";
import {
  analyzeNodeSafe,
  analyzeOverviewSafe,
  enrichNodeSafe,
  getSessionProgressSafe,
  explainSelectionSafe,
} from "@/lib/api";
import { ERROR_MESSAGES } from "@/lib/messages";
import type {
  IngestResponse,
  NodeAnalysisView,
  RepoOverviewView,
  EnrichNodeResponse,
  NodeStateView,
  QuestionState,
  SkillChange,
  ExplainSelectionResponse,
} from "@/contracts";

vi.mock("@/lib/api", () => ({
  explainSelectionSafe: vi.fn().mockResolvedValue({
    ok: false,
    data: null,
    error: {
      error: {
        code: "ERR_AI_UNAVAILABLE",
        message: "Chưa sẵn sàng",
        retryable: false,
      },
    },
  }),
  analyzeNodeSafe: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      node_id: "node-default",
      analysis: null,
      node_state: {
        node_id: "node-default",
        status: "AVAILABLE",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      tokens_used: 0,
      unlocked_node_ids: [],
    },
    error: null,
  }),
  analyzeOverviewSafe: vi.fn().mockResolvedValue({
    ok: false,
    data: null,
    error: {
      error: {
        code: "ERR_AI_UNAVAILABLE",
        message: "Chưa sẵn sàng",
        retryable: false,
      },
    },
  }),
  enrichNodeSafe: vi.fn().mockResolvedValue({
    ok: false,
    data: null,
    error: {
      error: {
        code: "ERR_AI_UNAVAILABLE",
        message: "Chưa có câu hỏi",
        retryable: false,
      },
    },
  }),
  getSessionProgressSafe: vi.fn().mockResolvedValue({
    ok: false,
    data: null,
    error: null,
  }),
}));

function createMockAnalysis(nodeId: string): NodeAnalysisView {
  return {
    node_id: nodeId,
    skills: [
      {
        skill: "HTTP_ROUTING",
        step: 1,
        symbol: "handleRequest",
        reason: "Xử lý route",
        file_path: "src/server.ts",
        line_start: 1,
        line_end: 10,
      },
    ],
    architecture: {
      patterns: ["MVC"],
      summary: "Kiến trúc mẫu MVC",
    },
    steps: [
      {
        step: 1,
        layer: "ENTRY_POINT",
        file_path: "src/server.ts",
        line_start: 1,
        line_end: 10,
        text: "Nhận HTTP request",
      },
    ],
    strengths: [
      {
        step: 1,
        text: "Tách bạch logic",
      },
    ],
    weak_points: [
      {
        skill: "ERROR_HANDLING",
        step: 1,
        symbol: "handleRequest",
        what: "Chưa bắt lỗi",
        consequence: "Crash server",
        file_path: "src/server.ts",
        line_start: 1,
        line_end: 10,
      },
    ],
    shared_files: [],
    skeleton_only: false,
  };
}

describe("src/store/workbench.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkbenchStore.getState().resetSession();
  });

  // ---------------------------------------------------------------------------
  // 1. topologicalOrder
  // ---------------------------------------------------------------------------
  describe("topologicalOrder", () => {
    it("trả về thứ tự tô-pô đúng cho đồ thị tuần tự", () => {
      const nodes = [
        { id: "C", prerequisites: ["B"] },
        { id: "B", prerequisites: ["A"] },
        { id: "A", prerequisites: [] },
      ];
      expect(topologicalOrder(nodes)).toEqual(["A", "B", "C"]);
    });

    it("hòa theo id tăng dần khi nhiều node cùng sẵn sàng", () => {
      const nodes = [
        { id: "node-Z", prerequisites: [] },
        { id: "node-A", prerequisites: [] },
        { id: "node-M", prerequisites: [] },
      ];
      expect(topologicalOrder(nodes)).toEqual(["node-A", "node-M", "node-Z"]);
    });

    it("bỏ qua prerequisites trỏ ra ngoài danh sách", () => {
      const nodes = [
        { id: "node-2", prerequisites: ["node-1", "UNKNOWN_EXTERNAL"] },
        { id: "node-1", prerequisites: ["ANOTHER_EXTERNAL"] },
      ];
      expect(topologicalOrder(nodes)).toEqual(["node-1", "node-2"]);
    });

    it("không treo khi có chu trình và nối các node kẹt vào cuối theo id tăng dần", () => {
      const nodes = [
        { id: "node-B", prerequisites: ["node-A"] },
        { id: "node-A", prerequisites: ["node-B"] },
        { id: "node-0", prerequisites: [] },
      ];
      const order = topologicalOrder(nodes);
      expect(order).toEqual(["node-0", "node-A", "node-B"]);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. applyIngest
  // ---------------------------------------------------------------------------
  describe("applyIngest", () => {
    it("gán đúng dữ liệu và đưa active_node_id về null, reset ui nhưng giữ offline_persona", () => {
      // Đặt state trước để kiểm tra bị ghi đè
      useWorkbenchStore.setState({
        active_node_id: "old-node",
        runs: { "old-node": {} as never },
        overview: { facts: {} } as never,
        active_tab: "FEYNMAN",
        active_step: 4,
        active_question_index: 2,
        last_failed_answers: { "key-1": "answer" },
        ui: {
          pending: { "key-p": true },
          errors: { "key-e": "err" },
          last_evaluations: {},
          skill_changes: {},
          drafts: { "key-d": "draft" },
          presentation_pane: true,
          hint_step: 3,
          offline_persona: "SENIOR_RUSTY",
          explanations: {},
        },
      });

      const mockAnalysis: NodeAnalysisView = createMockAnalysis("node-1");

      const mockIngest: IngestResponse = {
        session_id: "session-abc",
        result: {
          nodes: [{ id: "node-1", prerequisites: [] }] as never,
        } as never,
        progress: {
          session_id: "session-abc",
          tokens_used: 1200,
          nodes: {
            "node-1": {
              node_id: "node-1",
              status: "AVAILABLE",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        },
        analyses: {
          "node-1": mockAnalysis,
        },
        resumed: false,
        from_cache: false,
      };

      useWorkbenchStore.getState().applyIngest(mockIngest);
      const state = useWorkbenchStore.getState();

      expect(state.session_id).toBe("session-abc");
      expect(state.result).toBe(mockIngest.result);
      expect(state.progress).toBe(mockIngest.progress);
      expect(state.analyses).toEqual(mockIngest.analyses);
      expect(state.runs).toEqual({});
      expect(state.overview).toBe("PENDING");
      expect(state.active_node_id).toBeNull();
      expect(state.active_tab).toBe("XRAY");
      expect(state.active_step).toBeNull();
      expect(state.active_question_index).toBeNull();
      expect(state.last_failed_answers).toEqual({});
      expect(state.ui.offline_persona).toBe("SENIOR_RUSTY");
      expect(state.ui.pending).toEqual({});
      expect(state.ui.errors).toEqual({});
      expect(state.ui.hint_step).toBeNull();
      expect(state.ui.presentation_pane).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. setActiveNode
  // ---------------------------------------------------------------------------
  describe("setActiveNode", () => {
    it("đặt lại active_step, active_question_index, ui.hint_step khi chọn node", () => {
      useWorkbenchStore.setState({
        active_step: 5,
        active_question_index: 2,
        ui: {
          ...useWorkbenchStore.getState().ui,
          hint_step: 4,
        },
      });

      useWorkbenchStore.getState().setActiveNode("node-target");
      const state = useWorkbenchStore.getState();

      expect(state.active_node_id).toBe("node-target");
      expect(state.active_tab).toBe("XRAY");
      expect(state.active_step).toBe(1);
      expect(state.active_question_index).toBeNull();
      expect(state.ui.hint_step).toBeNull();
    });

    it("đặt active_step về null khi truyền nodeId là null", () => {
      useWorkbenchStore.getState().setActiveNode(null);
      const state = useWorkbenchStore.getState();

      expect(state.active_node_id).toBeNull();
      expect(state.active_tab).toBe("XRAY");
      expect(state.active_step).toBeNull();
      expect(state.active_question_index).toBeNull();
      expect(state.ui.hint_step).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. openNode trên 7 node
  // ---------------------------------------------------------------------------
  describe("openNode trên 7 node", () => {
    it("chỉ gọi analyzeNodeSafe đúng 3 lần: node đó và 2 node kế tiếp; gọi lại không phát sinh lời gọi mới", async () => {
      const nodes = [
        { id: "node-1", prerequisites: [] },
        { id: "node-2", prerequisites: ["node-1"] },
        { id: "node-3", prerequisites: ["node-2"] },
        { id: "node-4", prerequisites: ["node-3"] },
        { id: "node-5", prerequisites: ["node-4"] },
        { id: "node-6", prerequisites: ["node-5"] },
        { id: "node-7", prerequisites: ["node-6"] },
      ];

      useWorkbenchStore.getState().applyIngest({
        session_id: "test-session-7",
        result: { nodes } as never,
        progress: {
          session_id: "test-session-7",
          tokens_used: 0,
          nodes: Object.fromEntries(
            nodes.map((n) => [
              n.id,
              {
                node_id: n.id,
                status: "AVAILABLE",
                has_warning: false,
                analysis_failed: false,
                last_run: null,
              },
            ])
          ),
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      });

      vi.mocked(analyzeNodeSafe).mockImplementation(async (sid, nid) => ({
        ok: true,
        data: {
          node_id: nid,
          analysis: createMockAnalysis(nid),
          node_state: {
            node_id: nid,
            status: "AVAILABLE",
            has_warning: false,
            analysis_failed: false,
            last_run: null,
          },
          tokens_used: 150,
          unlocked_node_ids: [],
        },
        error: null,
      }));

      // Gọi openNode lần 1
      useWorkbenchStore.getState().openNode("node-1");

      // Chờ các promise phân tích hoàn tất
      await vi.waitFor(() => {
        expect(analyzeNodeSafe).toHaveBeenCalledTimes(3);
      });

      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(1, "test-session-7", "node-1");
      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(2, "test-session-7", "node-2");
      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(3, "test-session-7", "node-3");

      // Gọi lại openNode trên node-1
      useWorkbenchStore.getState().openNode("node-1");

      // Đợi thêm một khoảng thời gian để đảm bảo không có lời gọi mới
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(analyzeNodeSafe).toHaveBeenCalledTimes(3);
    });

    it("2 node kế tiếp đã có bản phân tích thì vẫn tải 2 node sau đó", async () => {
      const nodes = [
        { id: "node-1", prerequisites: [] },
        { id: "node-2", prerequisites: ["node-1"] },
        { id: "node-3", prerequisites: ["node-2"] },
        { id: "node-4", prerequisites: ["node-3"] },
        { id: "node-5", prerequisites: ["node-4"] },
        { id: "node-6", prerequisites: ["node-5"] },
        { id: "node-7", prerequisites: ["node-6"] },
      ];

      useWorkbenchStore.getState().applyIngest({
        session_id: "test-session-skip-cached",
        result: { nodes } as never,
        progress: {
          session_id: "test-session-skip-cached",
          tokens_used: 0,
          nodes: Object.fromEntries(
            nodes.map((n) => [
              n.id,
              {
                node_id: n.id,
                status: "AVAILABLE",
                has_warning: false,
                analysis_failed: false,
                last_run: null,
              },
            ])
          ),
        },
        analyses: {
          "node-2": createMockAnalysis("node-2"),
          "node-3": createMockAnalysis("node-3"),
        },
        resumed: false,
        from_cache: false,
      });

      vi.mocked(analyzeNodeSafe).mockImplementation(async (sid, nid) => ({
        ok: true,
        data: {
          node_id: nid,
          analysis: createMockAnalysis(nid),
          node_state: {
            node_id: nid,
            status: "AVAILABLE",
            has_warning: false,
            analysis_failed: false,
            last_run: null,
          },
          tokens_used: 150,
          unlocked_node_ids: [],
        },
        error: null,
      }));

      // Gọi openNode trên node-1
      useWorkbenchStore.getState().openNode("node-1");

      // Chờ các promise phân tích hoàn tất
      await vi.waitFor(() => {
        expect(analyzeNodeSafe).toHaveBeenCalledTimes(3);
      });

      // analyzeNodeSafe phải được gọi cho node-1, node-4, node-5 (bỏ qua node-2 và node-3 vì đã có)
      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(1, "test-session-skip-cached", "node-1");
      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(2, "test-session-skip-cached", "node-4");
      expect(analyzeNodeSafe).toHaveBeenNthCalledWith(3, "test-session-skip-cached", "node-5");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. ERR_TOKEN_QUOTA_EXCEEDED
  // ---------------------------------------------------------------------------
  describe("ERR_TOKEN_QUOTA_EXCEEDED", () => {
    it("dừng hàng và đổi node chờ thành FAILED", async () => {
      const nodes = [
        { id: "node-1", prerequisites: [] },
        { id: "node-2", prerequisites: ["node-1"] },
        { id: "node-3", prerequisites: ["node-2"] },
        { id: "node-4", prerequisites: ["node-3"] },
        { id: "node-5", prerequisites: ["node-4"] },
        { id: "node-6", prerequisites: ["node-5"] },
        { id: "node-7", prerequisites: ["node-6"] },
      ];

      useWorkbenchStore.getState().applyIngest({
        session_id: "quota-session",
        result: { nodes } as never,
        progress: {
          session_id: "quota-session",
          tokens_used: 0,
          nodes: Object.fromEntries(
            nodes.map((n) => [
              n.id,
              {
                node_id: n.id,
                status: "AVAILABLE",
                has_warning: false,
                analysis_failed: false,
                last_run: null,
              },
            ])
          ),
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      });

      let resolveNode1: (val: unknown) => void;
      const node1Promise = new Promise((r) => {
        resolveNode1 = r;
      });
      const pendingPromise = new Promise(() => {});

      vi.mocked(analyzeNodeSafe).mockImplementation(async (sid, nid) => {
        if (nid === "node-1") {
          return node1Promise as never;
        }
        return pendingPromise as never;
      });

      // Mở node-1: node-1, node-2, node-3 vào inFlight (concurrency = 3)
      useWorkbenchStore.getState().openNode("node-1");

      // Khi inFlight đã đầy (3 node), yêu cầu phân tích node-4:
      // node-4, node-5, node-6 sẽ được đưa vào waiting
      useWorkbenchStore.getState().requestAnalysis("node-4");

      const stateBefore = useWorkbenchStore.getState();
      expect(stateBefore.analyses["node-4"]).toBe("PENDING");
      expect(stateBefore.analyses["node-5"]).toBe("PENDING");
      expect(stateBefore.analyses["node-6"]).toBe("PENDING");

      // node-1 trả về lỗi hạn mức token
      resolveNode1!({
        ok: false,
        data: null,
        error: {
          error: {
            code: "ERR_TOKEN_QUOTA_EXCEEDED",
            message: "Hạn mức token phiên học đã hết.",
            retryable: false,
          },
        },
      });

      await vi.waitFor(() => {
        const state = useWorkbenchStore.getState();
        expect(state.analyses["node-1"]).toBe("FAILED");
        expect(state.analyses["node-4"]).toBe("FAILED");
        expect(state.analyses["node-5"]).toBe("FAILED");
        expect(state.analyses["node-6"]).toBe("FAILED");
      });

      // Kiểm tra có thông báo lỗi UI cho node-1
      expect(useWorkbenchStore.getState().ui.errors["analyze:node-1"]).toContain(
        "hạn mức AI"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Response về sau khi đã đổi phiên thì bị bỏ
  // ---------------------------------------------------------------------------
  describe("Đổi phiên", () => {
    it("response về sau khi đã đổi phiên thì bị bỏ", async () => {
      const nodes = [{ id: "node-1", prerequisites: [] }];

      useWorkbenchStore.getState().applyIngest({
        session_id: "session-1",
        result: { nodes } as never,
        progress: {
          session_id: "session-1",
          tokens_used: 0,
          nodes: {
            "node-1": {
              node_id: "node-1",
              status: "AVAILABLE",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      });

      let resolveAnalysis: (val: unknown) => void;
      const delayedPromise = new Promise((r) => {
        resolveAnalysis = r;
      });

      vi.mocked(analyzeNodeSafe).mockImplementation(async () => delayedPromise as never);

      useWorkbenchStore.getState().openNode("node-1");

      // D18: tổng quan phiên 2 treo ⇒ phiên 2 chưa tải trước node, chỉ còn response cũ của phiên 1
      vi.mocked(analyzeOverviewSafe).mockImplementationOnce(() => new Promise(() => {}) as never);

      // Chuyển sang phiên mới trước khi response kịp về
      useWorkbenchStore.getState().applyIngest({
        session_id: "session-2",
        result: { nodes } as never,
        progress: {
          session_id: "session-2",
          tokens_used: 0,
          nodes: {
            "node-1": {
              node_id: "node-1",
              status: "AVAILABLE",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      });

      // Response của session-1 hoàn thành
      resolveAnalysis!({
        ok: true,
        data: {
          node_id: "node-1",
          analysis: createMockAnalysis("node-1"),
          node_state: {
            node_id: "node-1",
            status: "AVAILABLE",
            has_warning: false,
            analysis_failed: false,
            last_run: null,
          },
          tokens_used: 100,
          unlocked_node_ids: [],
        },
        error: null,
      });

      await new Promise((r) => setTimeout(r, 20));

      // Analyses của session-2 không bị gán dữ liệu của session-1
      const state = useWorkbenchStore.getState();
      expect(state.session_id).toBe("session-2");
      expect(state.analyses["node-1"]).not.toEqual(
        expect.objectContaining({ node_id: "node-1" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. T-UI-10: analyzeOverviewSafe & prefetchStart (D18)
  // ---------------------------------------------------------------------------
  describe("T-UI-10: analyzeOverviewSafe & prefetchStart", () => {
    it("ca lỗi: analyzeOverviewSafe gọi 1 lần và overview === PENDING; analyzeNodeSafe chưa được gọi khi promise chưa giải; giải promise ⇒ analyzeNodeSafe được gọi (node đầu theo tô-pô), overview thành { facts, ai: null }, ui.errors['overview'] không có giá trị", async () => {
      const nodes = [
        { id: "node-1", prerequisites: [] },
        { id: "node-2", prerequisites: ["node-1"] },
        { id: "node-3", prerequisites: ["node-2"] },
      ];

      let resolveOverview: (val: unknown) => void;
      const overviewPromise = new Promise((resolve) => {
        resolveOverview = resolve;
      });

      vi.mocked(analyzeOverviewSafe).mockImplementation(() => overviewPromise as never);
      vi.mocked(analyzeNodeSafe).mockClear();

      const mockIngest: IngestResponse = {
        session_id: "session-t-ui-10-err",
        result: {
          repo_name: "test-repo",
          fingerprint: {
            archetype: "WEB_BACKEND",
            detected_framework: "Express",
            tech_stack: ["express"],
          },
          nodes,
          edges: [],
          groups: [],
        } as never,
        progress: {
          session_id: "session-t-ui-10-err",
          tokens_used: 0,
          nodes: Object.fromEntries(
            nodes.map((n) => [
              n.id,
              {
                node_id: n.id,
                status: "AVAILABLE",
                has_warning: false,
                analysis_failed: false,
                last_run: null,
              },
            ])
          ),
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      };

      // 1. Gọi applyIngest(res) với res có 3 node chưa có bản phân tích
      useWorkbenchStore.getState().applyIngest(mockIngest);

      // 2. Kiểm: analyzeOverviewSafe được gọi đúng 1 lần và overview === "PENDING" ngay sau applyIngest
      expect(analyzeOverviewSafe).toHaveBeenCalledTimes(1);
      expect(analyzeOverviewSafe).toHaveBeenCalledWith("session-t-ui-10-err");
      expect(useWorkbenchStore.getState().overview).toBe("PENDING");

      // 3. analyzeNodeSafe chưa được gọi khi promise tổng quan chưa giải
      expect(analyzeNodeSafe).not.toHaveBeenCalled();

      // 4. Giải promise với kết quả lỗi
      resolveOverview!({
        ok: false,
        data: null,
        error: {
          error: {
            code: "ERR_AI_UNAVAILABLE",
            message: "x",
          },
        },
      });

      // 5. Chờ microtask xử lý response
      await vi.waitFor(() => {
        expect(analyzeNodeSafe).toHaveBeenCalled();
      });

      const state = useWorkbenchStore.getState();

      // analyzeNodeSafe được gọi (node đầu theo tô-pô là node-1)
      expect(analyzeNodeSafe).toHaveBeenCalledWith("session-t-ui-10-err", "node-1");

      // overview thành { facts: {…}, ai: null }
      expect(state.overview).toEqual({
        facts: {
          archetype: "WEB_BACKEND",
          framework: "Express",
          tech_stack: ["express"],
          root_node_ids: ["node-1"],
          main_path_node_ids: expect.any(Array),
        },
        ai: null,
      });

      // ui.errors["overview"] không có giá trị
      expect(state.ui.errors["overview"]).toBeUndefined();

      // analyzeOverviewSafe vẫn chỉ 1 lần
      expect(analyzeOverviewSafe).toHaveBeenCalledTimes(1);
    });

    it("ca thành công: tổng quan về { ok: true, data: { overview, tokens_used: 5 } } ⇒ overview là object đó, sau đó analyzeNodeSafe mới được gọi", async () => {
      const nodes = [
        { id: "node-1", prerequisites: [] },
        { id: "node-2", prerequisites: ["node-1"] },
        { id: "node-3", prerequisites: ["node-2"] },
      ];

      let resolveOverview: (val: unknown) => void;
      const overviewPromise = new Promise((resolve) => {
        resolveOverview = resolve;
      });

      vi.mocked(analyzeOverviewSafe).mockImplementation(() => overviewPromise as never);
      vi.mocked(analyzeNodeSafe).mockClear();

      const mockOverview: RepoOverviewView = {
        facts: {
          archetype: "WEB_BACKEND",
          framework: "Express",
          tech_stack: ["express"],
          root_node_ids: ["node-1"],
          main_path_node_ids: ["node-1"],
        },
        ai: {
          summary: "Tóm tắt từ AI thành công",
          groups: [{ group_id: "g1", name: "Nhóm 1" }],
          node_titles: [{ node_id: "node-1", title: "Tiêu đề tiếng Việt 1" }],
        },
      };

      const mockIngest: IngestResponse = {
        session_id: "session-t-ui-10-ok",
        result: {
          repo_name: "test-repo",
          fingerprint: {
            archetype: "WEB_BACKEND",
            detected_framework: "Express",
            tech_stack: ["express"],
          },
          nodes,
          edges: [],
          groups: [],
        } as never,
        progress: {
          session_id: "session-t-ui-10-ok",
          tokens_used: 0,
          nodes: Object.fromEntries(
            nodes.map((n) => [
              n.id,
              {
                node_id: n.id,
                status: "AVAILABLE",
                has_warning: false,
                analysis_failed: false,
                last_run: null,
              },
            ])
          ),
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      };

      useWorkbenchStore.getState().applyIngest(mockIngest);

      // analyzeOverviewSafe được gọi 1 lần, overview = "PENDING", analyzeNodeSafe chưa gọi
      expect(analyzeOverviewSafe).toHaveBeenCalledTimes(1);
      expect(useWorkbenchStore.getState().overview).toBe("PENDING");
      expect(analyzeNodeSafe).not.toHaveBeenCalled();

      // Giải promise với kết quả thành công
      resolveOverview!({
        ok: true,
        data: {
          overview: mockOverview,
          tokens_used: 5,
        },
        error: null,
      });

      await vi.waitFor(() => {
        expect(analyzeNodeSafe).toHaveBeenCalled();
      });

      const state = useWorkbenchStore.getState();
      expect(state.overview).toEqual(mockOverview);
      expect(analyzeOverviewSafe).toHaveBeenCalledTimes(1);
      expect(analyzeNodeSafe).toHaveBeenCalledWith("session-t-ui-10-ok", "node-1");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. loadRun
  // ---------------------------------------------------------------------------
  describe("loadRun", () => {
    it("không gọi 2 lần cho cùng node", async () => {
      const mockAnalysis: NodeAnalysisView = createMockAnalysis("node-1");

      useWorkbenchStore.getState().applyIngest({
        session_id: "loadrun-session",
        result: {
          nodes: [{ id: "node-1", prerequisites: [] }],
        } as never,
        progress: {
          session_id: "loadrun-session",
          tokens_used: 0,
          nodes: {
            "node-1": {
              node_id: "node-1",
              status: "AVAILABLE",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        },
        analyses: {
          "node-1": mockAnalysis,
        },
        resumed: false,
        from_cache: false,
      });

      let resolveEnrich: (val: unknown) => void;
      const enrichPromise = new Promise((r) => {
        resolveEnrich = r;
      });

      vi.mocked(enrichNodeSafe).mockImplementation(async () => enrichPromise as never);

      // Gọi lần 1
      const call1 = useWorkbenchStore.getState().loadRun("node-1");
      expect(enrichNodeSafe).toHaveBeenCalledTimes(1);
      expect(useWorkbenchStore.getState().ui.pending["enrich:node-1"]).toBe(true);

      // Gọi lần 2 ngay khi lần 1 đang pending
      const call2 = useWorkbenchStore.getState().loadRun("node-1");
      expect(enrichNodeSafe).toHaveBeenCalledTimes(1);

      // Cho lời gọi 1 hoàn tất
      const mockRunResponse: EnrichNodeResponse = {
        node_id: "node-1",
        run_id: "run-101",
        mode: "LEARN",
        questions: [
          {
            question_index: 0,
            skill: "HTTP_ROUTING",
            tier: "NOVICE",
            focus: "FLOW",
            feynman_question: "Giải thích routing?",
            state: {
              question_index: 0,
              feynman_question: "Giải thích routing?",
              skill: "HTTP_ROUTING",
              tier: "NOVICE",
              focus: "FLOW",
              attempts_used: 0,
              finished: false,
              outcome: null,
              ended_by: null,
              disputed: false,
              reveal: null,
            },
          },
        ],
        node_state: {
          node_id: "node-1",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        tokens_used: 80,
      };

      resolveEnrich!({
        ok: true,
        data: mockRunResponse,
        error: null,
      });

      await Promise.all([call1, call2]);

      expect(useWorkbenchStore.getState().runs["node-1"]).toEqual(mockRunResponse);
      expect(useWorkbenchStore.getState().ui.pending["enrich:node-1"]).toBe(false);

      // Gọi lần 3 sau khi run đã có trong store
      await useWorkbenchStore.getState().loadRun("node-1");
      expect(enrichNodeSafe).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 8b. reloadRun
  // ---------------------------------------------------------------------------
  describe("reloadRun", () => {
    it("bỏ qua điều kiện runs đã có và gọi lại enrichNodeSafe, áp kết quả giống loadRun trừ khi đang pending", async () => {
      useWorkbenchStore.getState().applyIngest({
        session_id: "reloadrun-session",
        result: {
          nodes: [{ id: "node-1", prerequisites: [] }],
        } as never,
        progress: {
          session_id: "reloadrun-session",
          tokens_used: 0,
          nodes: {
            "node-1": {
              node_id: "node-1",
              status: "COMPLETED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        },
        analyses: {},
        resumed: false,
        from_cache: false,
      });

      useWorkbenchStore.setState({
        active_node_id: "node-1",
        runs: { "node-1": { run_id: "old-run" } as never },
      });

      const mockReloadResponse: EnrichNodeResponse = {
        node_id: "node-1",
        run_id: "run-reloaded",
        mode: "LEARN",
        questions: [
          {
            question_index: 0,
            skill: "HTTP_ROUTING",
            tier: "NOVICE",
            focus: "FLOW",
            feynman_question: "Câu hỏi reload?",
            state: {
              question_index: 0,
              feynman_question: "Câu hỏi reload?",
              skill: "HTTP_ROUTING",
              tier: "NOVICE",
              focus: "FLOW",
              attempts_used: 0,
              finished: false,
              outcome: null,
              ended_by: null,
              disputed: false,
              reveal: null,
            },
          },
        ],
        node_state: {
          node_id: "node-1",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        tokens_used: 120,
      };

      vi.mocked(enrichNodeSafe).mockResolvedValueOnce({
        ok: true,
        data: mockReloadResponse,
        error: null,
      });

      await useWorkbenchStore.getState().reloadRun("node-1");

      expect(enrichNodeSafe).toHaveBeenCalledWith("reloadrun-session", "node-1", "LEARN");
      expect(useWorkbenchStore.getState().runs["node-1"]).toEqual(mockReloadResponse);
      expect(useWorkbenchStore.getState().active_question_index).toBe(0);
      expect(useWorkbenchStore.getState().progress?.tokens_used).toBe(120);

      // Nếu đang pending thì reloadRun dừng ngay
      useWorkbenchStore.getState().setUiPending("enrich:node-1", true);
      vi.mocked(enrichNodeSafe).mockClear();
      await useWorkbenchStore.getState().reloadRun("node-1");
      expect(enrichNodeSafe).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Các action phụ trợ
  // ---------------------------------------------------------------------------
  describe("Action phụ trợ: setTokensUsed, applyNodeState, applyQuestionState, refreshProgress", () => {
    it("setTokensUsed cập nhật tokens_used và không làm gì khi progress = null", () => {
      useWorkbenchStore.getState().setTokensUsed(500);
      expect(useWorkbenchStore.getState().progress).toBeNull();

      useWorkbenchStore.setState({
        progress: {
          session_id: "sess",
          tokens_used: 100,
          nodes: {},
        },
      });

      useWorkbenchStore.getState().setTokensUsed(750);
      expect(useWorkbenchStore.getState().progress?.tokens_used).toBe(750);
    });

    it("applyNodeState cập nhật trạng thái node trong progress", () => {
      useWorkbenchStore.setState({
        progress: {
          session_id: "sess",
          tokens_used: 0,
          nodes: {},
        },
      });

      const updatedNode: NodeStateView = {
        node_id: "node-99",
        status: "COMPLETED",
        has_warning: true,
        analysis_failed: false,
        last_run: null,
      };

      useWorkbenchStore.getState().applyNodeState(updatedNode);
      expect(useWorkbenchStore.getState().progress?.nodes["node-99"]).toEqual(updatedNode);
    });

    it("applyQuestionState cập nhật câu hỏi tương ứng trong run", () => {
      const mockRun: EnrichNodeResponse = {
        node_id: "node-1",
        run_id: "run-1",
        mode: "LEARN",
        questions: [
          {
            question_index: 0,
            skill: "HTTP_ROUTING",
            tier: "NOVICE",
            focus: "FLOW",
            feynman_question: "Q1",
            state: {
              question_index: 0,
              feynman_question: "Q1",
              skill: "HTTP_ROUTING",
              tier: "NOVICE",
              focus: "FLOW",
              attempts_used: 1,
              finished: false,
              outcome: null,
              ended_by: null,
              disputed: false,
              reveal: null,
            },
          },
        ],
        node_state: {
          node_id: "node-1",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        tokens_used: 10,
      };

      useWorkbenchStore.setState({
        runs: { "node-1": mockRun },
      });

      const updatedQState: QuestionState = {
        ...mockRun.questions[0].state,
        attempts_used: 2,
        finished: true,
        outcome: "PASS_FIRST",
      };

      useWorkbenchStore.getState().applyQuestionState("node-1", updatedQState);
      expect(
        useWorkbenchStore.getState().runs["node-1"].questions[0].state.finished
      ).toBe(true);
      expect(
        useWorkbenchStore.getState().runs["node-1"].questions[0].state.outcome
      ).toBe("PASS_FIRST");
    });

    it("refreshProgress gọi getSessionProgressSafe và cập nhật progress", async () => {
      useWorkbenchStore.setState({ session_id: "sess-refresh" });

      const newProgress = {
        session_id: "sess-refresh",
        tokens_used: 999,
        nodes: {},
      };

      vi.mocked(getSessionProgressSafe).mockResolvedValueOnce({
        ok: true,
        data: { progress: newProgress },
        error: null,
      });

      await useWorkbenchStore.getState().refreshProgress();
      expect(getSessionProgressSafe).toHaveBeenCalledWith("sess-refresh");
      expect(useWorkbenchStore.getState().progress).toEqual(newProgress);
    });

    it("setSkillChange cập nhật ui.skill_changes theo khóa run_id:question_index", () => {
      const mockChange: SkillChange = {
        skill: "HTTP_ROUTING",
        p_before: 0.25,
        p_after: 0.4202,
        outcome: "PASS_FIRST",
      };

      const key = "run-123:1";
      useWorkbenchStore.getState().setSkillChange(key, mockChange);

      expect(useWorkbenchStore.getState().ui.skill_changes[key]).toEqual(mockChange);
    });
  });

  describe("T-UI-11: Giải thích đoạn chọn (D-82, UI-34, D19)", () => {
    const mockRange = {
      line_start: 12,
      col_start: 1,
      line_end: 12,
      col_end: 6,
    };
    const key = "node-1:2:12:1-12:6";

    beforeEach(() => {
      vi.clearAllMocks();
      useWorkbenchStore.setState({
        session_id: "sess-explain-1",
        progress: {
          session_id: "sess-explain-1",
          tokens_used: 100,
          nodes: {},
        },
        ui: {
          ...useWorkbenchStore.getState().ui,
          explanations: {},
          errors: {},
        },
      });
    });

    it("gọi explainSelection lần 1: gọi mock 1 lần, lưu ui.explanations và cập nhật tokens_used; gọi lại đúng vùng trả kết quả đã nhớ (0 request mới)", async () => {
      const mockResponseData: ExplainSelectionResponse = {
        explanation: {
          kind: "KEYWORD",
          what: "Từ khóa await dùng để đợi một Promise giải quyết.",
          here: "Đợi kết quả trả về từ hàm gọi mạng.",
          analogy: "Như việc đứng chờ lấy đồ ăn nhanh.",
          skill: null,
        },
        references: [
          {
            node_id: "node-2",
            step_number: 1,
            name: "fetchUserData",
          },
        ],
        tokens_used: 250,
      };

      vi.mocked(explainSelectionSafe).mockResolvedValueOnce({
        ok: true,
        data: mockResponseData,
        error: null,
      });

      const result = await useWorkbenchStore
        .getState()
        .explainSelection("node-1", 2, mockRange, "await");

      expect(explainSelectionSafe).toHaveBeenCalledTimes(1);
      expect(explainSelectionSafe).toHaveBeenCalledWith({
        session_id: "sess-explain-1",
        node_id: "node-1",
        step_number: 2,
        range: mockRange,
        selected_text: "await",
      });

      expect(result).toEqual({ ok: true, data: mockResponseData });
      expect(useWorkbenchStore.getState().ui.explanations[key]).toEqual(
        mockResponseData
      );
      expect(useWorkbenchStore.getState().progress?.tokens_used).toBe(250);

      // Gọi lại đúng vùng đó => mock vẫn 1 lần (0 request mới), trả kết quả đã nhớ
      const resultCached = await useWorkbenchStore
        .getState()
        .explainSelection("node-1", 2, mockRange, "await");

      expect(explainSelectionSafe).toHaveBeenCalledTimes(1);
      expect(resultCached).toEqual({ ok: true, data: mockResponseData });
    });

    it("response explanation: null ⇒ trả về kết quả đó nhưng KHÔNG ghi vào ui.explanations", async () => {
      const mockNullExplanation: ExplainSelectionResponse = {
        explanation: null,
        references: [],
        tokens_used: 120,
      };

      vi.mocked(explainSelectionSafe).mockResolvedValueOnce({
        ok: true,
        data: mockNullExplanation,
        error: null,
      });

      const result = await useWorkbenchStore
        .getState()
        .explainSelection("node-1", 2, mockRange, "await");

      expect(explainSelectionSafe).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true, data: mockNullExplanation });
      expect(useWorkbenchStore.getState().ui.explanations[key]).toBeUndefined();
      expect(useWorkbenchStore.getState().progress?.tokens_used).toBe(120);
    });

    it("lỗi ERR_EXPLAIN_LIMIT ⇒ không ghi ui.explanations; ui.errors['explain_limit'] có thông điệp Mục 10", async () => {
      vi.mocked(explainSelectionSafe).mockResolvedValueOnce({
        ok: false,
        data: null,
        error: {
          error: {
            code: "ERR_EXPLAIN_LIMIT",
            message: "Hết lượt",
            retryable: false,
          },
        },
      });

      const result = await useWorkbenchStore
        .getState()
        .explainSelection("node-1", 2, mockRange, "await");

      expect(explainSelectionSafe).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      expect(useWorkbenchStore.getState().ui.explanations[key]).toBeUndefined();

      const expectedMsg = ERROR_MESSAGES.ERR_EXPLAIN_LIMIT;
      expect(useWorkbenchStore.getState().ui.errors["explain_limit"]).toBe(
        expectedMsg
      );

      // Khi ui.errors['explain_limit'] đã có giá trị, gọi tiếp phải trả lỗi ngay mà không gọi API (0 request mới)
      const resultBlocked = await useWorkbenchStore
        .getState()
        .explainSelection("node-1", 2, mockRange, "other_code");

      expect(explainSelectionSafe).toHaveBeenCalledTimes(1);
      expect(resultBlocked).toEqual({
        ok: false,
        code: "ERR_EXPLAIN_LIMIT",
        message: expectedMsg,
      });
    });
  });
});
