// 10 Mục 2–4 — thăm dò repo, tìm nhánh mặc định, tải zip vào RAM (Zero-Disk, ING-01).
import { CONFIG } from "@/contracts/config";
import type { GithubRepoInfo, ProbeResult } from "@/contracts";
import { AppError, fail } from "../../errors";

const UA = { "User-Agent": "SimpliFey" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function head(url: string, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "HEAD", redirect: "manual", headers: UA, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Gọi 1 lần, hết giờ / lỗi mạng / 5xx ⇒ "TIMEOUT" (thử lại do caller). */
async function tryHead(url: string, timeoutMs: number): Promise<{ status: number; location: string | null } | "TIMEOUT"> {
  try {
    const r = await head(url, timeoutMs);
    if (r.status >= 500) return "TIMEOUT";
    return { status: r.status, location: r.headers.get("location") };
  } catch {
    return "TIMEOUT";
  }
}

export interface ResolvedRef { download_url: string; ref: string | null; ref_label: string | null }
const SHA40 = /^[0-9a-f]{40}$/;

function mapStatus(status: number): ProbeResult | null {
  if (status === 451) return "UNAVAILABLE_451";
  if (status === 429 || status === 403) return "RATE_LIMITED";
  return null;
}

function throwFor(r: ProbeResult): never {
  switch (r) {
    case "NOT_FOUND_OR_PRIVATE": return fail("ERR_PREFLIGHT_404_OR_PRIVATE");
    case "UNAVAILABLE_451": return fail("ERR_REPO_UNAVAILABLE_451");
    case "RATE_LIMITED": return fail("ERR_GITHUB_RATE_LIMIT_CDN");
    case "EMPTY": return fail("ERR_EMPTY_REPOSITORY");
    default: return fail("ERR_NETWORK_TIMEOUT");
  }
}

/** Mục 2: HEAD archive/HEAD.zip; 404 ⇒ HEAD trang repo. Trả owner/repo mới nếu repo đã đổi tên (301). */
export async function probeRepo(info: GithubRepoInfo): Promise<{
  owner: string; repo: string; head_zip: { status: number; location: string | null } | null;
}> {
  let { owner, repo } = info;
  for (let hop = 0; hop < 2; hop++) {
    let res = await tryHead(`https://github.com/${owner}/${repo}/archive/HEAD.zip`, CONFIG.PREFLIGHT_TIMEOUT_MS);
    if (res === "TIMEOUT") {
      await sleep(CONFIG.PREFLIGHT_RETRY_DELAY_MS);
      res = await tryHead(`https://github.com/${owner}/${repo}/archive/HEAD.zip`, CONFIG.PREFLIGHT_TIMEOUT_MS);
      if (res === "TIMEOUT") return throwFor("TIMEOUT");
    }
    const bad = mapStatus(res.status);
    if (bad) return throwFor(bad);
    if (res.status === 301 && res.location) {
      const m = /github\.com\/([^/]+)\/([^/]+)\/archive\/HEAD\.zip/i.exec(res.location);
      if (m && hop === 0 && (m[1] !== owner || m[2] !== repo)) { owner = m[1]; repo = m[2]; continue; }
    }
    if (res.status === 404) {
      const page = await tryHead(`https://github.com/${owner}/${repo}`, CONFIG.PREFLIGHT_PAGE_TIMEOUT_MS);
      if (page === "TIMEOUT") return throwFor("TIMEOUT");
      if (page.status === 404) return throwFor("NOT_FOUND_OR_PRIVATE");
      const bad2 = mapStatus(page.status);
      if (bad2) return throwFor(bad2);
      return { owner, repo, head_zip: null };
    }
    return { owner, repo, head_zip: res };
  }
  return throwFor("TIMEOUT");
}

async function refExists(owner: string, repo: string, ref: string): Promise<boolean> {
  const url = `https://codeload.github.com/${owner}/${repo}/zip/${ref}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await tryHead(url, CONFIG.PREFLIGHT_TIMEOUT_MS);
    if (r === "TIMEOUT") { if (attempt === 0) { await sleep(CONFIG.PREFLIGHT_RETRY_DELAY_MS); continue; } return throwFor("TIMEOUT"); }
    if (r.status === 200) return true;
    if (r.status === 404) return false;
    const bad = mapStatus(r.status);
    if (bad) return throwFor(bad);
    return false;
  }
  return false;
}

/** Mục 3: ING-32 — nhánh mặc định. */
export async function resolveRef(owner: string, repo: string, headZip: { status: number; location: string | null } | null): Promise<ResolvedRef> {
  if (headZip) {
    if (headZip.status >= 300 && headZip.status < 400 && headZip.location) {
      const m = /^https:\/\/codeload\.github\.com\/[^/]+\/[^/]+\/zip\/(?:refs\/heads\/)?(.+)$/.exec(headZip.location);
      if (m) {
        const ref = m[1];
        return { download_url: headZip.location, ref, ref_label: SHA40.test(ref) ? null : ref };
      }
    }
    return { download_url: `https://github.com/${owner}/${repo}/archive/HEAD.zip`, ref: null, ref_label: null };
  }
  for (const b of CONFIG.DEFAULT_BRANCH_FALLBACKS) {
    if (await refExists(owner, repo, b)) {
      return { download_url: `https://codeload.github.com/${owner}/${repo}/zip/${b}`, ref: b, ref_label: b };
    }
  }
  return fail("ERR_EMPTY_REPOSITORY"); // ING-33
}

/** `bytes` không bao giờ vượt `CONFIG.MAX_STREAM_BYTES`; `stream_cut` = bị cắt ở trần đó (ING-42). */
export interface RawArchive { bytes: Uint8Array; stream_cut: boolean }

async function downloadOnce(url: string): Promise<RawArchive> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CONFIG.STREAM_TIMEOUT_MS); // ING-40: phủ cả kết nối + tải
  try {
    const res = await fetch(url, { headers: UA, signal: ctl.signal, redirect: "follow" });
    if (res.status === 404) return fail("ERR_BRANCH_NOT_FOUND");
    if (res.status === 429 || res.status === 403) return fail("ERR_GITHUB_RATE_LIMIT_CDN");
    if (res.status === 451) return fail("ERR_REPO_UNAVAILABLE_451");
    if (!res.ok || !res.body) throw new Error(`http ${res.status}`);
    const chunks: Uint8Array[] = [];
    let total = 0;
    let cut = false;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const room = CONFIG.MAX_STREAM_BYTES - total;
      if (value.byteLength > room) { // ING-42: không tin Content-Length; giữ đúng MAX_STREAM_BYTES byte đầu, bỏ phần thừa của chunk cuối
        if (room > 0) chunks.push(value.subarray(0, room));
        total = CONFIG.MAX_STREAM_BYTES;
        cut = true;
        ctl.abort();
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.byteLength; }
    return { bytes: out, stream_cut: cut };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ING-44: tối đa 2 lần tải (1 lần tải lại, timer mới). Không thử lại 404/429/451.
 * `consume` xử lý bản tải; nó ném `ERR_STREAM_CORRUPTED` (zip hỏng, ING-63) thì cũng tính là một lần lỗi cần tải lại.
 */
export async function downloadArchive<T>(url: string, consume: (a: RawArchive) => T | Promise<T>): Promise<T> {
  let lastTimeout = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    let archive: RawArchive;
    try {
      archive = await downloadOnce(url);
    } catch (e) {
      if (e instanceof AppError) throw e; // 404 / 429 / 451: không thử lại
      lastTimeout = (e as Error).name === "AbortError";
      if (attempt === 0) await sleep(CONFIG.STREAM_RETRY_DELAY_MS);
      continue;
    }
    try {
      return await consume(archive);
    } catch (e) {
      if (!(e instanceof AppError) || e.code !== "ERR_STREAM_CORRUPTED" || attempt === 1) throw e;
      lastTimeout = false;
      await sleep(CONFIG.STREAM_RETRY_DELAY_MS);
    }
  }
  return lastTimeout ? fail("ERR_STREAM_TIMEOUT") : fail("ERR_STREAM_CORRUPTED");
}
