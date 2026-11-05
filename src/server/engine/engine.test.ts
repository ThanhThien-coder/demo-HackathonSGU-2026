import { describe, expect, it } from "vitest";
import { buildGraph, mainPath, toClientResult } from "./index";
import { processArchive } from "./ingest";
import { parseGithubUrl } from "./ingest/url";
import { redactSecrets } from "./ingest/secrets";
import { shopZip } from "./__fixtures__/shop-api";
import { AppError } from "../errors";

const ctx = { repo_name: "shop-api", repo_key: "me/shop-api", source: "ZIP" as const, ref: null, ref_label: null, explicit_subdir: null };

describe("ING url / secrets", () => {
  it("T-ING-01/02 chuẩn hóa link", () => {
    expect(parseGithubUrl("  https://github.com/nestjs/nest.git?tab=readme#x ")).toMatchObject({ owner: "nestjs", repo: "nest", path_trimmed: false, clean_url: "https://github.com/nestjs/nest" });
    for (const u of ["git@github.com:a/b.git", "github.com/a/b/", "https://www.github.com/a/b", "https://github.com/a/b/pulls"]) {
      expect(parseGithubUrl(u)).toMatchObject({ owner: "a", repo: "b", path_trimmed: false });
    }
  });
  it("T-ING-03 link /tree/ bị cắt về gốc", () => expect(parseGithubUrl("https://github.com/a/b/tree/release/v2/src")).toMatchObject({ repo: "b", path_trimmed: true }));
  it("T-ING-06 link sai", () => {
    expect(() => parseGithubUrl("https://gitlab.com/a/b")).toThrow(AppError);
    expect(() => parseGithubUrl("https://github.com/a")).toThrow(AppError);
  });
  it("T-ING-27 che secret", () => {
    expect(redactSecrets(`const JWT_SECRET = "abc123xyz";`).code).toBe(`const JWT_SECRET = "<REDACTED_SECRET>";`);
    expect(redactSecrets(`password = "12345"`).count).toBe(0);
    expect(redactSecrets("postgres://u:p4ss@h/db").code).toBe("postgres://u:<REDACTED_SECRET>@h/db");
    expect(redactSecrets(`{"password": "abc123xyz"}`).count).toBe(1);
    expect(redactSecrets(`x ? 'current-password' : 'new-password'`).count).toBe(0);
  });
  it("T-ING-26 khối private key bảo toàn dòng", () => {
    const key = "-----BEGIN RSA PRIVATE KEY-----\nAAA\nBBB\nCCC\n-----END RSA PRIVATE KEY-----";
    const r = redactSecrets(key);
    expect(r.count).toBe(1);
    expect(r.code.split("\n")).toHaveLength(5);
  });
});

describe("Engine shop-api", () => {
  it("dựng bản đồ từ zip, che secret, có entry route", async () => {
    const out = processArchive(shopZip(), ctx);
    expect(out.report.redacted_secret_count).toBeGreaterThanOrEqual(1);
    expect(out.code.get("src/middlewares/auth.middleware.ts")).toContain("<REDACTED_SECRET>");
    expect(out.fingerprint.archetype).toBe("WEB_BACKEND");
    expect(out.fingerprint.detected_framework).toBe("Express");
    expect(out.fingerprint.tech_stack).toEqual(expect.arrayContaining(["express", "typeorm", "pg", "zod", "jsonwebtoken"]));

    const g = await buildGraph(out);
    const titles = g.nodes.map((n) => n.title);
    expect(g.nodes.length).toBeGreaterThanOrEqual(3);
    expect(titles).toEqual(expect.arrayContaining(["User Profile", "List Products", "Order Checkout"]));
    expect(g.nodes.filter((n) => n.is_capstone)).toHaveLength(1);
    for (const n of g.nodes) {
      expect(n.trace_steps.length).toBeGreaterThan(0);
      expect(n.trace_steps.reduce((a, s) => a + s.snippet_line_map.length, 0)).toBeLessThanOrEqual(100);
      for (const s of n.trace_steps) expect(s.snippet.split("\n")).toHaveLength(s.snippet_line_map.length);
    }
    // N3: entry → service → repo, vòng lặp truy vấn còn trong snippet
    const list = g.nodes.find((n) => n.title === "List Products")!;
    expect(list.node_type).toBe("ARCHITECTURAL_DATA_FLOW");
    expect(list.trace_steps[0].layer).toBe("ENTRY_POINT");
    expect(list.trace_steps.some((s) => s.snippet.includes("categoryRepo.findById"))).toBe(true);
    // đồ thị không chu trình, mọi prerequisite tồn tại
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const n of g.nodes) for (const p of n.prerequisites) expect(ids.has(p)).toBe(true);
    expect(mainPath(g.nodes, g.edges).length).toBeGreaterThan(0);
  });

  it("T-ENG-33 toClientResult không lộ whitelist / suspicious files", async () => {
    const g = await buildGraph(processArchive(shopZip(), ctx));
    const c = toClientResult(g);
    expect("symbol_whitelist" in c).toBe(false);
    expect("suspicious_instruction_files" in c.ingestion_report).toBe(false);
  });

  it("T-ENG-34 tất định: 2 lần chạy cùng zip cho cùng nodes/edges/whitelist", async () => {
    const a = await buildGraph(processArchive(shopZip(), ctx));
    const b = await buildGraph(processArchive(shopZip(), ctx));
    expect(JSON.stringify([a.nodes, a.edges, a.symbol_whitelist])).toBe(JSON.stringify([b.nodes, b.edges, b.symbol_whitelist]));
  });
});
