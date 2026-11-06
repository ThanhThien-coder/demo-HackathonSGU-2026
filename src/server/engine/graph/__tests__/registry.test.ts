// Test cho Language Registry và KNOWN_NO_GRAMMAR — spec 11 Mục 1 (ENG-10, ENG-11), spec 10 Mục 7 (ING-77).
import { describe, expect, it } from "vitest";
import { KNOWN_NO_GRAMMAR, LANGUAGE_REGISTRY } from "../registry";
import { classifyEntry } from "../../ingest/prune";
import type { ZipEntryMeta } from "../../ingest/types";

describe("ING-77 Language Registry và KNOWN_NO_GRAMMAR", () => {
  it("ING-77 mỗi đuôi ở mục 3 ánh xạ đúng LanguageId", () => {
    const expectedMappings: Record<string, string> = {
      ".go": "GO",
      ".dart": "DART",
      ".cs": "CSHARP",
      ".php": "PHP",
      ".kt": "KOTLIN",
      ".kts": "KOTLIN",
      ".c": "C",
      ".h": "C",
      ".cpp": "CPP",
      ".cc": "CPP",
      ".cxx": "CPP",
      ".hpp": "CPP",
      ".hh": "CPP",
      ".rs": "RUST",
      ".rb": "RUBY",
      ".swift": "SWIFT",
      ".scala": "SCALA",
    };

    for (const [ext, langId] of Object.entries(expectedMappings)) {
      expect(KNOWN_NO_GRAMMAR[ext], `Đuôi ${ext} phải ánh xạ về ${langId}`).toBe(langId);
    }
  });

  it("ING-77 .java không có trong KNOWN_NO_GRAMMAR", () => {
    expect(KNOWN_NO_GRAMMAR[".java"]).toBeUndefined();
    expect(".java" in KNOWN_NO_GRAMMAR).toBe(false);
  });

  it("ING-77 không đuôi nào vừa ở LANGUAGE_REGISTRY vừa ở KNOWN_NO_GRAMMAR", () => {
    const registryExtensions = new Set<string>();
    for (const adapter of LANGUAGE_REGISTRY) {
      for (const ext of adapter.extensions) {
        registryExtensions.add(ext.toLowerCase());
      }
    }

    for (const noGrammarExt of Object.keys(KNOWN_NO_GRAMMAR)) {
      expect(
        registryExtensions.has(noGrammarExt.toLowerCase()),
        `Đuôi ${noGrammarExt} không được cùng tồn tại ở cả LANGUAGE_REGISTRY và KNOWN_NO_GRAMMAR`
      ).toBe(false);
    }
  });

  it("ING-77 hàm phân loại file ở src/server/engine/ingest/prune.ts trả NO_GRAMMAR kèm ngôn ngữ GO cho main.go, DART cho lib/main.dart", () => {
    const createMockEntry = (filePath: string): ZipEntryMeta => ({
      path: filePath,
      compressed_size: 100,
      size: 100,
      method: 8,
      local_offset: 0,
      is_dir: false,
      is_symlink: false,
      is_encrypted: false,
    });

    const goRes = classifyEntry(createMockEntry("main.go"));
    expect(goRes).toEqual({ cls: "NO_GRAMMAR", language: "GO" });

    const dartRes = classifyEntry(createMockEntry("lib/main.dart"));
    expect(dartRes).toEqual({ cls: "NO_GRAMMAR", language: "DART" });
  });
});
