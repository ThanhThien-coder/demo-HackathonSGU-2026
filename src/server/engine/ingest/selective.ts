import * as path from "node:path";
import { CONFIG } from "@/contracts";
import type { RepoSnapshotKey } from "@/contracts";
import type {
  ClassifiedEntry,
  SelectiveFetchInput,
  SelectiveFetchResult,
  ZipEntryMeta,
} from "./types";
import { classifyEntry, DEFAULT_LANGUAGE_REGISTRY } from "./prune";
import { isTestPath, selectFiles } from "./priority";
import { detectScope } from "./fingerprint";
import { decodeAndFilter } from "./unzip";

/**
 * Chuẩn hóa một đường dẫn theo ING-60
 */
function normalizeSinglePath(rawPath: string): string | null {
  const p = rawPath.replace(/\\/g, "/");
  if (p.includes("\0")) {
    return null;
  }

  const norm = path.posix.normalize(p);
  if (
    norm === "" ||
    norm === "." ||
    norm === ".." ||
    norm.startsWith("../") ||
    norm.startsWith("/")
  ) {
    return null;
  }

  return norm;
}

/**
 * Tự động chọn phạm vi cho repo lớn khi detectScope ra "" và không có scope tường minh theo ING-47
 */
function autoScopeLargeRepo(
  classifiedEntries: ClassifiedEntry[],
  report: { warnings: string[] }
): string {
  // Bỏ file cờ ING-87, chỉ tính entry CODE hoặc SPECIAL
  const eligibleEntries = classifiedEntries.filter(
    (e) => (e.cls === "CODE" || e.cls === "SPECIAL") && !isTestPath(e.path)
  );

  if (eligibleEntries.length === 0) {
    return "";
  }

  // 1. Tính tổng byte của từng thư mục độ sâu 1 (cha)
  const depth1Bytes = new Map<string, number>();
  for (const e of eligibleEntries) {
    const segments = e.path.split("/");
    if (segments.length > 1) {
      const d1 = `${segments[0]}/`;
      depth1Bytes.set(d1, (depth1Bytes.get(d1) ?? 0) + e.size);
    }
  }

  if (depth1Bytes.size === 0) {
    return "";
  }

  // Tìm thư mục độ sâu 1 nhiều bytes nhất; hòa => path nhỏ hơn
  const sortedDepth1 = Array.from(depth1Bytes.entries()).sort(
    ([pathA, bytesA], [pathB, bytesB]) => {
      if (bytesB !== bytesA) {
        return bytesB - bytesA;
      }
      return pathA < pathB ? -1 : pathA > pathB ? 1 : 0;
    }
  );

  const [bestDepth1, parentTotalBytes] = sortedDepth1[0];

  // 2. Tìm con lớn nhất của bestDepth1
  const childBytes = new Map<string, number>();
  for (const e of eligibleEntries) {
    if (e.path.startsWith(bestDepth1)) {
      const segments = e.path.split("/");
      if (segments.length > 2) {
        const cDir = `${segments[0]}/${segments[1]}/`;
        childBytes.set(cDir, (childBytes.get(cDir) ?? 0) + e.size);
      }
    }
  }

  let chosenOffset = bestDepth1;

  if (childBytes.size > 0 && parentTotalBytes > 0) {
    const sortedChildren = Array.from(childBytes.entries()).sort(
      ([pathA, bytesA], [pathB, bytesB]) => {
        if (bytesB !== bytesA) {
          return bytesB - bytesA;
        }
        return pathA < pathB ? -1 : pathA > pathB ? 1 : 0;
      }
    );

    const [bestChild, bestChildTotal] = sortedChildren[0];
    if (bestChildTotal >= CONFIG.AUTO_SCOPE_CHILD_RATIO * parentTotalBytes) {
      chosenOffset = bestChild;
    }
  }

  const warn = `Repo lớn — đang phân tích ${chosenOffset}; có thể chọn thư mục khác.`;
  if (!report.warnings.includes(warn)) {
    report.warnings.push(warn);
  }

  return chosenOffset;
}

/**
 * Tải 1 file từ raw.githubusercontent.com kèm thử lại 1 lần nếu lỗi (ING-48, ING-49)
 */
async function fetchRawFile(
  owner: string,
  repo: string,
  sha: string,
  filePath: string,
  token: string,
  signal?: AbortSignal
): Promise<Uint8Array | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${filePath}`;
  const headers: Record<string, string> = {
    "User-Agent": "SimpliFey",
    Authorization: `Bearer ${token}`,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers, signal });
      if (!res.ok) {
        if (attempt === 0) continue;
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      return new Uint8Array(arrayBuf);
    } catch (err) {
      if (
        signal?.aborted &&
        (signal.reason as Error)?.message !== "SELECTIVE_TIMEOUT"
      ) {
        throw err;
      }
      if (attempt === 0) continue;
      return null;
    }
  }

  return null;
}

/**
 * Xử lý tải chọn lọc khi stream zip bị cắt theo docs/spec/10_ENGINE_INGEST.md Mục 4A (D-63, ING-46..49)
 */
export async function selectiveFetch(
  input: SelectiveFetchInput
): Promise<SelectiveFetchResult | null> {
  const token = input.token ?? process.env.GITHUB_TOKEN;
  if (!token) {
    return null; // Thiếu token => lùi về ING-49
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error("SELECTIVE_TIMEOUT"));
  }, CONFIG.SELECTIVE_TIMEOUT_MS);

  const onParentAbort = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener("abort", onParentAbort);

  try {
    const authHeaders: Record<string, string> = {
      "User-Agent": "SimpliFey",
      Authorization: `Bearer ${token}`,
    };

    // 1. Lấy SHA phiên (ING-46)
    let sha = input.ref;
    if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
      const commitUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/commits/${input.ref ?? "HEAD"}`;
      let commitRes: Response;
      try {
        commitRes = await fetch(commitUrl, {
          headers: {
            ...authHeaders,
            Accept: "application/vnd.github.sha",
          },
          signal: controller.signal,
        });
      } catch (err) {
        if (input.signal?.aborted) throw err;
        return null;
      }

      if (
        commitRes.status === 401 ||
        commitRes.status === 403 ||
        commitRes.status === 429 ||
        !commitRes.ok
      ) {
        return null;
      }

      const rawShaText = (await commitRes.text()).trim();
      let parsedSha = rawShaText;
      if (rawShaText.startsWith("{")) {
        try {
          const json = JSON.parse(rawShaText) as { sha?: string };
          if (json.sha) parsedSha = json.sha;
        } catch {}
      }
      if (!/^[0-9a-f]{40}$/i.test(parsedSha)) {
        return null;
      }
      sha = parsedSha;
    }

    // 2. Lấy danh sách cây Git Trees API (ING-46)
    const treeUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/git/trees/${sha}?recursive=1`;
    let treeRes: Response;
    try {
      treeRes = await fetch(treeUrl, {
        headers: {
          ...authHeaders,
          Accept: "application/vnd.github+json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (input.signal?.aborted) throw err;
      return null;
    }

    if (
      treeRes.status === 401 ||
      treeRes.status === 403 ||
      treeRes.status === 429 ||
      !treeRes.ok
    ) {
      return null;
    }

    let treeData: {
      tree?: Array<{
        path: string;
        mode: string;
        type: string;
        sha: string;
        size?: number;
      }>;
      truncated?: boolean;
    };
    try {
      treeData = (await treeRes.json()) as typeof treeData;
    } catch {
      return null;
    }

    if (!treeData || !Array.isArray(treeData.tree) || treeData.truncated === true) {
      return null;
    }

    // Biến đổi cây thành ZipEntryMeta (compressed_size = 0, ING-46)
    const entryMetas: ZipEntryMeta[] = [];
    const seenPaths = new Set<string>();

    for (const item of treeData.tree) {
      if (item.type !== "blob" || item.mode === "120000") {
        continue;
      }

      const norm = normalizeSinglePath(item.path);
      if (!norm || seenPaths.has(norm)) {
        continue;
      }
      seenPaths.add(norm);

      entryMetas.push({
        path: norm,
        compressed_size: 0,
        size: typeof item.size === "number" ? item.size : 0,
        method: 0,
        local_offset: null,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      });
    }

    if (entryMetas.length === 0) {
      return null;
    }

    // Phân loại entry (Mục 7)
    const classifiedEntries: ClassifiedEntry[] = entryMetas.map((e) => {
      const { cls, language } = classifyEntry(
        e,
        DEFAULT_LANGUAGE_REGISTRY,
        input.report
      );
      return {
        ...e,
        cls,
        language,
      };
    });

    // Phạm vi monorepo & xếp file (Mục 8)
    let scopeDecision = detectScope(
      classifiedEntries,
      input.explicit_subdir || null,
      input.report
    );

    // ING-47 Phạm vi tự động cho repo lớn khi Mục 8 ra "" và không có scope tường minh
    if (scopeDecision.root_dir_offset === "" && !input.explicit_subdir) {
      const autoOffset = autoScopeLargeRepo(classifiedEntries, input.report);
      if (autoOffset !== "") {
        scopeDecision = {
          ...scopeDecision,
          root_dir_offset: autoOffset,
        };
      }
    }

    // Chọn file theo phạm vi đã xác định
    const plan = selectFiles(classifiedEntries, scopeDecision, input.report);

    const rawCodeMap = new Map<string, string>();
    const manifests = new Map<string, string>();
    let inflated_total = 0;
    let inflated_cap_hit = false;

    // Tải manifests trước
    for (const mf of plan.manifests) {
      if (controller.signal.aborted) {
        if (input.signal?.aborted) throw input.signal.reason;
        return null;
      }

      const buf = await fetchRawFile(
        input.owner,
        input.repo,
        sha,
        mf.path,
        token,
        controller.signal
      );
      if (!buf) {
        return null;
      }

      if (buf.length > CONFIG.MAX_MANIFEST_BYTES) {
        input.report.warnings.push(
          `Tệp cấu hình ${mf.path} vượt quá giới hạn ${Math.round(CONFIG.MAX_MANIFEST_BYTES / 1024)} KB nên bị bỏ qua.`
        );
        continue;
      }

      const text = decodeAndFilter(buf, input.report, { check_minified: false });
      if (text !== null) {
        manifests.set(mf.path, text);
      }
    }

    // Tải ứng viên theo thứ tự plan.ordered_candidates với độ song song CONFIG.SELECTIVE_FETCH_CONCURRENCY (16)
    const concurrency = CONFIG.SELECTIVE_FETCH_CONCURRENCY;
    let quotaHit = false;

    for (
      let i = 0;
      i < plan.ordered_candidates.length && !quotaHit && !inflated_cap_hit;
      i += concurrency
    ) {
      if (controller.signal.aborted) {
        if (input.signal?.aborted) throw input.signal.reason;
        return null;
      }

      const batch = plan.ordered_candidates.slice(i, i + concurrency);

      const batchPromises = batch.map((cand) =>
        fetchRawFile(
          input.owner,
          input.repo,
          sha,
          cand.path,
          token,
          controller.signal
        )
      );

      const batchResults = await Promise.all(batchPromises);

      for (const resBuf of batchResults) {
        if (!resBuf) {
          return null;
        }
      }

      for (let j = 0; j < batch.length; j++) {
        const cand = batch[j];
        const buf = batchResults[j]!;

        if (rawCodeMap.size >= CONFIG.MAX_CLEAN_FILES) {
          quotaHit = true;
          input.report.skipped.quota++;
          continue;
        }

        if (inflated_total + cand.size > CONFIG.MAX_INFLATED_BYTES) {
          inflated_cap_hit = true;
          break;
        }

        if (inflated_total + buf.length > CONFIG.MAX_INFLATED_BYTES) {
          inflated_cap_hit = true;
          break;
        }

        const isSpecial =
          cand.path.endsWith(".ipynb") ||
          cand.path.endsWith(".vue") ||
          cand.path.endsWith(".svelte");

        const text = decodeAndFilter(buf, input.report, {
          check_minified: !isSpecial,
        });

        if (text !== null) {
          rawCodeMap.set(cand.path, text);
          inflated_total += buf.length;
        }
      }

      if (quotaHit || inflated_cap_hit) {
        const processedCount = i + batch.length;
        if (processedCount < plan.ordered_candidates.length) {
          const remaining = plan.ordered_candidates.length - processedCount;
          input.report.skipped.quota += remaining;
        }
        break;
      }
    }

    const totalCodeFiles = classifiedEntries.filter(
      (e) => e.cls === "CODE" || e.cls === "SPECIAL"
    ).length;

    input.report.truncated = true;
    const warn = `Repository lớn — chỉ phân tích ${rawCodeMap.size}/${totalCodeFiles} tệp mã nguồn được ưu tiên.`;
    if (!input.report.warnings.includes(warn)) {
      input.report.warnings.push(warn);
    }

    const snapshot: RepoSnapshotKey = {
      source: "GITHUB",
      repo_key: `${input.owner}/${input.repo}`.toLowerCase(),
      snapshot_id: sha,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: input.explicit_subdir,
      ref_label: input.ref_label ?? input.ref,
    };

    return {
      snapshot,
      entryMetas,
      classifiedEntries,
      scopeDecision,
      rawCodeMap,
      manifests,
      inflated_cap_hit,
    };
  } catch {
    if (input.signal?.aborted) {
      throw input.signal.reason;
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}
