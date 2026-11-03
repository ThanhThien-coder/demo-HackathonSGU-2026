import type { GithubRepoInfo } from "@/contracts";
import { IngestionError } from "./types";

const GITHUB_REPO_REGEX =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/(tree|blob)(?:\/.*)?|\/[^/]+(?:\/.*)?)?$/;

/**
 * Chuẩn hóa và phân tích link GitHub theo docs/spec/10_ENGINE_INGEST.md Mục 1 (ING-10..13, D-38)
 */
export function parseGithubUrl(raw: string): GithubRepoInfo {
  if (typeof raw !== "string") {
    throw new IngestionError("ERR_INVALID_GITHUB_URL", "URL must be a string");
  }

  // 1. trim(); cắt từ ? hoặc # đầu tiên (ING-10)
  let s = raw.trim();
  const queryOrHashIndex = s.search(/[?#]/);
  if (queryOrHashIndex !== -1) {
    s = s.slice(0, queryOrHashIndex);
  }

  // 2. Chuẩn hóa theo thứ tự (ING-11)
  // git@github.com: => https://github.com/
  if (s.startsWith("git@github.com:")) {
    s = "https://github.com/" + s.slice("git@github.com:".length);
  }
  // http:// => https://
  if (s.startsWith("http://")) {
    s = "https://" + s.slice("http://".length);
  }
  // Thiếu scheme bắt đầu github.com/ hoặc www.github.com/ => thêm https://
  if (s.startsWith("github.com/") || s.startsWith("www.github.com/")) {
    s = "https://" + s;
  }
  // Bỏ www.
  if (s.startsWith("https://www.github.com/")) {
    s = "https://github.com/" + s.slice("https://www.github.com/".length);
  }
  // Bỏ / cuối
  s = s.replace(/\/+$/, "");

  // 3. Host khác github.com => ERR_INVALID_GITHUB_URL (ING-12)
  if (!s.startsWith("https://github.com/")) {
    throw new IngestionError(
      "ERR_INVALID_GITHUB_URL",
      `Host is not github.com or invalid format: ${raw}`
    );
  }

  // 4. Chỉ link gốc repo (D-38, ING-13)
  const match = s.match(GITHUB_REPO_REGEX);
  if (!match) {
    throw new IngestionError(
      "ERR_INVALID_GITHUB_URL",
      `Invalid GitHub repository URL pattern: ${raw}`
    );
  }

  const owner = match[1];
  const repo = match[2];
  const path_trimmed = Boolean(match[3]);
  const clean_url = `https://github.com/${owner}/${repo}`;

  return {
    owner,
    repo,
    path_trimmed,
    clean_url,
  };
}
