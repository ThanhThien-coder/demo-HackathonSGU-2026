// Nạp grammar và truy vấn Tree-sitter — spec 11 Mục 1 (ENG-11, ENG-12), spec 04 Mục 16.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Language, Parser, Query, type Node } from "web-tree-sitter";
import { CONFIG, type IngestionReport, type LanguageId } from "@/contracts";
import { getAdapter, LANGUAGE_REGISTRY, tierOf } from "./registry";
import type { ParsedFile } from "./types";

const GRAMMAR_DIR = path.join(process.cwd(), "public", "grammars");
const RUNTIME_DIR = path.join(process.cwd(), "node_modules", "web-tree-sitter");

const languages = new Map<LanguageId, Language>();
const queries = new Map<LanguageId, Query>();
let initPromise: Promise<void> | null = null;

async function loadAll(): Promise<void> {
  // locateFile trỏ tới web-tree-sitter.wasm trong node_modules (bản Docker standalone / Vercel).
  await Parser.init({ locateFile: (file: string) => path.join(RUNTIME_DIR, file) });
  // Grammar RESOLVED và truy vấn .scm nạp ở đây.
  for (const adapter of LANGUAGE_REGISTRY) {
    if (tierOf(adapter) !== "RESOLVED") continue;
    const bytes = await readFile(path.join(GRAMMAR_DIR, adapter.wasm_grammar));
    const lang = await Language.load(bytes);
    languages.set(adapter.id, lang);

    if (adapter.query_file) {
      try {
        const scmPath = path.isAbsolute(adapter.query_file)
          ? adapter.query_file
          : path.join(process.cwd(), adapter.query_file);
        const scmText = await readFile(scmPath, "utf-8");
        const query = new Query(lang, scmText);
        queries.set(adapter.id, query);
      } catch {
        // Nếu không có file scm hoặc lỗi query thì bỏ qua
      }
    }
  }
}

// Gọi nhiều lần vẫn chỉ nạp 1 lần; lỗi thì cho phép gọi lại.
export function initParsers(): Promise<void> {
  if (!initPromise) {
    initPromise = loadAll().catch((err: unknown) => {
      initPromise = null;
      languages.clear();
      queries.clear();
      throw err;
    });
  }
  return initPromise;
}

export function getLanguage(id: LanguageId): Language | null {
  return languages.get(id) ?? null;
}

export function getQuery(id: LanguageId): Query | null {
  return queries.get(id) ?? null;
}

// Parser mới cho 1 ngôn ngữ đã nạp. Người gọi tự parser.delete() khi xong.
export function createParser(id: LanguageId): Parser {
  const language = languages.get(id);
  if (!language) throw new Error(`Chưa nạp grammar cho ${id}: gọi initParsers() trước`);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

// ENG-12: Tính byte của các node ERROR ngoài cùng (không duyệt vào con của ERROR)
function computeOuterErrorBytes(node: Node): number {
  if (node.type === "ERROR") {
    return node.endIndex - node.startIndex;
  }
  let sum = 0;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      sum += computeOuterErrorBytes(child);
    }
  }
  return sum;
}

// ENG-12: Parse tất cả file code, lọc lỗi cú pháp > CONFIG.PARSE_ERROR_RATIO_MAX
export async function parseAll(
  code: Map<string, string>,
  langs: Map<string, LanguageId>,
  report: IngestionReport
): Promise<ParsedFile[]> {
  await initParsers();
  const sortedPaths = Array.from(code.keys()).sort(); // ENG-01
  const result: ParsedFile[] = [];

  for (const filePath of sortedPaths) {
    const langId = langs.get(filePath);
    if (!langId) continue;
    const adapter = getAdapter(langId);
    if (!adapter) continue;

    const source = code.get(filePath) ?? "";
    const parser = createParser(langId);
    let tree;
    try {
      tree = parser.parse(source);
    } finally {
      parser.delete();
    }

    if (!tree) continue;

    // web-tree-sitter (JS) trả startIndex/endIndex theo đơn vị UTF-16 của chuỗi đầu vào (đo thật
    // với 0.27.1, dù typings ghi "byte"). Tử và mẫu phải cùng đơn vị ⇒ dùng source.length.
    const totalBytes = source.length;
    const errorBytes = computeOuterErrorBytes(tree.rootNode);
    const rho = totalBytes > 0 ? errorBytes / totalBytes : 0;

    if (rho > CONFIG.PARSE_ERROR_RATIO_MAX) {
      report.skipped.parse_error++;
      report.warnings.push(`File ${filePath} có cú pháp không phân tích được`);
      tree.delete();
      continue;
    }

    result.push({
      path: filePath,
      language: langId,
      tier: tierOf(adapter),
      tree,
      source,
    });
  }

  return result;
}
