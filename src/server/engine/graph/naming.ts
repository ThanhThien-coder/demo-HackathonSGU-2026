// 11 Mục 13 — đặt tên node tất định (0 token): ROUTE → ENTRY_SYMBOL → DOMAIN_TERMS → DIRECTORY → FILE_BASENAME.
import { createHash } from "node:crypto";
import { CONFIG } from "@/contracts/config";
import type { NodeTitleSource } from "@/contracts";
import type { RouteBinding, SymbolIndex } from "./model";

const TECH_TOKENS = new Set(("controller ctrl service svc repository repo dao model entity dto schema handler handle impl manager helper util utils " +
  "router route routes view views api endpoint module index main base abstract interface default async sync").split(" "));
const ACRONYMS = new Set(["id", "ui", "ai", "io", "os", "qr"]);
const GENERIC_NAMES = new Set(("main run start init handler callback cb fn func process execute exec test tmp temp foo bar <module> default anonymous").split(" "));
const GENERIC_DIRS = new Set(("src lib app internal pkg cmd main java kotlin com org net controllers services repositories repos routes handlers api " +
  "modules core common shared utils components pages views features domain infra infrastructure").split(" "));
const ACTION_SEGMENTS = new Set("cancel login logout register search verify refresh reset health".split(" "));

export const hash6 = (s: string) => createHash("sha1").update(s, "utf8").digest("hex").slice(0, 6);
export function slug(t: string): string {
  const s = t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, CONFIG.TITLE_MAX_CHARS).replace(/-$/, "");
  return s || "node";
}

export function singular(w: string): string {
  const l = w.toLowerCase();
  if (l.length <= CONFIG.TITLE_MIN_TOKEN_CHARS || /(ss|us|is)$/.test(l)) return w;
  if (l.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (l.endsWith("sses")) return w.slice(0, -2);
  if (l.endsWith("s")) return w.slice(0, -1);
  return w;
}

const titleCase = (w: string) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

export function rawWords(s: string): string[] {
  return s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_\-./]+/).filter(Boolean);
}

export function normalizeTokens(s: string): string[] {
  const out: string[] = [];
  for (const raw of rawWords(s.replace(/^I(?=[A-Z][a-z])/, ""))) {
    const w = raw.toLowerCase();
    if (TECH_TOKENS.has(w) || /^v\d+$/.test(w) || /^\d+$/.test(w)) continue;
    if (w.length < CONFIG.TITLE_MIN_TOKEN_CHARS && !ACRONYMS.has(w)) continue;
    out.push(titleCase(singular(w)));
  }
  return out;
}

const entropy = (s: string) => {
  const m = new Map<string, number>();
  for (const c of s) m.set(c, (m.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of m.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
};

const isParam = (seg: string) => /^[:{<\[]/.test(seg);

function routeTitle(b: RouteBinding): { title: string; evidence: string } | null {
  if (b.kind !== "HTTP") {
    const base = normalizeTokens(b.path ?? b.display_name).slice(0, CONFIG.TITLE_MAX_TOKENS).join(" ");
    if (!base) return null;
    const suffix = b.kind === "PAGE" ? "Page" : b.kind === "SCREEN" ? "Screen" : "Command";
    return { title: `${base} ${suffix}`, evidence: `${b.kind} ${b.path ?? b.display_name}` };
  }
  if (!b.path) return null;
  const segs = b.path.split("/").filter(Boolean);
  const statics: string[] = [];
  const paramBetween: boolean[] = []; // paramBetween[i]: có tham số ngay trước statics[i]
  let sawParam = false;
  for (const s of segs) {
    if (isParam(s)) { sawParam = true; continue; }
    if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length > CONFIG.ROUTE_SEGMENT_MAX_CHARS) continue;
    if (s.length >= CONFIG.HIGH_ENTROPY_MIN_CHARS && entropy(s) > CONFIG.HIGH_ENTROPY_MIN_BITS) continue;
    if (s.toLowerCase() === "api" || /^v\d+$/i.test(s)) continue;
    statics.push(s); paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics.map((s) => rawWords(s).map((w) => w.toLowerCase()).join(" "));
  if (S.length === 0) return null;
  const T = (s: string) => s.split(" ").map(titleCase).join(" ");
  const Ts = (s: string) => s.split(" ").map((w, i, a) => (i === a.length - 1 ? titleCase(singular(w)) : titleCase(w))).join(" ");
  const last = S[S.length - 1], prev = S.length >= 2 ? S[S.length - 2] : null;
  const method = (b.method ?? "GET").toUpperCase();
  const endsWithParam = segs.length > 0 && isParam(segs[segs.length - 1]);
  let title: string;
  if (ACTION_SEGMENTS.has(last)) title = prev && prev !== "auth" ? `${T(last)} ${Ts(prev)}` : T(last);
  else if (method === "DELETE" && S.length >= 2) title = `Delete ${Ts(prev!)} ${Ts(last)}`;
  else if (S.length >= 2 && !paramBetween[S.length - 1]) title = `${Ts(prev!)} ${T(last)}`;
  else {
    const noun = (prefix: string) => (prev && paramBetween[S.length - 1] ? `${Ts(prev)} ` : "") + prefix;
    if (method === "POST") title = `Create ${noun(Ts(last))}`;
    else if (method === "GET" && endsWithParam) title = `Get ${noun(Ts(last))}`;
    else if (method === "GET") title = `List ${noun(T(last))}`;
    else if (method === "PUT" || method === "PATCH") title = `Update ${noun(Ts(last))}`;
    else if (method === "DELETE") title = `Delete ${noun(Ts(last))}`;
    else title = noun(T(last));
  }
  return { title: title.split(" ").slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "), evidence: `${b.method ?? "ANY"} ${b.path}` };
}

export interface NameInput {
  binding: RouteBinding | null;
  entry_symbol: string | null;   // khóa SymbolTable
  files: string[];
  function_keys: string[];
  file_index: string[];
}

export function baseTitle(inp: NameInput, idx: SymbolIndex): { title: string; source: NodeTitleSource; evidence: string } {
  // bậc 1
  if (inp.binding) { const r = routeTitle(inp.binding); if (r) return { title: r.title, source: "ROUTE", evidence: r.evidence }; }
  // bậc 2
  if (inp.entry_symbol) {
    const fn = idx.functions.get(inp.entry_symbol);
    if (fn) {
      const short = fn.name.split(".").pop() ?? fn.name;
      let toks = normalizeTokens(short);
      while (toks.length && /^(Post|Put|Patch)$/.test(toks[0])) toks = toks.slice(1);
      if (toks.length === 1 && fn.class_key) toks = [...normalizeTokens(idx.classes.get(fn.class_key)?.name ?? ""), ...toks];
      if (toks.length > 0 && !GENERIC_NAMES.has(short.toLowerCase()) && !toks.every((t) => GENERIC_NAMES.has(t.toLowerCase()))) {
        return { title: toks.slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "), source: "ENTRY_SYMBOL", evidence: inp.entry_symbol.slice(inp.entry_symbol.indexOf("#") + 1) };
      }
    }
  }
  // bậc 3: DOMAIN_TERMS
  const tf = new Map<string, number>();
  const df = new Map<string, Set<string>>();
  const N = inp.file_index.length;
  for (const f of inp.files) {
    const names = [...idx.symbols.values()].filter((s) => s.file_path === f && s.kind !== "VARIABLE").map((s) => s.name);
    for (const n of names) {
      if (GENERIC_NAMES.has(n.toLowerCase())) continue;
      for (const t of normalizeTokens(n)) { tf.set(t, (tf.get(t) ?? 0) + 1); const d = df.get(t) ?? new Set(); d.add(f); df.set(t, d); }
    }
  }
  const dfAll = (t: string) => inp.file_index.filter((f) => [...idx.symbols.values()].some((s) => s.file_path === f && normalizeTokens(s.name).includes(t))).length;
  const scored = [...tf.entries()].filter(([, c]) => c >= CONFIG.DOMAIN_TERM_MIN_TF)
    .map(([t, c]) => ({ t, c, score: c * (Math.log((1 + N) / (1 + dfAll(t))) + 1) }))
    .sort((a, b) => b.score - a.score || (a.t < b.t ? -1 : 1)).slice(0, CONFIG.DOMAIN_TERMS_MAX);
  if (scored.length > 0) return { title: scored.map((x) => x.t).join(" / "), source: "DOMAIN_TERMS", evidence: scored.map((x) => `${x.t.toLowerCase()}×${x.c}`).join(", ") };
  // bậc 4: DIRECTORY
  const first = inp.files[0] ?? "";
  const dirs = first.split("/").slice(0, -1).reverse();
  for (const d of dirs) {
    if (GENERIC_DIRS.has(d.toLowerCase())) continue;
    const toks = normalizeTokens(d);
    if (toks.length) return { title: toks.slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "), source: "DIRECTORY", evidence: d };
  }
  // bậc 5
  const base = first.slice(first.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  const toks = normalizeTokens(base);
  return { title: (toks.length ? toks : [base]).slice(0, CONFIG.TITLE_MAX_TOKENS).join(" "), source: "FILE_BASENAME", evidence: base };
}

/** Khử trùng sau Display Budget (id không đổi). */
export function dedupeTitles(nodes: Array<{ id: string; base_title: string; binding: RouteBinding | null; files: string[]; title: string }>): void {
  const sorted = [...nodes].sort((a, b) => (a.id < b.id ? -1 : 1));
  const groups = new Map<string, typeof sorted>();
  for (const n of sorted) { const l = groups.get(n.base_title) ?? []; l.push(n); groups.set(n.base_title, l); }
  for (const g of groups.values()) {
    if (g.length === 1) { g[0].title = g[0].base_title; continue; }
    const t = new Map<string, string>(g.map((n) => [n.id, n.base_title]));
    const methods = new Set(g.map((n) => n.binding?.method ?? ""));
    if (g.every((n) => n.binding?.kind === "HTTP") && methods.size === g.length) for (const n of g) t.set(n.id, `${n.base_title} (${n.binding!.method})`);
    const count = (): Map<string, number> => { const m = new Map<string, number>(); for (const v of t.values()) m.set(v, (m.get(v) ?? 0) + 1); return m; };
    let c = count();
    if ([...c.values()].some((v) => v > 1)) {
      for (const n of g) {
        if ((c.get(t.get(n.id)!) ?? 0) > 1) {
          const dir = n.files[0]?.split("/").slice(0, -1).pop();
          if (dir) t.set(n.id, `${t.get(n.id)} (${dir})`);
        }
      }
      c = count();
    }
    const seen = new Map<string, number>();
    for (const n of g) {
      const cur = t.get(n.id)!;
      if ((c.get(cur) ?? 0) > 1) { const k = (seen.get(cur) ?? 0) + 1; seen.set(cur, k); if (k > 1) t.set(n.id, `${cur} #${k}`); }
    }
    for (const n of g) n.title = t.get(n.id)!;
  }
}
