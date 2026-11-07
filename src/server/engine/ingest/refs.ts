import { CONFIG } from "@/contracts";
import { IngestionError, type ResolvedRef } from "./types";

const CODELOAD_ZIP_REGEX =
  /^https:\/\/codeload\.github\.com\/[^/]+\/[^/]+\/zip\/(?:refs\/heads\/)?(.+)$/;

/**
 * Kiểm tra xem 1 ref có tồn tại trên GitHub codeload không theo docs/spec/10_ENGINE_INGEST.md Mục 3 (ING-30)
 */
export async function refExists(
  owner: string,
  repo: string,
  ref: string
): Promise<boolean> {
  const url = `https://codeload.github.com/${owner}/${repo}/zip/${ref}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.PREFLIGHT_RETRY_DELAY_MS));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.PREFLIGHT_TIMEOUT_MS);

    try {
      let res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "SimpliFey" },
        signal: controller.signal,
      });

      // Fallback: nếu HEAD trả 405 hoặc 501 thì dùng GET rồi abort ngay khi có header
      if (res.status === 405 || res.status === 501) {
        const getController = new AbortController();
        const getTimer = setTimeout(() => getController.abort(), CONFIG.PREFLIGHT_TIMEOUT_MS);
        try {
          res = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: { "User-Agent": "SimpliFey" },
            signal: getController.signal,
          });
          getController.abort();
        } finally {
          clearTimeout(getTimer);
        }
      }

      clearTimeout(timer);

      if (res.status === 200) {
        return true;
      }
      if (res.status === 404) {
        return false;
      }
      if (res.status === 429 || res.status === 403) {
        throw new IngestionError(
          "ERR_GITHUB_RATE_LIMIT_CDN",
          `GitHub CDN rate limit checking ref '${ref}' (HTTP ${res.status})`
        );
      }
      if (res.status === 451) {
        throw new IngestionError(
          "ERR_REPO_UNAVAILABLE_451",
          `Repository unavailable (HTTP 451) checking ref '${ref}'`
        );
      }

      if (res.status >= 500) {
        continue;
      }

      return false;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof IngestionError) {
        throw err;
      }
      // Thử lại nếu lỗi mạng hoặc timeout
    }
  }

  throw new IngestionError(
    "ERR_NETWORK_TIMEOUT",
    `Network timeout or failure checking ref '${ref}' for ${owner}/${repo}`
  );
}

/**
 * Đổi kết quả HEAD archive/HEAD.zip (3xx) thành ResolvedRef (ING-32 bước 1).
 * Location khớp mẫu codeload thì lấy ref; khác mẫu hoặc thiếu thì tải chính HEAD.zip.
 */
export function headZipToResolvedRef(
  location: string | null,
  headZipUrl: string
): ResolvedRef {
  const match = location?.match(CODELOAD_ZIP_REGEX);
  if (location && match) {
    const ref = match[1];
    // GitHub có thể trả commit SHA thay vì tên nhánh: không dùng làm nhãn (lỗi B-16, ING-32)
    const ref_label = /^[0-9a-f]{40}$/i.test(ref) ? null : ref;
    return { download_url: location, ref, ref_label };
  }
  return { download_url: headZipUrl, ref: null, ref_label: null };
}

/**
 * Tìm URL tải nhánh mặc định theo docs/spec/10_ENGINE_INGEST.md Mục 3 (ING-31..33, D-38).
 * `headZip` là kết quả `probeRepo` đã gọi archive/HEAD.zip, không gọi lại (lỗi B-14).
 * `headZip = null` (HEAD.zip 404 nhưng trang repo 200) thì thử lần lượt nhánh dự phòng.
 */
export async function resolveRef(
  owner: string,
  repo: string,
  headZip: ResolvedRef | null
): Promise<ResolvedRef> {
  if (headZip) {
    return headZip;
  }

  // ING-32 (2): thử lần lượt CONFIG.DEFAULT_BRANCH_FALLBACKS
  for (const branch of CONFIG.DEFAULT_BRANCH_FALLBACKS) {
    const exists = await refExists(owner, repo, branch);
    if (exists) {
      return {
        download_url: `https://codeload.github.com/${owner}/${repo}/zip/${branch}`,
        ref: branch,
        ref_label: branch,
      };
    }
  }

  // ING-33: mọi bước đều 404 => repo rỗng
  throw new IngestionError(
    "ERR_EMPTY_REPOSITORY",
    `Repository ${owner}/${repo} is empty or has no default branch`
  );
}
