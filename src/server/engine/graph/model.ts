// 11 Mục 0 — kiểu nội bộ của engine Tầng 1–2 + vài hàm tiện ích AST.
import type { Node, Tree } from "web-tree-sitter";
import type { LanguageId, LanguageSupportTier, SymbolDefinition } from "@/contracts";

export type SyntaxNode = Node;

export interface ParsedFile {
  path: string;
  language: LanguageId;
  tier: LanguageSupportTier;
  tree: Tree;
  source: string;
  lines: string[];
  is_py: boolean;
}

export interface FunctionInfo {
  key: string;
  file: string;
  name: string;               // "OrderService.checkout" hoặc "checkout" hoặc display_name
  class_key: string | null;
  kind: SymbolDefinition["kind"];
  node: SyntaxNode;           // node hàm (hoặc root với <module>)
  body: SyntaxNode | null;
  line_start: number;         // 1-based; gồm decorator đầu tiên
  line_end: number;
  params: string[];
  complexity: number;
  is_exported: boolean;
  is_module: boolean;
  is_anon: boolean;
  /** Với handler ẩn danh: câu lệnh đăng ký bao quanh (snippet = cả câu lệnh). */
  stmt_node: SyntaxNode | null;
}

export interface ClassInfo {
  key: string;
  file: string;
  name: string;
  kind: "CLASS" | "INTERFACE" | "ABSTRACT";
  extends_names: string[];
  implements_names: string[];
  methods: Map<string, string>;   // tên method ⇒ function key
  fields: Map<string, string>;    // tên field ⇒ tên kiểu
  decorators: Array<{ name: string; args: string[] }>;
  line_start: number;
  line_end: number;
}

export interface ImportBinding {
  kind: "named" | "default" | "namespace" | "module";
  source: string;                 // chuỗi import gốc
  imported: string | null;        // tên được import (named)
  file: string | null;            // file nội bộ đã phân giải
}

export interface SymbolIndex {
  symbols: Map<string, SymbolDefinition>;
  functions: Map<string, FunctionInfo>;
  functionByNode: Map<number, string>;     // node.id ⇒ function key
  files: Map<string, ParsedFile>;
  imports: Map<string, Map<string, ImportBinding>>;
  reexports: Map<string, Array<{ from: string | null; names: Array<[string, string]> | "*" }>>;
  classes: Map<string, ClassInfo>;
  classByName: Map<string, string[]>;
  implMap: Map<string, string[]>;          // interface/abstract class key ⇒ class keys
  varTypes: Map<string, Map<string, string>>; // file ⇒ biến module ⇒ tên kiểu (new T())
  locals: Map<string, Set<string>>;        // function key ⇒ tham số + biến cục bộ
  paramTypes: Map<string, Map<string, string>>; // function key ⇒ tham số ⇒ tên kiểu
  decorators: Map<string, Decorator[]>;    // function key ⇒ decorator (Flask/FastAPI/Nest)
  fieldNames: Set<string>;                 // tên field/property của lớp, interface, type object
  module_vars: Map<string, Map<string, { line_start: number; line_end: number }>>; // file ⇒ biến module ⇒ dòng khai báo
}

export interface Decorator { name: string; chain: string[]; args: string[]; line: number }

export interface ExternalCall {
  caller: string;
  line: number;
  receiver_chain: string[];
  method: string;
  import_source: string | null;
  node: SyntaxNode;
}

export interface CallSite {
  caller: string;
  callee: string;
  node: SyntaxNode;
  confidence: "RESOLVED" | "INFERRED";
  ambiguous: boolean;
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
  display_name: string;
}

export interface EntryPoint { key: string; binding: RouteBinding | null; source: "REGISTERED" | "GENERIC" | "PROGRAM" }

// ---------- tiện ích AST ----------
export const row1 = (n: SyntaxNode) => n.startPosition.row + 1;
export const rowEnd1 = (n: SyntaxNode) => n.endPosition.row + 1;
export const field = (n: SyntaxNode, name: string) => n.childForFieldName(name);

export function walk(n: SyntaxNode, cb: (n: SyntaxNode) => boolean | void): void {
  if (cb(n) === false) return;
  for (const c of n.namedChildren) walk(c, cb);
}

export function ancestors(n: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let p = n.parent; p; p = p.parent) out.push(p);
  return out;
}

export const stripQuotes = (s: string) => s.replace(/^[`'"]|[`'"]$/g, "");

export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
