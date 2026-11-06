import { beforeAll, describe, expect, it } from "vitest";
import type { IngestionReport, LanguageId } from "@/contracts";
import { buildCallGraph } from "../callgraph";
import { initParsers, parseAll } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";

function emptyReport(): IngestionReport {
  return {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: { garbage: 0, binary: 0, oversized: 0, unsupported_lang: 0, quota: 0, parse_error: 0 },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };
}

async function bindingsOf(files: Record<string, string>) {
  const code = new Map<string, string>();
  const langs = new Map<string, LanguageId>();
  for (const [p, c] of Object.entries(files)) {
    code.set(p, c);
    langs.set(p, "TYPESCRIPT");
  }
  const parsed = await parseAll(code, langs, emptyReport());
  const idx = collectSymbols(parsed);
  resolveImports(parsed, idx, new Map(), {
    go_module_path: null,
    dart_package_name: null,
    package_entry_files: [],
  });
  return buildCallGraph(parsed, idx).bindings;
}

describe("B-29: route dạng router.route(path).verb(...)", () => {
  beforeAll(async () => {
    await initParsers();
  });

  const ROUTER = `import express from "express";
import { auth } from "./auth";
import { getUser, updateUser, deleteUser } from "./user.controller";
const router = express.Router();
`;

  it("B-29: mỗi động từ trong chuỗi .route() thành 1 binding có path, method, tên 1 dòng", async () => {
    const bindings = await bindingsOf({
      "src/user.route.ts":
        ROUTER +
        `router
  .route('/:userId')
  .get(auth('getUsers'), getUser)
  .patch(auth('manageUsers'), updateUser)
  .delete(auth('manageUsers'), deleteUser);
`,
    });
    const http = bindings.filter((b) => b.kind === "HTTP");
    expect(http.map((b) => [b.method, b.path, b.display_name])).toEqual([
      ["DELETE", "/:userId", "router.delete('/:userId')"],
      ["PATCH", "/:userId", "router.patch('/:userId')"],
      ["GET", "/:userId", "router.get('/:userId')"],
    ]);
    for (const b of http) expect(b.display_name).not.toContain("\n");
  });

  it("B-29: động từ chỉ có 1 đối số (handler) trong chuỗi vẫn nhận, middleware nằm ở giữa", async () => {
    const bindings = await bindingsOf({
      "src/user.route.ts":
        ROUTER + `router.route('/').get(getUser).post(auth('x'), updateUser);\n`,
    });
    const http = bindings.filter((b) => b.kind === "HTTP");
    expect(http.map((b) => `${b.method} ${b.path}`).sort()).toEqual(["GET /", "POST /"]);
    const post = http.find((b) => b.method === "POST");
    expect(post?.middlewares).toEqual(["auth"]);
    expect(http.find((b) => b.method === "GET")?.middlewares).toEqual([]);
  });

  it("B-29: cú pháp thường router.get('/x', h) không đổi", async () => {
    const bindings = await bindingsOf({
      "src/user.route.ts": ROUTER + `router.get('/x', getUser);\n`,
    });
    const http = bindings.filter((b) => b.kind === "HTTP");
    expect(http.map((b) => b.display_name)).toEqual(["router.get('/x')"]);
  });

  it("B-29: cache.get('k') một đối số và .route() trên đối tượng không phải router không thành route", async () => {
    const bindings = await bindingsOf({
      "src/a.ts": `const cache = new Map();\nexport function f() { return cache.get('k'); }\n`,
      "src/b.ts": `export function g(dom: any) { return dom.route('/x').get(function h() {}); }\n`,
    });
    expect(bindings.filter((b) => b.kind === "HTTP")).toEqual([]);
  });
});
