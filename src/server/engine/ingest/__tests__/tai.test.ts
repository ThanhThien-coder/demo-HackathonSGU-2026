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

// ---------------------------------------------------------------------------
// T-ING-07
// ---------------------------------------------------------------------------
describe("T-ING-07: Thăm dò repo (probeRepo)", () => {
  const repoInfo = {
    owner: "a",
    repo: "b",
    path_trimmed: false,
    clean_url: "https://github.com/a/b",
  };

  it("T-ING-07 (ING-21): Probe trả 404 => ném ERR_PREFLIGHT_404_OR_PRIVATE", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 404 })
    );

    await expect(probeRepo(repoInfo)).rejects.toMatchObject({
      code: "ERR_PREFLIGHT_404_OR_PRIVATE",
    });
  });

  it("T-ING-07 (ING-21): Probe trả 451 => ném ERR_REPO_UNAVAILABLE_451", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 451 })
    );

    await expect(probeRepo(repoInfo)).rejects.toMatchObject({
      code: "ERR_REPO_UNAVAILABLE_451",
    });
  });

  it("T-ING-07 (ING-21): Probe trả 429 => ném ERR_GITHUB_RATE_LIMIT_CDN", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 429 })
    );

    await expect(probeRepo(repoInfo)).rejects.toMatchObject({
      code: "ERR_GITHUB_RATE_LIMIT_CDN",
    });
  });

  it("T-ING-07 (ING-21): Probe trả 403 => ném ERR_GITHUB_RATE_LIMIT_CDN", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 403 })
    );

    await expect(probeRepo(repoInfo)).rejects.toMatchObject({
      code: "ERR_GITHUB_RATE_LIMIT_CDN",
    });
  });

  it(
    "T-ING-07 (ING-21, ING-22): Probe bị timeout 2 lần => ném ERR_NETWORK_TIMEOUT",
    async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Probe network timeout"));

      await expect(probeRepo(repoInfo)).rejects.toMatchObject({
        code: "ERR_NETWORK_TIMEOUT",
      });
    },
    10000
  );

  it("T-ING-07 (ING-21): Probe 200 sau chuyển hướng tới /c/d => trả OK với owner c, repo d", async () => {
    const redirectedResponse = new Response(null, {
      status: 200,
    });
    Object.defineProperty(redirectedResponse, "url", {
      value: "https://github.com/c/d",
    });

    globalThis.fetch = vi.fn().mockResolvedValue(redirectedResponse);

    const res = await probeRepo(repoInfo);
    expect(res).toEqual({
      result: "OK",
      owner: "c",
      repo: "d",
    });
  });
});

// ---------------------------------------------------------------------------
// T-ING-08
// ---------------------------------------------------------------------------
it("T-ING-08: HEAD.zip 302 => lấy ref 'develop', không gọi thử main", async () => {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("archive/HEAD.zip")) {
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://codeload.github.com/a/b/zip/refs/heads/develop",
          },
        })
      );
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });

  globalThis.fetch = mockFetch;

  const res = await resolveRef("a", "b");
  expect(res).toEqual({
    download_url: "https://codeload.github.com/a/b/zip/refs/heads/develop",
    ref: "develop",
    ref_label: "develop",
  });

  // Xác nhận không thử fallback tới main
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).not.toHaveBeenCalledWith(
    expect.stringContaining("zip/main"),
    expect.anything()
  );
});

// ---------------------------------------------------------------------------
// T-ING-09
// ---------------------------------------------------------------------------
it("T-ING-09: HEAD.zip, main, master, dev đều 404 => ném ERR_EMPTY_REPOSITORY", async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(null, { status: 404 })
  );

  globalThis.fetch = mockFetch;

  await expect(resolveRef("a", "b")).rejects.toMatchObject({
    code: "ERR_EMPTY_REPOSITORY",
  });

  // Xác nhận đã thử HEAD.zip và các fallback main, master, dev
  expect(mockFetch).toHaveBeenCalledWith(
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
