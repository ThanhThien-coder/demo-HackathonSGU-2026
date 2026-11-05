// 11 Mục 1 — nạp grammar Tree-sitter WASM (không tải mạng) và parse. ENG-11, ENG-12.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Language, Parser } from "web-tree-sitter";
import { CONFIG } from "@/contracts/config";
import type { IngestionReport, LanguageId } from "@/contracts";
import type { ParsedFile } from "./model";
import { LANGUAGE_REGISTRY, adapterById, tierOfLanguage } from "./registry";

let ready: Promise<void> | null = null;
const languages = new Map<LanguageId, Language>();

const root = () => process.cwd();

/** 1 lần khi server khởi động; lần nạp đầu không tính vào engine_ms. */
export function initParsers(): Promise<void> {
  ready ??= (async () => {
    await Parser.init({
      locateFile: (name: string) => path.join(root(), "node_modules", "web-tree-sitter", name),
    });
    for (const a of LANGUAGE_REGISTRY) {
      const buf = await readFile(path.join(root(), "public", "grammars", a.wasm_grammar));
      languages.set(a.id, await Language.load(new Uint8Array(buf)));
    }
  })();
  return ready;
}

/** ENG-12: ρ = byte node ERROR ngoài cùng / byte file; ρ > ngưỡng ⇒ bỏ file. */
function errorRatio(root: { children: Array<{ type: string; startIndex: number; endIndex: number; hasError: boolean; children: unknown[] }> }, size: number): number {
  let bytes = 0;
  const visit = (n: { type: string; startIndex: number; endIndex: number; hasError: boolean; children: unknown[] }) => {
    if (n.type === "ERROR") { bytes += n.endIndex - n.startIndex; return; }
    if (!n.hasError) return;
    for (const c of n.children as typeof root.children) visit(c);
  };
  for (const c of root.children) visit(c);
  return size === 0 ? 0 : bytes / size;
}

export async function parseAll(
  code: Map<string, string>, langs: Map<string, LanguageId>, report: IngestionReport,
): Promise<ParsedFile[]> {
  await initParsers();
  const out: ParsedFile[] = [];
  const parsers = new Map<LanguageId, Parser>();
  for (const [p, source] of [...code.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const lang = langs.get(p);
    const grammar = lang ? languages.get(lang) : undefined;
    if (!lang || !grammar) continue;
    let parser = parsers.get(lang);
    if (!parser) { parser = new Parser(); parser.setLanguage(grammar); parsers.set(lang, parser); }
    const tree = parser.parse(source);
    if (!tree) continue;
    const bytes = Buffer.byteLength(source);
    if (errorRatio(tree.rootNode as never, bytes) > CONFIG.PARSE_ERROR_RATIO_MAX) {
      report.skipped.parse_error++;
      report.warnings.push(`File ${p} có cú pháp không phân tích được`);
      continue;
    }
    out.push({
      path: p, language: lang, tier: tierOfLanguage(lang), tree, source, lines: source.split("\n"),
      is_py: adapterById(lang)?.id === "PYTHON",
    });
  }
  return out;
}
