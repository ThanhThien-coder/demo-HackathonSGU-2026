import { describe, expect, it } from "vitest";
import type { IngestionReport } from "@/contracts";
import { buildFingerprint } from "../fingerprint";
import type { ScopeDecision } from "../types";

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

const scope = (root_dir_offset = ""): ScopeDecision => ({
  root_dir_offset,
  is_monorepo: false,
  candidates: [],
  explicit: false,
});

function fp(pkg: Record<string, unknown>, offset = "", path = "package.json") {
  return buildFingerprint([], new Map([[path, JSON.stringify(pkg)]]), scope(offset), report()).fingerprint;
}

describe("B-34 (spec 10 Mục 12 ý 3, 5): gói chỉ ở devDependencies không làm nên backend", () => {
  it("app React có express ở devDependencies => WEB_FRONTEND, framework React", () => {
    const f = fp({
      dependencies: { "react-dom": "^18", react: "^18" },
      devDependencies: { express: "^4", msw: "^2" },
    });
    expect(f.archetype).toBe("WEB_FRONTEND");
    expect(f.detected_framework).toBe("React");
  });

  it("tech_stack vẫn giữ đủ gói, kể cả devDependencies", () => {
    const f = fp({ dependencies: { "react-dom": "1" }, devDependencies: { express: "1", jest: "1" } });
    expect(f.tech_stack).toEqual(["express", "jest", "react-dom"]);
  });

  it("express ở dependencies => vẫn WEB_BACKEND, framework Express", () => {
    const f = fp({ dependencies: { express: "^4" }, devDependencies: { jest: "1" } });
    expect(f.archetype).toBe("WEB_BACKEND");
    expect(f.detected_framework).toBe("Express");
  });

  it("express vừa ở dependencies vừa ở devDependencies => vẫn tính", () => {
    const f = fp({ dependencies: { express: "1" }, devDependencies: { express: "1" } });
    expect(f.archetype).toBe("WEB_BACKEND");
  });

  it("express ở peerDependencies => vẫn tính", () => {
    const f = fp({ peerDependencies: { express: "1" } });
    expect(f.archetype).toBe("WEB_BACKEND");
  });

  it("chỉ có @nestjs/core ở devDependencies => không phải NestJS", () => {
    const f = fp({ devDependencies: { "@nestjs/core": "1" } });
    expect(f.detected_framework).toBeNull();
    expect(f.archetype).toBe("ALGORITHM_CORE");
  });

  it("svelte ở devDependencies (SvelteKit) vẫn nhận là WEB_FRONTEND, Svelte", () => {
    const f = fp({ devDependencies: { svelte: "^4", vite: "^5" } });
    expect(f.archetype).toBe("WEB_FRONTEND");
    expect(f.detected_framework).toBe("Svelte");
  });

  it("manifest ở gốc kéo express vào devDependencies, manifest trong offset có express chạy thật => backend", () => {
    const manifests = new Map([
      ["package.json", JSON.stringify({ devDependencies: { express: "1" } })],
      ["server/package.json", JSON.stringify({ dependencies: { express: "1" } })],
    ]);
    const { fingerprint } = buildFingerprint([], manifests, scope("server/"), report());
    expect(fingerprint.archetype).toBe("WEB_BACKEND");
    expect(fingerprint.detected_framework).toBe("Express");
  });
});
