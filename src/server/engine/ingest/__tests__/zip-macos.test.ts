import { describe, expect, it } from "vitest";
import * as fflate from "fflate";
import type { IngestionReport } from "@/contracts";
import { detectScope } from "../fingerprint";
import { classifyEntry, DEFAULT_LANGUAGE_REGISTRY } from "../prune";
import { listEntries, listEntriesStreaming } from "../unzip";
import type { RawArchive } from "../types";

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

// Zip nén bằng Finder trên macOS: proj/... kèm __MACOSX/proj/._file và file ._ rải rác
function macZip(): Uint8Array {
  return fflate.zipSync({
    "proj/backend/src/main.ts": enc("export const a = 1;\n"),
    "proj/backend/package.json": enc("{}"),
    "proj/frontend/src/app.ts": enc("export const b = 1;\n"),
    "proj/._README.md": enc("junk"),
    "proj/backend/src/._main.ts": enc("junk"),
    "__MACOSX/proj/._README.md": enc("junk"),
    "__MACOSX/proj/backend/src/._main.ts": enc("junk"),
  });
}

const archive = (bytes: Uint8Array): RawArchive => ({ bytes, stream_cut: false, source: "ZIP" });

describe("B-19 (ING-60.3, ING-71): zip nén trên macOS", () => {
  it("B-19: bỏ __MACOSX/ và ._*, cắt thư mục gốc proj/, giữ backend/ frontend/", () => {
    const paths = listEntries(archive(macZip())).map((e) => e.path).sort();
    expect(paths).toEqual(["backend/package.json", "backend/src/main.ts", "frontend/src/app.ts"]);
  });

  it("B-19: chế độ streaming (dự phòng) cũng bỏ rác và cắt gốc", () => {
    const paths = listEntriesStreaming(macZip(), undefined, report()).map((e) => e.path).sort();
    expect(paths).toEqual(["backend/package.json", "backend/src/main.ts", "frontend/src/app.ts"]);
  });

  it("B-19: nhận ra monorepo backend/ + frontend/ sau khi cắt gốc", () => {
    const entries = listEntries(archive(macZip())).map((e) => {
      const { cls, language } = classifyEntry(e, DEFAULT_LANGUAGE_REGISTRY, report());
      return { ...e, cls, language };
    });
    const scope = detectScope(entries, null, report());
    expect(scope.is_monorepo).toBe(true);
    expect(scope.root_dir_offset).toBe("backend/");
  });

  it("B-19: zip GitHub thường (không có __MACOSX) vẫn cắt segment đầu như cũ", () => {
    const zip = fflate.zipSync({ "repo-main/a.ts": enc("x"), "repo-main/src/b.ts": enc("y") });
    expect(listEntries(archive(zip)).map((e) => e.path).sort()).toEqual(["a.ts", "src/b.ts"]);
  });

  it("B-19: file ._ ở gốc zip phẳng bị bỏ, file thường giữ", () => {
    const zip = fflate.zipSync({ "a.ts": enc("x"), "._a.ts": enc("junk"), "src/b.ts": enc("y") });
    expect(listEntries(archive(zip)).map((e) => e.path).sort()).toEqual(["a.ts", "src/b.ts"]);
  });

  it("B-19: tên chỉ chứa dấu chấm gạch dưới giữa chừng không bị coi là rác", () => {
    const zip = fflate.zipSync({ "r/my._file.ts": enc("x"), "r/b.ts": enc("y") });
    expect(listEntries(archive(zip)).map((e) => e.path).sort()).toEqual(["b.ts", "my._file.ts"]);
  });
});
