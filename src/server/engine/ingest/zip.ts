// 10 Mục 5–6, 9 — snapshot (EOCD / SHA-256), mục lục zip, chuẩn hóa đường dẫn, giải nén chọn lọc, lọc nội dung.
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { Unzip, UnzipInflate, UnzipPassThrough, unzipSync } from "fflate";
import { CONFIG } from "@/contracts/config";
import type { IngestionReport } from "@/contracts";
import { fail } from "../../errors";

export interface ZipEntryMeta {
  path: string;          // đã chuẩn hóa (ING-60)
  raw_name: string;      // tên gốc trong zip, dùng khi giải nén
  compressed_size: number;
  size: number;
  is_dir: boolean;
}

/** ING-50: dò ngược EOCD, đọc comment (SHA commit của zip codeload). */
export function readEocdComment(bytes: Uint8Array): string | null {
  const min = Math.max(0, bytes.length - (22 + 65535));
  for (let i = bytes.length - 22; i >= min; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      const len = bytes[i + 20] | (bytes[i + 21] << 8);
      return new TextDecoder().decode(bytes.subarray(i + 22, i + 22 + len)).trim();
    }
  }
  return null;
}

export const computeArchiveHash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export const looksLikeZip = (b: Uint8Array): boolean =>
  b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && ((b[2] === 3 && b[3] === 4) || (b[2] === 5 && b[3] === 6));

/** ING-60: chuẩn hóa đường dẫn; trả null nếu phải loại. */
function normalizePaths(names: string[], report: IngestionReport): Map<string, string> {
  const out = new Map<string, string>(); // raw ⇒ normalized
  const cleaned: Array<[string, string]> = [];
  for (const raw of names) {
    const p = raw.replace(/\\/g, "/");
    if (p.includes("\u0000")) { report.skipped.binary++; continue; }
    if (p.startsWith("__MACOSX/") || /(^|\/)\._[^/]*$/.test(p)) continue;
    cleaned.push([raw, p]);
  }
  // cắt segment đầu chung (zip GitHub có <repo>-<ref>/)
  const first = new Set(cleaned.map(([, p]) => p.split("/")[0]));
  const strip = first.size === 1 && cleaned.every(([, p]) => p.includes("/"));
  const seen = new Set<string>();
  for (const [raw, p0] of cleaned) {
    const p = strip ? p0.slice(p0.indexOf("/") + 1) : p0;
    if (!p) continue;
    const n = posix.normalize(p);
    if (n.startsWith("../") || n.startsWith("/") || n === "..") continue;
    if (seen.has(n)) { report.skipped.garbage++; continue; }
    seen.add(n);
    out.set(raw, n);
  }
  return out;
}

export function listEntries(bytes: Uint8Array, report: IngestionReport): ZipEntryMeta[] {
  const metas: Array<{ name: string; size: number; compressed: number }> = [];
  try {
    unzipSync(bytes, {
      filter: (f) => {
        metas.push({ name: f.name, size: f.originalSize, compressed: f.size });
        return false;
      },
    });
  } catch {
    return [];
  }
  const names = normalizePaths(metas.map((m) => m.name), report);
  const out: ZipEntryMeta[] = [];
  for (const m of metas) {
    const path = names.get(m.name);
    if (!path) continue;
    out.push({ path, raw_name: m.name, compressed_size: m.compressed, size: m.size, is_dir: m.name.endsWith("/") });
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Giải nén đúng các entry đã chọn (ING-01: chỉ RAM). */
export function inflateEntries(bytes: Uint8Array, entries: ZipEntryMeta[]): Map<string, Uint8Array> {
  const want = new Set(entries.map((e) => e.raw_name));
  let data: Record<string, Uint8Array>;
  try {
    data = unzipSync(bytes, { filter: (f) => want.has(f.name) });
  } catch {
    return fail("ERR_STREAM_CORRUPTED");
  }
  const out = new Map<string, Uint8Array>();
  for (const e of entries) {
    const d = data[e.raw_name];
    if (d) out.set(e.path, d);
  }
  return out;
}

// ---------- đọc tuần tự (streaming) cho zip bị cắt hoặc hỏng mục lục (ING-61 dự phòng) ----------
interface StreamedEntry { name: string; size: number; complete: boolean }

/** Lượt 1: đọc lần lượt các local header, chỉ ghi tên + đếm byte giải nén thật. Entry chưa trọn (bị cắt) có complete = false. */
function streamEntries(bytes: Uint8Array): StreamedEntry[] {
  const out: StreamedEntry[] = [];
  const u = new Unzip((file) => {
    const rec: StreamedEntry = { name: file.name, size: 0, complete: false };
    out.push(rec);
    if (file.name.endsWith("/")) { rec.complete = true; return; }
    file.ondata = (err, chunk, final) => {
      if (err) return;
      rec.size += chunk.length;
      if (final) rec.complete = true;
    };
    try { file.start(); } catch { /* phương thức nén lạ: bỏ qua entry */ }
  });
  u.register(UnzipInflate);
  u.register(UnzipPassThrough);
  try { u.push(bytes, false); } catch { /* cắt giữa chừng */ }
  return out;
}

/** Lượt 2: chạy lại, chỉ giải nén entry đã chọn (entry không gọi start() thì bị bỏ qua) và chỉ nhận entry trọn vẹn. */
function inflateStreaming(bytes: Uint8Array, entries: ZipEntryMeta[]): Map<string, Uint8Array> {
  const want = new Set(entries.map((e) => e.raw_name));
  const parts = new Map<string, Uint8Array[]>();
  const done = new Set<string>();
  const u = new Unzip((file) => {
    if (!want.has(file.name)) return;
    const list: Uint8Array[] = [];
    parts.set(file.name, list);
    file.ondata = (err, chunk, final) => {
      if (err) return;
      list.push(chunk);
      if (final) done.add(file.name);
    };
    try { file.start(); } catch { /* bỏ qua */ }
  });
  u.register(UnzipInflate);
  u.register(UnzipPassThrough);
  try { u.push(bytes, false); } catch { /* cắt giữa chừng */ }
  const out = new Map<string, Uint8Array>();
  for (const e of entries) {
    const list = parts.get(e.raw_name);
    if (!list || !done.has(e.raw_name)) continue;
    const total = list.reduce((a, c) => a + c.length, 0);
    const buf = new Uint8Array(total);
    let o = 0;
    for (const c of list) { buf.set(c, o); o += c.length; }
    out.set(e.path, buf);
  }
  return out;
}

export interface ArchiveReader {
  entries: ZipEntryMeta[];
  /** true = đọc tuần tự vì không có mục lục (zip bị cắt / hỏng) */
  streaming: boolean;
  inflate: (selected: ZipEntryMeta[]) => Map<string, Uint8Array>;
}

/**
 * ING-61: ưu tiên mục lục ở cuối zip; không có thì đọc tuần tự. null ⇒ không đọc được entry hợp lệ nào (ING-63).
 * `force_streaming` (zip bị cắt, ING-42): bỏ qua mục lục, đọc tuần tự luôn — tránh nhận nhầm byte giống chữ ký EOCD trong nội dung file.
 */
export function readArchive(bytes: Uint8Array, report: IngestionReport, opts: { force_streaming?: boolean } = {}): ArchiveReader | null {
  if (!opts.force_streaming) {
    const central = listEntries(bytes, report);
    if (central.length > 0) return { entries: central, streaming: false, inflate: (sel) => inflateEntries(bytes, sel) };
  }
  const streamed = streamEntries(bytes);
  if (streamed.length === 0) return null;
  const names = normalizePaths(streamed.map((s) => s.name), report);
  const entries: ZipEntryMeta[] = [];
  for (const s of streamed) {
    const path = names.get(s.name);
    if (!path || !s.complete) continue;
    entries.push({ path, raw_name: s.name, compressed_size: 0, size: s.size, is_dir: s.name.endsWith("/") });
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (entries.length === 0) return null;
  return { entries, streaming: true, inflate: (sel) => inflateStreaming(bytes, sel) };
}

/** ING-?: decodeAndFilter — UTF-16/UTF-8, null byte, LFS pointer, CRLF, minified. */
export function decodeAndFilter(buf: Uint8Array, report: IngestionReport, opts: { check_minified: boolean }): string | null {
  let text: string;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) text = new TextDecoder("utf-16le").decode(buf.subarray(2));
  else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) text = new TextDecoder("utf-16be").decode(buf.subarray(2));
  else {
    const sniff = buf.subarray(0, CONFIG.BINARY_SNIFF_BYTES);
    if (sniff.includes(0)) { report.skipped.binary++; return null; }
    text = new TextDecoder("utf-8").decode(buf);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  }
  if (text.startsWith("version https://git-lfs.github.com/spec/v1")) { report.skipped.binary++; return null; }
  text = text.replace(/\r\n?/g, "\n");
  if (opts.check_minified) {
    const lines = text.split("\n");
    const avg = text.length / Math.max(1, lines.length);
    if (lines.some((l) => l.length > CONFIG.MAX_LINE_LENGTH) || avg > CONFIG.MAX_AVG_LINE_LENGTH) {
      report.skipped.oversized++;
      return null;
    }
  }
  return text;
}
