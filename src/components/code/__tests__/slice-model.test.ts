import { describe, it, expect } from "vitest";
import { buildSliceModel } from "../slice-model";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import type { HybridArchitecturalNode } from "@/contracts";

describe("Mô hình Lát cắt Code (Slice Model) - D04 & spec/30_UI.md Mục 5", () => {
  const nodes = shopApiFixture.nodes as unknown as HybridArchitecturalNode[];
  // Node N3 trong shop-api là slice-product-list
  const nodeN3 = nodes.find((n) => n.id === "slice-product-list");

  it("UI-31 số dòng gốc: tiêu đề không có số dòng, đầu snippet bước 2 có số 14, marker dòng 0", () => {
    expect(nodeN3).toBeDefined();
    if (!nodeN3) return;

    const model = buildSliceModel(nodeN3);
    expect(model.text).toContain("Bước 1");
    expect(model.text).toContain("Bước 2");
    expect(model.lineMap.length).toBeGreaterThan(0);

    // Tìm vị trí dòng tiêu đề Bước 2
    const lines = model.text.split("\n");
    const step2HeaderIdx = lines.findIndex((l) => l.includes("Bước 2"));
    expect(step2HeaderIdx).toBeGreaterThanOrEqual(0);

    // Tiêu đề bước không hiển thị số dòng (lineMap = 0)
    expect(model.lineMap[step2HeaderIdx]).toBe(0);

    // Dòng ngay sau tiêu đề bước 2 là dòng đầu tiên của snippet bước 2
    const firstSnippetLineIdx = step2HeaderIdx + 1;
    // Theo T22: đầu snippet bước 2 có số 14
    expect(model.lineMap[firstSnippetLineIdx]).toBe(14);

    // Các dòng trống có lineMap = 0
    lines.forEach((l, idx) => {
      if (l.trim() === "") {
        expect(model.lineMap[idx]).toBe(0);
      }
    });

    // stepRanges ghi nhận đúng bước 1 và bước 2
    expect(model.stepRanges[1]).toBeDefined();
    expect(model.stepRanges[2]).toBeDefined();
    expect(model.stepRanges[2].startLine).toBe(step2HeaderIdx + 1);
  });

  it("Xử lý an toàn khi node rỗng hoặc không có trace_steps", () => {
    const emptyModel = buildSliceModel(null);
    expect(emptyModel.text).toBe("");
    expect(emptyModel.lineMap).toEqual([]);
    expect(emptyModel.stepRanges).toEqual({});
  });
});
