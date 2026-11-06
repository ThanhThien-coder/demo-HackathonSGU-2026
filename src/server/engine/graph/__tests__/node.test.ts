import { beforeAll, describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { CONFIG, type HybridArchitecturalNode, type IngestionReport } from "@/contracts";
import { initParsers, parseAll } from "../parser";
import { buildCallGraph, findEntries } from "../callgraph";
import { collectSymbols, resolveImports } from "../symbols";
import { hash6, slug, nameCandidate, dedupeTitles } from "../naming";
import { diagnoseUncleBob } from "../unclebob";
import { layoutGraph } from "../layout";
import { buildSymbolWhitelist, mainPath } from "../whitelist";
import { assembleGraph, buildAlgoCandidates, computeEdgesOnKept } from "../nodes";
import { runEngine, toClientResult } from "../../index";
import { IngestionError } from "../../ingest/types";
import type { Candidate, EngineContext, FunctionInfo } from "../types";

function createEmptyReport(): IngestionReport {
  return {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: {
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };
}

function createDummyContext(extra?: Partial<EngineContext>): EngineContext {
  return {
    files: new Map(),
    idx: {
      symbols: new Map(),
      functions: new Map(),
      imports: new Map(),
      field_types: new Map(),
      interface_impls: new Map(),
      locals: new Map(),
    },
    edges: [],
    external: [],
    tech_stack: [],
    rank: new Map(),
    source_map: new Map(),
    ...extra,
  };
}

function createDummyCandidate(data: {
  id: string;
  kind?: "SLICE" | "ALGO" | "VNODE";
  functions?: string[];
  cognitive_complexity?: number;
  rank_score?: number;
  entry_symbol?: string | null;
  base_title?: string;
}): Candidate {
  return {
    id: data.id,
    node_type: data.kind === "ALGO" ? "ALGORITHMIC_CORE" : "ARCHITECTURAL_DATA_FLOW",
    entry_symbol: data.entry_symbol !== undefined ? data.entry_symbol : data.id,
    trace_steps: [
      {
        step_number: 1,
        layer: "ENTRY_POINT",
        file_path: "src/sample.ts",
        function_name: "testFn",
        line_start: 1,
        line_end: 10,
        snippet: "function testFn() {}",
        snippet_line_map: [1],
      },
    ],
    dto_snippet: "",
    cognitive_complexity: data.cognitive_complexity ?? 1,
    rank_score: data.rank_score ?? 0.5,
    title_source: "ENTRY_SYMBOL",
    title_evidence: data.base_title ?? data.id,
    kind: data.kind ?? "SLICE",
    order_key: data.id,
    functions: data.functions ?? [data.id],
    binding: null,
    base_title: data.base_title ?? data.id,
  };
}

function createDummyNode(data: Partial<HybridArchitecturalNode> & { id: string }): HybridArchitecturalNode {
  return {
    id: data.id,
    title: data.title ?? data.id,
    title_source: data.title_source ?? "ENTRY_SYMBOL",
    title_evidence: data.title_evidence ?? data.id,
    node_type: data.node_type ?? "ARCHITECTURAL_DATA_FLOW",
    entry_symbol: data.entry_symbol !== undefined ? data.entry_symbol : data.id,
    prerequisites: data.prerequisites ?? [],
    position: data.position ?? { x: 0, y: 0 },
    files: data.files ?? ["src/sample.ts"],
    languages: data.languages ?? ["TYPESCRIPT"],
    support_tier: data.support_tier ?? "RESOLVED",
    cognitive_complexity: data.cognitive_complexity ?? 1,
    rank_score: data.rank_score ?? 0.5,
    is_vip_algorithm: data.is_vip_algorithm ?? false,
    is_capstone: data.is_capstone ?? false,
    uncle_bob: data.uncle_bob ?? {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    },
    trace_steps: data.trace_steps ?? [],
    dto_snippet: data.dto_snippet ?? "",
    group_id: "",
    entities: [],
  };
}

describe("ENG-90..ENG-155: Ghép node, tên, bố cục, xuất runEngine", () => {
  beforeAll(async () => {
    await initParsers();
  });

  // ---------------------------------------------------------------------------
  // T-ENG-14: Transitive Reduction trên G0
  // ---------------------------------------------------------------------------
  it("T-ENG-14: A {a,s} cc 3, B {b,s,t} cc 8, C {c,t} cc 12, D {d,s,t} cc 20 => A->B->C->D", () => {
    const report = createEmptyReport();
    const ctx = createDummyContext();

    const candA = createDummyCandidate({ id: "cand-a", functions: ["a", "s"], cognitive_complexity: 3 });
    const candB = createDummyCandidate({ id: "cand-b", functions: ["b", "s", "t"], cognitive_complexity: 8 });
    const candC = createDummyCandidate({ id: "cand-c", functions: ["c", "t"], cognitive_complexity: 12 });
    const candD = createDummyCandidate({ id: "cand-d", functions: ["d", "s", "t"], cognitive_complexity: 20 });

    const { nodes, edges } = assembleGraph([candA, candB, candC, candD], ctx, report);

    expect(nodes.length).toBe(4);
    // G0 ban đầu có A->B, B->C, A->D, B->D, C->D
    // Rút gọn bắc cầu loại A->D và B->D, chỉ còn A->B, B->C, C->D
    expect(edges.length).toBe(3);
    const expectedEdges = [
      `${candA.id}->${candB.id}`,
      `${candB.id}->${candC.id}`,
      `${candC.id}->${candD.id}`,
    ].sort();
    expect(edges.map((e) => e.id).sort()).toEqual(expectedEdges);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-15: Rút gọn bắc cầu trên tập giữ K
  // ---------------------------------------------------------------------------
  it("T-ENG-15: G0r A->X->C, A->B, B->C giữ {A,B,C} => A->B, B->C; chuỗi A->B->C giữ {A,C} => A->C", () => {
    // Ca 1: A->X->C, A->B, B->C, giữ {A,B,C} (X bị loại khỏi tập giữ K)
    const g0Adj1 = new Map<string, Set<string>>([
      ["A", new Set(["X", "B"])],
      ["X", new Set(["C"])],
      ["B", new Set(["C"])],
      ["C", new Set()],
    ]);
    const edges1 = computeEdgesOnKept(["A", "B", "C"], g0Adj1);
    expect(edges1.map((e) => e.id)).toEqual(["A->B", "B->C"]);

    // Ca 2: chuỗi A->B->C nhưng chỉ giữ {A, C} (B bị loại) => sinh cạnh trực tiếp A->C
    const g0Adj2 = new Map<string, Set<string>>([
      ["A", new Set(["B"])],
      ["B", new Set(["C"])],
      ["C", new Set()],
    ]);
    const edges2 = computeEdgesOnKept(["A", "C"], g0Adj2);
    expect(edges2.length).toBe(1);
    expect(edges2[0]?.id).toBe("A->C");
    expect(edges2[0]?.source).toBe("A");
    expect(edges2[0]?.target).toBe("C");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-18: Định dạng id tất định slice-* và algo-*
  // ---------------------------------------------------------------------------
  it("T-ENG-18: 'Order Checkout' + src/routes/order.routes.ts#<POST /checkout> => slice-order-checkout-a6ff3b", () => {
    const titleSlug = slug("Order Checkout");
    expect(titleSlug).toBe("order-checkout");

    const hashEntry = hash6("src/routes/order.routes.ts#<POST /checkout>");
    expect(hashEntry).toBe("a6ff3b");
    expect(`slice-${titleSlug}-${hashEntry}`).toBe("slice-order-checkout-a6ff3b");

    const algoSlug = slug("findShortestRoute");
    expect(algoSlug).toBe("findshortestroute");
    const hashAlgo = hash6("src/algo/dijkstra.ts#findShortestRoute");
    expect(hashAlgo).toBe("acfab3");
    expect(`algo-${slug("Find Shortest Route")}-${hashAlgo}`).toBe("algo-find-shortest-route-acfab3");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-19: Display Budget 12 candidate giữ hết, Capstone = rank cao hơn
  // ---------------------------------------------------------------------------
  it("T-ENG-19: 12 candidate (<= DISPLAY_MAX_NODES) giữ hết 12; 2 node cc 20, rank 0.6 và 0.7 => Capstone là node rank 0.7", () => {
    const report = createEmptyReport();
    const ctx = createDummyContext();

    const candidates: Candidate[] = [];
    for (let i = 1; i <= 10; i++) {
      candidates.push(createDummyCandidate({ id: `cand-${i}`, cognitive_complexity: i, rank_score: 0.1 * i }));
    }
    // 2 node hòa cc 20 nhưng khác rank
    const c11 = createDummyCandidate({ id: "cand-11", cognitive_complexity: 20, rank_score: 0.6 });
    const c12 = createDummyCandidate({ id: "cand-12", cognitive_complexity: 20, rank_score: 0.7 });
    candidates.push(c11, c12);

    const { nodes } = assembleGraph(candidates, ctx, report);

    expect(nodes.length).toBe(12);
    expect(report.omitted_node_count).toBe(0);

    const capstone = nodes.find((n) => n.is_capstone);
    expect(capstone).toBeDefined();
    expect(capstone?.id).toBe(c12.id);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-21: Uncle Bob Metrics
  // ---------------------------------------------------------------------------
  it("T-ENG-21: TS Na 2, Nc 3, Ce 1, Ca 1 => A 0.4, I 0.5, D 0.1 BALANCED; Na 0, Nc 2, Ce 0, Ca 3 => D 1 ZONE_OF_PAIN; toàn .js => miễn trừ", async () => {
    const ctx = createDummyContext();

    // 1. Ca TS Na 2, Nc 3, Ce 1, Ca 1
    const node1 = createDummyNode({
      id: "slice-order-1",
      title: "Order Flow",
      title_source: "ROUTE",
      title_evidence: "POST /order",
      files: ["src/order.ts"],
      languages: ["TYPESCRIPT"],
    });

    const tsCode = "export interface I1 {} export interface I2 {} export class C1 {} export class C2 {} export class C3 {}";
    const parsedTs = await parseAll(
      new Map([["src/order.ts", tsCode]]),
      new Map([["src/order.ts", "TYPESCRIPT"]]),
      createEmptyReport()
    );
    ctx.files.set("src/order.ts", parsedTs[0]!);
    ctx.idx.symbols.set("src/order.ts#I1", { key: "src/order.ts#I1", kind: "INTERFACE", name: "I1", file_path: "src/order.ts", line_start: 1, line_end: 1, is_exported: true });
    ctx.idx.symbols.set("src/order.ts#I2", { key: "src/order.ts#I2", kind: "INTERFACE", name: "I2", file_path: "src/order.ts", line_start: 1, line_end: 1, is_exported: true });
    ctx.idx.symbols.set("src/order.ts#C1", { key: "src/order.ts#C1", kind: "CLASS", name: "C1", file_path: "src/order.ts", line_start: 1, line_end: 1, is_exported: true });
    ctx.idx.symbols.set("src/order.ts#C2", { key: "src/order.ts#C2", kind: "CLASS", name: "C2", file_path: "src/order.ts", line_start: 1, line_end: 1, is_exported: true });
    ctx.idx.symbols.set("src/order.ts#C3", { key: "src/order.ts#C3", kind: "CLASS", name: "C3", file_path: "src/order.ts", line_start: 1, line_end: 1, is_exported: true });

    const fg1 = new Map<string, Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>>();
    // order -> other1 (Ce = 1)
    fg1.set("src/order.ts", new Map([["src/other1.ts", { weight: 1, confidence: "RESOLVED", via_entities: [] }]]));
    // in1 -> order (Ca = 1)
    fg1.set("src/in1.ts", new Map([["src/order.ts", { weight: 1, confidence: "RESOLVED", via_entities: [] }]]));

    const ub1 = diagnoseUncleBob(node1, fg1, ctx);
    expect(ub1.is_exempt).toBe(false);
    expect(ub1.abstractness).toBe(0.4);
    expect(ub1.instability).toBe(0.5);
    expect(ub1.distance).toBe(0.1);
    expect(ub1.diagnosis).toBe("BALANCED");

    // 2. Ca Na 0, Nc 2, Ce 0, Ca 3
    const node2 = createDummyNode({ id: "slice-order-2", files: ["src/pain.ts"] });
    const painCode = "export class P1 {} export class P2 {}";
    const parsedPain = await parseAll(
      new Map([["src/pain.ts", painCode]]),
      new Map([["src/pain.ts", "TYPESCRIPT"]]),
      createEmptyReport()
    );
    ctx.files.set("src/pain.ts", parsedPain[0]!);
    ctx.idx.symbols.set("src/pain.ts#P1", { key: "src/pain.ts#P1", kind: "CLASS", name: "P1", file_path: "src/pain.ts", line_start: 1, line_end: 1, is_exported: true });
    ctx.idx.symbols.set("src/pain.ts#P2", { key: "src/pain.ts#P2", kind: "CLASS", name: "P2", file_path: "src/pain.ts", line_start: 1, line_end: 1, is_exported: true });

    const fg2 = new Map<string, Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>>();
    fg2.set("src/in1.ts", new Map([["src/pain.ts", { weight: 1, confidence: "RESOLVED", via_entities: [] }]]));
    fg2.set("src/in2.ts", new Map([["src/pain.ts", { weight: 1, confidence: "RESOLVED", via_entities: [] }]]));
    fg2.set("src/in3.ts", new Map([["src/pain.ts", { weight: 1, confidence: "RESOLVED", via_entities: [] }]]));

    const ub2 = diagnoseUncleBob(node2, fg2, ctx);
    expect(ub2.is_exempt).toBe(false);
    expect(ub2.abstractness).toBe(0);
    expect(ub2.instability).toBe(0);
    expect(ub2.distance).toBe(1);
    expect(ub2.diagnosis).toBe("ZONE_OF_PAIN");

    // 3. Toàn .js => miễn trừ
    const node3 = createDummyNode({ id: "slice-js", files: ["src/app.js"] });
    const jsCode = "class App {}";
    const parsedJs = await parseAll(
      new Map([["src/app.js", jsCode]]),
      new Map([["src/app.js", "JAVASCRIPT"]]),
      createEmptyReport()
    );
    ctx.files.set("src/app.js", parsedJs[0]!);
    const ub3 = diagnoseUncleBob(node3, fg1, ctx);
    expect(ub3.is_exempt).toBe(true);
    expect(ub3.diagnosis).toBe("BALANCED");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-22: Đặt tên Bậc 1 ROUTE
  // ---------------------------------------------------------------------------
  it("T-ENG-22: ROUTE: POST /orders/checkout => Order Checkout; GET /users/:id/orders => List User Orders; POST /orders => Create Order; GET /orders/:id => Get Order; GET /orders => List Orders; DELETE /orders/:id => Delete Order", () => {
    const ctx = createDummyContext();

    const makeCand = (method: string, path: string) =>
      createDummyCandidate({
        id: `cand-${method}-${path}`,
        base_title: "",
      });

    const c1 = makeCand("POST", "/orders/checkout");
    c1.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "POST", path: "/orders/checkout", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c1, ctx).base_title).toBe("Order Checkout");

    const c2 = makeCand("GET", "/users/:id/orders");
    c2.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "GET", path: "/users/:id/orders", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c2, ctx).base_title).toBe("List User Orders");

    const c3 = makeCand("POST", "/orders");
    c3.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "POST", path: "/orders", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c3, ctx).base_title).toBe("Create Order");

    const c4 = makeCand("GET", "/orders/:id");
    c4.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "GET", path: "/orders/:id", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c4, ctx).base_title).toBe("Get Order");

    const c5 = makeCand("GET", "/orders");
    c5.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "GET", path: "/orders", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c5, ctx).base_title).toBe("List Orders");

    const c6 = makeCand("DELETE", "/orders/:id");
    c6.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method: "DELETE", path: "/orders/:id", handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c6, ctx).base_title).toBe("Delete Order");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-22b: Đoạn cuối là hành động, tách - và _ (lỗi B-30)
  // ---------------------------------------------------------------------------
  it.each([
    ["POST", "/orders/:id/cancel", "Cancel Order"],
    ["POST", "/auth/login", "Login"],
    ["GET", "/health", "Health"],
    ["DELETE", "/articles/:slug/comments/:id", "Delete Article Comment"],
    ["POST", "/auth/register", "Register"],
    ["POST", "/users/register", "Register User"],
    ["GET", "/search", "Search"],
    ["GET", "/login", "Login"],
    ["GET", "/reset_password_requests", "List Reset Password Requests"],
    ["POST", "/reset-password", "Create Reset Password"],
    ["POST", "/orders/:id/items", "Create Order Item"],
    ["GET", "/users/:id/orders/:orderId", "Get User Order"],
    ["PATCH", "/users/:id/orders", "Update User Order"],
  ])("T-ENG-22b: %s %s => %s", (method, path, expected) => {
    const ctx = createDummyContext();
    const c = createDummyCandidate({ id: `cand-${method}-${path}`, base_title: "" });
    c.binding = { file_path: "r.ts", line_start: 1, line_end: 1, kind: "HTTP", method, path, handler: "h", middlewares: [], display_name: "" };
    expect(nameCandidate(c, ctx).base_title).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-23: DOMAIN_TERMS và Khử trùng tên
  // ---------------------------------------------------------------------------
  it("T-ENG-23: DOMAIN_TERMS crawler/run.py main() => Crawler / Page; dedupe hai Checkout ở cart/ và payment/ => Checkout (cart), Checkout (payment), id không đổi", async () => {
    const ctx = createDummyContext();
    const parsedPy = await parseAll(
      new Map([["crawler/run.py", "# python file"]]),
      new Map([["crawler/run.py", "PYTHON"]]),
      createEmptyReport()
    );
    ctx.files.set("crawler/run.py", parsedPy[0]!);

    // 4 lần crawler, 3 lần page trong file crawler/run.py
    for (let i = 1; i <= 4; i++) {
      ctx.idx.symbols.set(`crawler/run.py#crawler${i}`, {
        key: `crawler/run.py#crawler${i}`,
        kind: "FUNCTION",
        name: `crawlerJob${i}`,
        file_path: "crawler/run.py",
        line_start: i,
        line_end: i,
        is_exported: true,
      });
    }
    for (let i = 1; i <= 3; i++) {
      ctx.idx.symbols.set(`crawler/run.py#page${i}`, {
        key: `crawler/run.py#page${i}`,
        kind: "FUNCTION",
        name: `pageFetcher${i}`,
        file_path: "crawler/run.py",
        line_start: 10 + i,
        line_end: 10 + i,
        is_exported: true,
      });
    }

    const cand = createDummyCandidate({
      id: "crawler-run",
      entry_symbol: "crawler/run.py#main",
      base_title: "",
    });
    cand.trace_steps[0]!.file_path = "crawler/run.py";

    const named = nameCandidate(cand, ctx);
    expect(named.base_title).toBe("Crawler / Page");
    expect(named.title_source).toBe("DOMAIN_TERMS");

    // Khử trùng tên
    const nodeA = createDummyNode({
      id: "slice-checkout-1",
      title: "Checkout",
      title_source: "ROUTE",
      title_evidence: "POST /checkout",
      entry_symbol: "cart/checkout.ts#checkout",
      files: ["cart/checkout.ts"],
    });

    const nodeB = createDummyNode({
      id: "slice-checkout-2",
      title: "Checkout",
      title_source: "ROUTE",
      title_evidence: "POST /checkout",
      entry_symbol: "payment/checkout.ts#checkout",
      files: ["payment/checkout.ts"],
    });

    dedupeTitles([nodeA, nodeB]);
    expect(nodeA.title).toBe("Checkout (cart)");
    expect(nodeB.title).toBe("Checkout (payment)");
    expect(nodeA.id).toBe("slice-checkout-1");
    expect(nodeB.id).toBe("slice-checkout-2");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-25: Chạy đủ đường buildGraph với Express 5 route và main.py PROCEDURAL
  // ---------------------------------------------------------------------------
  it("T-ENG-25: 1 file Express 5 route => NORMAL 5 lát cắt; main.py không route 5 hàm => PROCEDURAL P1", async () => {
    // 1. Express 5 route
    const expressCode = `
import express from "express";
const app = express();
app.get("/users", (req, res) => { res.json([]); });
app.get("/users/:id", (req, res) => { res.json({}); });
app.post("/users", (req, res) => { res.json({}); });
app.put("/users/:id", (req, res) => { res.json({}); });
app.delete("/users/:id", (req, res) => { res.json({}); });
`;
    const zip1 = fflate.zipSync({
      "package.json": fflate.strToU8(JSON.stringify({ name: "express-app", dependencies: { express: "4.18.2" } })),
      "src/app.ts": fflate.strToU8(expressCode),
    });

    const res1 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "express-app.zip",
      bytes: zip1,
      subdir_override: null,
    });

    expect(res1.ingestion_report.degraded_mode).toBeNull();
    expect(res1.nodes.length).toBe(5);

    // 2. main.py không route, 5 hàm gọi nhau => PROCEDURAL P1
    const pythonCode = `
def helper_d(x):
    return x * 2

def helper_c(x):
    return helper_d(x) + 1

def helper_b(x):
    return helper_c(x) * 3

def helper_a(x):
    return helper_b(x) + 4

def main():
    res = helper_a(10)
    print(res)
`;
    const zip2 = fflate.zipSync({
      "main.py": fflate.strToU8(pythonCode),
    });

    const res2 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "procedural.zip",
      bytes: zip2,
      subdir_override: null,
    });

    expect(res2.ingestion_report.degraded_mode).toBe("PROCEDURAL");
    expect(res2.nodes.length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-27: main.py 1 hàm 400 dòng => 4 node ảo Input -> Validation -> Compute & Output -> Data Access
  // ---------------------------------------------------------------------------
  it("T-ENG-27: main.py 1 hàm 400 dòng => 4 node ảo; id node đầu vnode-c5e5ae", async () => {
    expect(hash6("main.py#INPUT")).toBe("c5e5ae");

    const lines: string[] = [];
    lines.push("def process_large():");
    lines.push("    data = input('Nhập dữ liệu: ')");
    for (let i = 0; i < 90; i++) lines.push(`    # input line ${i}`);

    lines.push("    if not data: raise ValueError('Lỗi dữ liệu')");
    for (let i = 0; i < 90; i++) lines.push(`    # validate line ${i}`);

    lines.push("    result = [x.upper() for x in data.split()]");
    for (let i = 0; i < 90; i++) lines.push(`    # compute line ${i}`);

    lines.push("    cursor.execute('INSERT INTO logs VALUES (%s)', [data])");
    for (let i = 0; i < 90; i++) lines.push(`    # data sink line ${i}`);

    const zip = fflate.zipSync({
      "main.py": fflate.strToU8(lines.join("\n")),
    });

    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "huge.zip",
      bytes: zip,
      subdir_override: null,
    });

    expect(res.ingestion_report.degraded_mode).toBe("PROCEDURAL");
    expect(res.nodes.length).toBe(4);
    // "Node đầu" = node đầu chuỗi (không có prerequisites), không phải nodes[0]: nodes sort theo id (Mục 15 ý 4).
    const startNodes = res.nodes.filter((n) => n.prerequisites.length === 0);
    expect(startNodes.map((n) => n.id)).toEqual(["vnode-c5e5ae"]);
    const titles = res.nodes.map((n) => n.title);
    expect(titles.some((t) => t.includes("Input"))).toBe(true);
    expect(titles.some((t) => t.includes("Validation"))).toBe(true);
    expect(titles.some((t) => t.includes("Compute & Output"))).toBe(true);
    expect(titles.some((t) => t.includes("Data Access"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-28: 20 file bài tập 0 entry 6 hàm > 15 => NORMAL 6 algo-*
  // ---------------------------------------------------------------------------
  it("T-ENG-28: 20 file bài tập 0 entry, 6 hàm complexity > 15 => NORMAL 6 algo-* không node gom nhóm, Capstone là 1 node algo-*", async () => {
    const files: fflate.Zippable = {};
    for (let i = 1; i <= 20; i++) {
      if (i <= 6) {
        // Hàm có complexity > 15
        const code = `
export function complexAlgo${i}(items: number[]) {
  let res = 0;
  for (const a of items) {
    if (a > 0) {
      for (const b of items) {
        if (b > a) {
          if (b % 2 === 0) {
            res += a * b;
          }
        }
      }
    }
  }
  return res;
}
`;
        files[`src/algo${i}.ts`] = fflate.strToU8(code);
      } else {
        files[`src/simple${i}.ts`] = fflate.strToU8(`export function simple${i}() { return ${i}; }`);
      }
    }

    const zip = fflate.zipSync(files);
    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "algos.zip",
      bytes: zip,
      subdir_override: null,
    });

    expect(res.ingestion_report.degraded_mode).toBeNull();
    expect(res.nodes.length).toBe(6);
    for (const n of res.nodes) {
      expect(n.id).toMatch(/^algo-/);
      expect(n.prerequisites).toEqual([]);
    }
    const capstone = res.nodes.find((n) => n.is_capstone);
    expect(capstone).toBeDefined();
    expect(capstone?.id).toMatch(/^algo-/);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-29: Chia 3 bước ALGO_SETUP, ALGO_EXECUTION, ALGO_TERMINATION
  // ---------------------------------------------------------------------------
  it("T-ENG-29: 3 câu khởi tạo, while 20 dòng, return => ALGO_SETUP / ALGO_EXECUTION / ALGO_TERMINATION", async () => {
    const code = `
export function dijkstra(start: number) {
  let dist = 0;
  let visited = false;
  let count = 0;
  while (count < 20) {
    count++;
    dist += count;
  }
  return dist;
}
`;
    const report = createEmptyReport();
    const parsedFiles = await parseAll(
      new Map([["src/dijkstra.ts", code]]),
      new Map([["src/dijkstra.ts", "TYPESCRIPT"]]),
      report
    );
    const pf = parsedFiles[0]!;
    const ctx = createDummyContext({
      files: new Map([["src/dijkstra.ts", pf]]),
    });

    const fnInfo: FunctionInfo = {
      key: "src/dijkstra.ts#dijkstra",
      kind: "FUNCTION",
      name: "dijkstra",
      file_path: "src/dijkstra.ts",
      line_start: 2,
      line_end: 11,
      is_exported: true,
      params: ["start"],
      locals: ["dist", "visited", "count"],
      complexity: 18,
    };

    const algos = buildAlgoCandidates([fnInfo], ctx);
    expect(algos.length).toBe(1);
    const steps = algos[0]!.trace_steps;
    expect(steps.length).toBe(3);
    expect(steps[0]?.layer).toBe("ALGO_SETUP");
    expect(steps[1]?.layer).toBe("ALGO_EXECUTION");
    expect(steps[2]?.layer).toBe("ALGO_TERMINATION");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-30: > CONFIG.PROCEDURAL_MAX_FILES file, 0 entry, không hàm nào >= 5 => ERR_NO_ARCHITECTURAL_SLICE
  // ---------------------------------------------------------------------------
  it("T-ENG-30: > 2 file, 0 entry, không hàm nào >= 5 => ném IngestionError ERR_NO_ARCHITECTURAL_SLICE", async () => {
    const files: fflate.Zippable = {
      "src/f1.ts": fflate.strToU8("export const x1 = 1;"),
      "src/f2.ts": fflate.strToU8("export const x2 = 2;"),
      "src/f3.ts": fflate.strToU8("export const x3 = 3;"),
    };
    const zip = fflate.zipSync(files);

    await expect(
      runEngine({
        kind: "ZIP_UPLOAD",
        file_name: "empty_slice.zip",
        bytes: zip,
        subdir_override: null,
      })
    ).rejects.toThrow(IngestionError);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-31: Parse error > 30% byte bị bỏ; mọi file như vậy => ERR_NO_ARCHITECTURAL_SLICE
  // ---------------------------------------------------------------------------
  it("T-ENG-31: 1 file 40% byte ERROR bị bỏ khỏi file_index; mọi file như vậy => ERR_NO_ARCHITECTURAL_SLICE", async () => {
    // 1. File 40% byte trong ERROR cùng file tốt
    const badCode = "const valid = 1;\n" + "??? !!! ### @@@ $$$ %%% &&& *** (((\n".repeat(4);
    const goodExpress = `
import express from "express";
const app = express();
app.get("/ping", (req, res) => res.send("pong"));
`;
    const zip1 = fflate.zipSync({
      "package.json": fflate.strToU8(JSON.stringify({ name: "app", dependencies: { express: "4.18.2" } })),
      "src/bad.ts": fflate.strToU8(badCode),
      "src/good.ts": fflate.strToU8(goodExpress),
    });

    const res1 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "partial_error.zip",
      bytes: zip1,
      subdir_override: null,
    });

    expect(res1.ingestion_report.skipped.parse_error).toBe(1);
    expect(res1.file_index).not.toContain("src/bad.ts");
    expect(res1.file_index).toContain("src/good.ts");

    // 2. Mọi file đều > 30% ERROR
    const zip2 = fflate.zipSync({
      "src/bad1.ts": fflate.strToU8(badCode),
      "src/bad2.ts": fflate.strToU8(badCode),
    });

    await expect(
      runEngine({
        kind: "ZIP_UPLOAD",
        file_name: "all_error.zip",
        bytes: zip2,
        subdir_override: null,
      })
    ).rejects.toThrow(IngestionError);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-32: symbol_whitelist
  // ---------------------------------------------------------------------------
  it("T-ENG-32: OrderService.checkout(userId, items) và DTO qty => whitelist có OrderService, checkout, OrderService.checkout, userId, items, qty; sort; không <module>", () => {
    const ctx = createDummyContext();
    ctx.idx.symbols.set("src/order.ts#OrderService", {
      key: "src/order.ts#OrderService",
      kind: "CLASS",
      name: "OrderService",
      file_path: "src/order.ts",
      line_start: 1,
      line_end: 20,
      is_exported: true,
    });
    ctx.idx.symbols.set("src/order.ts#OrderService.checkout", {
      key: "src/order.ts#OrderService.checkout",
      kind: "METHOD",
      name: "checkout",
      file_path: "src/order.ts",
      line_start: 5,
      line_end: 15,
      is_exported: true,
    });
    ctx.idx.symbols.set("src/order.ts#<module>", {
      key: "src/order.ts#<module>",
      kind: "FUNCTION",
      name: "<module>",
      file_path: "src/order.ts",
      line_start: 1,
      line_end: 20,
      is_exported: false,
    });

    ctx.idx.functions.set("src/order.ts#OrderService.checkout", {
      key: "src/order.ts#OrderService.checkout",
      kind: "METHOD",
      name: "checkout",
      file_path: "src/order.ts",
      line_start: 5,
      line_end: 15,
      is_exported: true,
      params: ["userId", "items"],
      locals: ["cartTotal"],
      complexity: 8,
    });

    ctx.idx.field_types.set("OrderDto.qty", "number");

    const whitelist = buildSymbolWhitelist(ctx.idx, ["src/order.ts#OrderService.checkout"]);

    expect(whitelist).toContain("OrderService");
    expect(whitelist).toContain("checkout");
    expect(whitelist).toContain("OrderService.checkout");
    expect(whitelist).toContain("userId");
    expect(whitelist).toContain("items");
    expect(whitelist).toContain("qty");
    expect(whitelist).not.toContain("<module>");

    // Đảm bảo đã sort
    const sorted = whitelist.slice().sort();
    expect(whitelist).toEqual(sorted);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-33: toClientResult lược bỏ trường nhạy cảm/nội bộ
  // ---------------------------------------------------------------------------
  it("T-ENG-33: toClientResult không có symbol_whitelist và không có suspicious_instruction_files", () => {
    const rawResult: Parameters<typeof toClientResult>[0] = {
      engine_version: CONFIG.ENGINE_VERSION,
      repo_name: "test-repo",
      snapshot: {
        source: "ZIP",
        repo_key: "test-repo",
        snapshot_id: "1234567890abcdef",
        snapshot_id_kind: "ARCHIVE_HASH",
        subdir: "",
        ref_label: null,
      },
      fingerprint: {
        archetype: "WEB_BACKEND",
        primary_language: "TYPESCRIPT",
        language_breakdown: [{ language: "TYPESCRIPT", tier: "RESOLVED", code_bytes: 500 }],
        graph_confidence: "HIGH",
        detected_framework: "Express",
        tech_stack: ["express"],
        is_monorepo: false,
        root_dir_offset: "",
      },
      total_files: 1,
      nodes: [],
      edges: [],
      groups: [],
      readme_excerpt: null,
      manifest_description: null,
      symbol_whitelist: ["secretSymbol", "leakCheck"],
      file_index: ["src/index.ts"],
      ingestion_report: {
        ...createEmptyReport(),
        suspicious_instruction_files: ["src/malicious.ts"],
      },
    };

    const clientRes = toClientResult(rawResult);

    expect((clientRes as unknown as { symbol_whitelist?: unknown }).symbol_whitelist).toBeUndefined();
    expect(
      (clientRes.ingestion_report as unknown as { suspicious_instruction_files?: unknown })
        .suspicious_instruction_files
    ).toBeUndefined();
    expect(clientRes.repo_name).toBe("test-repo");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-34: Tính tất định tuyệt đối của runEngine trên cùng zip
  // ---------------------------------------------------------------------------
  it("T-ENG-34: runEngine chạy 2 lần cùng zip cho ra nodes, edges, symbol_whitelist giống hệt nhau khi JSON.stringify", async () => {
    const code = `
import express from "express";
const app = express();
app.get("/items", (req, res) => res.json([]));
app.post("/items", (req, res) => res.json({ id: 1 }));
`;
    const zip = fflate.zipSync({
      "package.json": fflate.strToU8(JSON.stringify({ name: "deterministic-test", dependencies: { express: "4.18.2" } })),
      "src/index.ts": fflate.strToU8(code),
    });

    const resA = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "det.zip",
      bytes: zip,
      subdir_override: null,
    });

    const resB = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "det.zip",
      bytes: zip,
      subdir_override: null,
    });

    expect(JSON.stringify(resA.nodes)).toBe(JSON.stringify(resB.nodes));
    expect(JSON.stringify(resA.edges)).toBe(JSON.stringify(resB.edges));
    expect(JSON.stringify(resA.symbol_whitelist)).toBe(JSON.stringify(resB.symbol_whitelist));
  });

  // ---------------------------------------------------------------------------
  // T-ENG-35: mainPath với 2 đường hòa khoảng cách
  // ---------------------------------------------------------------------------
  it("T-ENG-35: mainPath: n-a->n-b->n-d và n-a->n-c->n-d => chọn ['n-a', 'n-b', 'n-d'] vì hòa theo id nhỏ hơn", () => {
    const mockGraph: Parameters<typeof mainPath>[0] = {
      engine_version: CONFIG.ENGINE_VERSION,
      repo_name: "mp-test",
      snapshot: { source: "ZIP", repo_key: "mp", snapshot_id: "sha", snapshot_id_kind: "ARCHIVE_HASH", subdir: "", ref_label: null },
      fingerprint: { archetype: "WEB_BACKEND", primary_language: "TYPESCRIPT", language_breakdown: [], graph_confidence: "HIGH", detected_framework: null, tech_stack: [], is_monorepo: false, root_dir_offset: "" },
      total_files: 4,
      nodes: [
        createDummyNode({ id: "n-a", prerequisites: [] }),
        createDummyNode({ id: "n-b", prerequisites: ["n-a"] }),
        createDummyNode({ id: "n-c", prerequisites: ["n-a"] }),
        createDummyNode({ id: "n-d", prerequisites: ["n-b", "n-c"] }),
      ],
      edges: [
        { id: "n-a->n-b", source: "n-a", target: "n-b", confidence: "RESOLVED", via_entities: [] },
        { id: "n-b->n-d", source: "n-b", target: "n-d", confidence: "RESOLVED", via_entities: [] },
        { id: "n-a->n-c", source: "n-a", target: "n-c", confidence: "RESOLVED", via_entities: [] },
        { id: "n-c->n-d", source: "n-c", target: "n-d", confidence: "RESOLVED", via_entities: [] },
      ],
      groups: [],
      readme_excerpt: null,
      manifest_description: null,
      symbol_whitelist: [],
      file_index: [],
      ingestion_report: createEmptyReport(),
    };

    const path = mainPath(mockGraph);
    expect(path).toEqual(["n-a", "n-b", "n-d"]);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-36: Giới hạn Display Budget 25 candidate
  // ---------------------------------------------------------------------------
  it("T-ENG-36: 25 candidate => giữ 20 (= DISPLAY_MAX_NODES), omitted_node_count = 5, warning '5 luồng khác không hiển thị trên bản đồ'", () => {
    const report = createEmptyReport();
    const ctx = createDummyContext();

    const candidates: Candidate[] = [];
    for (let i = 1; i <= 25; i++) {
      candidates.push(createDummyCandidate({ id: `cand-${i < 10 ? `0${i}` : i}`, cognitive_complexity: i }));
    }

    const { nodes } = assembleGraph(candidates, ctx, report);

    expect(nodes.length).toBe(CONFIG.DISPLAY_MAX_NODES);
    expect(report.omitted_node_count).toBe(5);
    expect(report.warnings).toContain("5 luồng khác không hiển thị trên bản đồ");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-53 (B-36, D-88): thứ tự giữ node khi vượt DISPLAY_MAX_NODES
  // ---------------------------------------------------------------------------
  const budgetCandidate = (id: string, kind: "HTTP" | "PAGE" | "ALGO", cc: number, rank: number): Candidate => ({
    ...createDummyCandidate({ id, kind: kind === "ALGO" ? "ALGO" : "SLICE", cognitive_complexity: cc, rank_score: rank }),
    binding:
      kind === "ALGO"
        ? null
        : { file_path: "src/a.ts", line_start: 1, line_end: 2, kind, method: "GET", path: "/" + id, handler: id, middlewares: [], display_name: id },
  });
  const pad = (i: number) => String(i).padStart(2, "0");

  it("T-ENG-53: giữ tối đa VIP_FALLBACK_TOP_K node thuật toán, bài API trước bài trang dù hạng thấp hơn", () => {
    const candidates: Candidate[] = [];
    for (let i = 0; i < 12; i++) candidates.push(budgetCandidate(`api-${pad(i)}`, "HTTP", 2, 0.1));
    for (let i = 0; i < 12; i++) candidates.push(budgetCandidate(`page-${pad(i)}`, "PAGE", 40, 0.9));
    for (let i = 0; i < 12; i++) candidates.push(budgetCandidate(`algo-${pad(i)}`, "ALGO", 50, 0.8));

    const { nodes } = assembleGraph(candidates, createDummyContext(), createEmptyReport());
    const count = (prefix: string) => nodes.filter((n) => n.entry_symbol?.startsWith(prefix)).length;

    expect(nodes.length).toBe(CONFIG.DISPLAY_MAX_NODES);
    expect(count("algo-")).toBe(CONFIG.VIP_FALLBACK_TOP_K);
    expect(count("api-")).toBe(12);
  });

  it("T-ENG-53: thiếu bài luồng thì trả chỗ lại cho node thuật toán", () => {
    const candidates: Candidate[] = [];
    for (let i = 0; i < 3; i++) candidates.push(budgetCandidate(`api-${pad(i)}`, "HTTP", 2, 0.1));
    for (let i = 0; i < 25; i++) candidates.push(budgetCandidate(`algo-${pad(i)}`, "ALGO", 50, 0.8));

    const { nodes } = assembleGraph(candidates, createDummyContext(), createEmptyReport());

    expect(nodes.length).toBe(CONFIG.DISPLAY_MAX_NODES);
    expect(nodes.filter((n) => n.entry_symbol?.startsWith("api-")).length).toBe(3);
  });

  it("T-ENG-53: thiếu node thuật toán thì bài luồng lấp đủ chỗ", () => {
    const candidates: Candidate[] = [];
    for (let i = 0; i < 25; i++) candidates.push(budgetCandidate(`api-${pad(i)}`, "HTTP", 2, 0.1));
    candidates.push(budgetCandidate("algo-00", "ALGO", 50, 0.8));

    const { nodes } = assembleGraph(candidates, createDummyContext(), createEmptyReport());

    expect(nodes.length).toBe(CONFIG.DISPLAY_MAX_NODES);
    expect(nodes.filter((n) => n.entry_symbol?.startsWith("algo-")).length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-37: Mọi điểm bắt đầu nằm trên cùng hàng trên cùng (D-55)
  // ---------------------------------------------------------------------------
  it("T-ENG-37: Gốc A (A->B->C->D), gốc E (E->D), gốc F lẻ => A, E, F cùng position.y nhỏ nhất; không có nút __start__", () => {
    const nodeA = createDummyNode({ id: "node-A", prerequisites: [] });
    const nodeB = createDummyNode({ id: "node-B", prerequisites: ["node-A"] });
    const nodeC = createDummyNode({ id: "node-C", prerequisites: ["node-B"] });
    const nodeD = createDummyNode({ id: "node-D", prerequisites: ["node-C", "node-E"] });
    const nodeE = createDummyNode({ id: "node-E", prerequisites: [] });
    const nodeF = createDummyNode({ id: "node-F", prerequisites: [] });

    const nodes = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF];
    const edges = [
      { id: "node-A->node-B", source: "node-A", target: "node-B", confidence: "RESOLVED" as const, via_entities: [] },
      { id: "node-B->node-C", source: "node-B", target: "node-C", confidence: "RESOLVED" as const, via_entities: [] },
      { id: "node-C->node-D", source: "node-C", target: "node-D", confidence: "RESOLVED" as const, via_entities: [] },
      { id: "node-E->node-D", source: "node-E", target: "node-D", confidence: "RESOLVED" as const, via_entities: [] },
    ];

    layoutGraph(nodes, edges);

    // Không có nút __start__ trong mảng nodes
    expect(nodes.some((n) => n.id === "__start__")).toBe(false);

    // Điểm bắt đầu là A, E, F
    const minY = Math.min(...nodes.map((n) => n.position.y));
    expect(nodeA.position.y).toBe(minY);
    expect(nodeE.position.y).toBe(minY);
    expect(nodeF.position.y).toBe(minY);

    // Các node con phải có y lớn hơn minY
    expect(nodeB.position.y).toBeGreaterThan(minY);
    expect(nodeD.position.y).toBeGreaterThan(minY);
  });

  // ---------------------------------------------------------------------------
  // ENG-90 (B-27): <module> không là ứng viên node thuật toán
  // ---------------------------------------------------------------------------
  const lapLong = (n: number) => {
    let code = "const table: number[] = [];\n";
    for (let i = 0; i < n; i++) code += `for (const v${i} of [1, 2]) { if (v${i} > 0) {\n`;
    code += "table.push(1);\n" + "} }\n".repeat(n);
    return code;
  };
  const routeFile = (body: string) => `
import express from "express";
const app = express();
const router = express.Router();
${body}
router.get("/items", (req, res) => { res.json({ ok: true }); });
app.use(router);
`;

  it("ENG-90: <module> trên VIP_COMPLEXITY_MIN không thành node thuật toán, hàm thật vẫn thành (a)", async () => {
    const zip = fflate.zipSync({
      "src/app.ts": fflate.strToU8(routeFile(lapLong(4))),
      "src/algo.ts": fflate.strToU8(`
export function realAlgo(items: number[]) {
  let res = 0;
  for (const a of items) {
    if (a > 0) {
      for (const b of items) {
        if (b > a) {
          for (const c of items) {
            if (c > b) { res += a * b * c; }
          }
        }
      }
    }
  }
  return res;
}
`),
    });
    const res = await runEngine({ kind: "ZIP_UPLOAD", file_name: "module-vip.zip", bytes: zip, subdir_override: null });
    const algos = res.nodes.filter((n) => n.node_type === "ALGORITHMIC_CORE");

    expect(res.ingestion_report.degraded_mode).toBeNull();
    expect(algos.map((n) => n.trace_steps[0]?.function_name)).toEqual(["realAlgo"]);
  });

  it("ENG-90: <module> đủ VIP_FALLBACK_MIN_SCORE không được bù ở (b)", async () => {
    const zip = fflate.zipSync({ "src/app.ts": fflate.strToU8(routeFile(lapLong(2))) });
    const res = await runEngine({ kind: "ZIP_UPLOAD", file_name: "module-bu.zip", bytes: zip, subdir_override: null });

    expect(res.ingestion_report.degraded_mode).toBeNull();
    expect(res.nodes.filter((n) => n.node_type === "ALGORITHMIC_CORE")).toEqual([]);
    expect(res.nodes.flatMap((n) => n.trace_steps.map((s) => s.function_name))).not.toContain("<module>");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-51 (B-35, D-86): hàm trả JSX không là ứng viên node thuật toán
  // ---------------------------------------------------------------------------
  const lapTrongHam = `
  let total = 0;
  for (const a of items) {
    if (a > 0) {
      for (const b of items) {
        if (b > a) {
          for (const c of items) {
            if (c > b) { total += a * b * c; }
          }
        }
      }
    }
  }`;

  it("T-ENG-51: component trả JSX không thành node thuật toán, hàm chỉ có callback trả JSX vẫn thành", async () => {
    const zip = fflate.zipSync({
      "src/app.ts": fflate.strToU8(routeFile("")),
      "src/ui/Big.tsx": fflate.strToU8(`
export function BigPage({ items }: { items: number[] }) {${lapTrongHam}
  if (!items) return null;
  return <div>{total}</div>;
}
export const ArrowPage = ({ a, b, c, d, e, f }: Record<string, boolean>) => (
  <div>{a ? (b ? (c ? (d ? (e ? (f ? 1 : 2) : 3) : 4) : 5) : 6) : 7}</div>
);
export function countRows(items: number[]) {${lapTrongHam}
  const rows = items.map((i) => <li key={i}>{i}</li>);
  return rows.length + total;
}
`),
    });
    const res = await runEngine({ kind: "ZIP_UPLOAD", file_name: "jsx-vip.zip", bytes: zip, subdir_override: null });
    const algos = res.nodes.filter((n) => n.node_type === "ALGORITHMIC_CORE");

    expect(res.ingestion_report.degraded_mode).toBeNull();
    expect(algos.map((n) => n.trace_steps[0]?.function_name)).toEqual(["countRows"]);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-38: Nối node thuật toán theo D-07 / D-56
  // ---------------------------------------------------------------------------
  it("T-ENG-38: Lát cắt gọi VIP ở hop > SLICE_MAX_HOPS có cạnh D-56; VIP chỉ là callback hoặc không ai gọi thì đứng riêng", () => {
    const report = createEmptyReport();
    const ctx = createDummyContext();

    // 1. Lát cắt A gọi hàm intermediate, intermediate gọi VIP algo-calcShipping
    ctx.edges = [
      { caller: "fnA", callee: "fnDeep1", confidence: "RESOLVED", ambiguous: false, call_count: 1 },
      { caller: "fnDeep1", callee: "fnDeep2", confidence: "RESOLVED", ambiguous: false, call_count: 1 },
      { caller: "fnDeep2", callee: "fnDeep3", confidence: "RESOLVED", ambiguous: false, call_count: 1 },
      { caller: "fnDeep3", callee: "fnDeep4", confidence: "RESOLVED", ambiguous: false, call_count: 1 },
      { caller: "fnDeep4", callee: "calcShipping", confidence: "RESOLVED", ambiguous: false, call_count: 1 },
    ];

    const sliceA = createDummyCandidate({
      id: "slice-order",
      functions: ["fnA"],
      cognitive_complexity: 5,
    });

    const vipAlgo = createDummyCandidate({
      id: "algo-calc-shipping",
      kind: "ALGO",
      entry_symbol: "calcShipping",
      functions: ["calcShipping"],
      cognitive_complexity: 25,
    });

    const standaloneAlgo = createDummyCandidate({
      id: "algo-standalone",
      kind: "ALGO",
      entry_symbol: "standaloneCmp",
      functions: ["standaloneCmp"],
      cognitive_complexity: 18,
    });

    const { nodes, edges } = assembleGraph([sliceA, vipAlgo, standaloneAlgo], ctx, report);

    expect(nodes.length).toBe(3);
    // Có cạnh giữa sliceA và vipAlgo
    expect(edges.some((e) => e.source === sliceA.id && e.target === vipAlgo.id)).toBe(true);
    // standaloneAlgo không ai gọi => không có cạnh vào hay ra
    expect(edges.some((e) => e.source === standaloneAlgo.id || e.target === standaloneAlgo.id)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ENG-40: app.options('*', cors()) và app.use(helmet()) => không có entry, không có khóa kết thúc bằng #()
  // ---------------------------------------------------------------------------
  it("ENG-40: app.options('*', cors()) và app.use(helmet()) => không có entry, không có khóa kết thúc bằng #()", async () => {
    const report = createEmptyReport();
    const code = `
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
app.use(helmet());
app.options("*", cors());
`;
    const parsed = await parseAll(
      new Map([["src/app.ts", code]]),
      new Map([["src/app.ts", "TYPESCRIPT"]]),
      report
    );
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), { go_module_path: null, dart_package_name: null, package_entry_files: [] });
    const cg = buildCallGraph(parsed, idx);
    const entries = findEntries(parsed, idx, cg, "");

    expect(entries.length).toBe(0);
    expect(cg.bindings.length).toBe(0);

    const allKeys = [
      ...Array.from(idx.symbols.keys()),
      ...Array.from(idx.functions.keys()),
      ...cg.bindings.map((b) => b.handler),
      ...entries.map((e) => e.key),
    ];
    expect(allKeys.some((k) => k.endsWith("#()"))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ENG-40: router.post('/x', validate(s), ctrl.go) => handler vẫn là ctrl.go, validate là middleware
  // ---------------------------------------------------------------------------
  it("ENG-40: router.post('/x', validate(s), ctrl.go) => handler vẫn là ctrl.go, validate là middleware", async () => {
    const report = createEmptyReport();
    const code = `
import express from "express";
const router = express.Router();
const validate = (schema: any) => (req: any, res: any, next: any) => next();
const ctrl = {
  go: (req: any, res: any) => res.send("ok"),
};
const s = {};

router.post("/x", validate(s), ctrl.go);
`;
    const parsed = await parseAll(
      new Map([["src/routes.ts", code]]),
      new Map([["src/routes.ts", "TYPESCRIPT"]]),
      report
    );
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), { go_module_path: null, dart_package_name: null, package_entry_files: [] });
    const cg = buildCallGraph(parsed, idx);
    const entries = findEntries(parsed, idx, cg, "");

    expect(cg.bindings.length).toBe(1);
    const binding = cg.bindings[0]!;
    expect(binding.handler).toBe("src/routes.ts#ctrl.go");
    expect(binding.middlewares).toEqual(["validate"]);
    expect(entries.length).toBe(1);
    expect(entries[0]?.key).toBe("src/routes.ts#ctrl.go");
    expect(entries[0]?.binding?.middlewares).toEqual(["validate"]);
  });

  // ---------------------------------------------------------------------------
  // ENG-40: router.get('/y', asyncHandler(ctrl.go)) => handler vẫn là ctrl.go
  // ---------------------------------------------------------------------------
  it("ENG-40: router.get('/y', asyncHandler(ctrl.go)) => handler vẫn là ctrl.go", async () => {
    const report = createEmptyReport();
    const code = `
import express from "express";
const router = express.Router();
const asyncHandler = (fn: any) => fn;
const ctrl = {
  go: (req: any, res: any) => res.send("ok"),
};

router.get("/y", asyncHandler(ctrl.go));
`;
    const parsed = await parseAll(
      new Map([["src/routes.ts", code]]),
      new Map([["src/routes.ts", "TYPESCRIPT"]]),
      report
    );
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), { go_module_path: null, dart_package_name: null, package_entry_files: [] });
    const cg = buildCallGraph(parsed, idx);
    const entries = findEntries(parsed, idx, cg, "");

    expect(cg.bindings.length).toBe(1);
    const binding = cg.bindings[0]!;
    expect(binding.handler).toBe("src/routes.ts#ctrl.go");
    expect(entries.length).toBe(1);
    expect(entries[0]?.key).toBe("src/routes.ts#ctrl.go");
  });

  // ---------------------------------------------------------------------------
  // ENG-40: Candidate rỗng không thành node
  // ---------------------------------------------------------------------------
  it("ENG-40: Candidate rỗng không thành node và không cộng vào omitted_node_count", () => {
    const report = createEmptyReport();
    const ctx = createDummyContext();

    const emptyCandidate = createDummyCandidate({
      id: "cand-empty",
      functions: ["emptyFn"],
      cognitive_complexity: 5,
    });
    emptyCandidate.trace_steps = []; // candidate rỗng

    const normalCandidate = createDummyCandidate({
      id: "cand-normal",
      functions: ["normalFn"],
      cognitive_complexity: 10,
    });

    const { nodes } = assembleGraph([emptyCandidate, normalCandidate], ctx, report);

    expect(nodes.length).toBe(1);
    expect(nodes[0]?.id).toBe(normalCandidate.id);
    expect(nodes.some((n) => n.id === emptyCandidate.id)).toBe(false);
    expect(report.omitted_node_count).toBe(0);
  });
});
