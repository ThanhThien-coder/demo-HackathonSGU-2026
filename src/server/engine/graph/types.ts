// Kiểu nội bộ Tầng 1–2 — spec 11 Mục 0, 1, 2, 8.
// Kiểu có trong @/contracts chỉ import type, không khai báo lại.
import type { Tree } from "web-tree-sitter";
import type {
  FunctionCallEdge,
  HybridArchitecturalNode,
  LanguageId,
  LanguageSupportTier,
  SymbolDefinition,
  VirtualFileOrigin,
} from "@/contracts";

// Mục 0: ExternalCall, RouteBinding, EntryPoint, Candidate, FunctionInfo
export interface ExternalCall {
  caller: string;
  line: number;
  receiver_chain: string[];
  method: string;
  import_source: string | null;
}

export interface RouteBinding {
  file_path: string;
  line_start: number;
  line_end: number;
  kind: "HTTP" | "PAGE" | "SCREEN" | "COMMAND";
  method: string | null;
  path: string | null;
  handler: string;
  middlewares: string[];
  display_name: string; // "router.post('/checkout')"
}

export interface EntryPoint {
  key: string;
  binding: RouteBinding | null;
  source: "REGISTERED" | "GENERIC" | "PROGRAM";
}

export interface Candidate
  extends Pick<
    HybridArchitecturalNode,
    | "id"
    | "node_type"
    | "entry_symbol"
    | "trace_steps"
    | "dto_snippet"
    | "cognitive_complexity"
    | "rank_score"
    | "title_source"
    | "title_evidence"
  > {
  kind: "SLICE" | "ALGO" | "VNODE";
  order_key: string;
  functions: string[];
  binding: RouteBinding | null;
  base_title: string;
}

export interface FunctionInfo extends SymbolDefinition {
  params: string[];
  locals: string[];
  complexity: number;
}

// Mục 1: ParsedFile
export interface ParsedFile {
  path: string;
  language: LanguageId;
  tier: LanguageSupportTier;
  tree: Tree;
  source: string;
}

// Mục 2: SymbolIndex (SymbolTable, ImportMap, FieldTypeMap, InterfaceImplMap, LocalSymbolIndex)
export interface ImportedSymbol {
  source_file: string | null;
  symbol_name: string;
  import_source: string | null;
  is_namespace?: boolean;
}

export type SymbolTable = Map<string, SymbolDefinition>;
export type ImportMap = Map<string, Map<string, ImportedSymbol>>;
export type FieldTypeMap = Map<string, string>;
export type InterfaceImplMap = Map<string, string[]>;
export type LocalSymbolIndex = Map<string, Set<string>>;

export interface SymbolIndex {
  symbols: SymbolTable;
  functions: Map<string, FunctionInfo>;
  imports: ImportMap;
  field_types: FieldTypeMap;
  interface_impls: InterfaceImplMap;
  locals: LocalSymbolIndex;
  reexports?: Map<string, Map<string, ImportedSymbol>>;
}

// Mục 8: EngineContext cho lát cắt (slicing)
export interface EngineContext {
  files: Map<string, ParsedFile>;
  idx: SymbolIndex;
  edges: FunctionCallEdge[];
  external: ExternalCall[];
  tech_stack: string[];
  rank: Map<string, number>;
  source_map: Map<string, VirtualFileOrigin>;
  manifests?: Map<string, string>;
}
