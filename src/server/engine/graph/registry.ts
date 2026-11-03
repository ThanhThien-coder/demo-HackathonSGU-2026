// Language Registry — spec 11 Mục 1.
// Kiểu LanguageAdapter / LanguageId lấy từ contracts (spec 02 Mục 4), chỉ import kiểu.
import type { LanguageAdapter, LanguageId, LanguageSupportTier } from "@/contracts";

// B01 mới có grammar cho 4 ngôn ngữ RESOLVED đã kiểm chứng (INV-09: TS/JS và Python).
// Thêm ngôn ngữ khác (ENG-10) = 1 phần tử ở đây + public/grammars/<lang>.wasm + queries/<lang>.scm.
// ingress_patterns, abstraction_kinds bổ sung ở các phiếu sau (B05, B07, B10).
const JS_FAMILY_MANIFESTS = ["package.json", "tsconfig.json", "jsconfig.json"];

export const LANGUAGE_REGISTRY: LanguageAdapter[] = [
  {
    id: "TYPESCRIPT",
    extensions: [".ts", ".mts", ".cts"],
    wasm_grammar: "tree-sitter-typescript.wasm",
    query_file: "queries/typescript.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    comment_prefix: "//",
  },
  {
    id: "TSX",
    extensions: [".tsx"],
    wasm_grammar: "tree-sitter-tsx.wasm",
    query_file: "queries/tsx.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    comment_prefix: "//",
  },
  {
    id: "JAVASCRIPT",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    wasm_grammar: "tree-sitter-javascript.wasm",
    query_file: "queries/javascript.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    comment_prefix: "//",
  },
  {
    id: "PYTHON",
    extensions: [".py"],
    wasm_grammar: "tree-sitter-python.wasm",
    query_file: "queries/python.scm",
    manifest_files: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
    import_resolver: "PYTHON",
    comment_prefix: "#",
  },
];

// Đuôi không có grammar ⇒ tier UNSUPPORTED (spec 10 ING-77).
export const KNOWN_NO_GRAMMAR: Record<string, LanguageId> = {
  ".sol": "SOLIDITY",
  ".vhd": "VHDL",
  ".vhdl": "VHDL",
  ".pas": "PASCAL",
  ".f90": "FORTRAN",
  ".f95": "FORTRAN",
  ".cob": "COBOL",
  ".cbl": "COBOL",
  ".asm": "ASSEMBLY",
  ".abap": "ABAP",
};

// Có import_resolver ⇒ RESOLVED, không ⇒ STRUCTURAL.
export function tierOf(adapter: LanguageAdapter): LanguageSupportTier {
  return adapter.import_resolver ? "RESOLVED" : "STRUCTURAL";
}

export function getAdapter(id: LanguageId): LanguageAdapter | undefined {
  return LANGUAGE_REGISTRY.find((a) => a.id === id);
}
