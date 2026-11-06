// 10 Mục 2–4: thăm dò repo (T-ING-07/08/09), tìm nhánh mặc định, tải zip có trần byte (ING-40..44, ING-63).
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts/config";
import { AppError } from "../../errors";
import { bodyResponse, fakeNet, hang, settle, status, text } from "./__fixtures__/fake-net";
import { type RawArchive, downloadArchive, probeRepo, resolveRef } from "./github";
import { parseGithubUrl } from "./url";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const HEAD_ZIP = /^HEAD https:\/\/github\.com\/a\/b\/archive\/HEAD\.zip$/;
const REPO_PAGE = /^HEAD https:\/\/github\.com\/a\/b$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const codeOf = (r: { ok: unknown } | { err: unknown }): string =>
  "err" in r ? (r.err instanceof AppError ? r.err.code : `LỖI LẠ: ${String(r.err)}`) : "OK";

describe("T-ING-07 — thăm dò archive/HEAD.zip rồi trang repo", () => {
  const probe = (routes: Parameters<typeof fakeNet>[0]) => {
    vi.useFakeTimers();
    const net = fakeNet(routes);
    return { net, result: settle(probeRepo(parseGithubUrl("https://github.com/a/b"))) };
  };

  it("HEAD.zip 404 và trang repo 404 ⇒ ERR_PREFLIGHT_404_OR_PRIVATE", async () => {
    const { result } = probe([[HEAD_ZIP, () => status(404)], [REPO_PAGE, () => status(404)]]);
    expect(codeOf(await result)).toBe("ERR_PREFLIGHT_404_OR_PRIVATE");
  });

  it("451 ⇒ ERR_REPO_UNAVAILABLE_451; 429 ⇒ ERR_GITHUB_RATE_LIMIT_CDN", async () => {
    expect(codeOf(await probe([[HEAD_ZIP, () => status(451)]]).result)).toBe("ERR_REPO_UNAVAILABLE_451");
    expect(codeOf(await probe([[HEAD_ZIP, () => status(429)]]).result)).toBe("ERR_GITHUB_RATE_LIMIT_CDN");
  });

  it("2 lần hết PREFLIGHT_TIMEOUT_MS ⇒ ERR_NETWORK_TIMEOUT (thử lại đúng 1 lần)", async () => {
    const { net, result } = probe([[HEAD_ZIP, (_m, _c, init) => hang(init)]]);
    expect(codeOf(await result)).toBe("ERR_NETWORK_TIMEOUT");
    expect(net.calls).toHaveLength(2);
  });

  it("301 tới /c/d/archive/HEAD.zip rồi 302 ⇒ OK, owner c, repo d", async () => {
    const { result } = probe([
      [HEAD_ZIP, () => status(301, { location: "https://github.com/c/d/archive/HEAD.zip" })],
      [/^HEAD https:\/\/github\.com\/c\/d\/archive\/HEAD\.zip$/, () => status(302, { location: "https://codeload.github.com/c/d/zip/refs/heads/main" })],
    ]);
    expect(await result).toMatchObject({ ok: { owner: "c", repo: "d", head_zip: { status: 302 } } });
  });
});

describe("T-ING-08 / T-ING-09 — nhánh mặc định", () => {
  const info = () => parseGithubUrl("https://github.com/a/b");

  it("302 ⇒ …/zip/refs/heads/develop ⇒ ref develop; không thử main, không gọi trang repo", async () => {
    const net = fakeNet([[HEAD_ZIP, () => status(302, { location: "https://codeload.github.com/a/b/zip/refs/heads/develop" })]]);
    const p = await probeRepo(info());
    const ref = await resolveRef(p.owner, p.repo, p.head_zip);
    expect(ref).toEqual({ download_url: "https://codeload.github.com/a/b/zip/refs/heads/develop", ref: "develop", ref_label: "develop" });
    expect(net.calls).toHaveLength(1);
  });

  it("302 ⇒ …/zip/<SHA 40 hex> ⇒ ref = SHA, ref_label null", async () => {
    fakeNet([[HEAD_ZIP, () => status(302, { location: `https://codeload.github.com/a/b/zip/${SHA}` })]]);
    const p = await probeRepo(info());
    expect(await resolveRef(p.owner, p.repo, p.head_zip)).toMatchObject({ ref: SHA, ref_label: null });
  });

  it("HEAD.zip 200 (không chuyển hướng) ⇒ tải chính URL HEAD.zip, ref null", async () => {
    fakeNet([[HEAD_ZIP, () => status(200)]]);
    const p = await probeRepo(info());
    expect(await resolveRef(p.owner, p.repo, p.head_zip)).toEqual({
      download_url: "https://github.com/a/b/archive/HEAD.zip", ref: null, ref_label: null,
    });
  });

  it("T-ING-09: HEAD.zip, main, master, dev đều 404, trang repo 200 ⇒ ERR_EMPTY_REPOSITORY", async () => {
    const net = fakeNet([
      [HEAD_ZIP, () => status(404)],
      [REPO_PAGE, () => status(200)],
      [/^HEAD https:\/\/codeload\.github\.com\/a\/b\/zip\/(main|master|dev)$/, () => status(404)],
    ]);
    const p = await probeRepo(info());
    expect(p.head_zip).toBeNull();
    await expect(resolveRef(p.owner, p.repo, p.head_zip)).rejects.toMatchObject({ code: "ERR_EMPTY_REPOSITORY" });
    expect(net.calls.map((c) => c.url.split("/zip/")[1]).filter(Boolean)).toEqual(["main", "master", "dev"]);
  });
});

describe("ING-42..44, ING-63 — tải zip", () => {
  const MAX = CONFIG.MAX_STREAM_BYTES;
  const ZIP_URL = "https://codeload.github.com/a/b/zip/main";
  const ZIP_ROUTE = /^GET https:\/\/codeload\.github\.com\/a\/b\/zip\/main$/;
  const ident = (a: RawArchive): RawArchive => a;
  /** Mỗi 4096 byte có một dấu khác nhau ⇒ phân biệt được vị trí cắt. */
  const pattern = (n: number): Uint8Array => {
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i += 4096) b[i] = ((i / 4096) & 0xff) | 1;
    return b;
  };
  const same = (a: Uint8Array, b: Uint8Array) => Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.length), Buffer.from(b.buffer, b.byteOffset, b.length)) === 0;

  it("ING-42: vượt MAX_STREAM_BYTES ⇒ giữ đúng MAX byte đầu, stream_cut, không ném lỗi (chunk cuối bị cắt)", async () => {
    const full = pattern(MAX + 1000);
    for (const chunk of [full.length, 1024 * 1024 + 17]) { // 1 chunk duy nhất, và nhiều chunk lệch biên
      fakeNet([[ZIP_ROUTE, () => bodyResponse(full, chunk)]]);
      const a = await downloadArchive(ZIP_URL, ident);
      expect(a.stream_cut).toBe(true);
      expect(a.bytes.length).toBe(MAX);
      expect(same(a.bytes, full.subarray(0, MAX))).toBe(true);
    }
  });

  it("đúng MAX byte hoặc ít hơn ⇒ không cắt", async () => {
    for (const n of [MAX, MAX - 1, 10]) {
      fakeNet([[ZIP_ROUTE, () => bodyResponse(pattern(n), 1024 * 1024)]]);
      const a = await downloadArchive(ZIP_URL, ident);
      expect(a.stream_cut).toBe(false);
      expect(a.bytes.length).toBe(n);
    }
  });

  it("ING-43: 404 ⇒ ERR_BRANCH_NOT_FOUND; 429/403 ⇒ ERR_GITHUB_RATE_LIMIT_CDN; 451 ⇒ ERR_REPO_UNAVAILABLE_451 — không thử lại", async () => {
    const cases: Array<[number, string]> = [[404, "ERR_BRANCH_NOT_FOUND"], [429, "ERR_GITHUB_RATE_LIMIT_CDN"], [403, "ERR_GITHUB_RATE_LIMIT_CDN"], [451, "ERR_REPO_UNAVAILABLE_451"]];
    for (const [s, code] of cases) {
      const net = fakeNet([[ZIP_ROUTE, () => status(s)]]);
      await expect(downloadArchive(ZIP_URL, ident)).rejects.toMatchObject({ code });
      expect(net.calls).toHaveLength(1);
    }
  });

  it("ING-44: 5xx một lần rồi 200 ⇒ tải lại 1 lần, thành công", async () => {
    vi.useFakeTimers();
    let n = 0;
    const net = fakeNet([[ZIP_ROUTE, () => (n++ === 0 ? status(502) : bodyResponse(pattern(100)))]]);
    const r = await settle(downloadArchive(ZIP_URL, ident));
    expect(r).toMatchObject({ ok: { stream_cut: false } });
    expect(net.calls).toHaveLength(2);
  });

  it("ING-44: 5xx hai lần ⇒ ERR_STREAM_CORRUPTED; hết giờ hai lần ⇒ ERR_STREAM_TIMEOUT", async () => {
    vi.useFakeTimers();
    const a = fakeNet([[ZIP_ROUTE, () => status(500)]]);
    expect(codeOf(await settle(downloadArchive(ZIP_URL, ident)))).toBe("ERR_STREAM_CORRUPTED");
    expect(a.calls).toHaveLength(2);
    const b = fakeNet([[ZIP_ROUTE, (_m, _c, init) => hang(init)]]);
    expect(codeOf(await settle(downloadArchive(ZIP_URL, ident)))).toBe("ERR_STREAM_TIMEOUT");
    expect(b.calls).toHaveLength(2);
  });

  it("ING-63: bản tải hỏng (consume ném ERR_STREAM_CORRUPTED) ⇒ tải lại đúng 1 lần", async () => {
    vi.useFakeTimers();
    let tries = 0;
    const net = fakeNet([[ZIP_ROUTE, () => bodyResponse(pattern(100))]]);
    const ok = await settle(downloadArchive(ZIP_URL, (a) => {
      if (tries++ === 0) throw new AppError("ERR_STREAM_CORRUPTED");
      return a.bytes.length;
    }));
    expect(ok).toEqual({ ok: 100 });
    expect(net.calls).toHaveLength(2);

    const net2 = fakeNet([[ZIP_ROUTE, () => bodyResponse(pattern(100))]]);
    const bad = await settle(downloadArchive(ZIP_URL, () => { throw new AppError("ERR_STREAM_CORRUPTED"); }));
    expect(codeOf(bad)).toBe("ERR_STREAM_CORRUPTED");
    expect(net2.calls).toHaveLength(2);
  });

  it("lỗi nghiệp vụ khác từ consume (vd. không có file nguồn) ⇒ giữ nguyên, không tải lại", async () => {
    const net = fakeNet([[ZIP_ROUTE, () => bodyResponse(pattern(100))]]);
    await expect(downloadArchive(ZIP_URL, () => { throw new AppError("ERR_NO_SOURCE_FILES_FOUND"); })).rejects.toMatchObject({ code: "ERR_NO_SOURCE_FILES_FOUND" });
    expect(net.calls).toHaveLength(1);
  });

  it("text() của fake không làm vỡ định tuyến (kiểm tra fixture)", async () => {
    fakeNet([[ZIP_ROUTE, () => text("x")]]);
    const a = await downloadArchive(ZIP_URL, ident);
    expect(new TextDecoder().decode(a.bytes)).toBe("x");
  });
});
