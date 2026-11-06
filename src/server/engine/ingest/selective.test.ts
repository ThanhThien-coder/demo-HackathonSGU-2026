// 10 Mục 4A (ING-46..49) + ING-42/131: zip GitHub bị cắt ⇒ tải chọn lọc từng file, hoặc lùi về phần zip đã giữ.
import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts/config";
import { AppError } from "../../errors";
import { type Call, type Route, bodyResponse, fakeNet, hang, json, settle, status, text } from "./__fixtures__/fake-net";
import { runIngest } from "./index";
import { classifyEntry } from "./prune";
import { autoScopeOffset } from "./selective";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const MAX = CONFIG.MAX_STREAM_BYTES;
const SRC = { kind: "GITHUB_COMMIT" as const, owner: "o", repo: "r", sha: SHA, subdir: "" };
const WARN_NO_LISTING = "Không lấy được danh sách file, có thể thiếu thư mục chính.";

/** Repo "thật" trên GitHub (chỉ tải được qua API + raw). */
const code = (name: string, lines: number) => Array.from({ length: lines }, (_, i) => `export const ${name}${i} = ${i};`).join("\n") + "\n";
const REMOTE: Record<string, string> = {
  "package.json": '{"name":"big","dependencies":{"express":"^4.18.0"}}',
  "core/package.json": '{"name":"core"}',
  "core/app/package.json": '{"name":"app","dependencies":{"express":"^4.18.0"}}',
  "core/app/routes.ts": code("route", 100),
  "core/app/service.ts": code("service", 100),
  "core/app/repo.ts": code("repo", 100),
  "core/lib/util.ts": code("util", 10),
  "tools/gen.ts": code("gen", 10),
  "tests/a.test.ts": code("spec", 10),
  "docs/readme.md": "# hi\n",
  "assets/logo.png": "\u0000PNG",
  "node_modules/x/index.js": "module.exports = 1;\n",
};
for (let i = 0; i < 105; i++) REMOTE[`tools/gen/g${String(i).padStart(3, "0")}.ts`] = `export const g${i} = ${i};\n`; // vượt MAX_CLEAN_FILES
const TOTAL_CODE = Object.keys(REMOTE).filter((p) => p.endsWith(".ts")).length; // 111 file .ts

const tree = (extra: Record<string, unknown> = {}) => ({
  sha: SHA,
  truncated: false,
  tree: [
    ...Object.entries(REMOTE).map(([path, c]) => ({ path, mode: "100644", type: "blob", sha: "x", size: Buffer.byteLength(c) })),
    { path: "link.ts", mode: "120000", type: "blob", sha: "x", size: 5 }, // symlink: bỏ
    { path: "core", mode: "040000", type: "tree", sha: "x" },           // thư mục: bỏ
    { path: "vendor-sub", mode: "160000", type: "commit", sha: "x" },   // submodule: bỏ
  ],
  ...extra,
});

/** Zip bị cắt: vài file đầu trọn vẹn rồi một file nhị phân vượt trần ⇒ tải về còn đúng MAX byte. */
function cutZip(head: Record<string, string>): Uint8Array {
  const e: Record<string, Uint8Array> = {};
  for (const [p, c] of Object.entries(head)) e[`r-main/${p}`] = strToU8(c);
  e["r-main/assets/big.bin"] = new Uint8Array(MAX);
  return zipSync(e, { level: 0 });
}
const HEAD_OK: Record<string, string> = { "package.json": '{"name":"r"}', "src/a.ts": code("a", 5), "src/b.ts": code("b", 5), "src/c.ts": code("c", 5) };
let ZIP: Uint8Array;
let ZIP_NODE_MODULES: Uint8Array;
beforeAll(() => {
  ZIP = cutZip(HEAD_OK);
  ZIP_NODE_MODULES = cutZip({ "node_modules/x/index.js": code("x", 5), "node_modules/y/index.js": code("y", 5) });
});

const ROUTE = {
  codeload: /^GET https:\/\/codeload\.github\.com\/o\/r\/zip\/.+$/,
  headZipHead: /^HEAD https:\/\/github\.com\/o\/r\/archive\/HEAD\.zip$/,
  headZipGet: /^GET https:\/\/github\.com\/o\/r\/archive\/HEAD\.zip$/,
  commit: /^GET https:\/\/api\.github\.com\/repos\/o\/r\/commits\/(.+)$/,
  tree: /^GET https:\/\/api\.github\.com\/repos\/o\/r\/git\/trees\/([0-9a-f]{40})\?recursive=1$/,
  raw: /^GET https:\/\/raw\.githubusercontent\.com\/o\/r\/([0-9a-f]{40})\/(.+)$/,
};

interface Over { commit?: Route; tree?: Route; raw?: Route; headZip?: Route }
function repoNet(zip: Uint8Array, over: Over = {}) {
  let inFlight = 0;
  let peak = 0;
  const rawDefault: Route = async (m) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 1)); // cho các cuộc gọi chồng lên nhau
    inFlight--;
    const path = decodeURIComponent(m[2]);
    return path in REMOTE ? text(REMOTE[path]) : status(404);
  };
  const net = fakeNet([
    [ROUTE.headZipHead, over.headZip ?? (() => status(302, { location: "https://codeload.github.com/o/r/zip/refs/heads/main" }))],
    [ROUTE.codeload, () => bodyResponse(zip, 1024 * 1024 + 17)],
    [ROUTE.headZipGet, () => bodyResponse(zip, 1024 * 1024 + 17)],
    [ROUTE.commit, over.commit ?? (() => text(SHA))],
    [ROUTE.tree, over.tree ?? (() => json(tree()))],
    [ROUTE.raw, over.raw ?? rawDefault],
  ]);
  return { net, peak: () => peak };
}
const callsTo = (net: { calls: Call[] }, host: string) => net.calls.filter((c) => c.url.startsWith(`https://${host}`));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("ING-46..48 — tải chọn lọc khi zip bị cắt", () => {
  it("danh sách từ API ⇒ tự chọn thư mục ⇒ tải riêng từng file ⇒ snapshot COMMIT_SHA", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const { net, peak } = repoNet(ZIP);
    const out = await runIngest(SRC);

    expect(out.report).toMatchObject({ selective_fetch: true, truncated: true });
    expect(out.snapshot).toEqual({ source: "GITHUB", repo_key: "o/r", snapshot_id: SHA, snapshot_id_kind: "COMMIT_SHA", subdir: "", ref_label: null });
    expect(out.fingerprint.root_dir_offset).toBe("core/app/"); // ING-47: core/ nhiều byte nhất, core/app/ ≥ 0.5 × core/

    // ING-48: manifest chỉ lấy ở gốc hoặc trong scope — core/package.json (ngoài scope, không ở gốc) không được tải
    expect([...out.manifests.keys()].sort()).toEqual(["core/app/package.json", "package.json"]);
    // quota như Mục 9: đủ MAX_CLEAN_FILES theo FPS, file trong scope đứng đầu
    expect(out.code.size).toBe(CONFIG.MAX_CLEAN_FILES);
    for (const p of ["core/app/routes.ts", "core/app/service.ts", "core/app/repo.ts"]) expect(out.code.has(p)).toBe(true);
    expect(out.report.skipped.quota).toBe(TOTAL_CODE - CONFIG.MAX_CLEAN_FILES);
    expect(out.report.warnings).toEqual(expect.arrayContaining([
      "Repo lớn — đang phân tích core/app/; có thể chọn thư mục khác.",
      `Repository lớn — chỉ phân tích ${CONFIG.MAX_CLEAN_FILES}/${TOTAL_CODE} tệp mã nguồn được ưu tiên.`,
    ]));
    expect(out.report.warnings).not.toContain(WARN_NO_LISTING);

    // ING-46: API có token, đúng Accept; cây dùng sha vừa lấy
    const [commit] = callsTo(net, "api.github.com").filter((c) => c.url.includes("/commits/"));
    expect(commit.url).toBe(`https://api.github.com/repos/o/r/commits/${SHA}`);
    expect(commit.headers).toMatchObject({ Accept: "application/vnd.github.sha", Authorization: "Bearer test-token" });
    expect(callsTo(net, "api.github.com").some((c) => c.url.endsWith(`/git/trees/${SHA}?recursive=1`))).toBe(true);
    // ING-48: raw đúng sha, không gửi token, chỉ file được chọn (100 code + 2 manifest), song song ≤ SELECTIVE_FETCH_CONCURRENCY
    const raws = callsTo(net, "raw.githubusercontent.com");
    expect(raws).toHaveLength(CONFIG.MAX_CLEAN_FILES + 2);
    expect(raws.every((c) => c.url.startsWith(`https://raw.githubusercontent.com/o/r/${SHA}/`) && !("Authorization" in c.headers))).toBe(true);
    expect(raws.some((c) => /core\/package\.json|node_modules|logo\.png|readme\.md|link\.ts/.test(c.url))).toBe(false);
    expect(peak()).toBeGreaterThan(1);
    expect(peak()).toBeLessThanOrEqual(CONFIG.SELECTIVE_FETCH_CONCURRENCY);
  });

  it("tất định: hai lần chạy cho cùng danh sách file và nội dung", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    repoNet(ZIP);
    const a = await runIngest(SRC);
    const b = await runIngest(SRC);
    expect(JSON.stringify([...a.code])).toBe(JSON.stringify([...b.code]));
    expect(a.fingerprint).toEqual(b.fingerprint);
  });

  it("link GitHub: ref là nhánh ⇒ commits/main; HEAD.zip không chuyển hướng ⇒ commits/HEAD", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    const url = { kind: "GITHUB_URL" as const, repo_url: "https://github.com/o/r", subdir_override: null };
    const a = repoNet(ZIP);
    const outA = await runIngest(url);
    expect(callsTo(a.net, "api.github.com").find((c) => c.url.includes("/commits/"))?.url).toBe("https://api.github.com/repos/o/r/commits/main");
    expect(outA.snapshot).toMatchObject({ snapshot_id: SHA, snapshot_id_kind: "COMMIT_SHA", ref_label: "main" });

    const b = repoNet(ZIP, { headZip: () => status(200) });
    await runIngest(url);
    expect(callsTo(b.net, "api.github.com").find((c) => c.url.includes("/commits/"))?.url).toBe("https://api.github.com/repos/o/r/commits/HEAD");
  });

  it("scope tường minh ⇒ không tự chọn thư mục; subdir lưu vào snapshot", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    repoNet(ZIP);
    const out = await runIngest({ ...SRC, subdir: "tools" });
    expect(out.fingerprint.root_dir_offset).toBe("tools/");
    expect(out.snapshot.subdir).toBe("tools/");
    expect(out.report.warnings.some((w) => w.startsWith("Repo lớn — đang phân tích"))).toBe(false);
    expect([...out.manifests.keys()]).toEqual(["package.json"]); // chỉ manifest ở gốc (tools/ không có manifest riêng)
  });

  it("scope tường minh không có code ⇒ ERR_NO_SOURCE_FILES_FOUND (ING-80), không lùi sang zip", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    repoNet(ZIP);
    const err = await runIngest({ ...SRC, subdir: "nope/" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: "ERR_NO_SOURCE_FILES_FOUND", details: { subdir: "nope/", hint: "empty_subdir" } });
  });

  it("1 file lỗi một lần rồi được ⇒ thử lại thành công, vẫn là tải chọn lọc", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    let hits = 0;
    const { net } = repoNet(ZIP, {
      raw: (m) => {
        const path = decodeURIComponent(m[2]);
        if (path === "core/app/service.ts" && hits++ === 0) return status(502);
        return text(REMOTE[path]);
      },
    });
    const out = await runIngest(SRC);
    expect(out.report.selective_fetch).toBe(true);
    expect(net.calls.filter((c) => c.url.endsWith("/core/app/service.ts"))).toHaveLength(2);
  });

  it("zip không bị cắt ⇒ không gọi API / raw, selective_fetch false", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    const small = zipSync({ "r-main/src/a.ts": strToU8(code("a", 5)) });
    const net = fakeNet([[ROUTE.codeload, () => bodyResponse(small)]]);
    const out = await runIngest(SRC);
    expect(out.report).toMatchObject({ selective_fetch: false, truncated: false });
    expect(callsTo(net, "api.github.com")).toHaveLength(0);
    expect(callsTo(net, "raw.githubusercontent.com")).toHaveLength(0);
  });
});

describe("ING-49 — không tải chọn lọc được ⇒ phân tích phần zip đã giữ", () => {
  const cases: Array<{ name: string; token: string; over: Over; api: number }> = [
    { name: "thiếu GITHUB_TOKEN", token: "", over: {}, api: 0 },
    { name: "API 401", token: "t", over: { commit: () => status(401) }, api: 1 },
    { name: "API 403", token: "t", over: { commit: () => status(403) }, api: 1 },
    { name: "API 429", token: "t", over: { commit: () => status(429) }, api: 1 },
    { name: "mã commit trả về không phải SHA", token: "t", over: { commit: () => text("<html>oops</html>") }, api: 1 },
    { name: "cây truncated: true", token: "t", over: { tree: () => json(tree({ truncated: true })) }, api: 2 },
    { name: "1 file lỗi sau 1 lần thử lại", token: "t", over: { raw: () => status(500) }, api: 2 },
  ];

  it.each(cases)("$name", async ({ token, over, api }) => {
    vi.stubEnv("GITHUB_TOKEN", token);
    const { net } = repoNet(ZIP, over);
    const out = await runIngest(SRC);

    expect(out.report).toMatchObject({ selective_fetch: false, truncated: true });
    expect([...out.code.keys()]).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]); // chỉ phần đầu zip còn trọn vẹn
    expect(out.report.warnings).toEqual(expect.arrayContaining([
      WARN_NO_LISTING,
      "Repository lớn — chỉ phân tích 3 tệp mã nguồn được ưu tiên.",
    ]));
    expect(callsTo(net, "api.github.com")).toHaveLength(api);
  });

  it("T-ING-10 (link nhánh): giữ đúng MAX byte, ARCHIVE_HASH = SHA-256 phần giữ, 3 file", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    repoNet(ZIP);
    const out = await runIngest({ kind: "GITHUB_URL", repo_url: "https://github.com/o/r", subdir_override: null });
    const kept = createHash("sha256").update(ZIP.subarray(0, MAX)).digest("hex");
    expect(out.snapshot).toMatchObject({ snapshot_id: kept, snapshot_id_kind: "ARCHIVE_HASH", ref_label: "main" });
    expect(out.code.size).toBe(3);
    expect(out.report.truncated).toBe(true);
    expect(out.report.warnings).toContain("Không đọc được mã commit của repo — dùng mã băm của file zip để nhận diện phiên bản.");
  });

  it("T-ING-10 (phiên mở lại bằng SHA): snapshot giữ nguyên COMMIT_SHA dù zip bị cắt", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    repoNet(ZIP);
    const out = await runIngest(SRC);
    expect(out.snapshot).toMatchObject({ snapshot_id: SHA, snapshot_id_kind: "COMMIT_SHA" });
  });

  it("T-ING-11: phần đầu zip chỉ có node_modules/** ⇒ ERR_STREAM_QUOTA_EXCEEDED", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    repoNet(ZIP_NODE_MODULES);
    await expect(runIngest(SRC)).rejects.toMatchObject({ code: "ERR_STREAM_QUOTA_EXCEEDED" });
  });

  it("hết SELECTIVE_TIMEOUT_MS khi hỏi API ⇒ lùi", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GITHUB_TOKEN", "t");
    repoNet(ZIP, { commit: (_m, _c, init) => hang(init) });
    const r = await settle(runIngest(SRC));
    expect(r).toMatchObject({ ok: { report: { selective_fetch: false, truncated: true } } });
    expect("ok" in r && r.ok.report.warnings).toContain(WARN_NO_LISTING);
  });

  it("hết SELECTIVE_TIMEOUT_MS khi đang tải file ⇒ lùi", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GITHUB_TOKEN", "t");
    repoNet(ZIP, { raw: (_m, _c, init) => hang(init) });
    const r = await settle(runIngest(SRC));
    expect(r).toMatchObject({ ok: { report: { selective_fetch: false } } });
    expect("ok" in r && [...r.ok.code.keys()]).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });
});

describe("ING-47 — autoScopeOffset", () => {
  const entriesOf = (files: Record<string, number>) =>
    Object.entries(files).map(([path, size]) => {
      const m = { path, raw_name: path, compressed_size: 0, size, is_dir: false };
      return { ...m, ...classifyEntry(m) };
    });

  it("con lớn nhất ≥ AUTO_SCOPE_CHILD_RATIO × cha ⇒ lấy con", () => {
    expect(autoScopeOffset(entriesOf({ "core/app/a.ts": 6000, "core/lib/b.ts": 3000, "tools/c.ts": 5000 }))).toBe("core/app/");
  });

  it("con nhỏ hơn ngưỡng ⇒ giữ thư mục độ sâu 1", () => {
    expect(autoScopeOffset(entriesOf({ "core/a/x.ts": 2000, "core/b/y.ts": 2000, "core/c/z.ts": 2000, "tools/c.ts": 5000 }))).toBe("core/");
  });

  it("file nằm thẳng trong thư mục cha tính vào cha nhưng không vào con", () => {
    expect(autoScopeOffset(entriesOf({ "src/index.ts": 5000, "src/a/x.ts": 1000 }))).toBe("src/");
  });

  it("bỏ file cờ test (ING-87); hòa ⇒ path nhỏ hơn", () => {
    expect(autoScopeOffset(entriesOf({ "tests/a.test.ts": 9000, "zeta/a.ts": 100, "alpha/b.ts": 100 }))).toBe("alpha/");
  });

  it("không có thư mục nào chứa code ⇒ chuỗi rỗng", () => {
    expect(autoScopeOffset(entriesOf({ "main.ts": 100, "util.ts": 50, "README.md": 10 }))).toBe("");
  });
});
