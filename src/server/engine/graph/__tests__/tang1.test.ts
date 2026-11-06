import { beforeAll, describe, expect, it } from "vitest";
import type { IngestionReport, LanguageId } from "@/contracts";
import { buildCallGraph, findEntries } from "../callgraph";
import { chooseMode } from "../degraded";
import { initParsers, parseAll } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";
import type { EntryPoint } from "../types";

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

describe("ENG-12: Kiểm tra parseAll và lọc lỗi cú pháp", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-12: File có tỉ lệ byte ERROR > 30% bị bỏ và tăng parse_error", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    // File có hơn 40% byte lỗi cú pháp (> 30% của CONFIG.PARSE_ERROR_RATIO_MAX)
    const badCode = "const valid = 1;\n" + "??? !!! ### @@@ $$$ %%% &&& *** (((\n".repeat(4);
    code.set("src/bad.ts", badCode);
    langs.set("src/bad.ts", "TYPESCRIPT");

    // File hợp lệ
    const goodCode = "export function add(a: number, b: number): number { return a + b; }\n";
    code.set("src/good.ts", goodCode);
    langs.set("src/good.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);

    expect(report.skipped.parse_error).toBe(1);
    expect(report.warnings.length).toBe(1);
    expect(report.warnings[0]).toContain("File src/bad.ts có cú pháp không phân tích được");
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.path).toBe("src/good.ts");
  });
});

describe("T-ENG-12: Phân giải interface sang implementation và comment không sinh cạnh", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENG-12: 1 implementor chuyển sang impl; 2 implementor ra ambiguous; comment không sinh cạnh", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    // Interface IOrderService
    const ifaceCode = `
export interface IOrderService {
  run(): void;
}
`;
    code.set("src/service.ts", ifaceCode);
    langs.set("src/service.ts", "TYPESCRIPT");

    // Impl 1
    const implCode = `
import { IOrderService } from './service';

export class OrderServiceImpl implements IOrderService {
  run(): void {
    // orderItemRepo.save()
  }
}
`;
    code.set("src/impl.ts", implCode);
    langs.set("src/impl.ts", "TYPESCRIPT");

    // Caller 1: có 1 impl
    const callerCode = `
import { IOrderService } from './service';

export class OrderController {
  constructor(private svc: IOrderService) {}

  execute(): void {
    this.svc.run();
  }
}
`;
    code.set("src/controller.ts", callerCode);
    langs.set("src/controller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph1 = buildCallGraph(parsed, idx);

    // Trường hợp 1: 1 implementor
    const runCall = graph1.edges.find((e) => e.callee.includes("OrderServiceImpl.run"));
    expect(runCall).toBeDefined();
    expect(runCall?.confidence).toBe("RESOLVED");
    expect(runCall?.ambiguous).toBe(false);

    // Kiểm tra comment // orderItemRepo.save() không sinh cạnh nào
    const commentCall = graph1.edges.find((e) => e.callee.includes("orderItemRepo"));
    expect(commentCall).toBeUndefined();

    // Trường hợp 2: Thêm Impl 2 ⇒ 2 implementors ⇒ ambiguous
    const impl2Code = `
import { IOrderService } from './service';

export class OrderServiceMock implements IOrderService {
  run(): void {}
}
`;
    code.set("src/mock.ts", impl2Code);
    langs.set("src/mock.ts", "TYPESCRIPT");

    const parsed2 = await parseAll(code, langs, report);
    const idx2 = collectSymbols(parsed2);
    resolveImports(parsed2, idx2, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph2 = buildCallGraph(parsed2, idx2);
    const ambiguousCalls = graph2.edges.filter((e) => e.callee.endsWith(".run"));
    expect(ambiguousCalls.length).toBe(2);
    for (const call of ambiguousCalls) {
      expect(call.ambiguous).toBe(true);
    }
  });
});

describe("ENG-40: Nhận diện route Express và NestJS", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-40: Express router.post('/checkout', ...) nhận diện display_name và middlewares", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const expressCode = `
import express from 'express';

const router = express.Router();

function authMiddleware(req: unknown, res: unknown, next: () => void) {
  next();
}

router.post('/checkout', authMiddleware, async (req: unknown, res: { json: (d: unknown) => void }) => {
  res.json({ status: 'ok' });
});
`;
    code.set("src/routes/order.routes.ts", expressCode);
    langs.set("src/routes/order.routes.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph = buildCallGraph(parsed, idx);
    expect(graph.bindings.length).toBe(1);

    const binding = graph.bindings[0]!;
    expect(binding.display_name).toBe("router.post('/checkout')");
    expect(binding.method).toBe("POST");
    expect(binding.path).toBe("/checkout");
    expect(binding.middlewares).toContain("authMiddleware");
    expect(binding.handler).toContain("<POST /checkout>");

    const entries = findEntries(parsed, idx, graph, "");
    expect(entries.length).toBe(1);
    expect(entries[0]?.source).toBe("REGISTERED");
    expect(entries[0]?.binding?.display_name).toBe("router.post('/checkout')");
  });

  it("ENG-40: NestJS Controller nhận diện decorator prefix, method verb và middlewares", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const nestCode = `
import { Controller, Post, UseGuards } from '@nestjs/common';

@Controller('orders')
export class OrderController {
  @Post('checkout')
  @UseGuards(AuthGuard)
  async checkout(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
`;
    code.set("src/order.controller.ts", nestCode);
    langs.set("src/order.controller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph = buildCallGraph(parsed, idx);
    expect(graph.bindings.length).toBe(1);

    const binding = graph.bindings[0]!;
    expect(binding.method).toBe("POST");
    expect(binding.path).toBe("/orders/checkout");
    expect(binding.middlewares).toContain("AuthGuard.canActivate");
    expect(binding.handler).toBe("src/order.controller.ts#OrderController.checkout");

    const entries = findEntries(parsed, idx, graph, "");
    expect(entries.length).toBe(1);
    expect(entries[0]?.source).toBe("REGISTERED");
  });
});

describe("ENG-51: Chọn chế độ degraded mode", () => {
  it("ENG-51: 1 file Express 5 route ⇒ NORMAL (null)", () => {
    const entries: EntryPoint[] = [
      { key: "r1", binding: null, source: "REGISTERED" },
      { key: "r2", binding: null, source: "REGISTERED" },
      { key: "r3", binding: null, source: "REGISTERED" },
      { key: "r4", binding: null, source: "REGISTERED" },
      { key: "r5", binding: null, source: "REGISTERED" },
    ];
    const mode = chooseMode(entries, 1);
    expect(mode).toBeNull();
  });

  it("ENG-51: main.py không route, 5 hàm (n <= 2 file) ⇒ PROCEDURAL", () => {
    const entries: EntryPoint[] = [];
    const mode = chooseMode(entries, 1);
    expect(mode).toBe("PROCEDURAL");
  });

  it("ENG-51: > 2 file không route ⇒ NORMAL (null)", () => {
    const entries: EntryPoint[] = [];
    const mode = chooseMode(entries, 5);
    expect(mode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ENG-40: Flask, FastAPI (12 Mục 1, nhóm ✅ của Python)
// ---------------------------------------------------------------------------
describe("ENG-40: Nhận diện route Flask và FastAPI", () => {
  beforeAll(async () => {
    await initParsers();
  });

  const MODULE_INFO = { go_module_path: null, dart_package_name: null, package_entry_files: [] };

  async function bindingsOf(filePath: string, src: string) {
    const report = createEmptyReport();
    const parsed = await parseAll(new Map([[filePath, src]]), new Map<string, LanguageId>([[filePath, "PYTHON"]]), report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), MODULE_INFO);
    const graph = buildCallGraph(parsed, idx);
    return { graph, entries: findEntries(parsed, idx, graph, "") };
  }

  it("ENG-40: FastAPI @app.post('/items') là entry REGISTERED, method POST, path /items", async () => {
    const src = [
      "from fastapi import FastAPI",
      "app = FastAPI()",
      "",
      "@app.post(\"/items\")",
      "def create_item(item: dict):",
      "    return item",
      "",
    ].join("\n");
    const { graph, entries } = await bindingsOf("app/main.py", src);
    expect(graph.bindings.length).toBe(1);
    expect(graph.bindings[0]!.method).toBe("POST");
    expect(graph.bindings[0]!.path).toBe("/items");
    expect(graph.bindings[0]!.handler).toContain("create_item");
    expect(entries.map((e) => e.source)).toEqual(["REGISTERED"]);
  });

  it("ENG-40: Flask @bp.route('/users', methods=['GET']) + @login_required là middleware", async () => {
    const src = [
      "from flask import Blueprint",
      "bp = Blueprint(\"users\", __name__)",
      "",
      "def login_required(f):",
      "    return f",
      "",
      "@bp.route(\"/users\", methods=[\"GET\"])",
      "@login_required",
      "def list_users():",
      "    return []",
      "",
    ].join("\n");
    const { graph } = await bindingsOf("app/users.py", src);
    expect(graph.bindings.length).toBe(1);
    expect(graph.bindings[0]!.method).toBe("GET");
    expect(graph.bindings[0]!.path).toBe("/users");
    expect(graph.bindings[0]!.handler).toContain("list_users");
    expect(graph.bindings[0]!.middlewares.join(",")).toContain("login_required");
  });
});

// ---------------------------------------------------------------------------
// ENG-12: tỉ lệ ERROR đo cùng đơn vị với độ dài file (code có tiếng Việt)
// ---------------------------------------------------------------------------
describe("ENG-12: tỉ lệ lỗi cú pháp với chuỗi tiếng Việt", () => {
  it("ENG-12: file hợp lệ chứa nhiều chuỗi tiếng Việt không bị bỏ", async () => {
    const report = createEmptyReport();
    const src = Array.from({ length: 20 }, (_, i) => `export const m${i} = "Thông báo lỗi tiếng Việt số ${i}";`).join("\n");
    const parsed = await parseAll(new Map([["src/msg.ts", src]]), new Map<string, LanguageId>([["src/msg.ts", "TYPESCRIPT"]]), report);
    expect(parsed.length).toBe(1);
    expect(report.skipped.parse_error).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ENG-31: Phân giải lời gọi phương thức qua biến module và không tự trỏ (spec 11 Mục 3)
// ---------------------------------------------------------------------------
describe("ENG-31: Phân giải biến module new T() và kiểm tra không tự trỏ", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-31: Handler ẩn danh gọi orderService.checkout(...) sinh cạnh tới OrderService.checkout, không tự trỏ, không sinh cạnh tới CLASS", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const serviceCode = `
export class OrderService {
  checkout(data: any): any {
    return { ok: true };
  }
}
`;
    code.set("src/service.ts", serviceCode);
    langs.set("src/service.ts", "TYPESCRIPT");

    const routeCode = `
import express from 'express';
import { OrderService } from './service';

const router = express.Router();
const orderService = new OrderService();

function authMiddleware(req: any, res: any, next: any) {
  next();
}

router.post('/checkout', authMiddleware, async (req: any, res: any) => {
  orderService.checkout(req.body);
  res.json({ success: true });
});
`;
    code.set("src/route.ts", routeCode);
    langs.set("src/route.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph = buildCallGraph(parsed, idx);

    // 1. Kiểm tra có cạnh từ <POST /checkout> tới OrderService.checkout
    const checkoutCall = graph.edges.find(
      (e) =>
        e.caller.includes("<POST /checkout>") &&
        e.callee.includes("OrderService.checkout")
    );
    expect(checkoutCall).toBeDefined();
    expect(checkoutCall?.confidence).toBe("RESOLVED");

    // 2. Kiểm tra KHÔNG CÓ cạnh tự trỏ (caller === callee)
    for (const e of graph.edges) {
      expect(e.caller).not.toBe(e.callee);
    }
    const selfLoop = graph.edges.find((e) => e.caller === e.callee);
    expect(selfLoop).toBeUndefined();

    // 3. Kiểm tra KHÔNG CÓ cạnh trỏ tới CLASS (ENG-30)
    for (const e of graph.edges) {
      const sym = idx.symbols.get(e.callee);
      expect(sym?.kind).not.toBe("CLASS");
    }
    const classEdge = graph.edges.find((e) => e.callee === "src/service.ts#OrderService");
    expect(classEdge).toBeUndefined();
  });
});


// ---------------------------------------------------------------------------
// ENG-31: Hàm bọc, re-export CommonJS/ES6 và Python import từ thư mục con
// ---------------------------------------------------------------------------
describe("ENG-31: Hàm bọc catchAsync/wrapper, re-export file index và Python import từ thư mục con", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-31: const a = wrap(async () => { svc.go(); }) có symbol hàm #a và cạnh tới go", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const svcCode = `
export class Svc {
  go(): void {}
}
`;
    code.set("src/svc.ts", svcCode);
    langs.set("src/svc.ts", "TYPESCRIPT");

    const wrapCode = `
import { Svc } from './svc';
const svc = new Svc();
function wrap(fn: any) { return fn; }

export const a = wrap(async () => {
  svc.go();
});
`;
    code.set("src/main.ts", wrapCode);
    langs.set("src/main.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    // 1. Có symbol hàm #a
    const fnA = idx.functions.get("src/main.ts#a");
    expect(fnA).toBeDefined();
    expect(fnA?.kind).toBe("FUNCTION");

    // 2. Có cạnh từ src/main.ts#a tới Svc.go (hoặc go)
    const graph = buildCallGraph(parsed, idx);
    const edge = graph.edges.find(
      (e) => e.caller === "src/main.ts#a" && e.callee.includes("go")
    );
    expect(edge).toBeDefined();
    expect(edge?.confidence).toBe("RESOLVED");
  });

  it("ENG-31: module.exports.svc = require('./svc') rồi const { svc } = require('./index'), svc.go() ra cạnh RESOLVED", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const svcCode = `
class Svc {
  go() {}
}
module.exports = new Svc();
`;
    code.set("src/svc.js", svcCode);
    langs.set("src/svc.js", "JAVASCRIPT");

    const indexCode = `
module.exports.svc = require('./svc');
`;
    code.set("src/index.js", indexCode);
    langs.set("src/index.js", "JAVASCRIPT");

    const callerCode = `
const { svc } = require('./index');

function run() {
  svc.go();
}
`;
    code.set("src/caller.js", callerCode);
    langs.set("src/caller.js", "JAVASCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph = buildCallGraph(parsed, idx);
    const edge = graph.edges.find(
      (e) => e.caller === "src/caller.js#run" && e.callee.includes("go")
    );
    expect(edge).toBeDefined();
    expect(edge?.confidence).toBe("RESOLVED");
  });

  it("ENG-31: export { Foo as Bar } from './foo' và export * from './foo' ra cạnh RESOLVED", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const fooCode = `
export class Foo {
  run(): void {}
}
export function helper(): void {}
`;
    code.set("src/foo.ts", fooCode);
    langs.set("src/foo.ts", "TYPESCRIPT");

    const barCode = `
export { Foo as Bar } from './foo';
export * from './foo';
`;
    code.set("src/bar.ts", barCode);
    langs.set("src/bar.ts", "TYPESCRIPT");

    const callerCode = `
import { Bar, helper } from './bar';

export function testNamed(): void {
  const b = new Bar();
  b.run();
}

export function testWildcard(): void {
  helper();
}
`;
    code.set("src/caller.ts", callerCode);
    langs.set("src/caller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const graph = buildCallGraph(parsed, idx);

    const namedEdge = graph.edges.find(
      (e) => e.caller === "src/caller.ts#testNamed" && e.callee.includes("Foo.run")
    );
    expect(namedEdge).toBeDefined();
    expect(namedEdge?.confidence).toBe("RESOLVED");

    const wildcardEdge = graph.edges.find(
      (e) => e.caller === "src/caller.ts#testWildcard" && e.callee === "src/foo.ts#helper"
    );
    expect(wildcardEdge).toBeDefined();
    expect(wildcardEdge?.confidence).toBe("RESOLVED");
  });

  it("ENG-31: Chuỗi re-export vòng tròn không treo và không ném lỗi", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const codeA = `
export { b as a } from './circleB';
export const valA = 1;
`;
    code.set("src/circleA.ts", codeA);
    langs.set("src/circleA.ts", "TYPESCRIPT");

    const codeB = `
export { a as b } from './circleA';
export const valB = 2;
`;
    code.set("src/circleB.ts", codeB);
    langs.set("src/circleB.ts", "TYPESCRIPT");

    const codeCaller = `
import { a } from './circleA';
export function testCircle(): void {
  const x = a;
}
`;
    code.set("src/callerCircle.ts", codeCaller);
    langs.set("src/callerCircle.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    expect(() => {
      resolveImports(parsed, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });
    }).not.toThrow();

    const graph = buildCallGraph(parsed, idx);
    expect(graph).toBeDefined();
  });

  it("ENG-31: Python trong backend/app/ với from app import crud và crud.f() sinh cạnh RESOLVED", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const initCode = ``;
    code.set("backend/app/__init__.py", initCode);
    langs.set("backend/app/__init__.py", "PYTHON");

    const crudCode = `
def f():
    return {"id": 1}
`;
    code.set("backend/app/crud.py", crudCode);
    langs.set("backend/app/crud.py", "PYTHON");

    const mainCode = `
from app import crud

def register():
    crud.f()
`;
    code.set("backend/app/main.py", mainCode);
    langs.set("backend/app/main.py", "PYTHON");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(
      parsed,
      idx,
      new Map(),
      {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      },
      "backend/"
    );

    const graph = buildCallGraph(parsed, idx);
    const edge = graph.edges.find(
      (e) =>
        e.caller === "backend/app/main.py#register" &&
        e.callee === "backend/app/crud.py#f"
    );
    expect(edge).toBeDefined();
    expect(edge?.confidence).toBe("RESOLVED");
  });
});


// ---------------------------------------------------------------------------
// ENG-20: line_start với decorator trong NestJS controller và export class
// ---------------------------------------------------------------------------
describe("ENG-20: line_start với decorator trong NestJS controller và export class", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-20: Controller 3 method, mỗi method 1 decorator ⇒ line_start của method là decorator của chính nó", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const nestCode = [
      "import { Controller, Get, Post, Delete } from '@nestjs/common';",
      "",
      "@Controller('orders')",
      "export class OrderController {",
      "  @Post()",
      "  async create() {",
      "    return {};",
      "  }",
      "",
      "  @Get(':id')",
      "  async findOne() {",
      "    return {};",
      "  }",
      "",
      "  @Delete(':id')",
      "  async remove() {",
      "    return {};",
      "  }",
      "}",
    ].join("\n");

    code.set("src/order.controller.ts", nestCode);
    langs.set("src/order.controller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    const createSym = idx.functions.get("src/order.controller.ts#OrderController.create");
    const findOneSym = idx.functions.get("src/order.controller.ts#OrderController.findOne");
    const removeSym = idx.functions.get("src/order.controller.ts#OrderController.remove");

    expect(createSym).toBeDefined();
    expect(findOneSym).toBeDefined();
    expect(removeSym).toBeDefined();

    expect(createSym?.line_start).toBe(5);
    expect(findOneSym?.line_start).toBe(10);
    expect(removeSym?.line_start).toBe(15);
  });

  it("ENG-20: Method có 2 decorator liền nhau như @Get() và @Roles() ⇒ line_start là decorator đầu của chính method đó", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const nestCode = [
      "import { Controller, Get, Post, Roles } from '@nestjs/common';",
      "",
      "@Controller('users')",
      "export class UserController {",
      "  @Post()",
      "  async create() {",
      "    return {};",
      "  }",
      "",
      "  @Get(':id')",
      "  @Roles('admin')",
      "  async findOne() {",
      "    return {};",
      "  }",
      "}",
    ].join("\n");

    code.set("src/user.controller.ts", nestCode);
    langs.set("src/user.controller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    const createSym = idx.functions.get("src/user.controller.ts#UserController.create");
    const findOneSym = idx.functions.get("src/user.controller.ts#UserController.findOne");

    expect(createSym).toBeDefined();
    expect(findOneSym).toBeDefined();

    expect(createSym?.line_start).toBe(5);
    expect(findOneSym?.line_start).toBe(10);
  });

  it("ENG-20: @Dec export class X vẫn lấy dòng decorator", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const codeStr = [
      "@Dec",
      "export class X {",
      "  run() {}",
      "}",
    ].join("\n");

    code.set("src/x.ts", codeStr);
    langs.set("src/x.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    const classSym = idx.symbols.get("src/x.ts#X");
    expect(classSym).toBeDefined();
    expect(classSym?.line_start).toBe(1);
    expect(classSym?.line_end).toBe(4);
  });

  it("ENG-20: Comment giữa decorator và method ⇒ line_start vẫn là decorator của method", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    const nestCode = [
      "export class OrderController {",
      "  @Get()",
      "  list() {}",
      "",
      "  @Post()",
      "  // tạo đơn mới",
      "  create() {}",
      "",
      "  @Get(':id')",
      "  /** lấy một đơn */",
      "  findOne() {}",
      "}",
    ].join("\n");

    code.set("src/order.controller.ts", nestCode);
    langs.set("src/order.controller.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    expect(idx.functions.get("src/order.controller.ts#OrderController.create")?.line_start).toBe(5);
    expect(idx.functions.get("src/order.controller.ts#OrderController.findOne")?.line_start).toBe(9);
  });
});
