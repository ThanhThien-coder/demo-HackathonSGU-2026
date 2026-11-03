import { CONFIG, type GithubRepoInfo, type ProbeResult } from "@/contracts";
import { IngestionError } from "./types";
import { parseGithubUrl } from "./url";

/**
 * Thăm dò repo GitHub theo docs/spec/10_ENGINE_INGEST.md Mục 2 (ING-20..22)
 */
export async function probeRepo(
  info: GithubRepoInfo
): Promise<{ result: ProbeResult; owner: string; repo: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.PREFLIGHT_RETRY_DELAY_MS));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.PREFLIGHT_TIMEOUT_MS);

    try {
      const res = await fetch(`https://github.com/${info.owner}/${info.repo}`, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "SimpliFey" },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 200) {
        let resolvedOwner = info.owner;
        let resolvedRepo = info.repo;
        if (res.url) {
          try {
            const parsed = parseGithubUrl(res.url);
            resolvedOwner = parsed.owner;
            resolvedRepo = parsed.repo;
          } catch {
            // Giữ nguyên nếu không parse được URL chuyển hướng
          }
        }
        return {
          result: "OK",
          owner: resolvedOwner,
          repo: resolvedRepo,
        };
      }

      if (res.status === 404) {
        throw new IngestionError(
          "ERR_PREFLIGHT_404_OR_PRIVATE",
          `Repository ${info.owner}/${info.repo} not found or is private (HTTP 404)`
        );
      }

      if (res.status === 451) {
        throw new IngestionError(
          "ERR_REPO_UNAVAILABLE_451",
          `Repository ${info.owner}/${info.repo} unavailable (HTTP 451)`
        );
      }

      if (res.status === 429 || res.status === 403) {
        throw new IngestionError(
          "ERR_GITHUB_RATE_LIMIT_CDN",
          `GitHub CDN rate limit or access denied (HTTP ${res.status})`
        );
      }

      // Lỗi 5xx: xếp vào nhóm TIMEOUT để thử lại (ING-21)
      if (res.status >= 500) {
        continue;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof IngestionError) {
        throw err;
      }
      // Lỗi mạng hoặc hết giờ: tiếp tục thử lại nếu còn lượt
    }
  }

  // Hết giờ / lỗi mạng sau khi đã thử lại 1 lần (ING-21, ING-22)
  throw new IngestionError(
    "ERR_NETWORK_TIMEOUT",
    `Network timeout or failure connecting to GitHub for ${info.owner}/${info.repo}`
  );
}
