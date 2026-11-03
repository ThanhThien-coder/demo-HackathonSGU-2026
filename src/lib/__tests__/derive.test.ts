import { describe, it, expect } from "vitest";
import type { GraphSkeletonNode } from "@/contracts";
import { deriveNodeStates, type ProgressRowLike } from "../derive";

// Bản đồ shop-api theo 50 Mục 1.1:
// N1 -> N2 -> N4 -> N5, N3 -> N5, N5 -> N6, N5 -> N7
const shopApiSkeleton: GraphSkeletonNode[] = [
  { node_id: "N1", title: "Đăng ký", prerequisites: [], is_capstone: false },
  { node_id: "N2", title: "Xem hồ sơ", prerequisites: ["N1"], is_capstone: false },
  { node_id: "N3", title: "Danh sách SP", prerequisites: [], is_capstone: false },
  { node_id: "N4", title: "Giỏ hàng", prerequisites: ["N2"], is_capstone: false },
  { node_id: "N5", title: "Thanh toán", prerequisites: ["N3", "N4"], is_capstone: true },
  { node_id: "N6", title: "Gửi email xác nhận", prerequisites: ["N5"], is_capstone: false },
  { node_id: "N7", title: "Báo cáo doanh thu", prerequisites: ["N5"], is_capstone: false },
];

describe("derive.ts — deriveNodeStates", () => {
  it("(a) chưa có dòng nào ⇒ N1, N3 AVAILABLE, còn lại LOCKED, không cảnh báo", () => {
    const states = deriveNodeStates(shopApiSkeleton, []);

    expect(states["N1"]).toEqual({
      node_id: "N1",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N3"]).toEqual({
      node_id: "N3",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
    });

    expect(states["N2"]).toEqual({
      node_id: "N2",
      status: "LOCKED",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N4"]).toEqual({
      node_id: "N4",
      status: "LOCKED",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N5"]).toEqual({
      node_id: "N5",
      status: "LOCKED",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N6"]).toEqual({
      node_id: "N6",
      status: "LOCKED",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N7"]).toEqual({
      node_id: "N7",
      status: "LOCKED",
      has_warning: false,
      analysis_failed: false,
    });
  });

  it("(b) N1 COMPLETED ⇒ N2 AVAILABLE, không cảnh báo", () => {
    const rows: ProgressRowLike[] = [
      { node_id: "N1", status: "COMPLETED", analysis_failed: false },
    ];
    const states = deriveNodeStates(shopApiSkeleton, rows);

    expect(states["N1"].status).toBe("COMPLETED");
    expect(states["N2"]).toEqual({
      node_id: "N2",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
    });
    expect(states["N4"].status).toBe("LOCKED");
  });

  it("(c) N1 FAILED ⇒ N2 AVAILABLE + has_warning", () => {
    const rows: ProgressRowLike[] = [
      { node_id: "N1", status: "FAILED", analysis_failed: false },
    ];
    const states = deriveNodeStates(shopApiSkeleton, rows);

    expect(states["N1"].status).toBe("FAILED");
    expect(states["N2"]).toEqual({
      node_id: "N2",
      status: "AVAILABLE",
      has_warning: true,
      analysis_failed: false,
    });
    expect(states["N4"].status).toBe("LOCKED");
  });

  it("(d) N1 AVAILABLE + analysis_failed ⇒ N2 AVAILABLE + has_warning", () => {
    const rows: ProgressRowLike[] = [
      { node_id: "N1", status: "AVAILABLE", analysis_failed: true },
    ];
    const states = deriveNodeStates(shopApiSkeleton, rows);

    expect(states["N1"]).toEqual({
      node_id: "N1",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: true,
    });
    expect(states["N2"]).toEqual({
      node_id: "N2",
      status: "AVAILABLE",
      has_warning: true,
      analysis_failed: false,
    });
  });

  it("(e) N5 chỉ mở khi cả N3 và N4 đã thông", () => {
    // e1: Chỉ N3 COMPLETED, N4 vẫn LOCKED ⇒ N5 LOCKED
    const rowsOnlyN3: ProgressRowLike[] = [
      { node_id: "N3", status: "COMPLETED", analysis_failed: false },
    ];
    const statesE1 = deriveNodeStates(shopApiSkeleton, rowsOnlyN3);
    expect(statesE1["N4"].status).toBe("LOCKED");
    expect(statesE1["N5"].status).toBe("LOCKED");

    // e2: Chỉ N4 COMPLETED (nhờ N1, N2 COMPLETED), N3 vẫn AVAILABLE chưa xong ⇒ N5 LOCKED
    const rowsOnlyN4: ProgressRowLike[] = [
      { node_id: "N1", status: "COMPLETED", analysis_failed: false },
      { node_id: "N2", status: "COMPLETED", analysis_failed: false },
      { node_id: "N4", status: "COMPLETED", analysis_failed: false },
    ];
    const statesE2 = deriveNodeStates(shopApiSkeleton, rowsOnlyN4);
    expect(statesE2["N3"].status).toBe("AVAILABLE");
    expect(statesE2["N4"].status).toBe("COMPLETED");
    expect(statesE2["N5"].status).toBe("LOCKED");

    // e3: Cả N3 và N4 đã thông (COMPLETED) ⇒ N5 AVAILABLE, không cảnh báo
    const rowsBothCleared: ProgressRowLike[] = [
      ...rowsOnlyN4,
      { node_id: "N3", status: "COMPLETED", analysis_failed: false },
    ];
    const statesE3 = deriveNodeStates(shopApiSkeleton, rowsBothCleared);
    expect(statesE3["N5"]).toEqual({
      node_id: "N5",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
    });

    // e4: Cả N3 và N4 đã thông nhưng N3 FAILED ⇒ N5 AVAILABLE kèm has_warning = true
    const rowsN3Failed: ProgressRowLike[] = [
      ...rowsOnlyN4,
      { node_id: "N3", status: "FAILED", analysis_failed: false },
    ];
    const statesE4 = deriveNodeStates(shopApiSkeleton, rowsN3Failed);
    expect(statesE4["N5"]).toEqual({
      node_id: "N5",
      status: "AVAILABLE",
      has_warning: true,
      analysis_failed: false,
    });
  });

  it("(f) dòng có status thì dùng status đó", () => {
    const rows: ProgressRowLike[] = [
      // Dù N2 chưa xong, N4 có dòng FAILED sẵn thì dùng FAILED
      { node_id: "N4", status: "FAILED", analysis_failed: false },
      // N1 COMPLETED thì dùng COMPLETED
      { node_id: "N1", status: "COMPLETED", analysis_failed: false },
    ];
    const states = deriveNodeStates(shopApiSkeleton, rows);

    expect(states["N4"].status).toBe("FAILED");
    expect(states["N1"].status).toBe("COMPLETED");
  });
});
