import { describe, expect, it } from "vitest";
import { buildGraph } from "./index";
import { processArchive } from "./ingest";
import { flaskZip } from "./__fixtures__/shop-flask";

const ctx = { repo_name: "shop-flask", repo_key: "me/shop-flask", source: "ZIP" as const, ref: null, ref_label: null, explicit_subdir: null };

describe("Engine — đường Python (Flask)", () => {
  it("vân tay: WEB_BACKEND, Flask, tên gói chuẩn hóa PEP 503; che secret Python", () => {
    const out = processArchive(flaskZip(), ctx);
    expect(out.fingerprint).toMatchObject({ archetype: "WEB_BACKEND", detected_framework: "Flask", primary_language: "PYTHON", graph_confidence: "HIGH" });
    expect(out.fingerprint.tech_stack).toEqual(["flask", "pyjwt"]);
    expect(out.code.get("auth.py")).toContain('SECRET_KEY = "<REDACTED_SECRET>"');
    expect(out.code.get("auth.py")).not.toContain("super-secret-1234");
    expect(out.report.redacted_secret_count).toBeGreaterThanOrEqual(1);
  });

  it("lát cắt: route từ decorator ⇒ middleware decorator ⇒ service (self.repo) ⇒ repo (DATA_ACCESS)", async () => {
    const g = await buildGraph(processArchive(flaskZip(), ctx));
    expect(g.nodes.map((n) => n.title).sort()).toEqual(["Create Order", "Get Order"]); // không thêm node từ khối __main__ (đã có entry đăng ký)
    const create = g.nodes.find((n) => n.title === "Create Order")!;
    expect(create).toMatchObject({ title_source: "ROUTE", title_evidence: "POST /orders", node_type: "ARCHITECTURAL_DATA_FLOW" });
    expect(create.trace_steps.map((s) => [s.layer, s.function_name, s.file_path])).toEqual([
      ["ENTRY_POINT", "create_order", "app.py"],
      ["MIDDLEWARE", "login_required", "auth.py"],
      ["BUSINESS_LOGIC", "OrderService.checkout", "services/order_service.py"],
      ["DATA_ACCESS", "OrderRepo.save", "repos/order_repo.py"],
    ]);
    const step1 = create.trace_steps[0];
    expect(step1.snippet).toContain('@app.route("/orders", methods=["POST"])'); // decorator thuộc hàm
    expect(step1.snippet).toContain("service = OrderService()");                // biến module được dùng
    const checkout = create.trace_steps[2];
    expect(checkout.snippet).toContain("for item in items");                    // def-use lùi: total phục vụ lời gọi repo
    expect(checkout.snippet).toContain("self.repo.save");
    expect(create.trace_steps.flatMap((s) => s.snippet_line_map).every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    const get = g.nodes.find((n) => n.title === "Get Order")!;
    expect(get.trace_steps.map((s) => s.function_name)).toEqual(["get_order", "OrderService.find", "OrderRepo.find_by_id"]);
    expect(g.edges).toHaveLength(1); // 2 node không dùng chung hàm ⇒ nối theo cây bài học (D-73), cạnh INFERRED
    expect(g.edges[0].confidence).toBe("INFERRED");
    expect(g.nodes.filter((n) => n.is_capstone)).toHaveLength(1);
  });

  it("tất định: 2 lần chạy cho cùng nodes/edges/whitelist", async () => {
    const a = await buildGraph(processArchive(flaskZip(), ctx));
    const b = await buildGraph(processArchive(flaskZip(), ctx));
    expect(JSON.stringify([a.nodes, a.edges, a.symbol_whitelist])).toBe(JSON.stringify([b.nodes, b.edges, b.symbol_whitelist]));
    expect(a.symbol_whitelist).toEqual(expect.arrayContaining(["OrderService", "checkout", "OrderService.checkout", "items", "login_required"]));
  });
});
