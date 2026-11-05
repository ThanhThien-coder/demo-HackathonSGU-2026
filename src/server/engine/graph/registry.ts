// 11 Mục 1 — Language Registry. Bản thi (D-76): chỉ TYPESCRIPT, TSX, JAVASCRIPT, PYTHON.
import type { LanguageAdapter, LanguageId, LanguageSupportTier } from "@/contracts";

export const LANGUAGE_REGISTRY: LanguageAdapter[] = [
  {
    id: "TYPESCRIPT", extensions: [".ts", ".mts", ".cts"], wasm_grammar: "tree-sitter-typescript.wasm",
    query_file: "typescript.scm", manifest_files: ["package.json", "tsconfig.json"], import_resolver: "TS_JS",
    ingress_patterns: ["express", "nestjs", "fastify", "nextjs"], abstraction_kinds: ["interface_declaration", "abstract_class_declaration", "type_alias_declaration"],
    comment_prefix: "//",
  },
  {
    id: "TSX", extensions: [".tsx"], wasm_grammar: "tree-sitter-tsx.wasm", query_file: "typescript.scm",
    manifest_files: ["package.json", "tsconfig.json"], import_resolver: "TS_JS", ingress_patterns: ["react-router", "nextjs", "react-native"],
    abstraction_kinds: ["interface_declaration", "abstract_class_declaration", "type_alias_declaration"], comment_prefix: "//",
  },
  {
    id: "JAVASCRIPT", extensions: [".js", ".jsx", ".mjs", ".cjs"], wasm_grammar: "tree-sitter-javascript.wasm",
    query_file: "javascript.scm", manifest_files: ["package.json", "jsconfig.json"], import_resolver: "TS_JS",
    ingress_patterns: ["express", "fastify", "nextjs"], comment_prefix: "//",
  },
  {
    id: "PYTHON", extensions: [".py"], wasm_grammar: "tree-sitter-python.wasm", query_file: "python.scm",
    manifest_files: ["requirements.txt", "pyproject.toml", "Pipfile", "setup.py"], import_resolver: "PYTHON",
    ingress_patterns: ["flask", "fastapi", "django"], comment_prefix: "#",
  },
];

// D-76: các đuôi RESOLVED/STRUCTURAL ngoài bản thi xếp vào KNOWN_NO_GRAMMAR (tier UNSUPPORTED, ING-77)
export const KNOWN_NO_GRAMMAR: Record<string, LanguageId> = {
  ".java": "JAVA", ".go": "GO", ".dart": "DART",
  ".cs": "CSHARP", ".php": "PHP", ".kt": "KOTLIN", ".kts": "KOTLIN", ".c": "C", ".h": "C",
  ".cpp": "CPP", ".cc": "CPP", ".cxx": "CPP", ".hpp": "CPP", ".hh": "CPP", ".rs": "RUST", ".rb": "RUBY",
  ".swift": "SWIFT", ".scala": "SCALA",
  ".sol": "SOLIDITY", ".vhd": "VHDL", ".vhdl": "VHDL", ".pas": "PASCAL", ".f90": "FORTRAN", ".f95": "FORTRAN",
  ".cob": "COBOL", ".cbl": "COBOL", ".asm": "ASSEMBLY", ".abap": "ABAP",
};

const extMap = new Map<string, LanguageAdapter>();
for (const a of LANGUAGE_REGISTRY) for (const e of a.extensions) extMap.set(e, a);

export const extOf = (path: string): string => {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i).toLowerCase();
};

export const adapterByExt = (ext: string): LanguageAdapter | undefined => extMap.get(ext);
export const adapterById = (id: LanguageId): LanguageAdapter | undefined => LANGUAGE_REGISTRY.find((a) => a.id === id);
export const tierOfLanguage = (id: LanguageId): LanguageSupportTier => {
  const a = adapterById(id);
  if (!a) return "UNSUPPORTED";
  return a.import_resolver ? "RESOLVED" : "STRUCTURAL";
};
export const allManifestFiles = (): Set<string> => new Set(LANGUAGE_REGISTRY.flatMap((a) => a.manifest_files));
