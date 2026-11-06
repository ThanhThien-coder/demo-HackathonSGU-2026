import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { selectiveFetch } from "../selective";

const originalFetch = globalThis.fetch;
const SHA = "a".repeat(40);

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function report(): IngestionReport {
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

const blob = (path: string, size = 100) => ({ path, type: "blob", mode: "100644", sha: "s", size });

/** Mock GitHub: trả cây tuỳ ý, raw trả nội dung cho mọi file (hoặc lỗi nếu failPath khớp). */
function mockGithub(
  tree: Array<ReturnType<typeof blob>>,
  opts: { delayMs?: number; failPath?: string } = {}
) {
  const rawCalls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const u = url.toString();
    if (u.includes("/git/trees/")) {
      return new Response(JSON.stringify({ tree, truncated: false }), { status: 200 });
    }
    const filePath = u.split(`/${SHA}/`)[1] ?? "";
    rawCalls.push(filePath);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    inFlight--;
    if (opts.failPath && filePath === opts.failPath) return new Response(null, { status: 500 });
    const body = filePath.endsWith("package.json") ? "{}" : "export const a = 1;\n";
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
  return { rawCalls, maxInFlight: () => maxInFlight };
}

const input = (rep: IngestionReport) => ({
  owner: "o",
  repo: "r",
  ref: SHA,
  ref_label: null,
  explicit_subdir: "",
  report: rep,
  token: "example-github-token",
});

describe("B-32: tải manifest song song và chỉ trong scope", () => {
  it("B-32: tải manifest theo lô song song, không quá SELECTIVE_FETCH_CONCURRENCY", async () => {
    const tree = [
      blob("backend/src/main.ts"),
      blob("backend/package.json"),
      ...Array.from({ length: 40 }, (_, i) => blob(`backend/pkg${i}/package.json`)),
    ];
    const gh = mockGithub(tree, { delayMs: 15 });
    const res = await selectiveFetch(input(report()));
    expect(res).not.toBeNull();
    expect(res!.scopeDecision.root_dir_offset).toBe("backend/");
    expect(res!.manifests.size).toBe(41);
    expect(gh.maxInFlight()).toBeGreaterThan(1);
    expect(gh.maxInFlight()).toBeLessThanOrEqual(CONFIG.SELECTIVE_FETCH_CONCURRENCY);
  });

  it("B-32: chỉ tải manifest trong scope và ở gốc, bỏ manifest của thư mục khác", async () => {
    const tree = [
      blob("package.json"),
      blob("backend/src/main.ts"),
      blob("backend/package.json"),
      blob("docs/site/package.json"),
      blob("examples/a/package.json"),
    ];
    const gh = mockGithub(tree);
    const res = await selectiveFetch(input(report()));
    expect(res).not.toBeNull();
    expect([...res!.manifests.keys()].sort()).toEqual(["backend/package.json", "package.json"]);
    expect(gh.rawCalls.filter((p) => p.endsWith("package.json")).sort()).toEqual([
      "backend/package.json",
      "package.json",
    ]);
  });

  it("B-32: đầu ra giống nhau giữa các lần chạy (tất định)", async () => {
    const tree = [
      blob("backend/src/main.ts"),
      ...Array.from({ length: 20 }, (_, i) => blob(`backend/p${i}/package.json`)),
    ];
    mockGithub(tree, { delayMs: 5 });
    const a = await selectiveFetch(input(report()));
    mockGithub(tree, { delayMs: 1 });
    const b = await selectiveFetch(input(report()));
    expect([...a!.manifests.keys()]).toEqual([...b!.manifests.keys()]);
  });

  it("B-32: lùi về zip (một file tải lỗi) thì bỏ cảnh báo phạm vi và không đếm đôi số đo", async () => {
    // Hai thư mục backend => cảnh báo "Phát hiện nhiều thư mục backend" được ghi trước khi tải
    const tree = [
      blob("backend/package.json"),
      blob("backend/src/a.ts"),
      blob("api/package.json"),
      blob("api/src/b.ts"),
      blob("logo.png"),
    ];
    mockGithub(tree, { failPath: "backend/src/a.ts" });
    const rep = report();
    const res = await selectiveFetch(input(rep));
    expect(res).toBeNull();
    expect(rep.warnings).toEqual([]);
    expect(rep.skipped).toEqual({
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    });
  });
});
