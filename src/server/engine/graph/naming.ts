// Đặt tên tất định 0 token AI qua 5 bậc thang — spec 11 Mục 13, D-08.
import { createHash } from "node:crypto";
import {
  CONFIG,
  type HybridArchitecturalNode,
  type NodeTitleSource,
} from "@/contracts";
import type { Candidate, EngineContext } from "./types";

// Token kỹ thuật bị loại bỏ khi chuẩn hóa token (Mục 13 ý 1 (2))
const TECH_TOKENS = new Set([
  "controller",
  "ctrl",
  "service",
  "svc",
  "repository",
  "repo",
  "dao",
  "model",
  "entity",
  "dto",
  "schema",
  "handler",
  "handle",
  "impl",
  "manager",
  "helper",
  "util",
  "utils",
  "router",
  "route",
  "routes",
  "view",
  "views",
  "api",
  "endpoint",
  "module",
  "index",
  "main",
  "base",
  "abstract",
  "interface",
  "default",
  "async",
  "sync",
]);

// Tên viết tắt giữ in hoa (Mục 13 ý 1 (3))
const ACRONYMS = new Set(["id", "ui", "ai", "io", "os", "qr"]);

// Đoạn cuối path là hành động, dùng thẳng làm tên (Mục 13 ý 2, lỗi B-30)
const ACTION_SEGMENTS = new Set([
  "cancel",
  "login",
  "logout",
  "register",
  "search",
  "verify",
  "refresh",
  "reset",
  "health",
]);

// Tên quá chung chung bị bỏ ở Bậc 2 và Bậc 3 (Mục 13 ý 3, 4)
const GENERIC_NAMES = new Set([
  "main",
  "run",
  "start",
  "init",
  "handler",
  "callback",
  "cb",
  "fn",
  "func",
  "process",
  "execute",
  "exec",
  "test",
  "tmp",
  "temp",
  "foo",
  "bar",
  "<module>",
  "default",
  "anonymous",
]);

// Thư mục chung chung bị bỏ ở Bậc 4 (Mục 13 ý 5)
const GENERIC_DIRS = new Set([
  "src",
  "lib",
  "app",
  "internal",
  "pkg",
  "cmd",
  "main",
  "java",
  "kotlin",
  "com",
  "org",
  "net",
  "controllers",
  "services",
  "repositories",
  "repos",
  "routes",
  "handlers",
  "api",
  "modules",
  "core",
  "common",
  "shared",
  "utils",
  "components",
  "pages",
  "views",
  "features",
  "domain",
  "infra",
  "infrastructure",
]);

/**
 * 6 ký tự hex đầu của SHA-1 (UTF-8) bằng node:crypto (D-08, ENG-111).
 */
export function hash6(s: string): string {
  return createHash("sha1").update(s, "utf8").digest("hex").slice(0, 6);
}

/**
 * Tạo slug tất định từ chuỗi tiêu đề theo spec 11 Mục 11 (ENG-111).
 */
export function slug(t: string): string {
  const normalized = t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const trimmed = normalized
    .slice(0, CONFIG.TITLE_MAX_CHARS)
    .replace(/-+$/, "");

  return trimmed.length > 0 ? trimmed : "node";
}

/**
 * Chuyển một từ tiếng Anh sang dạng số ít theo Mục 13 ý 1 (4).
 */
function toSingular(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("ss") || lower.endsWith("us") || lower.endsWith("is")) {
    return word;
  }
  if (lower.endsWith("ies") && lower.length > 4) {
    return word.slice(0, -3) + (word.slice(-3).toUpperCase() === "IES" ? "Y" : "y");
  }
  if (lower.endsWith("sses") && lower.length > 5) {
    return word.slice(0, -2);
  }
  if (lower.endsWith("s") && lower.length > CONFIG.TITLE_MIN_TOKEN_CHARS) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Chuẩn hóa một token sang Title Case hoặc in hoa nếu là Acronym.
 */
function titleCaseToken(token: string): string {
  const lower = token.toLowerCase();
  if (ACRONYMS.has(lower)) {
    return lower.toUpperCase();
  }
  if (token.length > 1 && token === token.toUpperCase()) {
    return token;
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Chuẩn hóa chuỗi định danh thành danh sách token sạch theo Mục 13 ý 1.
 */
export function normalizeTokens(str: string): string[] {
  if (!str) return [];

  // Bỏ tiền tố I khi ký tự thứ 2 viết hoa (IOrderService => OrderService)
  let cleanStr = str;
  if (/^I[A-Z]/.test(cleanStr)) {
    cleanStr = cleanStr.slice(1);
  }

  // Tách camelCase / PascalCase và các dấu ngăn cách _, -, ., /
  const separated = cleanStr
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ");

  const rawTokens = separated.split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (const raw of rawTokens) {
    const lower = raw.toLowerCase();

    // Bỏ TECH_TOKENS và đoạn v\d+
    if (TECH_TOKENS.has(lower) || /^v\d+$/.test(lower)) {
      continue;
    }

    // Bỏ số và token < CONFIG.TITLE_MIN_TOKEN_CHARS trừ ACRONYMS
    if (/^\d+$/.test(raw)) {
      continue;
    }
    if (raw.length < CONFIG.TITLE_MIN_TOKEN_CHARS && !ACRONYMS.has(lower)) {
      continue;
    }

    // Số ít
    const sing = toSingular(raw);
    const singLower = sing.toLowerCase();
    if (sing.length < CONFIG.TITLE_MIN_TOKEN_CHARS && !ACRONYMS.has(singLower)) {
      continue;
    }

    result.push(titleCaseToken(sing));
    if (result.length >= CONFIG.TITLE_MAX_TOKENS) {
      break;
    }
  }

  return result;
}

/**
 * Tính Shannon Entropy của một chuỗi (bit / ký tự).
 */
function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freqs = new Map<string, number>();
  for (const c of s) {
    freqs.set(c, (freqs.get(c) ?? 0) + 1);
  }
  let h = 0;
  const len = s.length;
  for (const count of freqs.values()) {
    const p = count / len;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Tách đoạn path theo `-`, `_` rồi Title Case từng từ (forgot-password => Forgot Password). */
function routeWords(seg: string): string {
  return seg
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => titleCaseToken(w))
    .join(" ");
}

/** Số ít của đoạn path: chỉ đổi từ cuối (reset_password_requests => Reset Password Request). */
function routeSingular(seg: string): string {
  const words = seg.split(/[-_]+/).filter(Boolean);
  if (words.length === 0) return "";
  words[words.length - 1] = toSingular(words[words.length - 1]!);
  return words.map((w) => titleCaseToken(w)).join(" ");
}

/** Số nhiều của đoạn path cho tên "List ...": đã là số nhiều thì giữ, chưa thì thêm s. */
function routePlural(seg: string): string {
  const words = seg.split(/[-_]+/).filter(Boolean);
  if (words.length === 0) return "";
  const lastWord = words[words.length - 1]!;
  if (toSingular(lastWord) === lastWord) words[words.length - 1] = `${lastWord}s`;
  return words.map((w) => titleCaseToken(w)).join(" ");
}

/**
 * Bậc 1: ROUTE (cần binding).
 */
function tryNameFromRoute(
  c: Candidate
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } | null {
  const binding = c.binding;
  if (!binding || !binding.path) return null;

  const rawPath = binding.path;
  const segments = rawPath.split("/").filter(Boolean);
  const staticSegments: string[] = [];

  for (const seg of segments) {
    // Bỏ tham số (:id, {id}, <int:id>, [id])
    if (/^[:{[<]/.test(seg)) continue;
    // Bỏ api, v\d+
    const lower = seg.toLowerCase();
    if (lower === "api" || /^v\d+$/.test(lower)) continue;
    // Chỉ nhận [A-Za-z0-9_-], dài <= CONFIG.ROUTE_SEGMENT_MAX_CHARS
    if (seg.length > CONFIG.ROUTE_SEGMENT_MAX_CHARS) continue;
    if (!/^[A-Za-z0-9_-]+$/.test(seg)) continue;
    // Bỏ đoạn dài >= HIGH_ENTROPY_MIN_CHARS có entropy > HIGH_ENTROPY_MIN_BITS
    if (
      seg.length >= CONFIG.HIGH_ENTROPY_MIN_CHARS &&
      shannonEntropy(seg) > CONFIG.HIGH_ENTROPY_MIN_BITS
    ) {
      continue;
    }
    staticSegments.push(seg);
  }

  const evidence = `${binding.method ?? "GET"} ${binding.path}`;

  if (binding.kind === "PAGE" || binding.kind === "SCREEN" || binding.kind === "COMMAND") {
    const norm = staticSegments.length > 0 ? normalizeTokens(staticSegments.join(" ")) : [];
    const suffix =
      binding.kind === "PAGE" ? "Page" : binding.kind === "SCREEN" ? "Screen" : "Command";
    const name = norm.length > 0 ? `${norm.join(" ")} ${suffix}` : suffix;
    return {
      base_title: name,
      title_source: "ROUTE",
      title_evidence: evidence,
    };
  }

  if (binding.kind !== "HTTP") return null;

  // HTTP route naming (Mục 13 ý 2, lỗi B-30)
  const method = (binding.method ?? "GET").toUpperCase();
  const S = staticSegments;
  if (S.length === 0) return null;

  const isParam = (seg: string): boolean => /^[:{[<]/.test(seg);
  const hasParamAtEnd = segments.length > 0 && isParam(segments[segments.length - 1] ?? "");

  // Có tham số nằm giữa hai đoạn tĩnh cuối (ví dụ /users/:id/orders)
  let paramBetween = false;
  if (S.length >= 2) {
    const lastIdx = segments.lastIndexOf(S[S.length - 1]!);
    const prevIdx = segments.lastIndexOf(S[S.length - 2]!, lastIdx - 1);
    paramBetween = prevIdx >= 0 && segments.slice(prevIdx + 1, lastIdx).some(isParam);
  }

  const result = (base_title: string) => ({
    base_title,
    title_source: "ROUTE" as NodeTitleSource,
    title_evidence: evidence,
  });

  const last = S[S.length - 1]!;
  const prev = S.length >= 2 ? S[S.length - 2]! : null;

  // Đoạn cuối là hành động: dùng thẳng, kèm tài nguyên đứng trước (trừ auth)
  if (ACTION_SEGMENTS.has(last.toLowerCase())) {
    const action = routeWords(last);
    return result(
      prev && prev.toLowerCase() !== "auth" ? `${action} ${routeSingular(prev)}` : action
    );
  }

  if (method === "DELETE" && prev) {
    return result(`Delete ${routeSingular(prev)} ${routeSingular(last)}`);
  }

  if (prev && !paramBetween) {
    // Hai đoạn cuối liền nhau (ví dụ /orders/checkout => Order Checkout)
    return result(`${routeSingular(prev)} ${routeWords(last)}`);
  }

  // Một đoạn (S[-1]); có tham số xen thì chèn Singular(S[-2]) sau động từ
  const owner = prev ? `${routeSingular(prev)} ` : "";
  if (method === "POST") return result(`Create ${owner}${routeSingular(last)}`);
  if (method === "GET") {
    return result(
      hasParamAtEnd
        ? `Get ${owner}${routeSingular(last)}`
        : `List ${owner}${routePlural(last)}`
    );
  }
  if (method === "PUT" || method === "PATCH") return result(`Update ${owner}${routeSingular(last)}`);
  if (method === "DELETE") return result(`Delete ${routeSingular(last)}`);
  return result(`${method} ${owner}${routeSingular(last)}`);
}

/**
 * Bậc 2: ENTRY_SYMBOL.
 */
function tryNameFromEntrySymbol(
  c: Candidate
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } | null {
  const entrySym = c.entry_symbol;
  if (!entrySym) return null;

  const rawName = entrySym.includes("#") ? entrySym.split("#")[1]! : entrySym;
  const parts = rawName.split(".");
  const fnPart = parts[parts.length - 1] ?? rawName;
  const classPart = parts.length > 1 ? parts[0] ?? "" : "";

  // Bỏ token đầu post|put|patch
  const cleanFnPart = fnPart.replace(/^(post|put|patch)([A-Z_])/i, "$2");

  const tokens = normalizeTokens(cleanFnPart);
  if (tokens.length === 0) return null;

  // Nếu chỉ có 1 token và có tên class chứa thì ghép tài nguyên từ tên class
  if (tokens.length === 1 && classPart) {
    const classTokens = normalizeTokens(classPart);
    if (classTokens.length > 0 && classTokens[0] !== tokens[0]) {
      tokens.unshift(classTokens[0]!);
    }
  }

  const allGeneric = tokens.every((t) => GENERIC_NAMES.has(t.toLowerCase()));
  if (allGeneric) return null;

  return {
    base_title: tokens.slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "),
    title_source: "ENTRY_SYMBOL",
    title_evidence: rawName,
  };
}

/**
 * Bậc 3: DOMAIN_TERMS.
 */
function tryNameFromDomainTerms(
  c: Candidate,
  ctx: EngineContext
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } | null {
  const candFiles = new Set(
    c.trace_steps.map((st) => st.file_path).filter(Boolean)
  );
  if (candFiles.size === 0 && c.entry_symbol) {
    candFiles.add(c.entry_symbol.split("#")[0]!);
  }

  const allFilePaths = new Set(Array.from(ctx.files.keys()));
  const N = Math.max(1, allFilePaths.size);

  // Tính TF trong candidate files và DF trong toàn repo
  const tfMap = new Map<string, number>();
  const dfMap = new Map<string, Set<string>>();

  for (const [symKey, sym] of ctx.idx.symbols) {
    const fPath = sym.file_path;
    const tokens = normalizeTokens(sym.name);
    for (const t of tokens) {
      const lower = t.toLowerCase();
      if (GENERIC_NAMES.has(lower)) continue;

      if (!dfMap.has(lower)) {
        dfMap.set(lower, new Set());
      }
      dfMap.get(lower)!.add(fPath);

      if (candFiles.has(fPath) || candFiles.has(symKey.split("#")[0]!)) {
        tfMap.set(lower, (tfMap.get(lower) ?? 0) + 1);
      }
    }
  }

  // Lọc các token có tf >= CONFIG.DOMAIN_TERM_MIN_TF
  const scoredTokens: { token: string; tf: number; score: number }[] = [];
  for (const [tLower, tf] of tfMap) {
    if (tf < CONFIG.DOMAIN_TERM_MIN_TF) continue;
    const df = dfMap.get(tLower)?.size ?? 1;
    const idf = Math.log((1 + N) / (1 + df)) + 1;
    const score = tf * idf;
    scoredTokens.push({ token: tLower, tf, score });
  }

  if (scoredTokens.length === 0) return null;

  // Sắp xếp giảm dần theo score, hòa => tf lớn hơn, hòa => a-z
  scoredTokens.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.tf !== a.tf) return b.tf - a.tf;
    return a.token < b.token ? -1 : a.token > b.token ? 1 : 0;
  });

  const top = scoredTokens.slice(0, CONFIG.DOMAIN_TERMS_MAX);
  const title = top.map((st) => titleCaseToken(st.token)).join(" / ");
  const evidence = top.map((st) => `${st.token}×${st.tf}`).join(", ");

  return {
    base_title: title,
    title_source: "DOMAIN_TERMS",
    title_evidence: evidence,
  };
}

/**
 * Bậc 4: DIRECTORY.
 */
function tryNameFromDirectory(
  c: Candidate
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } | null {
  const firstFile = c.trace_steps[0]?.file_path ?? (c.entry_symbol?.split("#")[0] ?? "");
  if (!firstFile) return null;

  const parts = firstFile.replace(/\\/g, "/").split("/");
  parts.pop(); // bỏ tên file

  // Duyệt ngược từ thư mục gần nhất
  for (let i = parts.length - 1; i >= 0; i--) {
    const dir = parts[i]!;
    if (GENERIC_DIRS.has(dir.toLowerCase())) continue;

    const tokens = normalizeTokens(dir);
    if (tokens.length > 0) {
      return {
        base_title: tokens.slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "),
        title_source: "DIRECTORY",
        title_evidence: dir,
      };
    }
  }

  return null;
}

/**
 * Bậc 5: FILE_BASENAME.
 */
function nameFromFileBasename(
  c: Candidate
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } {
  const firstFile = c.trace_steps[0]?.file_path ?? (c.entry_symbol?.split("#")[0] ?? "index.ts");
  const fileName = firstFile.replace(/\\/g, "/").split("/").pop() ?? firstFile;
  const stem = fileName.replace(/\.[^.]+$/, "");

  const tokens = normalizeTokens(stem);
  const title = tokens.length > 0 ? tokens.slice(0, CONFIG.TITLE_MAX_TOKENS).join(" ") : stem;

  return {
    base_title: title,
    title_source: "FILE_BASENAME",
    title_evidence: fileName,
  };
}

/**
 * Đặt tên tất định cho Candidate qua 5 bậc thang (Mục 13).
 */
export function nameCandidate(
  c: Candidate,
  ctx: EngineContext
): { base_title: string; title_source: NodeTitleSource; title_evidence: string } {
  // Node ảo PROCEDURAL (Mục 13 ý 7)
  if (c.kind === "VNODE") {
    // Chặng = Input / Validation / Compute & Output / Data Access
    let stage = "Compute & Output";
    if (c.title_evidence === "INPUT") stage = "Input";
    else if (c.title_evidence === "VALIDATE") stage = "Validation";
    else if (c.title_evidence === "DATA") stage = "Data Access";

    // Tên gốc = chạy bậc 2..5 trên hàm M
    const baseCandidate: Candidate = {
      ...c,
      binding: null,
    };
    const namedBase =
      tryNameFromEntrySymbol(baseCandidate) ??
      tryNameFromDomainTerms(baseCandidate, ctx) ??
      tryNameFromDirectory(baseCandidate) ??
      nameFromFileBasename(baseCandidate);

    return {
      base_title: `${namedBase.base_title}: ${stage}`,
      title_source: "VIRTUAL",
      title_evidence: c.title_evidence || "VIRTUAL",
    };
  }

  // 1. ROUTE
  const r1 = tryNameFromRoute(c);
  if (r1) return r1;

  // 2. ENTRY_SYMBOL
  const r2 = tryNameFromEntrySymbol(c);
  if (r2) return r2;

  // 3. DOMAIN_TERMS
  const r3 = tryNameFromDomainTerms(c, ctx);
  if (r3) return r3;

  // 4. DIRECTORY
  const r4 = tryNameFromDirectory(c);
  if (r4) return r4;

  // 5. FILE_BASENAME
  return nameFromFileBasename(c);
}

/**
 * Khử trùng tiêu đề các node sau Display Budget theo Mục 13 ý 9.
 */
export function dedupeTitles(nodes: HybridArchitecturalNode[]): void {
  // Duyệt các node theo id tăng dần (ENG-01)
  const sorted = nodes.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Nhóm theo title
  const groups = new Map<string, HybridArchitecturalNode[]>();
  for (const n of sorted) {
    const list = groups.get(n.title) ?? [];
    list.push(n);
    groups.set(n.title, list);
  }

  for (const [baseTitle, list] of groups) {
    if (list.length <= 1) continue;

    // (1) Cùng ROUTE khác method => " (GET)"...
    const methodMap = new Map<string, HybridArchitecturalNode[]>();
    for (const n of list) {
      if (n.title_source === "ROUTE" && n.title_evidence.includes(" ")) {
        const method = n.title_evidence.split(" ")[0] ?? "";
        const mList = methodMap.get(method) ?? [];
        mList.push(n);
        methodMap.set(method, mList);
      }
    }

    if (methodMap.size > 1 && Array.from(methodMap.values()).every((mList) => mList.length === 1)) {
      for (const [m, mList] of methodMap) {
        mList[0]!.title = `${baseTitle} (${m})`;
      }
      continue;
    }

    // (2) Còn trùng => thư mục gần nhất khác nhau của files[0]
    const dirMap = new Map<string, HybridArchitecturalNode[]>();
    for (const n of list) {
      const f0 = n.files[0] ?? "";
      const parts = f0.replace(/\\/g, "/").split("/");
      parts.pop(); // tên file
      const dir = parts.pop() ?? "";
      const dList = dirMap.get(dir) ?? [];
      dList.push(n);
      dirMap.set(dir, dList);
    }

    if (dirMap.size > 1 && Array.from(dirMap.values()).every((dList) => dList.length === 1)) {
      for (const [d, dList] of dirMap) {
        dList[0]!.title = `${baseTitle} (${d})`;
      }
      continue;
    }

    // (3) Còn trùng => " #2", " #3" theo thứ tự id
    for (let i = 0; i < list.length; i++) {
      if (i > 0) {
        list[i]!.title = `${baseTitle} #${i + 1}`;
      }
    }
  }
}
