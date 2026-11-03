// Test cho lát cắt, xếp hạng PageRank, Tarjan SCC và Cognitive Complexity — spec 11 Mục 6, 7, 8.
// Bao phủ các ca: T-ENG-01, T-ENG-02, T-ENG-05, T-ENG-06, T-ENG-08, T-ENG-09, T-ENG-10, T-ENG-11.
import { describe, it, expect } from "vitest";
import {
  CONFIG,
  type FunctionCallEdge,
  type IngestionReport,
} from "@/contracts";
import { parseAll } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";
import { buildCallGraph, fileGraph, findEntries } from "../callgraph";
import { tarjanScc } from "../tarjan";
import { pageRank, rankFiles } from "../pagerank";
import { cognitiveComplexity } from "../complexity";
import { buildSlice } from "../slicing";
import type { EngineContext, ExternalCall } from "../types";

function createReport(): IngestionReport {
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

describe("ENG-60…ENG-89: Đồ thị, Xếp hạng, Cognitive Complexity và Lát cắt", () => {
  // ---------------------------------------------------------------------------
  // T-ENG-01
  // ---------------------------------------------------------------------------
  it("T-ENG-01: findPath if (!graph || !start) lồng 0 · for 0 · if 1 · for 2 · if 3 => điểm 12", async () => {
    const code = `
function findPath(graph: any, start: any) {
  if (!graph || !start) {
    return null;
  }
  for (const node of graph.nodes) {
    if (node.id === start) {
      for (const neighbor of node.neighbors) {
        if (neighbor.visited) {
          return neighbor;
        }
      }
    }
  }
  return [];
}
`;
    const codeMap = new Map([["src/path.ts", code]]);
    const langsMap = new Map([["src/path.ts", "TYPESCRIPT"]]);
    const report = createReport();

    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);
    const fnSym = idx.symbols.get("src/path.ts#findPath");
    expect(fnSym).toBeDefined();

    const score = cognitiveComplexity(fnSym!, parsedFiles[0]!);
    // 2 (if + ||) + 1 (for) + 2 (if lồng 1) + 3 (for lồng 2) + 4 (if lồng 3) = 12
    expect(score).toBe(12);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-02
  // ---------------------------------------------------------------------------
  it("T-ENG-02: for (x of items) { if … else if … else … } (TS và Python elif) điểm 5 · a && b || c điểm +2", async () => {
    // 1. Kiểm tra TypeScript: else-if không cộng thêm mức lồng
    const tsCode = `
function structureOnly(items: any[]) {
  for (const x of items) {
    if (x.type === 1) {
      console.log(1);
    } else if (x.type === 2) {
      console.log(2);
    } else {
      console.log(3);
    }
  }
  return 0;
}

function logicOnly(a: boolean, b: boolean, c: boolean) {
  if (a && b || c) {
    return true;
  }
  return false;
}
`;
    const codeMap = new Map([["src/test_cc.ts", tsCode]]);
    const langsMap = new Map([["src/test_cc.ts", "TYPESCRIPT"]]);
    const report = createReport();

    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);

    const fnStructure = idx.symbols.get("src/test_cc.ts#structureOnly");
    expect(fnStructure).toBeDefined();
    // for (1 + 0) + if (1 + 1) + else if (1) + else (1) = 5
    expect(cognitiveComplexity(fnStructure!, parsedFiles[0]!)).toBe(5);

    const fnLogic = idx.symbols.get("src/test_cc.ts#logicOnly");
    expect(fnLogic).toBeDefined();
    // if (1 + 0) + đoạn && (+1) + đoạn || (+1) = 3 (trong đó đoạn logic là +2)
    expect(cognitiveComplexity(fnLogic!, parsedFiles[0]!)).toBe(3);

    // 2. Kiểm tra Python elif:
    const pyCode = `
def python_elif(items):
    for x in items:
        if x == 1:
            print(1)
        elif x == 2:
            print(2)
        else:
            print(3)
    return 0
`;
    const pyCodeMap = new Map([["src/test_py.py", pyCode]]);
    const pyLangsMap = new Map([["src/test_py.py", "PYTHON"]]);
    const pyParsed = await parseAll(pyCodeMap, pyLangsMap, report);
    const pyIdx = collectSymbols(pyParsed);
    const pyFn = pyIdx.symbols.get("src/test_py.py#python_elif");
    expect(pyFn).toBeDefined();
    // for (1) + if (2) + elif (1) + else (1) = 5
    expect(cognitiveComplexity(pyFn!, pyParsed[0]!)).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-05
  // ---------------------------------------------------------------------------
  it("T-ENG-05: PageRank chuỗi C → S → R, d 0.85, ≤ 20 vòng, tol 1e-6 => ≈ 0.1844 / 0.3412 / 0.4744; C Ingress => ≈ 0.6844", () => {
    // Đồ thị C → S → R
    const dag = new Map<string, string[]>([
      ["C", ["S"]],
      ["S", ["R"]],
      ["R", []],
    ]);

    const pr = pageRank(dag);
    expect(pr.get("C")).toBeDefined();
    expect(pr.get("S")).toBeDefined();
    expect(pr.get("R")).toBeDefined();

    expect(pr.get("C")!).toBeCloseTo(0.1844, 3);
    expect(pr.get("S")!).toBeCloseTo(0.3412, 3);
    expect(pr.get("R")!).toBeCloseTo(0.4744, 3);

    // Xếp hạng với Ingress bonus: C là Ingress file
    const edges: FunctionCallEdge[] = [
      {
        caller: "src/c.ts#C.handle",
        callee: "src/s.ts#S.process",
        confidence: "RESOLVED",
        ambiguous: false,
        call_count: 1,
      },
      {
        caller: "src/s.ts#S.process",
        callee: "src/r.ts#R.find",
        confidence: "RESOLVED",
        ambiguous: false,
        call_count: 1,
      },
    ];

    const fg = fileGraph(edges);
    const ingressFiles = new Set(["src/c.ts"]);
    const ranks = rankFiles(fg, ingressFiles);

    expect(ranks.get("src/c.ts")!).toBeCloseTo(0.1844 + CONFIG.INGRESS_BONUS, 3); // 0.6844
    expect(ranks.get("src/s.ts")!).toBeCloseTo(0.3412, 3);
    expect(ranks.get("src/r.ts")!).toBeCloseTo(0.4744, 3);
  });

  // ---------------------------------------------------------------------------
  // T-ENG-06
  // ---------------------------------------------------------------------------
  it("T-ENG-06: Tarjan 1 → 2, 2 ⇄ 3 và SCC khổng lồ sinh warning", () => {
    // 1. Kiểm tra Tarjan với 1 → 2, 2 ⇄ 3
    const nodes = ["1", "2", "3"];
    const adj = new Map<string, string[]>([
      ["1", ["2"]],
      ["2", ["3"]],
      ["3", ["2"]],
    ]);

    const sccs = tarjanScc(nodes, adj);
    expect(sccs).toHaveLength(2);
    expect(sccs).toContainEqual(["1"]);
    expect(sccs).toContainEqual(["2", "3"]);

    // 2. SCC khổng lồ 5/8 file không tách được => warning
    // 8 files: f1..f8, trong đó f1..f5 tạo chu trình lớn không thể tách sau 3 lần gỡ cạnh
    const fg = new Map<
      string,
      Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>
    >();

    for (let i = 1; i <= 8; i++) {
      fg.set(`src/f${i}.ts`, new Map());
    }

    // Tạo các chu trình bền vững giữa f1..f5 với nhiều cạnh cùng trọng số 10
    const giantFiles = [1, 2, 3, 4, 5];
    for (const u of giantFiles) {
      for (const v of giantFiles) {
        if (u !== v) {
          fg.get(`src/f${u}.ts`)?.set(`src/f${v}.ts`, {
            weight: 10,
            confidence: "RESOLVED",
          });
        }
      }
    }
    // f5 trỏ ra f6, f6 trỏ ra f7, f7 trỏ ra f8
    fg.get("src/f5.ts")?.set("src/f6.ts", { weight: 1, confidence: "RESOLVED" });
    fg.get("src/f6.ts")?.set("src/f7.ts", { weight: 1, confidence: "RESOLVED" });
    fg.get("src/f7.ts")?.set("src/f8.ts", { weight: 1, confidence: "RESOLVED" });

    const report = createReport();
    rankFiles(fg, new Set(), report);

    expect(report.warnings.some((w) => w.includes("Phát hiện cụm phụ thuộc vòng lớn"))).toBe(
      true
    );
  });

  // ---------------------------------------------------------------------------
  // T-ENG-08
  // ---------------------------------------------------------------------------
  it("T-ENG-08: Lát cắt router.post('/checkout') với middleware, service, repository và criterion", async () => {
    const routesCode = `
import express from "express";
import { authMiddleware } from "./auth.middleware";
import { OrderService } from "./order.service";

const router = express.Router();
const orderService = new OrderService();

router.post('/checkout', authMiddleware, async (req, res) => {
  const result = await orderService.checkout(req.body);
  res.json(result);
});
`;

    const authCode = `
const JWT_SECRET = "example-jwt-secret"; // giá trị giả (hook quét khóa bỏ qua chữ "example")

export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  if (token !== JWT_SECRET) {
    return res.status(403).send("Forbidden");
  }
  next();
}
`;

    const serviceCode = `
export class OrderService {
  async checkout(data: any) {
    const product = await productRepo.findOne(data.productId);
    product.stock -= 1;
    await productRepo.save(product);
    return { success: true };
  }
}
`;

    const codeMap = new Map([
      ["src/routes/order.routes.ts", routesCode],
      ["src/routes/auth.middleware.ts", authCode],
      ["src/routes/order.service.ts", serviceCode],
    ]);

    const langsMap = new Map([
      ["src/routes/order.routes.ts", "TYPESCRIPT"],
      ["src/routes/auth.middleware.ts", "TYPESCRIPT"],
      ["src/routes/order.service.ts", "TYPESCRIPT"],
    ]);

    const report = createReport();
    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);
    resolveImports(parsedFiles, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const callGraph = buildCallGraph(parsedFiles, idx);
    const entries = findEntries(parsedFiles, idx, callGraph, "");
    expect(entries.length).toBeGreaterThan(0);

    const checkoutEntry = entries.find((e) => e.binding?.path === "/checkout");
    expect(checkoutEntry).toBeDefined();

    // Dựng ExternalCalls cho productRepo.findOne và productRepo.save (DATA_SINK)
    const externalCalls: ExternalCall[] = [
      {
        caller: "src/routes/order.service.ts#OrderService.checkout",
        line: 4,
        receiver_chain: ["productRepo"],
        method: "findOne",
        import_source: "typeorm",
      },
      {
        caller: "src/routes/order.service.ts#OrderService.checkout",
        line: 6,
        receiver_chain: ["productRepo"],
        method: "save",
        import_source: "typeorm",
      },
    ];

    const fg = fileGraph(callGraph.edges);
    const ranks = rankFiles(fg, new Set(["src/routes/order.routes.ts"]));

    const ctx: EngineContext = {
      files: new Map(parsedFiles.map((f) => [f.path, f])),
      idx,
      edges: callGraph.edges,
      external: externalCalls,
      tech_stack: ["typeorm"],
      rank: ranks,
      source_map: new Map(),
    };

    const candidate = buildSlice(checkoutEntry!, ctx);

    expect(candidate.trace_steps.length).toBeGreaterThanOrEqual(3);

    // Bước 1: ENTRY_POINT
    const step1 = candidate.trace_steps[0]!;
    expect(step1.layer).toBe("ENTRY_POINT");
    expect(step1.function_name).toContain("router.post('/checkout')");

    // Bước 2: MIDDLEWARE kèm dòng const JWT_SECRET
    const step2 = candidate.trace_steps[1]!;
    expect(step2.layer).toBe("MIDDLEWARE");
    expect(step2.function_name).toBe("authMiddleware");
    // Dòng const JWT_SECRET ở dòng 2 của auth.middleware.ts
    expect(step2.line_start).toBe(2);
    expect(step2.snippet).toContain("JWT_SECRET");

    // Bước 3: DATA_ACCESS (OrderService.checkout có DATA_SINK)
    const step3 = candidate.trace_steps[2]!;
    expect(step3.layer).toBe("DATA_ACCESS");
    expect(step3.function_name).toBe("OrderService.checkout");
    expect(step3.snippet).toContain("productRepo.findOne");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-09
  // ---------------------------------------------------------------------------
  it("T-ENG-09: const t0 = Date.now() và logger.info(x) nội bộ thành marker, không có bước logger", async () => {
    const appCode = `
import express from "express";
import { logger } from "./logger";

const router = express.Router();

router.get('/ping', (req, res) => {
  const t0 = Date.now();
  logger.info("ping received");
  res.send("pong");
});
`;

    const loggerCode = `
export const logger = {
  info(msg: string) {
    console.log("[INFO]", msg);
  }
};
`;

    const codeMap = new Map([
      ["src/app.ts", appCode],
      ["src/logger.ts", loggerCode],
    ]);
    const langsMap = new Map([
      ["src/app.ts", "TYPESCRIPT"],
      ["src/logger.ts", "TYPESCRIPT"],
    ]);

    const report = createReport();
    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);
    resolveImports(parsedFiles, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const callGraph = buildCallGraph(parsedFiles, idx);
    const entries = findEntries(parsedFiles, idx, callGraph, "");
    expect(entries.length).toBeGreaterThan(0);

    const fg = fileGraph(callGraph.edges);
    const ranks = rankFiles(fg, new Set(["src/app.ts"]));

    const ctx: EngineContext = {
      files: new Map(parsedFiles.map((f) => [f.path, f])),
      idx,
      edges: callGraph.edges,
      external: [],
      tech_stack: [],
      rank: ranks,
      source_map: new Map(),
    };

    const candidate = buildSlice(entries[0]!, ctx);

    // Không có bước logger (ENG-81 đã lọc bỏ vì không data sink, không dùng return, không throw)
    const hasLoggerStep = candidate.trace_steps.some((s) =>
      s.file_path.includes("logger")
    );
    expect(hasLoggerStep).toBe(false);

    // Snippet giữ câu lệnh đăng ký / res.send("pong")
    expect(candidate.trace_steps[0]!.snippet).toContain("res.send");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-10
  // ---------------------------------------------------------------------------
  it("T-ENG-10: Hàm 80 dòng, criterion dòng 50, chữ ký 1 dòng => clamp ra đúng 30 dòng", async () => {
    // Sinh hàm đúng 80 dòng có chuỗi def-use phụ thuộc đầy đủ để mọi dòng đều được giữ
    const lines: string[] = [];
    lines.push("export function longProcess(data: any) {"); // dòng 1 (chữ ký)
    lines.push("  let s2 = data;"); // dòng 2
    for (let i = 3; i <= 49; i++) {
      lines.push(`  const s${i} = s${i - 1} + 1;`); // dòng 3..49
    }
    lines.push("  const saved = userRepo.save(s49);"); // dòng 50 (criterion!)
    lines.push("  const s51 = s49 + 1;"); // dòng 51
    for (let i = 52; i <= 78; i++) {
      lines.push(`  const s${i} = s${i - 1} + 1;`); // dòng 52..78
    }
    lines.push("  return s78;"); // dòng 79 (return đọc s78 kéo def-use toàn bộ chuỗi)
    lines.push("}"); // dòng 80 (đóng)

    const code = lines.join("\n");
    const codeMap = new Map([["src/long.ts", code]]);
    const langsMap = new Map([["src/long.ts", "TYPESCRIPT"]]);

    const report = createReport();
    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);

    const fnSym = idx.symbols.get("src/long.ts#longProcess");
    expect(fnSym).toBeDefined();

    const externalCalls: ExternalCall[] = [
      {
        caller: "src/long.ts#longProcess",
        line: 50,
        receiver_chain: ["userRepo"],
        method: "save",
        import_source: "typeorm",
      },
    ];

    const ctx: EngineContext = {
      files: new Map(parsedFiles.map((f) => [f.path, f])),
      idx,
      edges: [],
      external: externalCalls,
      tech_stack: ["typeorm"],
      rank: new Map([["src/long.ts", 1]]),
      source_map: new Map(),
    };

    const entryPoint = {
      key: "src/long.ts#longProcess",
      binding: null,
      source: "GENERIC" as const,
    };

    const candidate = buildSlice(entryPoint, ctx);
    expect(candidate.trace_steps).toHaveLength(1);

    const step = candidate.trace_steps[0]!;
    const snippetLines = step.snippet.split("\n");

    // Tiêu chí spec: chữ ký + cửa sổ 26 dòng chứa dòng 50 + đóng + 2 marker = 30 dòng
    expect(snippetLines.length).toBe(30);
    expect(step.snippet).toContain("userRepo.save");
  });

  // ---------------------------------------------------------------------------
  // T-ENG-11
  // ---------------------------------------------------------------------------
  it("T-ENG-11: 5 bước, 140 dòng, criterion ở bước 3 => trần node bỏ lá sâu nhất còn bước 1–3", async () => {
    // 5 file gọi nhau qua import: step1 -> step2 -> step3 (criterion) -> step4 -> step5 (lá sâu nhất).
    // Mọi dòng thân hàm đều được giữ (chuỗi phụ thuộc tới return) và giá trị trả về của callee được dùng,
    // để ENG-81 không loại bước và ENG-88 thật sự phải bỏ lá. Cỡ 30/30/30/25/25 = 140 dòng, mỗi bước ≤ STEP_MAX_LINES
    // (không bị Hard Clamp): bỏ step5 ⇒ 115 > 100, bỏ step4 ⇒ 90 ≤ 100 ⇒ còn bước 1–3 (bảng T-ENG-11).
    function makeFn(name: string, callee: { name: string; file: string } | null, lineCount: number, hasSink = false) {
      const l: string[] = [];
      l.push(`export function ${name}(data?: any) {`);
      l.push("  let s1 = data ?? 1;");
      if (hasSink) {
        l.push("  dbClient.query(s1);");
      }
      let prevVar = "s1";
      if (callee) {
        l.push(`  const c = ${callee.name}(s1);`);
        prevVar = "c";
      }
      let varIdx = 2;
      while (l.length < lineCount - 2) {
        const curVar = `s${varIdx++}`;
        l.push(`  const ${curVar} = ${prevVar} + 1;`);
        prevVar = curVar;
      }
      l.push(`  return ${prevVar};`);
      l.push("}");
      const header = callee ? `import { ${callee.name} } from "${callee.file}";\n` : "";
      return header + l.join("\n");
    }

    const f1 = makeFn("step1", { name: "step2", file: "./s2" }, 30);
    const f2 = makeFn("step2", { name: "step3", file: "./s3" }, 30);
    const f3 = makeFn("step3", { name: "step4", file: "./s4" }, 30, true); // chứa criterion
    const f4 = makeFn("step4", { name: "step5", file: "./s5" }, 25);
    const f5 = makeFn("step5", null, 25);

    const codeMap = new Map([
      ["src/s1.ts", f1],
      ["src/s2.ts", f2],
      ["src/s3.ts", f3],
      ["src/s4.ts", f4],
      ["src/s5.ts", f5],
    ]);

    const langsMap = new Map([
      ["src/s1.ts", "TYPESCRIPT"],
      ["src/s2.ts", "TYPESCRIPT"],
      ["src/s3.ts", "TYPESCRIPT"],
      ["src/s4.ts", "TYPESCRIPT"],
      ["src/s5.ts", "TYPESCRIPT"],
    ]);

    const report = createReport();
    const parsedFiles = await parseAll(codeMap, langsMap, report);
    const idx = collectSymbols(parsedFiles);
    resolveImports(parsedFiles, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const callGraph = buildCallGraph(parsedFiles, idx);

    const externalCalls: ExternalCall[] = [
      {
        caller: "src/s3.ts#step3",
        line: 2,
        receiver_chain: ["dbClient"],
        method: "query",
        import_source: "pg",
      },
    ];

    const ctx: EngineContext = {
      files: new Map(parsedFiles.map((f) => [f.path, f])),
      idx,
      edges: callGraph.edges,
      external: externalCalls,
      tech_stack: ["pg"],
      rank: new Map([["src/s1.ts", 1]]),
      source_map: new Map(),
    };

    const entryPoint = {
      key: "src/s1.ts#step1",
      binding: null,
      source: "GENERIC" as const,
    };

    const candidate = buildSlice(entryPoint, ctx);

    // Tiêu chí spec: Bỏ lá không bảo vệ sâu nhất trước (step5, step4)
    // Còn lại bước 1–3
    expect(candidate.trace_steps.length).toBe(3);
    expect(candidate.trace_steps[0]!.step_number).toBe(1);
    expect(candidate.trace_steps[1]!.step_number).toBe(2);
    expect(candidate.trace_steps[2]!.step_number).toBe(3);

    // Tổng dòng ≤ CONFIG.NODE_MAX_LINES (100)
    let totalLines = 0;
    for (const st of candidate.trace_steps) {
      totalLines += st.snippet.split("\n").length;
    }
    expect(totalLines).toBeLessThanOrEqual(CONFIG.NODE_MAX_LINES);
  });
});
