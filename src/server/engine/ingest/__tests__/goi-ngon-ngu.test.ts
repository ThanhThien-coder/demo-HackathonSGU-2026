import { describe, expect, it } from "vitest";
import type { IngestionReport, LanguageId } from "@/contracts";
import { buildFingerprint, parseManifests } from "../fingerprint";
import type { ClassifiedEntry, ScopeDecision } from "../types";

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

const scope: ScopeDecision = { root_dir_offset: "", is_monorepo: false, candidates: [], explicit: false };

function packagesOf(path: string, content: string): string[] {
  const list = parseManifests(new Map([[path, content]]), report());
  return list.find((m) => m.path === path)?.packages ?? [];
}

describe("B-23: manifest đọc đủ gói, không dừng ở chữ z", () => {
  it("Pipfile chỉ có [packages] ở cuối file", () => {
    expect(packagesOf("Pipfile", '[packages]\nrequests = "*"\n')).toEqual(["requests"]);
  });

  it("Pipfile có pytz trước fastapi vẫn đọc được fastapi", () => {
    const pipfile = '[packages]\npytz = "*"\nfastapi = "*"\nuvicorn = "*"\n';
    expect(packagesOf("Pipfile", pipfile).sort()).toEqual(["fastapi", "pytz", "uvicorn"]);
  });

  it("Pipfile có [packages] rồi [dev-packages]", () => {
    const pipfile = '[packages]\nflask = "*"\n\n[dev-packages]\npytest = "*"\n';
    expect(packagesOf("Pipfile", pipfile).sort()).toEqual(["flask", "pytest"]);
  });

  it("Cargo.toml có [dependencies] nằm cuối file, tên gói chứa chữ z", () => {
    const cargo = '[package]\nname = "x"\n\n[dependencies]\nserde = "1"\nzstd = "0.13"\n';
    expect(packagesOf("Cargo.toml", cargo).sort()).toEqual(["serde", "zstd"]);
  });

  it("pubspec.yaml có dependencies nằm cuối file", () => {
    const pubspec = "name: app\ndependencies:\n  flutter:\n    sdk: flutter\n  provider: ^6.0.0\n  zebra: ^1.0.0\n";
    expect(packagesOf("pubspec.yaml", pubspec).sort()).toEqual(["flutter", "provider", "zebra"]);
  });
});

function sfc(path: string): ClassifiedEntry {
  return {
    path,
    compressed_size: 100,
    size: 500,
    method: 8,
    local_offset: 0,
    is_dir: false,
    is_symlink: false,
    is_encrypted: false,
    cls: "SPECIAL",
    language: null,
  } as ClassifiedEntry;
}

describe("B-24: ngôn ngữ của .vue, .svelte theo ING-101", () => {
  it("19 file .vue đều là JavaScript => primary_language JAVASCRIPT", () => {
    const entries = Array.from({ length: 19 }, (_, i) => sfc(`src/c${i}.vue`));
    const fileLanguage = new Map<string, LanguageId>(
      entries.map((e) => [`${e.path}.js`, "JAVASCRIPT" as LanguageId])
    );
    const { fingerprint } = buildFingerprint(entries, new Map(), scope, report(), undefined, fileLanguage);
    expect(fingerprint.primary_language).toBe("JAVASCRIPT");
    expect(fingerprint.language_breakdown.map((l) => l.language)).toEqual(["JAVASCRIPT"]);
  });

  it("file có lang=ts (file ảo .ts) vẫn là TYPESCRIPT; trộn hai loại tách đúng byte", () => {
    const entries = [sfc("a.vue"), sfc("b.vue"), sfc("c.svelte")];
    const fileLanguage = new Map<string, LanguageId>([
      ["a.vue.ts", "TYPESCRIPT"],
      ["b.vue.js", "JAVASCRIPT"],
      ["c.svelte.js", "JAVASCRIPT"],
    ]);
    const { fingerprint } = buildFingerprint(entries, new Map(), scope, report(), undefined, fileLanguage);
    const bytes = Object.fromEntries(fingerprint.language_breakdown.map((l) => [l.language, l.code_bytes]));
    expect(bytes).toEqual({ JAVASCRIPT: 1000, TYPESCRIPT: 500 });
  });

  it("file không được giữ (không có trong file_language) dùng mặc định TYPESCRIPT", () => {
    const { fingerprint } = buildFingerprint([sfc("x.vue")], new Map(), scope, report(), undefined, new Map());
    expect(fingerprint.primary_language).toBe("TYPESCRIPT");
  });
});
