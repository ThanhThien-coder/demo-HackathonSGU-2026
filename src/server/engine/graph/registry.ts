// Language Registry — spec 11 Mục 1.
// Kiểu LanguageAdapter / LanguageId lấy từ contracts (spec 02 Mục 4), chỉ import kiểu.
import type { LanguageAdapter, LanguageId, LanguageSupportTier } from "@/contracts";

const JS_FAMILY_MANIFESTS = ["package.json", "tsconfig.json", "jsconfig.json"];

export const LANGUAGE_REGISTRY: LanguageAdapter[] = [
  {
    id: "TYPESCRIPT",
    extensions: [".ts", ".mts", ".cts"],
    wasm_grammar: "tree-sitter-typescript.wasm",
    query_file: "queries/typescript.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    ingress_patterns: [
      "EXPRESS",
      "NESTJS",
      "FASTIFY",
      "KOA",
      "NEXTJS",
      "REACT_ROUTER",
      "REACT_NATIVE",
      "EXPO_ROUTER",
      "COMMANDER",
    ],
    abstraction_kinds: [
      "interface_declaration",
      "abstract_class_declaration",
      "type_alias_declaration",
    ],
    comment_prefix: "//",
  },
  {
    id: "TSX",
    extensions: [".tsx"],
    wasm_grammar: "tree-sitter-tsx.wasm",
    query_file: "queries/tsx.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    ingress_patterns: [
      "EXPRESS",
      "NESTJS",
      "FASTIFY",
      "KOA",
      "NEXTJS",
      "REACT_ROUTER",
      "REACT_NATIVE",
      "EXPO_ROUTER",
      "COMMANDER",
    ],
    abstraction_kinds: [
      "interface_declaration",
      "abstract_class_declaration",
      "type_alias_declaration",
    ],
    comment_prefix: "//",
  },
  {
    id: "JAVASCRIPT",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    wasm_grammar: "tree-sitter-javascript.wasm",
    query_file: "queries/javascript.scm",
    manifest_files: JS_FAMILY_MANIFESTS,
    import_resolver: "TS_JS",
    ingress_patterns: [
      "EXPRESS",
      "FASTIFY",
      "KOA",
      "NEXTJS",
      "REACT_ROUTER",
      "REACT_NATIVE",
      "EXPO_ROUTER",
      "COMMANDER",
    ],
    abstraction_kinds: [],
    comment_prefix: "//",
  },
  {
    id: "PYTHON",
    extensions: [".py"],
    wasm_grammar: "tree-sitter-python.wasm",
    query_file: "queries/python.scm",
    manifest_files: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
    import_resolver: "PYTHON",
    ingress_patterns: ["FLASK", "FASTAPI", "DJANGO", "TYPER_CLICK"],
    abstraction_kinds: ["class_definition"],
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
