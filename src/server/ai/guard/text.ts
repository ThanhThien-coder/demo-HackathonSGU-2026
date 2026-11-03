/**
 * src/server/ai/guard/text.ts
 *
 * Chuẩn hóa và xử lý văn bản, danh sách từ ngôn ngữ (GUARD-02) theo spec 21 Mục 2.
 */

import type { HybridArchitecturalNode } from "@/contracts";

export const norm = (s: string): string =>
  s.normalize("NFC").replace(/[_\-]/g, "").toLowerCase(); // find_by_id ≡ findById

export const normText = (s: string): string =>
  s.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim();

export const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;

const IDENT_FULL_RE = new RegExp(`^${IDENT_RE.source}$`);

/**
 * Kiểm tra chuỗi s có khớp TRỌN mẫu của IDENT_RE hay không.
 * Dùng IDENT_RE.source neo ^...$ độc lập để tránh lỗi lastIndex do cờ g.
 */
export const isIdent = (s: string): boolean => IDENT_FULL_RE.test(s);

export const identWords = (text: string): Set<string> =>
  new Set((text.match(IDENT_RE) ?? []).map(norm));

export const backticks = (text: string): string[] =>
  [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);

export const firstSentences = (s: string, k: number): string =>
  s
    .split(/(?<=[.!?…])\s+/u)
    .filter(Boolean)
    .slice(0, k)
    .join(" ");

export const nodeCodeText = (node: HybridArchitecturalNode): string =>
  [
    ...node.trace_steps.map((s) => `${s.function_name}\n${s.snippet}`),
    node.dto_snippet,
  ].join("\n");

export const LOC_RE = /(?:bước|buoc|dòng|dong|step|line)\s*\d+/iu; // nhắc vị trí bằng số

/**
 * Từ của ngôn ngữ: bỏ qua khi kiểm tên; so chữ thường; dùng chung cho mọi ngôn ngữ của Registry.
 */
export const LANGUAGE_WORDS = new Set<string>(
  (
    // TS / JS
    "break case catch class const continue debugger default delete do else enum export extends false finally for function if " +
    "import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of " +
    "static get set as from type interface implements private protected public readonly abstract declare namespace keyof " +
    "never unknown any undefined number string boolean object symbol bigint " +
    // Python · Java · Go · Dart
    "and or not is elif except lambda pass raise def global nonlocal none self cls print len range " +
    "final throws package byte short int long float double char synchronized volatile " +
    "func go defer chan map struct select fallthrough nil goto late required dynamic factory library part mixin on " +
    // biến toàn cục / thư viện chuẩn hay gặp
    "console json math promise array date error require module exports process window document"
  ).split(" ")
);
