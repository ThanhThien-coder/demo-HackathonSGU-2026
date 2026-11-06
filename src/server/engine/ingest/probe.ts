import { CONFIG, type GithubRepoInfo, type ProbeResult } from "@/contracts";
import { headZipToResolvedRef } from "./refs";
import { IngestionError, type ResolvedRef } from "./types";
import { parseGithubUrl } from "./url";

const HEAD_ZIP_REDIRECT_REGEX =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/archive\/HEAD\.zip$/i;

type Outcome =
  | { kind: "DONE"; owner: string; repo: string; head_zip: ResolvedRef | null }
  | { kind: "MOVED"; owner: string; repo: string }
  | { kind: "TIMEOUT" };

/** Gọi 1 request có hạn giờ. Hết giờ hoặc lỗi mạng trả null. */
async function timedHead(
  url: string,
  redirect: "manual" | "follow",
  timeoutMs: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "HEAD",
      redirect,
      headers: { "User-Agent": "SimpliFey" },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function throwForStatus(status: number, owner: string, repo: string): void {
  if (status === 451) {
    throw new IngestionError(
      "ERR_REPO_UNAVAILABLE_451",
      `Repository ${owner}/${repo} unavailable (HTTP 451)`
    );
  }
  if (status === 429 || status === 403) {
    throw new IngestionError(
      "ERR_GITHUB_RATE_LIMIT_CDN",
      `GitHub CDN rate limit or access denied (HTTP ${status})`
    );
  }
}

/** Một lượt thăm dò: archive/HEAD.zip trước, chỉ khi 404 mới gọi trang repo (ING-20, ING-21). */
async function probeOnce(owner: string, repo: string, allowMove: boolean): Promise<Outcome> {
  const headZipUrl = `https://github.com/${owner}/${repo}/archive/HEAD.zip`;
  const res = await timedHead(headZipUrl, "manual", CONFIG.PREFLIGHT_TIMEOUT_MS);
  if (!res) return { kind: "TIMEOUT" };

  throwForStatus(res.status, owner, repo);

  if (res.status === 404) {
    // Phân biệt repo không có / private với repo rỗng bằng trang repo
    const page = await timedHead(
      `https://github.com/${owner}/${repo}`,
      "follow",
      CONFIG.PREFLIGHT_PAGE_TIMEOUT_MS
    );
    if (!page) return { kind: "TIMEOUT" };
    throwForStatus(page.status, owner, repo);
    if (page.status === 404) {
      throw new IngestionError(
        "ERR_PREFLIGHT_404_OR_PRIVATE",
        `Repository ${owner}/${repo} not found or is private (HTTP 404)`
      );
    }
    if (page.status >= 500) return { kind: "TIMEOUT" };
    let resolvedOwner = owner;
    let resolvedRepo = repo;
    if (page.url) {
      try {
        const parsed = parseGithubUrl(page.url);
        resolvedOwner = parsed.owner;
        resolvedRepo = parsed.repo;
      } catch {
        // Giữ nguyên nếu không parse được URL chuyển hướng
      }
    }
    return { kind: "DONE", owner: resolvedOwner, repo: resolvedRepo, head_zip: null };
  }

  if (res.status >= 500) return { kind: "TIMEOUT" };

  if (res.status === 200) {
    return {
      kind: "DONE",
      owner,
      repo,
      head_zip: { download_url: headZipUrl, ref: null, ref_label: null },
    };
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    // 301 tới archive/HEAD.zip của repo khác (đổi tên, chuyển chủ): lấy owner/repo mới, gọi lại 1 lần
    const moved = location?.match(HEAD_ZIP_REDIRECT_REGEX);
    if (
      allowMove &&
      moved &&
      (moved[1].toLowerCase() !== owner.toLowerCase() ||
        moved[2].toLowerCase() !== repo.toLowerCase())
    ) {
      return { kind: "MOVED", owner: moved[1], repo: moved[2] };
    }
    return { kind: "DONE", owner, repo, head_zip: headZipToResolvedRef(location, headZipUrl) };
  }

  // Mã khác (vd 400): coi như lỗi tạm để thử lại
  return { kind: "TIMEOUT" };
}

/**
 * Thăm dò repo GitHub theo docs/spec/10_ENGINE_INGEST.md Mục 2 (ING-20..22, lỗi B-14)
 */
export async function probeRepo(
  info: GithubRepoInfo
): Promise<{ result: ProbeResult; owner: string; repo: string; head_zip: ResolvedRef | null }> {
  let owner = info.owner;
  let repo = info.repo;
  let allowMove = true;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.PREFLIGHT_RETRY_DELAY_MS));
    }

    let outcome = await probeOnce(owner, repo, allowMove);
    if (outcome.kind === "MOVED") {
      owner = outcome.owner;
      repo = outcome.repo;
      allowMove = false;
      outcome = await probeOnce(owner, repo, false);
    }

    if (outcome.kind === "DONE") {
      return {
        result: "OK",
        owner: outcome.owner,
        repo: outcome.repo,
        head_zip: outcome.head_zip,
      };
    }
  }

  // Hết giờ / lỗi mạng sau khi đã thử lại 1 lần (ING-21, ING-22)
  throw new IngestionError(
    "ERR_NETWORK_TIMEOUT",
    `Network timeout or failure connecting to GitHub for ${info.owner}/${info.repo}`
  );
}
