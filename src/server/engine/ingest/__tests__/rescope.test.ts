import { describe, expect, it } from "vitest";
import type { IngestOutput, IngestionReport } from "@/contracts";
import { detectScope } from "../fingerprint";
import { getScopeFallbacks, rememberScope, rescopeIngest } from "../rescope";
import type { ClassifiedEntry } from "../types";

function entry(path: string, size: number, cls: ClassifiedEntry["cls"] = "CODE"): ClassifiedEntry {
  return {
    path,
    compressed_size: size,
    size,
    method: 8,
    local_offset: 0,
    is_dir: false,
    is_symlink: false,
    is_encrypted: false,
    cls,
    language: cls === "CODE" ? "TYPESCRIPT" : null,
  } as ClassifiedEntry;
}

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

// Giống create-t3-turbo: gói api nhỏ, web lớn, có manifest từng gói
const t3 = [
  entry("package.json", 100, "MANIFEST"),
  entry("packages/api/package.json", 100, "MANIFEST"),
  entry("packages/api/src/a.ts", 500),
  entry("apps/nextjs/src/page.ts", 9000),
  entry("apps/web/src/app.ts", 3000),
  entry("packages/db-api/package.json", 100, "MANIFEST"),
  entry("packages/db-api/src/b.ts", 2000),
];

describe("B-17: ứng viên scope gồm cả client", () => {
  it("B-17: candidates = server rồi client, mỗi nhóm bytes giảm dần", () => {
    const scope = detectScope(t3, null);
    expect(scope.root_dir_offset).toBe("packages/db-api/");
    expect(scope.candidates).toEqual(["packages/db-api/", "packages/api/", "apps/web/"]);
  });

  it("B-17: scope tường minh vẫn chọn đúng thư mục, ứng viên giữ nguyên", () => {
    const scope = detectScope(t3, "apps/web/");
    expect(scope.root_dir_offset).toBe("apps/web/");
    expect(scope.explicit).toBe(true);
  });
});

describe("B-17: đường lùi scope (getScopeFallbacks, rescopeIngest)", () => {
  function fakeOutput(): IngestOutput {
    return {
      repo_name: "t3",
      manifests: new Map([["package.json", "{}"]]),
      code: new Map(),
      file_language: new Map(),
      source_map: new Map(),
      report: report(),
    } as unknown as IngestOutput;
  }

  it("B-17: scope tự chọn => các offset còn lại rồi cuối cùng rỗng", () => {
    const out = fakeOutput();
    rememberScope(out, t3, detectScope(t3, null));
    expect(getScopeFallbacks(out)).toEqual(["packages/api/", "apps/web/", ""]);
  });

  it("B-17: scope tường minh hoặc không có thông tin => không có đường lùi", () => {
    const out = fakeOutput();
    rememberScope(out, t3, detectScope(t3, "apps/web/"));
    expect(getScopeFallbacks(out)).toEqual([]);
    expect(getScopeFallbacks(fakeOutput())).toEqual([]);
  });

  it("B-17: rescopeIngest đổi root_dir_offset, giữ code, không sửa báo cáo gốc", () => {
    const out = fakeOutput();
    rememberScope(out, t3, detectScope(t3, null));
    const next = rescopeIngest(out, "apps/web/");
    expect(next.fingerprint.root_dir_offset).toBe("apps/web/");
    expect(next.manifests).toBe(out.manifests);
    expect(next.report).not.toBe(out.report);
    // lùi tiếp từ kết quả mới: bỏ offset hiện tại, thêm ""
    expect(getScopeFallbacks(next)).toEqual(["packages/db-api/", "packages/api/", ""]);
  });
});
