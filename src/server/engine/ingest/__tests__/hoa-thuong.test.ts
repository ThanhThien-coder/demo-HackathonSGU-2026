import { describe, expect, it } from "vitest";
import { detectScope } from "../fingerprint";
import type { ClassifiedEntry } from "../types";
import { parseGithubUrl } from "../url";

describe("B-15 (ING-11): scheme và host viết hoa", () => {
  it.each([
    "https://GitHub.com/Owner/Repo",
    "HTTPS://github.com/Owner/Repo",
    "Https://WWW.GitHub.com/Owner/Repo/",
    "GITHUB.COM/Owner/Repo",
    "www.GitHub.com/Owner/Repo",
    "git@GitHub.com:Owner/Repo.git",
    "HTTP://github.com/Owner/Repo",
  ])("%s => owner Owner, repo Repo", (input) => {
    expect(parseGithubUrl(input)).toEqual({
      owner: "Owner",
      repo: "Repo",
      path_trimmed: false,
      clean_url: "https://github.com/Owner/Repo",
    });
  });

  it("giữ nguyên hoa thường của owner và repo", () => {
    expect(parseGithubUrl("https://GITHUB.COM/NestJS/Nest").clean_url).toBe(
      "https://github.com/NestJS/Nest"
    );
  });

  it("host khác vẫn bị từ chối, kể cả viết hoa", () => {
    expect(() => parseGithubUrl("https://GitLab.com/a/b")).toThrowError(
      expect.objectContaining({ code: "ERR_INVALID_GITHUB_URL" })
    );
    expect(() => parseGithubUrl("https://notgithub.com/a/b")).toThrowError(
      expect.objectContaining({ code: "ERR_INVALID_GITHUB_URL" })
    );
  });
});

function code(path: string, size = 500): ClassifiedEntry {
  return {
    path,
    compressed_size: size,
    size,
    method: 8,
    local_offset: 0,
    is_dir: false,
    is_symlink: false,
    is_encrypted: false,
    cls: "CODE",
    language: "TYPESCRIPT",
  } as ClassifiedEntry;
}

describe("B-21 (ING-80): thư mục nhập khác hoa thường", () => {
  const entries = [code("Backend/src/a.ts"), code("Frontend/src/b.ts")];

  it("nhập backend, repo có Backend/ => dùng tên thật Backend/", () => {
    const scope = detectScope(entries, "backend", undefined);
    expect(scope.root_dir_offset).toBe("Backend/");
    expect(scope.explicit).toBe(true);
  });

  it("nhập /BACKEND/ có gạch chéo hai đầu vẫn khớp", () => {
    expect(detectScope(entries, "/BACKEND/", undefined).root_dir_offset).toBe("Backend/");
  });

  it("nhập thư mục con nhiều cấp khác hoa thường", () => {
    expect(detectScope(entries, "backend/SRC", undefined).root_dir_offset).toBe("Backend/src/");
  });

  it("khớp đúng hoa thường thì giữ nguyên, kể cả khi có cả hai biến thể", () => {
    const both = [code("backend/x.ts"), code("Backend/y.ts")];
    expect(detectScope(both, "Backend", undefined).root_dir_offset).toBe("Backend/");
    expect(detectScope(both, "backend", undefined).root_dir_offset).toBe("backend/");
  });

  it("không có thư mục nào khớp => vẫn ERR_NO_SOURCE_FILES_FOUND, details giữ tên đã nhập", () => {
    expect(() => detectScope(entries, "server", undefined)).toThrowError(
      expect.objectContaining({
        code: "ERR_NO_SOURCE_FILES_FOUND",
        details: { subdir: "server/", hint: "empty_subdir" },
      })
    );
  });
});
