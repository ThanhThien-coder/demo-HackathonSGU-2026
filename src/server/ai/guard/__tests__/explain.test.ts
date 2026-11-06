/**
 * Test cổng gác explain-selection (21 GUARD-23, D-82).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ExplainSelectionRaw, GuardIssue, StaticEngineResult } from "@/contracts";
import { checkExplain } from "../explain";
import { forbiddenKeywords } from "../forbidden";
import { explainScope } from "../names";
import { stepCodeText } from "../../prompts/explain";

const graph: StaticEngineResult = JSON.parse(
  readFileSync(resolve(__dirname, "../../../engine/__fixtures__/shop-api.json"), "utf-8"),
);
const n3 = graph.nodes.find((n) => n.id === "slice-product-list")!;
const scope = explainScope(n3, 2, [], graph);
const forbidden = forbiddenKeywords(graph.fingerprint, stepCodeText(n3, 2));
const ok: ExplainSelectionRaw = {
  kind: "KEYWORD",
  what: "`await` bắt hàm chờ việc bất đồng bộ xong rồi mới chạy tiếp.",
  here: "Ở đây vòng lặp chờ `categoryRepo.findById` trả loại hàng cho từng sản phẩm.",
  analogy: "Giống xếp hàng chờ lấy từng món một.",
  skill: "ASYNC_CONCURRENCY",
};

describe("GUARD-23 — checkExplain", () => {
  it("bản đúng ⇒ giữ nguyên", () => {
    const issues: GuardIssue[] = [];
    expect(checkExplain(ok, scope, forbidden, issues)).toEqual(ok);
    expect(issues).toEqual([]);
  });

  it("here có `verifyToken` (không có trong bước, references, dto) ⇒ E2, null", () => {
    const issues: GuardIssue[] = [];
    expect(checkExplain({ ...ok, here: "Gọi `verifyToken` trước." }, scope, forbidden, issues)).toBeNull();
    expect(issues).toContainEqual({ code: "E2", name: "verifyToken" });
  });

  it('skill = "FOO" ⇒ skill = null, giữ phần còn lại', () => {
    const r = checkExplain({ ...ok, skill: "FOO" as ExplainSelectionRaw["skill"] }, scope, forbidden);
    expect(r).toEqual({ ...ok, skill: null });
  });

  it("what 5 câu ⇒ còn 3 câu; what rỗng ⇒ E1, null", () => {
    expect(checkExplain({ ...ok, what: "Một. Hai. Ba. Bốn. Năm." }, scope, forbidden)?.what).toBe("Một. Hai. Ba.");
    const issues: GuardIssue[] = [];
    expect(checkExplain({ ...ok, what: "  " }, scope, forbidden, issues)).toBeNull();
    expect(issues).toContainEqual({ code: "E1" });
  });

  it("từ cấm ⇒ E3; số dòng ⇒ E4; analogy rỗng vẫn qua; tên ở references qua", () => {
    const i3: GuardIssue[] = [];
    expect(checkExplain({ ...ok, what: "Nó giống Redis." }, scope, forbidden, i3)).toBeNull();
    expect(i3.some((i) => i.code === "E3")).toBe(true);
    const i4: GuardIssue[] = [];
    expect(checkExplain({ ...ok, here: "Xem dòng 17." }, scope, forbidden, i4)).toBeNull();
    expect(i4.some((i) => i.code === "E4")).toBe(true);
    expect(checkExplain({ ...ok, analogy: "" }, scope, forbidden)?.analogy).toBe("");
    const withRef = explainScope(n3, 2, ["checkout"], graph);
    expect(checkExplain({ ...ok, here: "Bài khác dùng `checkout`." }, withRef, forbidden)).not.toBeNull();
  });
});
