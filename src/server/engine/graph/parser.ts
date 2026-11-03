// Nạp grammar Tree-sitter — spec 11 Mục 1 (ENG-11), spec 04 Mục 16.
// Grammar đọc từ public/grammars/ trên đĩa, không tải mạng. Nạp 1 lần khi server khởi động,
// thời gian nạp không tính vào engine_ms.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Language, Parser } from "web-tree-sitter";
import type { LanguageId } from "@/contracts";
import { LANGUAGE_REGISTRY, tierOf } from "./registry";

const GRAMMAR_DIR = path.join(process.cwd(), "public", "grammars");
const RUNTIME_DIR = path.join(process.cwd(), "node_modules", "web-tree-sitter");

const languages = new Map<LanguageId, Language>();
let initPromise: Promise<void> | null = null;

async function loadAll(): Promise<void> {
  // locateFile trỏ tới web-tree-sitter.wasm trong node_modules (bản Docker standalone / Vercel).
  await Parser.init({ locateFile: (file: string) => path.join(RUNTIME_DIR, file) });
  // Grammar RESOLVED nạp ở đây; STRUCTURAL sẽ nạp từ bundle khi được thêm vào registry.
  for (const adapter of LANGUAGE_REGISTRY) {
    if (tierOf(adapter) !== "RESOLVED") continue;
    const bytes = await readFile(path.join(GRAMMAR_DIR, adapter.wasm_grammar));
    languages.set(adapter.id, await Language.load(bytes));
  }
}

// Gọi nhiều lần vẫn chỉ nạp 1 lần; lỗi thì cho phép gọi lại.
export function initParsers(): Promise<void> {
  if (!initPromise) {
    initPromise = loadAll().catch((err: unknown) => {
      initPromise = null;
      languages.clear();
      throw err;
    });
  }
  return initPromise;
}

export function getLanguage(id: LanguageId): Language | null {
  return languages.get(id) ?? null;
}

// Parser mới cho 1 ngôn ngữ đã nạp. Người gọi tự parser.delete() khi xong.
export function createParser(id: LanguageId): Parser {
  const language = languages.get(id);
  if (!language) throw new Error(`Chưa nạp grammar cho ${id}: gọi initParsers() trước`);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}
