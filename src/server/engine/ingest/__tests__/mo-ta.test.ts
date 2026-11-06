import { describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { buildProjectText, pickReadmeEntry } from "../fingerprint";
import { runIngest } from "../index";
import type { ClassifiedEntry, ScopeDecision } from "../types";

const enc = fflate.strToU8;

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

const scope = (root_dir_offset: string): ScopeDecision => ({
  root_dir_offset,
  is_monorepo: root_dir_offset !== "",
  candidates: [],
  explicit: false,
});

function entry(path: string, size = 100): ClassifiedEntry {
  return {
    path,
    compressed_size: size,
    size,
    method: 8,
    local_offset: 0,
    is_dir: false,
    is_symlink: false,
    is_encrypted: false,
    cls: "OTHER",
    language: null,
  } as ClassifiedEntry;
}

// Khóa giả, ghép chuỗi để hook quét khóa không nhận nhầm là khóa thật
const FAKE_AWS = "AK" + "IA" + "ABCDEFGHIJKLMNOP";

describe("T-ING-35 (ING-123): readme_excerpt", () => {
  it("README 3000 ký tự có khóa AKIA ở đầu => đã che, ≤ OVERVIEW_README_MAX_CHARS, đếm secret", () => {
    const rep = report();
    const readme = `Key: ${FAKE_AWS}\n` + "x".repeat(3000);
    const res = buildProjectText(readme, new Map(), scope(""), rep);
    expect(res.readme_excerpt).not.toBeNull();
    expect(res.readme_excerpt).not.toContain(FAKE_AWS);
    expect(res.readme_excerpt).toContain("<REDACTED_SECRET>");
    expect(res.readme_excerpt!.length).toBeLessThanOrEqual(CONFIG.OVERVIEW_README_MAX_CHARS);
    expect(rep.redacted_secret_count).toBeGreaterThanOrEqual(1);
  });

  it("không có README hoặc README chỉ có khoảng trắng => null", () => {
    expect(buildProjectText(null, new Map(), scope(""), report()).readme_excerpt).toBeNull();
    expect(buildProjectText("  \n \n", new Map(), scope(""), report()).readme_excerpt).toBeNull();
  });

  it("runIngest: README ra readme_excerpt đã che, không nằm trong code hay manifests", async () => {
    const zip = fflate.zipSync({
      "repo/package.json": enc(JSON.stringify({ name: "x" })),
      "repo/README.md": enc(`# Shop\nKey: ${FAKE_AWS}\n` + "y".repeat(3000)),
      "repo/src/index.ts": enc("export const a = 1;\n"),
    });
    const out = await runIngest({
      kind: "ZIP_UPLOAD",
      file_name: "repo.zip",
      bytes: zip,
      subdir_override: null,
    });
    expect(out.readme_excerpt).toContain("# Shop");
    expect(out.readme_excerpt).not.toContain(FAKE_AWS);
    expect(out.readme_excerpt!.length).toBeLessThanOrEqual(CONFIG.OVERVIEW_README_MAX_CHARS);
    expect(out.report.redacted_secret_count).toBeGreaterThanOrEqual(1);
    expect([...out.code.keys()].some((p) => /readme/i.test(p))).toBe(false);
    expect([...out.manifests.keys()].some((p) => /readme/i.test(p))).toBe(false);
  });

  it("runIngest: repo không có README => null", async () => {
    const zip = fflate.zipSync({
      "repo/package.json": enc(JSON.stringify({ name: "x" })),
      "repo/src/index.ts": enc("export const a = 1;\n"),
    });
    const out = await runIngest({
      kind: "ZIP_UPLOAD",
      file_name: "repo.zip",
      bytes: zip,
      subdir_override: null,
    });
    expect(out.readme_excerpt).toBeNull();
    expect(out.manifest_description).toBeNull();
  });
});

describe("T-ING-36 (ING-123): chọn README và manifest_description theo offset", () => {
  it("có README ở offset và ở gốc => lấy của offset", () => {
    const entries = [entry("README.md"), entry("apps/api/README.md"), entry("apps/api/docs/README.md")];
    expect(pickReadmeEntry(entries, scope("apps/api/"))?.path).toBe("apps/api/README.md");
  });

  it("chỉ có README ở gốc => lấy README gốc", () => {
    const entries = [entry("README.md"), entry("apps/api/src/a.ts")];
    expect(pickReadmeEntry(entries, scope("apps/api/"))?.path).toBe("README.md");
  });

  it("nhiều README cùng thư mục => path nhỏ nhất; không phân biệt hoa thường", () => {
    const entries = [entry("readme.txt"), entry("README.md"), entry("Readme")];
    expect(pickReadmeEntry(entries, scope(""))?.path).toBe("README.md");
  });

  it("README quá lớn hoặc không có => null; tên giống README nhưng không khớp thì bỏ", () => {
    expect(
      pickReadmeEntry([entry("README.md", CONFIG.MAX_MANIFEST_BYTES + 1)], scope(""))
    ).toBeNull();
    expect(pickReadmeEntry([entry("README-old.md"), entry("readme.md.bak")], scope(""))).toBeNull();
    expect(pickReadmeEntry([], scope(""))).toBeNull();
  });

  it("package.json có description => manifest_description là chuỗi đó; không có => null", () => {
    const withDesc = new Map([["package.json", JSON.stringify({ description: "Shop API" })]]);
    expect(buildProjectText(null, withDesc, scope(""), report()).manifest_description).toBe(
      "Shop API"
    );
    const without = new Map([["package.json", JSON.stringify({ name: "x" })]]);
    expect(buildProjectText(null, without, scope(""), report()).manifest_description).toBeNull();
  });

  it("manifest trong offset được ưu tiên hơn manifest ở gốc", () => {
    const manifests = new Map([
      ["package.json", JSON.stringify({ description: "Gốc" })],
      ["apps/api/package.json", JSON.stringify({ description: "Của api" })],
    ]);
    expect(
      buildProjectText(null, manifests, scope("apps/api/"), report()).manifest_description
    ).toBe("Của api");
  });

  it("pyproject.toml [project].description và pom.xml <description> của project", () => {
    const py = new Map([
      [
        "pyproject.toml",
        '[tool.x]\ndescription = "sai chỗ"\n\n[project]\nname = "a"\ndescription = "Mô tả py"\n',
      ],
    ]);
    expect(buildProjectText(null, py, scope(""), report()).manifest_description).toBe("Mô tả py");

    const pom = new Map([
      [
        "pom.xml",
        "<project><dependencies><dependency><description>không lấy</description></dependency></dependencies>" +
          "<description>Mô tả pom</description></project>",
      ],
    ]);
    expect(buildProjectText(null, pom, scope(""), report()).manifest_description).toBe(
      "Mô tả pom"
    );
  });

  it("mô tả có secret bị che", () => {
    const rep = report();
    const manifests = new Map([["package.json", JSON.stringify({ description: `key ${FAKE_AWS}` })]]);
    const res = buildProjectText(null, manifests, scope(""), rep);
    expect(res.manifest_description).not.toContain(FAKE_AWS);
    expect(rep.redacted_secret_count).toBeGreaterThanOrEqual(1);
  });
});
