// 10 Mục 4A (D-63) — tải chọn lọc khi zip GitHub bị cắt: lấy danh sách file từ API rồi tải riêng từng file được chọn.
// Mọi hàm ở đây trả null thay vì ném lỗi: null = "lùi" (ING-49), caller chạy lại trên zip đã giữ.
import { CONFIG } from "@/contracts/config";
import { type ClassifiedEntry, isTestPath } from "./prune";
import type { ZipEntryMeta } from "./zip";

const UA = { "User-Agent": "SimpliFey" };
const SHA40 = /^[0-9a-f]{40}$/;

export interface TreeListing { sha: string; entries: ZipEntryMeta[] }

/** Thư mục con trực tiếp của `parent` có nhiều byte code nhất; hòa ⇒ path nhỏ hơn. File nằm thẳng trong `parent` không tính. */
function heaviestChild(code: ClassifiedEntry[], parent: string): { dir: string; bytes: number } | null {
  const bytes = new Map<string, number>();
  for (const e of code) {
    if (!e.path.startsWith(parent)) continue;
    const rest = e.path.slice(parent.length);
    const i = rest.indexOf("/");
    if (i < 0) continue;
    const dir = `${parent}${rest.slice(0, i + 1)}`;
    bytes.set(dir, (bytes.get(dir) ?? 0) + e.size);
  }
  let best: { dir: string; bytes: number } | null = null;
  for (const [dir, b] of bytes) {
    if (!best || b > best.bytes || (b === best.bytes && dir < best.dir)) best = { dir, bytes: b };
  }
  return best;
}

/**
 * ING-47. Thư mục độ sâu 1 nhiều byte code nhất (bỏ file cờ ING-87, hòa ⇒ path nhỏ hơn); con lớn nhất của nó
 * ≥ `AUTO_SCOPE_CHILD_RATIO` × cha ⇒ lấy con. `""` khi repo không có thư mục nào chứa code.
 */
export function autoScopeOffset(entries: ClassifiedEntry[]): string {
  const code = entries.filter((e) => (e.cls === "CODE" || e.cls === "SPECIAL") && !isTestPath(e.path));
  const top = heaviestChild(code, "");
  if (!top) return "";
  const child = heaviestChild(code, top.dir);
  return child && child.bytes >= CONFIG.AUTO_SCOPE_CHILD_RATIO * top.bytes ? child.dir : top.dir;
}

/** Mỗi segment được mã hóa riêng, giữ dấu `/` (nhánh `feature/x`, đường dẫn thư mục). */
const encodePath = (p: string): string => p.split("/").map(encodeURIComponent).join("/");

interface ApiTreeNode { path?: unknown; mode?: unknown; type?: unknown; size?: unknown }

/**
 * ING-46. `commits/{ref ?? "HEAD"}` với `Accept: application/vnd.github.sha` ⇒ sha;
 * `git/trees/{sha}?recursive=1` ⇒ blob (bỏ symlink `120000`) thành `ZipEntryMeta` (`compressed_size = 0`).
 * null khi: thiếu `GITHUB_TOKEN`, API trả 401/403/429 (hoặc lỗi khác), cây `truncated: true`, hết hạn, lỗi mạng.
 */
export async function listTree(owner: string, repo: string, ref: string | null, signal: AbortSignal): Promise<TreeListing | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const headers = { ...UA, Authorization: `Bearer ${token}` };
  try {
    const c = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${encodePath(ref ?? "HEAD")}`, {
      headers: { ...headers, Accept: "application/vnd.github.sha" }, signal,
    });
    if (!c.ok) return null;
    const sha = (await c.text()).trim();
    if (!SHA40.test(sha)) return null;

    const t = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, {
      headers: { ...headers, Accept: "application/vnd.github+json" }, signal,
    });
    if (!t.ok) return null;
    const body = (await t.json()) as { truncated?: unknown; tree?: unknown };
    if (body.truncated === true || !Array.isArray(body.tree)) return null;

    const entries: ZipEntryMeta[] = [];
    for (const n of body.tree as ApiTreeNode[]) {
      if (n.type !== "blob" || n.mode === "120000" || typeof n.path !== "string") continue;
      const p = n.path;
      if (p.startsWith("/") || p.includes("\u0000") || p.split("/").includes("..")) continue; // ING-60.4
      entries.push({ path: p, raw_name: p, compressed_size: 0, size: typeof n.size === "number" ? n.size : 0, is_dir: false });
    }
    entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return { sha, entries };
  } catch {
    return null;
  }
}

async function fetchOne(url: string, signal: AbortSignal): Promise<Uint8Array | null> {
  for (let attempt = 0; attempt < 2; attempt++) { // 1 lần thử lại (ING-49)
    try {
      const r = await fetch(url, { headers: UA, signal, redirect: "follow" });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
    } catch { /* thử lại / lùi */ }
    if (signal.aborted) return null;
  }
  return null;
}

/**
 * ING-48. `raw.githubusercontent.com/{owner}/{repo}/{sha}/{path}`, song song tối đa `SELECTIVE_FETCH_CONCURRENCY`.
 * Kết quả đặt theo path nên không phụ thuộc thứ tự hoàn thành. Một file vẫn lỗi sau 1 lần thử lại, hoặc hết hạn ⇒ null.
 * Không gửi token tới host raw (repo công khai không cần).
 */
export async function fetchBlobs(owner: string, repo: string, sha: string, paths: string[], signal: AbortSignal): Promise<Map<string, Uint8Array> | null> {
  const out = new Map<string, Uint8Array>();
  let next = 0;
  let failed = false;
  const worker = async (): Promise<void> => {
    while (!failed && !signal.aborted) {
      const i = next++;
      if (i >= paths.length) return;
      const buf = await fetchOne(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${encodePath(paths[i])}`, signal);
      if (!buf) { failed = true; return; }
      out.set(paths[i], buf);
    }
  };
  const n = Math.min(CONFIG.SELECTIVE_FETCH_CONCURRENCY, paths.length);
  await Promise.all(Array.from({ length: n }, worker));
  return failed || signal.aborted ? null : out;
}
