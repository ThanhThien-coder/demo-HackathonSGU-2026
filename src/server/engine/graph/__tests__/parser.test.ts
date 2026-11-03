import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { LANGUAGE_VERSION, MIN_COMPATIBLE_VERSION } from "web-tree-sitter";
import { createParser, getLanguage, initParsers } from "../parser";
import { LANGUAGE_REGISTRY, tierOf } from "../registry";

const SAMPLES: Record<string, { code: string; root: string }> = {
  TYPESCRIPT: { code: "export function add(a: number, b: number): number { return a + b; }\n", root: "program" },
  TSX: { code: "export const App = (): JSX.Element => <div className=\"x\">hi</div>;\n", root: "program" },
  JAVASCRIPT: { code: "const add = (a, b) => a + b;\nmodule.exports = { add };\n", root: "program" },
  PYTHON: { code: "def add(a, b):\n    return a + b\n", root: "module" },
};

describe("ENG-11 nạp grammar Tree-sitter", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-11 mọi grammar của registry có trong public/grammars/", () => {
    for (const adapter of LANGUAGE_REGISTRY) {
      expect(existsSync(path.join(process.cwd(), "public", "grammars", adapter.wasm_grammar)), adapter.wasm_grammar).toBe(true);
    }
  });

  it("ENG-11 initParsers nạp đủ TS, TSX, JS, Python cùng ABI với web-tree-sitter", () => {
    for (const id of ["TYPESCRIPT", "TSX", "JAVASCRIPT", "PYTHON"]) {
      const language = getLanguage(id);
      expect(language, id).not.toBeNull();
      expect(language!.abiVersion).toBeGreaterThanOrEqual(MIN_COMPATIBLE_VERSION);
      expect(language!.abiVersion).toBeLessThanOrEqual(LANGUAGE_VERSION);
    }
  });

  it("ENG-11 grammar RESOLVED đều được nạp", () => {
    for (const adapter of LANGUAGE_REGISTRY.filter((a) => tierOf(a) === "RESOLVED")) {
      expect(getLanguage(adapter.id), adapter.id).not.toBeNull();
    }
  });

  it("ENG-11 parse được code TS/JS và Python không lỗi cú pháp", () => {
    for (const [id, sample] of Object.entries(SAMPLES)) {
      const parser = createParser(id);
      const tree = parser.parse(sample.code);
      expect(tree, id).not.toBeNull();
      expect(tree!.rootNode.type, id).toBe(sample.root);
      expect(tree!.rootNode.hasError, id).toBe(false);
      tree!.delete();
      parser.delete();
    }
  });

  it("ENG-11 gọi initParsers lần 2 không nạp lại grammar", async () => {
    const before = getLanguage("PYTHON");
    await initParsers();
    expect(getLanguage("PYTHON")).toBe(before);
  });

  it("ENG-11 ngôn ngữ chưa nạp thì createParser báo lỗi", () => {
    expect(getLanguage("COBOL")).toBeNull();
    expect(() => createParser("COBOL")).toThrow();
  });
});
