import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CONFIG } from "@/contracts";
import { IngestionError, type RawArchive } from "../types";
import { parseGithubUrl } from "../url";
import { probeRepo } from "../probe";
import { resolveRef } from "../refs";
import { downloadArchive, receiveUpload } from "../download";
import {
  computeSnapshot,
  computeArchiveHash,
  readEocdComment,
} from "../snapshot";

/**
 * Tạo một buffer zip tối thiểu chỉ chứa bản ghi EOCD kèm comment tùy chọn
 */
function createZipWithComment(comment: string): Uint8Array {
  const commentBytes = Buffer.from(comment, "utf-8");
  const len = 22 + commentBytes.length;
  const buf = Buffer.alloc(len);
  buf.writeUInt32LE(0x06054b50, 0); // Signature PK\x05\x06
  buf.writeUInt16LE(0, 4); // Số thứ tự đĩa
  buf.writeUInt16LE(0, 6); // Đĩa bắt đầu central directory
  buf.writeUInt16LE(0, 8); // Số entry trên đĩa
  buf.writeUInt16LE(0, 10); // Tổng số entry
  buf.writeUInt32LE(0, 12); // Kích thước central directory
  buf.writeUInt32LE(0, 16); // Offset central directory
  buf.writeUInt16LE(commentBytes.length, 20); // Độ dài comment
  commentBytes.copy(buf, 22);
  return new Uint8Array(buf);
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// T-ING-01
// ---------------------------------------------------------------------------
it("T-ING-01: chuẩn hóa link có query/hash, tab, .git", () => {
  const input = "  https://github.com/nestjs/nest.git?tab=readme#x ";
  const res = parseGithubUrl(input);

  expect(res).toEqual({
    owner: "nestjs",
    repo: "nest",
    path_trimmed: false,
    clean_url: "https://github.com/nestjs/nest",
  });
});

// ---------------------------------------------------------------------------
// T-ING-02
// ---------------------------------------------------------------------------
it("T-ING-02: chuẩn hóa các biến thể link GitHub (git@, không scheme, www, pulls)", () => {
  const inputs = [
    "git@github.com:a/b.git",
    "github.com/a/b/",
    "https://www.github.com/a/b",
    "https://github.com/a/b/pulls",
  ];

  for (const input of inputs) {
    const res = parseGithubUrl(input);
    expect(res).toEqual({
      owner: "a",
      repo: "b",
      path_trimmed: false,
      clean_url: "https://github.com/a/b",
    });
  }
});

// ---------------------------------------------------------------------------
// T-ING-03
// ---------------------------------------------------------------------------
it("T-ING-03: link có /tree/... cắt về gốc repo và đánh dấu path_trimmed = true", () => {
  const input = "https://github.com/a/b/tree/release/v2/src";
  const res = parseGithubUrl(input);

  expect(res).toEqual({
    owner: "a",
    repo: "b",
    path_trimmed: true,
    clean_url: "https://github.com/a/b",
  });
});

// ---------------------------------------------------------------------------
// T-ING-04
// ---------------------------------------------------------------------------
it("T-ING-04: link có /blob/... cắt về gốc repo và đánh dấu path_trimmed = true", () => {
  const input = "https://github.com/a/b/blob/main/src/app.ts";
  const res = parseGithubUrl(input);

  expect(res).toEqual({
    owner: "a",
    repo: "b",
    path_trimmed: true,
    clean_url: "https://github.com/a/b",
  });
});

// ---------------------------------------------------------------------------
// T-ING-06
// ---------------------------------------------------------------------------
it("T-ING-06: ném ERR_INVALID_GITHUB_URL với host khác hoặc link không đủ owner/repo", () => {
  expect(() => parseGithubUrl("https://gitlab.com/a/b")).toThrowError(IngestionError);
  expect(() => parseGithubUrl("https://gitlab.com/a/b")).toThrowError(
    expect.objectContaining({ code: "ERR_INVALID_GITHUB_URL" })
  );

  expect(() => parseGithubUrl("https://github.com/a")).toThrowError(IngestionError);
  expect(() => parseGithubUrl("https://github.com/a")).toThrowError(
    expect.objectContaining({ code: "ERR_INVALID_GITHUB_URL" })
  );
});

// T-ING-07
// ---------------------------------------------------------------------------
describe("T-ING-07: Thăm dò repo (probeRepo)", () => {
  const repoInfo = {
    owner: "a",
    repo: "b",
    path_trimmed: false,
    clean_url: "https://github.com/a/b",
  };
  const HEAD_ZIP = "https://github.com/a/b/archive/HEAD.zip";
  const PAGE = "https://github.com/a/b";

  /** Mock fetch theo URL; URL không khai báo trả 404 */
  function mockByUrl(map: Record<string, () => Response>) {
    const fn = vi.fn(async (url: string | URL | Request) => {
      const make = map[url.toString()];
      return make ? make() : new Response(null, { status: 404 });
    });
    globalThis.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  it("T-ING-07 (ING-21): HEAD.zip 404 và trang repo 404 => ERR_PREFLIGHT_404_OR_PRIVATE", async () => {
    mockByUrl({});
    await expect(probeRepo(repoInfo)).rejects.toMatchObject({
      code: "ERR_PREFLIGHT_404_OR_PRIVATE",
    });
  });

  it.each([
    [451, "ERR_REPO_UNAVAILABLE_451"],
    [429, "ERR_GITHUB_RATE_LIMIT_CDN"],
    [403, "ERR_GITHUB_RATE_LIMIT_CDN"],
  ])("T-ING-07 (ING-21): HEAD.zip trả %i => %s", async (status, code) => {
    mockByUrl({ [HEAD_ZIP]: () => new Response(null, { status }) });
    await expect(probeRepo(repoInfo)).rejects.toMatchObject({ code });
  });

  it(
    "T-ING-07 (ING-21, ING-22): lỗi mạng 2 lần => ERR_NETWORK_TIMEOUT",
    async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Probe network timeout"));
      await expect(probeRepo(repoInfo)).rejects.toMatchObject({
        code: "ERR_NETWORK_TIMEOUT",
      });
    },
    10000
  );

  it("B-14: HEAD.zip 302 => OK, trả head_zip, không gọi trang repo", async () => {
    const fn = mockByUrl({
      [HEAD_ZIP]: () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://codeload.github.com/a/b/zip/refs/heads/develop" },
        }),
    });
    const res = await probeRepo(repoInfo);
    expect(res).toEqual({
      result: "OK",
      owner: "a",
      repo: "b",
      head_zip: {
        download_url: "https://codeload.github.com/a/b/zip/refs/heads/develop",
        ref: "develop",
        ref_label: "develop",
      },
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("T-ING-07 (ING-21): 301 tới /c/d/archive/HEAD.zip rồi 302 => OK, owner c, repo d", async () => {
    mockByUrl({
      [HEAD_ZIP]: () =>
        new Response(null, {
          status: 301,
          headers: { location: "https://github.com/c/d/archive/HEAD.zip" },
        }),
      "https://github.com/c/d/archive/HEAD.zip": () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://codeload.github.com/c/d/zip/refs/heads/main" },
        }),
    });
    const res = await probeRepo(repoInfo);
    expect(res).toMatchObject({
      result: "OK",
      owner: "c",
      repo: "d",
      head_zip: { ref: "main" },
    });
  });

  it("B-16 (ING-32): HEAD.zip 302 tới SHA 40 hex => giữ ref, ref_label = null", async () => {
    const sha = "5da6ad13f8be8e571a9fc2eb4d9b421adfa53a78";
    mockByUrl({
      [HEAD_ZIP]: () =>
        new Response(null, {
          status: 302,
          headers: { location: `https://codeload.github.com/a/b/zip/${sha}` },
        }),
    });
    const res = await probeRepo(repoInfo);
    expect(res.head_zip).toEqual({
      download_url: `https://codeload.github.com/a/b/zip/${sha}`,
      ref: sha,
      ref_label: null,
    });
  });

  it("B-16 (ING-32): tên nhánh 40 ký tự không phải hex vẫn là nhãn", async () => {
    const name = "feature-" + "x".repeat(32);
    mockByUrl({
      [HEAD_ZIP]: () =>
        new Response(null, {
          status: 302,
          headers: { location: `https://codeload.github.com/a/b/zip/refs/heads/${name}` },
        }),
    });
    const res = await probeRepo(repoInfo);
    expect(res.head_zip?.ref_label).toBe(name);
  });

  it("B-14: HEAD.zip 404 nhưng trang repo 200 => OK, head_zip = null", async () => {
    mockByUrl({ [PAGE]: () => new Response(null, { status: 200 }) });
    const res = await probeRepo(repoInfo);
    expect(res).toEqual({ result: "OK", owner: "a", repo: "b", head_zip: null });
  });

  it("B-14: lần đầu 503, lần hai 302 => OK sau 1 lần thử lại", async () => {
    let calls = 0;
    mockByUrl({
      [HEAD_ZIP]: () =>
        ++calls === 1
          ? new Response(null, { status: 503 })
          : new Response(null, {
              status: 302,
              headers: { location: "https://codeload.github.com/a/b/zip/refs/heads/main" },
            }),
    });
    const res = await probeRepo(repoInfo);
    expect(res.result).toBe("OK");
    expect(calls).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// T-ING-08
// ---------------------------------------------------------------------------
it("T-ING-08: có head_zip từ probe => dùng luôn, không gọi mạng", async () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  const headZip = {
    download_url: "https://codeload.github.com/a/b/zip/refs/heads/develop",
    ref: "develop",
    ref_label: "develop",
  };
  const res = await resolveRef("a", "b", headZip);
  expect(res).toEqual(headZip);
  expect(mockFetch).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// T-ING-09
// ---------------------------------------------------------------------------
it("T-ING-09: head_zip null, main, master, dev đều 404 => ném ERR_EMPTY_REPOSITORY", async () => {
  const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
  globalThis.fetch = mockFetch;

  await expect(resolveRef("a", "b", null)).rejects.toMatchObject({
    code: "ERR_EMPTY_REPOSITORY",
  });

  expect(mockFetch).not.toHaveBeenCalledWith(
    expect.stringContaining("archive/HEAD.zip"),
    expect.anything()
  );
  for (const fb of CONFIG.DEFAULT_BRANCH_FALLBACKS) {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/zip/${fb}`),
      expect.anything()
    );
  }
});

// ---------------------------------------------------------------------------
// T-ING-33
// ---------------------------------------------------------------------------
describe("T-ING-33: Định danh phiên bản computeSnapshot", () => {
  it("T-ING-33 (ING-50): Comment EOCD 40 hex => COMMIT_SHA = comment", () => {
    const commitSha = "1234567890abcdef1234567890abcdef12345678";
    const bytes = createZipWithComment(commitSha);

    // Kiểm tra hàm tự đọc comment EOCD (ING-50)
    const readComment = readEocdComment(bytes);
    expect(readComment).toBe(commitSha);

    const archive: RawArchive = {
      bytes,
      stream_cut: false,
      source: "GITHUB",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "owner/repo",
      ref: null,
      ref_label: "main",
      explicit_subdir: "",
    });

    expect(snapshot).toEqual({
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: commitSha,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "",
      ref_label: "main",
    });
  });

  it("T-ING-33 (ING-52): Comment rỗng => ARCHIVE_HASH cả buffer", () => {
    const emptyBytes = createZipWithComment("");
    const expectedHash = computeArchiveHash(emptyBytes);

    const archive: RawArchive = {
      bytes: emptyBytes,
      stream_cut: false,
      source: "GITHUB",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "owner/repo",
      ref: null,
      ref_label: "main",
      explicit_subdir: "",
    });

    expect(snapshot).toEqual({
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: expectedHash,
      snapshot_id_kind: "ARCHIVE_HASH",
      subdir: "",
      ref_label: "main",
    });
  });

  it("T-ING-33 (ING-50): ref là SHA 40 hex => COMMIT_SHA = ref", () => {
    const refSha = "fedcba9876543210fedcba9876543210fedcba98";
    const bytesWithOtherComment = createZipWithComment("unrelated-comment");

    const archive: RawArchive = {
      bytes: bytesWithOtherComment,
      stream_cut: false,
      source: "GITHUB",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "Owner/Repo",
      ref: refSha,
      ref_label: refSha,
      explicit_subdir: "server/",
    });

    expect(snapshot).toEqual({
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: refSha,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "server/",
      ref_label: refSha,
    });
  });

  it("T-ING-33 (ING-50, ING-52): stream_cut với ref 40 hex vẫn cho snapshot_id = ref và COMMIT_SHA", () => {
    const refSha = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const cutBytes = new Uint8Array(100);

    const archive: RawArchive = {
      bytes: cutBytes,
      stream_cut: true,
      source: "GITHUB",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "owner/repo",
      ref: refSha,
      ref_label: refSha,
      explicit_subdir: "",
    });

    expect(snapshot).toEqual({
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: refSha,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "",
      ref_label: refSha,
    });
  });

  it("T-ING-33 (ING-52): stream_cut khi ref không phải SHA 40 hex => ARCHIVE_HASH", () => {
    const cutBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const expectedHash = computeArchiveHash(cutBytes);

    const archive: RawArchive = {
      bytes: cutBytes,
      stream_cut: true,
      source: "GITHUB",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "owner/repo",
      ref: "main",
      ref_label: "main",
      explicit_subdir: "",
    });

    expect(snapshot).toEqual({
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: expectedHash,
      snapshot_id_kind: "ARCHIVE_HASH",
      subdir: "",
      ref_label: "main",
    });
  });

  it("T-ING-33 (ING-52): Upload file zip => ARCHIVE_HASH, ref_label = null", () => {
    const zipBytes = createZipWithComment("zip-upload");
    const hash = computeArchiveHash(zipBytes);

    const archive: RawArchive = {
      bytes: zipBytes,
      stream_cut: false,
      source: "ZIP",
    };

    const snapshot = computeSnapshot(archive, {
      repo_key: "project.zip",
      ref: null,
      ref_label: "main",
      explicit_subdir: "",
    });

    expect(snapshot).toEqual({
      source: "ZIP",
      repo_key: "project.zip",
      snapshot_id: hash,
      snapshot_id_kind: "ARCHIVE_HASH",
      subdir: "",
      ref_label: null,
    });
  });
});

// ---------------------------------------------------------------------------
// Tải và Upload: downloadArchive & receiveUpload (ING-40, ING-42, ING-44, ING-45)
// ---------------------------------------------------------------------------
describe("ING-42, ING-44, ING-45: downloadArchive & receiveUpload", () => {
  it("ING-42: downloadArchive tải bình thường trong RAM (stream_cut = false)", async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(testData, { status: 200 })
    );

    const res = await downloadArchive("https://codeload.github.com/a/b/zip/main");
    expect(res.stream_cut).toBe(false);
    expect(res.source).toBe("GITHUB");
    expect(res.bytes).toEqual(testData);
  });

  it("ING-42: downloadArchive cắt cụt nếu vượt MAX_STREAM_BYTES (stream_cut = true)", async () => {
    const oversizedBytes = new Uint8Array(CONFIG.MAX_STREAM_BYTES + 1024);
    oversizedBytes.fill(42);

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(oversizedBytes, { status: 200 })
    );

    const res = await downloadArchive("https://codeload.github.com/a/b/zip/main");
    expect(res.stream_cut).toBe(true);
    expect(res.bytes.byteLength).toBe(CONFIG.MAX_STREAM_BYTES);
  });

  it("ING-44: downloadArchive thử lại khi gặp 5xx và thành công ở lần 2", async () => {
    const testData = new Uint8Array([1, 2, 3]);
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(null, { status: 502 }));
      }
      return Promise.resolve(new Response(testData, { status: 200 }));
    });

    const res = await downloadArchive("https://codeload.github.com/a/b/zip/main");
    expect(callCount).toBe(2);
    expect(res.bytes).toEqual(testData);
  });

  it("ING-44: downloadArchive ném ERR_STREAM_CORRUPTED khi lỗi kết nối cả 2 lần thử", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection reset"));

    await expect(
      downloadArchive("https://codeload.github.com/a/b/zip/main")
    ).rejects.toMatchObject({
      code: "ERR_STREAM_CORRUPTED",
    });
  });

  it("ING-44: downloadArchive không thử lại khi gặp 404 => ném ERR_BRANCH_NOT_FOUND", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    globalThis.fetch = mockFetch;

    await expect(
      downloadArchive("https://codeload.github.com/a/b/zip/notfound")
    ).rejects.toMatchObject({
      code: "ERR_BRANCH_NOT_FOUND",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("ING-45: receiveUpload ném ERR_STREAM_QUOTA_EXCEEDED khi vượt MAX_UPLOAD_BYTES", async () => {
    const oversizedChunk = new Uint8Array(CONFIG.MAX_UPLOAD_BYTES + 100);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversizedChunk);
        controller.close();
      },
    });

    await expect(
      receiveUpload(stream, "multipart/form-data; boundary=---boundary")
    ).rejects.toMatchObject({
      code: "ERR_STREAM_QUOTA_EXCEEDED",
    });
  });

  it("ING-45: receiveUpload ném ERR_UPLOAD_INVALID khi Content-Type không phải multipart/form-data", async () => {
    const validZip = createZipWithComment("");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(validZip);
        controller.close();
      },
    });

    await expect(
      receiveUpload(stream, "application/octet-stream")
    ).rejects.toMatchObject({
      code: "ERR_UPLOAD_INVALID",
    });
  });

  it("ING-45: receiveUpload ném ERR_UPLOAD_INVALID khi multipart thiếu trường archive", async () => {
    const formData = new FormData();
    formData.append("other_field", "value");
    const dummyRes = new Response(formData);

    await expect(
      receiveUpload(dummyRes.body!, dummyRes.headers.get("content-type")!)
    ).rejects.toMatchObject({
      code: "ERR_UPLOAD_INVALID",
    });
  });

  it("ING-45: receiveUpload ném ERR_UPLOAD_INVALID khi file upload không bắt đầu bằng PK magic", async () => {
    const invalidBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const file = new File([invalidBytes], "corrupted.zip", { type: "application/zip" });
    const formData = new FormData();
    formData.append("archive", file);
    const dummyRes = new Response(formData);

    await expect(
      receiveUpload(dummyRes.body!, dummyRes.headers.get("content-type")!)
    ).rejects.toMatchObject({
      code: "ERR_UPLOAD_INVALID",
    });
  });

  it("ING-45: receiveUpload nhận multipart hợp lệ có archive và subdir", async () => {
    const validZip = createZipWithComment("valid-upload");
    // Chép sang ArrayBuffer thường để khớp kiểu BlobPart của lib DOM.
    const file = new File([new Uint8Array(validZip)], "repo.zip", { type: "application/zip" });
    const formData = new FormData();
    formData.append("archive", file);
    formData.append("subdir", "packages/core");
    const dummyRes = new Response(formData);

    const res = await receiveUpload(dummyRes.body!, dummyRes.headers.get("content-type")!);
    expect(res.file_name).toBe("repo.zip");
    expect(res.subdir).toBe("packages/core");
    expect(res.bytes).toEqual(validZip);
  });
});
