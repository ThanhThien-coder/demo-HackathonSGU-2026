import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import type { IngestSource } from "@/contracts";
import { runIngest } from "../index";
import { computeArchiveHash } from "../snapshot";

const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.GITHUB_TOKEN = "example-github-token";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken !== undefined) {
    process.env.GITHUB_TOKEN = originalToken;
  } else {
    delete process.env.GITHUB_TOKEN;
  }
});

/**
 * Tạo một buffer zip vượt trần MAX_STREAM_BYTES (15 MB + 2 KB)
 * Thêm README.md ở gốc để không bị ING-60.3 cắt nhầm segment đầu khi các file cùng thư mục
 * Các file cần giữ được đặt ở đầu zip; padding không nén được đặt ở cuối
 */
function createOversizedZip(files: Record<string, Uint8Array>): Uint8Array {
  const paddingSize = CONFIG.MAX_STREAM_BYTES + 2048;
  const padding = new Uint8Array(paddingSize);
  return new Uint8Array(
    fflate.zipSync({
      "README.md": fflate.strToU8("# repo"),
      ...files,
      "dummy_padding.bin": [padding, { level: 0 }],
    })
  );
}

// ---------------------------------------------------------------------------
// T-ING-10: Zip GitHub > 15 728 640 byte; 3 file .ts trọn vẹn trong phần đầu; API lỗi (ING-49)
// ---------------------------------------------------------------------------
describe("T-ING-10", () => {
  it("T-ING-10: Zip GitHub > 15 728 640 byte; 3 file .ts trọn vẹn trong phần đầu; API lỗi (ING-49)", async () => {
    const files = {
      "src/file1.ts": fflate.strToU8("export const f1 = 1;"),
      "src/file2.ts": fflate.strToU8("export const f2 = 2;"),
      "src/file3.ts": fflate.strToU8("export const f3 = 3;"),
    };
    const oversizedZip = createOversizedZip(files);
    const expectedKeptBytes = oversizedZip.subarray(0, CONFIG.MAX_STREAM_BYTES);
    const expectedArchiveHash = computeArchiveHash(expectedKeptBytes);

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/test-org/test-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/test-org/test-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(oversizedZip), { status: 200 })
        );
      }
      if (url.includes("api.github.com")) {
        // API lỗi theo ING-49
        return Promise.resolve(
          new Response("GitHub API Internal Error", { status: 500 })
        );
      }
      if (
        url.includes("github.com/test-org/test-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/test-org/test-repo",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(false);
    expect(res.report.truncated).toBe(true);
    expect(res.snapshot.snapshot_id_kind).toBe("ARCHIVE_HASH");
    expect(res.snapshot.snapshot_id).toBe(expectedArchiveHash);
    expect(res.code.size).toBe(3);
    expect(res.code.has("src/file1.ts")).toBe(true);
    expect(res.code.has("src/file2.ts")).toBe(true);
    expect(res.code.has("src/file3.ts")).toBe(true);
    expect(res.report.warnings).toContain(
      "Không lấy được danh sách file, có thể thiếu thư mục chính."
    );
    expect(
      res.report.warnings.some((w) =>
        w.includes("Repository lớn — chỉ phân tích 3 tệp mã nguồn được ưu tiên.")
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-ING-11: Như T-ING-10 nhưng phần đầu chỉ có node_modules/**
// ---------------------------------------------------------------------------
describe("T-ING-11", () => {
  it("T-ING-11: Như T-ING-10 nhưng phần đầu chỉ có node_modules/** => ERR_STREAM_QUOTA_EXCEEDED", async () => {
    const files = {
      "node_modules/pkg/index.js": fflate.strToU8("module.exports = 1;"),
      "node_modules/pkg/utils.js": fflate.strToU8("module.exports = 2;"),
    };
    const oversizedZip = createOversizedZip(files);

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/test-org/test-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/test-org/test-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(oversizedZip), { status: 200 })
        );
      }
      if (url.includes("api.github.com")) {
        return Promise.resolve(new Response(null, { status: 500 }));
      }
      if (
        url.includes("github.com/test-org/test-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    await expect(
      runIngest({
        kind: "GITHUB_URL",
        repo_url: "https://github.com/test-org/test-repo",
        subdir_override: null,
      })
    ).rejects.toMatchObject({
      code: "ERR_STREAM_QUOTA_EXCEEDED",
    });
  });
});

// ---------------------------------------------------------------------------
// X-08: Repo lớn (D-63)
// ---------------------------------------------------------------------------
describe("X-08: Repo lớn (D-63)", () => {
  it("X-08: Zip > MAX_STREAM_BYTES, code chính nằm sau phần cắt => report.selective_fetch = true, COMMIT_SHA, root_dir_offset là thư mục chính, chạy 2 lần cùng kết quả", async () => {
    // Zip bị cắt ở 15 MB, phần đầu chỉ có docs
    const cutZip = createOversizedZip({
      "docs/readme.txt": fflate.strToU8("documentation only"),
    });

    const commitSha = "0123456789abcdef0123456789abcdef01234567";

    const treeData = {
      sha: commitSha,
      truncated: false,
      tree: [
        {
          path: "fastapi/main.py",
          mode: "100644",
          type: "blob",
          sha: "sha1",
          size: 500,
        },
        {
          path: "fastapi/routing.py",
          mode: "100644",
          type: "blob",
          sha: "sha2",
          size: 600,
        },
        {
          path: "fastapi/applications.py",
          mode: "100644",
          type: "blob",
          sha: "sha3",
          size: 400,
        },
        {
          path: "docs/index.md",
          mode: "100644",
          type: "blob",
          sha: "sha4",
          size: 1000,
        },
        {
          path: "tests/test_main.py",
          mode: "100644",
          type: "blob",
          sha: "sha5",
          size: 800,
        },
        {
          path: "scripts/build.py",
          mode: "100644",
          type: "blob",
          sha: "sha6",
          size: 300,
        },
      ],
    };

    const fileContents: Record<string, string> = {
      "fastapi/main.py":
        "def root():\n    return {'message': 'hello'}\n",
      "fastapi/routing.py": "class APIRoute:\n    pass\n",
      "fastapi/applications.py":
        "class FastAPI:\n    def __init__(self):\n        pass\n",
    };

    const handler = (url: string) => {
      // 1. Phân biệt raw.githubusercontent.com
      if (url.includes("raw.githubusercontent.com")) {
        for (const [filePath, content] of Object.entries(fileContents)) {
          if (
            url.includes(
              `raw.githubusercontent.com/tiangolo/fastapi/${commitSha}/${filePath}`
            )
          ) {
            return Promise.resolve(new Response(content, { status: 200 }));
          }
        }
        return Promise.resolve(new Response("pass\n", { status: 200 }));
      }

      // 2. Phân biệt git/trees
      if (
        url.includes(`api.github.com/repos/tiangolo/fastapi/git/trees/${commitSha}`)
      ) {
        return Promise.resolve(
          new Response(JSON.stringify(treeData), { status: 200 })
        );
      }

      // 3. Phân biệt commits
      if (url.includes("api.github.com/repos/tiangolo/fastapi/commits/main")) {
        return Promise.resolve(
          new Response(commitSha, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }

      // 4. Phân biệt codeload archive zip
      if (
        url.includes("codeload.github.com/tiangolo/fastapi/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }

      // 5. Phân biệt archive/HEAD.zip
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/tiangolo/fastapi/zip/refs/heads/main",
            },
          })
        );
      }

      // 6. Probe link gốc repo
      if (
        url.includes("github.com/tiangolo/fastapi") &&
        !url.includes("api.github.com") &&
        !url.includes("raw.githubusercontent.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    };

    globalThis.fetch = vi.fn().mockImplementation(handler);

    const source: IngestSource = {
      kind: "GITHUB_URL",
      repo_url: "https://github.com/tiangolo/fastapi",
      subdir_override: null,
    };

    // Chạy lần 1
    const res1 = await runIngest(source);
    expect(res1.report.selective_fetch).toBe(true);
    expect(res1.snapshot.snapshot_id_kind).toBe("COMMIT_SHA");
    expect(res1.snapshot.snapshot_id).toBe(commitSha);
    expect(res1.fingerprint.root_dir_offset).toBe("fastapi/");
    expect(res1.code.has("fastapi/main.py")).toBe(true);
    expect(res1.code.has("fastapi/routing.py")).toBe(true);
    expect(res1.code.has("fastapi/applications.py")).toBe(true);
    expect(res1.report.warnings).toContain(
      "Repo lớn — đang phân tích fastapi/; có thể chọn thư mục khác."
    );
    expect(
      res1.report.warnings.some((w) =>
        w.includes("Repository lớn — chỉ phân tích")
      )
    ).toBe(true);

    // Chạy lần 2 để kiểm tra tất định
    const res2 = await runIngest(source);
    expect(res2.report.selective_fetch).toBe(true);
    expect(res2.snapshot.snapshot_id).toBe(res1.snapshot.snapshot_id);
    expect(res2.fingerprint.root_dir_offset).toBe(
      res1.fingerprint.root_dir_offset
    );
    expect(Array.from(res2.code.keys())).toEqual(Array.from(res1.code.keys()));
  });

  it("X-08: API trả 403 => selective_fetch = false, có warning ING-49", async () => {
    const cutZip = createOversizedZip({
      "src/backup.ts": fflate.strToU8("export const backup = true;"),
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/tiangolo/fastapi/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/tiangolo/fastapi/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }
      if (url.includes("api.github.com")) {
        // API trả 403 Rate Limited / Forbidden
        return Promise.resolve(
          new Response("API rate limit exceeded", { status: 403 })
        );
      }
      if (
        url.includes("github.com/tiangolo/fastapi") &&
        !url.includes("api.github.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/tiangolo/fastapi",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(false);
    expect(res.report.warnings).toContain(
      "Không lấy được danh sách file, có thể thiếu thư mục chính."
    );
  });
});

// ---------------------------------------------------------------------------
// Các ca phụ phủ sâu luật ING-46, ING-47, ING-48, ING-49
// ---------------------------------------------------------------------------
describe("ING-46..49 Edge cases", () => {
  it("ING-49: Thiếu GITHUB_TOKEN => lùi về đọc zip đã giữ", async () => {
    delete process.env.GITHUB_TOKEN;

    const cutZip = createOversizedZip({
      "src/only.ts": fflate.strToU8("export const x = 1;"),
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/my-org/my-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/my-org/my-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }
      if (
        url.includes("github.com/my-org/my-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/my-org/my-repo",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(false);
    expect(res.report.warnings).toContain(
      "Không lấy được danh sách file, có thể thiếu thư mục chính."
    );
    expect(res.code.has("src/only.ts")).toBe(true);
  });

  it("ING-49: Git tree có truncated = true => lùi về đọc zip đã giữ", async () => {
    const cutZip = createOversizedZip({
      "src/main.ts": fflate.strToU8("export const ok = true;"),
    });
    const commitSha = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/org/truncated-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/org/truncated-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }
      if (url.includes("api.github.com/repos/org/truncated-repo/commits/main")) {
        return Promise.resolve(
          new Response(commitSha, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
      if (
        url.includes(`api.github.com/repos/org/truncated-repo/git/trees/${commitSha}`)
      ) {
        // Git Trees API trả về truncated: true khi cây vượt quá 100,000 mục
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sha: commitSha,
              truncated: true,
              tree: [],
            }),
            { status: 200 }
          )
        );
      }
      if (
        url.includes("github.com/org/truncated-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/org/truncated-repo",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(false);
    expect(res.report.warnings).toContain(
      "Không lấy được danh sách file, có thể thiếu thư mục chính."
    );
    expect(res.code.has("src/main.ts")).toBe(true);
  });

  it("ING-49: Một file tải raw lỗi sau 1 lần thử lại => lùi về đọc zip đã giữ", async () => {
    const cutZip = createOversizedZip({
      "src/fallback.ts": fflate.strToU8("export const fallback = 1;"),
    });
    const commitSha = "fedcba9876543210fedcba9876543210fedcba98";

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("raw.githubusercontent.com")) {
        // Lỗi 500 khi tải file raw cả 2 lần thử
        return Promise.resolve(new Response(null, { status: 500 }));
      }
      if (
        url.includes(`api.github.com/repos/org/file-fail-repo/git/trees/${commitSha}`)
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sha: commitSha,
              truncated: false,
              tree: [
                {
                  path: "server/index.ts",
                  mode: "100644",
                  type: "blob",
                  sha: "s1",
                  size: 100,
                },
              ],
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes("api.github.com/repos/org/file-fail-repo/commits/main")) {
        return Promise.resolve(
          new Response(commitSha, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/org/file-fail-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/org/file-fail-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }
      if (
        url.includes("github.com/org/file-fail-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("raw.githubusercontent.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/org/file-fail-repo",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(false);
    expect(res.report.warnings).toContain(
      "Không lấy được danh sách file, có thể thiếu thư mục chính."
    );
    expect(res.code.has("src/fallback.ts")).toBe(true);
  });

  it("ING-47: Con lớn nhất >= CONFIG.AUTO_SCOPE_CHILD_RATIO * cha => lấy con", async () => {
    const cutZip = createOversizedZip({
      "dummy.txt": fflate.strToU8("dummy"),
    });
    const commitSha = "1111222233334444555566667777888899990000";

    // Cha là "packages/" tổng 1000 byte. Con "packages/core/" có 800 byte (>= 50%)
    const treeData = {
      sha: commitSha,
      truncated: false,
      tree: [
        {
          path: "packages/core/index.ts",
          mode: "100644",
          type: "blob",
          sha: "s1",
          size: 800,
        },
        {
          path: "packages/utils/index.ts",
          mode: "100644",
          type: "blob",
          sha: "s2",
          size: 200,
        },
      ],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("raw.githubusercontent.com")) {
        return Promise.resolve(
          new Response("export const ok = true;\n", { status: 200 })
        );
      }
      if (
        url.includes(`api.github.com/repos/org/child-scope-repo/git/trees/${commitSha}`)
      ) {
        return Promise.resolve(
          new Response(JSON.stringify(treeData), { status: 200 })
        );
      }
      if (url.includes("api.github.com/repos/org/child-scope-repo/commits/main")) {
        return Promise.resolve(
          new Response(commitSha, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
      if (url.includes("archive/HEAD.zip")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              location:
                "https://codeload.github.com/org/child-scope-repo/zip/refs/heads/main",
            },
          })
        );
      }
      if (
        url.includes("codeload.github.com/org/child-scope-repo/zip/refs/heads/main")
      ) {
        return Promise.resolve(
          new Response(new Uint8Array(cutZip), { status: 200 })
        );
      }
      if (
        url.includes("github.com/org/child-scope-repo") &&
        !url.includes("api.github.com") &&
        !url.includes("raw.githubusercontent.com") &&
        !url.includes("codeload.github.com")
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const res = await runIngest({
      kind: "GITHUB_URL",
      repo_url: "https://github.com/org/child-scope-repo",
      subdir_override: null,
    });

    expect(res.report.selective_fetch).toBe(true);
    // Con "packages/core/" có 80% byte nên được chọn thay vì "packages/"
    expect(res.fingerprint.root_dir_offset).toBe("packages/core/");
    expect(res.report.warnings).toContain(
      "Repo lớn — đang phân tích packages/core/; có thể chọn thư mục khác."
    );
  });
});
