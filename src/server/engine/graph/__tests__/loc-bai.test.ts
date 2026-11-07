// Nhận route đúng (ENG-40, `12` Mục 1), cờ test (ING-87), lọc bài và Capstone (ENG-110, D-12).
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as fflate from "fflate";
import type { IngestionReport } from "@/contracts";
import { initParsers, parseAll } from "../parser";
import { buildCallGraph } from "../callgraph";
import { collectSymbols, resolveImports } from "../symbols";
import { runEngine } from "../../index";
import { isTestPath } from "../../ingest/priority";

vi.setConfig({ testTimeout: 30_000 });

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

async function routes(code: string, extra: Record<string, string> = {}): Promise<string[]> {
  const all = new Map([["src/routes.ts", code], ...Object.entries(extra)]);
  const langs = new Map([...all.keys()].map((k) => [k, "TYPESCRIPT" as const]));
  const parsed = await parseAll(all, langs, emptyReport());
  const idx = collectSymbols(parsed);
  resolveImports(parsed, idx, new Map(), { go_module_path: null, dart_package_name: null, package_entry_files: [] });
  return buildCallGraph(parsed, idx).bindings.map((b) => `${b.method} ${b.path}`);
}

describe("ENG-40: chỉ nhận route khi receiver và handler hợp lệ", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-40: config.get với giá trị mặc định ⇒ không có route", async () => {
    const code = `
const DEFAULT = 5;
export const a = (config: any) => [config.get('A', '7d'), config.get('B', 600), config.get('C', DEFAULT)];
`;
    expect(await routes(code)).toEqual([]);
  });

  it("ENG-40: cache.get('k', loadFn) ⇒ không có route", async () => {
    const code = `
const loadFn = () => 1;
export const a = (cache: any) => cache.get('k', loadFn);
`;
    expect(await routes(code)).toEqual([]);
  });

  it("ENG-40: mock msw http.get ⇒ không có route", async () => {
    const code = `
import { http } from 'msw';
export const h = [http.get('/x', () => 1), http.post('/y', async () => 2)];
`;
    expect(await routes(code)).toEqual([]);
  });

  it("ENG-40: router tên hợp lệ nhưng import từ gói ngoài ⇒ không có route", async () => {
    const code = `
import { router } from 'expo-router';
router.get('/x', () => 1);
`;
    expect(await routes(code)).toEqual([]);
  });

  it("ENG-40: đối số cuối là giá trị cố định ⇒ không có route", async () => {
    const code = `
import express from 'express';
const router = express.Router();
const LIMIT = 10;
router.get('/a', 'b');
router.get('/c', { x: 1 });
router.get('/d', LIMIT);
`;
    expect(await routes(code)).toEqual([]);
  });

  it("ENG-40: router cùng file, handler tên, lời gọi bọc, biến gán từ lời gọi ⇒ vẫn có route", async () => {
    const code = `
import express from 'express';
const router = express.Router();
const handler = (req: any, res: any) => res.send('ok');
const ctrl = { go: (req: any, res: any) => res.send('ok') };
const asyncHandler = (f: any) => f;
const makeHandler = (c: any) => handler;
const cfg = {};
const h = makeHandler(cfg);
router.get('/x', handler);
router.get('/y', asyncHandler(ctrl.go));
router.get('/z', h);
`;
    expect(await routes(code)).toEqual(["GET /x", "GET /y", "GET /z"]);
  });

  it("ENG-40: biến tên bất kỳ tạo từ Router(), express(), fastify() ⇒ có route", async () => {
    const code = `
import express, { Router } from 'express';
import Fastify from 'fastify';
const api = Router();
const web = express();
const srv = Fastify({ logger: true });
const v1 = require('express').Router();
api.get('/a', () => 1);
web.post('/b', () => 1);
srv.get('/c', () => 1);
v1.get('/d', () => 1);
`;
    expect(await routes(code)).toEqual(["GET /a", "POST /b", "GET /c", "GET /d"]);
  });

  it("ENG-40: receiver là tham số, field hoặc import nội bộ đúng tên ⇒ có route", async () => {
    const code = `
import router from './base';
import adminRouter from '@/admin';
export function mount(app: any) { app.get('/a', () => 1); }
export default async function plugin(fastify: any) { fastify.post('/b', async () => 1); }
class Users { router: any; init() { this.router.get('/c', () => 1); } }
router.get('/d', () => 1);
adminRouter.get('/e', () => 1);
`;
    expect(await routes(code, { "src/base.ts": "export default {};" })).toEqual([
      "GET /a", "POST /b", "GET /c", "GET /d", "GET /e",
    ]);
  });

  it("ENG-40: R.route(path).get(fn) ⇒ vẫn nhận theo receiver gốc", async () => {
    const code = `
import { Router } from 'express';
const r = Router();
const a = (x: any) => x;
const b = (x: any) => x;
r.route('/u').get(a, b);
`;
    expect((await routes(code)).length).toBe(1);
  });
});

describe("ING-87: isTestPath dùng chung", () => {
  it.each([
    "src/a.spec.ts", "src/a.test.ts", "src/test_a.py", "src/__tests__/a.ts", "tests/a.ts",
    "integration/cookies/app.ts", "sample/01/app.ts", "samples/a.ts",
    "src/testing/mocks/handlers.ts", "src/__mocks__/a.ts", "examples/a.ts", ".github/a.ts", "lib_src/a.ts",
  ])("ING-87: %s mang cờ", (p) => {
    expect(isTestPath(p)).toBe(true);
  });

  it.each([
    "src/integration/stripe.service.ts", "src/samples/sample.controller.ts", "src/orders/order.service.ts",
    "packages/core/router.ts",
  ])("ING-87: %s không mang cờ", (p) => {
    expect(isTestPath(p)).toBe(false);
  });
});

describe("ENG-110, D-12: lọc bài mang cờ và Capstone", () => {
  const zip = (files: Record<string, string>) => {
    const bytes = fflate.zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [`r/${k}`, fflate.strToU8(v)])));
    return { kind: "ZIP_UPLOAD" as const, file_name: "r.zip", bytes, subdir_override: null };
  };
  const pkg = JSON.stringify({ name: "x", dependencies: { express: "^4" } });
  const routeFile = (prefix: string, n: number) =>
    `import { Router } from "express";\nconst router = Router();\n` +
    Array.from({ length: n }, (_, i) => `router.get("/${prefix}${i}", (req: any, res: any) => {\n  res.json({ i: ${i} });\n});\n`).join("") +
    `export default router;\n`;
  const complexFn = `export function hard(a: number[]) {\n  let s = 0;\n  for (const x of a) {\n    for (const y of a) {\n      for (const z of a) {\n        if (x > y) {\n          if (y > z) {\n            if (x > z) s++;\n          }\n        }\n      }\n    }\n  }\n  return s;\n}\n`;

  it("T-ENG-42: đủ bài sạch ⇒ bỏ bài từ .spec, Capstone không ở file test", async () => {
    const r = await runEngine(zip({ "package.json": pkg, "src/routes.ts": routeFile("a", 7), "src/a.spec.ts": complexFn }));
    expect(r.nodes.some((n) => n.files[0]?.includes(".spec"))).toBe(false);
    expect(r.nodes.find((n) => n.is_capstone)?.files[0]).toBe("src/routes.ts");
  });

  it("T-ENG-43: thiếu bài sạch ⇒ giữ bài sạch, chỉ bù đủ 6, Capstone là bài sạch", async () => {
    const r = await runEngine(zip({ "package.json": pkg, "src/routes.ts": routeFile("a", 2), "integration/routes.ts": routeFile("b", 8) }));
    expect(r.nodes.length).toBe(6);
    expect(r.nodes.filter((n) => n.files[0] === "src/routes.ts").length).toBe(2);
    expect(r.nodes.find((n) => n.is_capstone)?.files[0]).toBe("src/routes.ts");
    expect(r.ingestion_report.omitted_node_count).toBe(0);
  });

  it("T-ENG-44: không có bài sạch ⇒ giữ nguyên", async () => {
    const r = await runEngine(zip({ "package.json": pkg, "integration/routes.ts": routeFile("b", 8) }));
    expect(r.nodes.length).toBe(8);
  });
});
