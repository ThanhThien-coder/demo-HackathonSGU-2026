import { beforeAll, describe, expect, it } from "vitest";
import type { IngestionReport, LanguageId } from "@/contracts";
import { parseJsonc, stripJsonc } from "../../jsonc";
import { parseManifests } from "../../ingest/fingerprint";
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

describe("B-25: parser JSONC dùng chung, có xét chuỗi", () => {
  it("giữ nguyên // và /* trong chuỗi", () => {
    const text = '{"a": "https://x.dev/y", "p": ["@/*", "src/**/*"]}';
    expect(parseJsonc(text)).toEqual({ a: "https://x.dev/y", p: ["@/*", "src/**/*"] });
  });

  it("bỏ comment dòng, comment khối, dấu phẩy thừa và BOM", () => {
    const text = '\uFEFF{\n // c1\n "a": 1, /* c2 */\n "b": [1, 2,],\n}\n';
    expect(parseJsonc(text)).toEqual({ a: 1, b: [1, 2] });
  });

  it("chuỗi có dấu nháy thoát không làm lệch bộ đọc", () => {
    expect(parseJsonc('{"a": "x\\"//y", "b": 2}')).toEqual({ a: 'x"//y', b: 2 });
  });

  it("comment nhiều dòng giữ số dòng", () => {
    const out = stripJsonc('{"a":1, /* x\n y */ "b":2}');
    expect(out.split("\n").length).toBe(2);
  });
});

describe("B-26: alias @/ theo tsconfig gần file nhất", () => {
  beforeAll(async () => {
    await initParsers();
  });

  async function resolveFrom(
    files: Record<string, string>,
    manifests: Record<string, string>
  ) {
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();
    for (const [p, c] of Object.entries(files)) {
      code.set(p, c);
      langs.set(p, "TYPESCRIPT");
    }
    const parsed = await parseAll(code, langs, emptyReport());
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(Object.entries(manifests)), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });
    return idx;
  }

  it("B-26: tsconfig ở frontend/ có comment, chuỗi **/* và dấu phẩy thừa vẫn đọc được alias", async () => {
    const tsconfig = `{
  // tsconfig mặc định của Next.js
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"], },
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
}`;
    const idx = await resolveFrom(
      {
        "frontend/src/lib/a.ts": "export function foo() { return 1; }\n",
        "frontend/src/app/b.ts": 'import { foo } from "@/lib/a";\nexport const x = foo();\n',
      },
      { "frontend/tsconfig.json": tsconfig }
    );
    const imp = idx.imports.get("frontend/src/app/b.ts")?.get("foo");
    expect(imp?.source_file).toBe("frontend/src/lib/a.ts");
    expect(imp?.import_source).toBeNull();
  });

  it("B-26: hai tsconfig, mỗi file dùng tsconfig gần nhất", async () => {
    const idx = await resolveFrom(
      {
        "web/lib/a.ts": "export function foo() { return 1; }\n",
        "web/app/b.ts": 'import { foo } from "@/lib/a";\n',
        "admin/src/lib/a.ts": "export function foo() { return 2; }\n",
        "admin/src/app/b.ts": 'import { foo } from "@/lib/a";\n',
      },
      {
        "web/tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./*"]}}}',
        "admin/tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}',
      }
    );
    expect(idx.imports.get("web/app/b.ts")?.get("foo")?.source_file).toBe("web/lib/a.ts");
    expect(idx.imports.get("admin/src/app/b.ts")?.get("foo")?.source_file).toBe(
      "admin/src/lib/a.ts"
    );
  });

  it("B-26: gói ngoài @scope/pkg không bị alias @/* nuốt", async () => {
    const idx = await resolveFrom(
      { "src/b.ts": 'import { Module } from "@nestjs/common";\n' },
      { "tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}' }
    );
    const imp = idx.imports.get("src/b.ts")?.get("Module");
    expect(imp?.source_file).toBeNull();
    expect(imp?.import_source).toBe("@nestjs/common");
  });
});

describe("B-25: tsconfig hợp lệ không bị báo hỏng", () => {
  it("tsconfig có comment, URL trong chuỗi, dấu phẩy thừa => không cảnh báo", () => {
    const report = emptyReport();
    const manifests = new Map<string, string>([
      [
        "packages/a/tsconfig.json",
        `{
 // c
 "$schema": "https://json.schemastore.org/tsconfig",
 "compilerOptions": {"paths": {"@/*": ["./*"],},},
 "include": ["src/**/*",],
}`,
      ],
    ]);
    parseManifests(manifests, report);
    expect(report.warnings).toEqual([]);
  });

  it("tsconfig hỏng thật cũng không cảnh báo người học", () => {
    const report = emptyReport();
    parseManifests(new Map([["tsconfig.json", "{ không phải json"]]), report);
    expect(report.warnings).toEqual([]);
  });
});
