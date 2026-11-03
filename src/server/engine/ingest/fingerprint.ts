import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { IngestionError } from "./types";
import type { ClassifiedEntry, ScopeDecision } from "./types";

const SERVER_SEGMENTS = new Set(["server", "backend", "api"]);

const CLIENT_SEGMENTS = new Set([
  "client",
  "frontend",
  "web",
  "ui",
  "mobile",
  "webapp",
  "app-web",
]);

const CLIENT_SUFFIXES = ["-web", "-client", "-ui", "-mobile"];
const SERVER_SUFFIXES = ["-api", "-server", "-backend"];

/**
 * Phát hiện phạm vi monorepo hoặc thư mục mã nguồn chính theo docs/spec/10_ENGINE_INGEST.md Mục 8 (ING-80)
 */
export function detectScope(
  entries: ClassifiedEntry[],
  explicit_subdir: string | null,
  report?: IngestionReport
): ScopeDecision {
  const codeEntries = entries.filter(
    (e) => e.cls === "CODE" || e.cls === "SPECIAL"
  );

  const manifestPaths = new Set(
    entries.filter((e) => e.cls === "MANIFEST").map((e) => e.path)
  );

  const hasManifestInDir = (dirPrefix: string): boolean => {
    for (const mp of manifestPaths) {
      if (mp.startsWith(dirPrefix)) {
        const rest = mp.slice(dirPrefix.length);
        if (!rest.includes("/")) {
          return true;
        }
      }
    }
    return false;
  };

  // 1. Dò các ứng viên server và client
  const serverDirs = new Set<string>();
  const clientDirs = new Set<string>();

  for (const entry of codeEntries) {
    const segments = entry.path.split("/");
    if (segments.length <= 1) {
      continue;
    }

    const first = segments[0].toLowerCase();

    // Server ở gốc: <x>/ với x in {server, backend, api}
    if (SERVER_SEGMENTS.has(first)) {
      serverDirs.add(`${segments[0]}/`);
    }

    // Client ở gốc
    if (
      CLIENT_SEGMENTS.has(first) ||
      CLIENT_SUFFIXES.some((s) => first.endsWith(s))
    ) {
      clientDirs.add(`${segments[0]}/`);
    }

    if (segments.length > 2) {
      const second = segments[1].toLowerCase();

      // apps/<x>/ hoặc packages/<x>/
      if (first === "apps" || first === "packages") {
        const isServerChild =
          SERVER_SEGMENTS.has(second) ||
          SERVER_SUFFIXES.some((s) => second.endsWith(s));

        if (isServerChild) {
          const candDir = `${segments[0]}/${segments[1]}/`;
          if (hasManifestInDir(candDir)) {
            serverDirs.add(candDir);
          }
        }

        const isClientChild =
          CLIENT_SEGMENTS.has(second) ||
          CLIENT_SUFFIXES.some((s) => second.endsWith(s));

        if (isClientChild) {
          clientDirs.add(`${segments[0]}/${segments[1]}/`);
        }
      }

      // services/<x>/ có manifest riêng
      if (first === "services") {
        const candDir = `${segments[0]}/${segments[1]}/`;
        if (hasManifestInDir(candDir)) {
          serverDirs.add(candDir);
        }
      }
    }
  }

  const sortedServers = Array.from(serverDirs).sort((a, b) =>
    a.localeCompare(b)
  );

  // 2. Scope tường minh (ING-80)
  if (explicit_subdir !== null && explicit_subdir.trim() !== "") {
    let normalized = explicit_subdir.trim().replace(/^[\/\\]+/, "");
    if (!normalized.endsWith("/")) {
      normalized += "/";
    }

    const hasCodeInSubdir = codeEntries.some((e) =>
      e.path.startsWith(normalized)
    );

    if (!hasCodeInSubdir) {
      throw new IngestionError(
        "ERR_NO_SOURCE_FILES_FOUND",
        `No source files found in subdirectory: ${normalized}`,
        { subdir: normalized, hint: "empty_subdir" }
      );
    }

    const is_monorepo =
      (clientDirs.size >= 1 && serverDirs.size >= 1) || serverDirs.size >= 2;

    return {
      root_dir_offset: normalized,
      is_monorepo,
      candidates: sortedServers,
      explicit: true,
    };
  }

  // 3. Quyết định tự động
  let root_dir_offset = "";
  let is_monorepo = false;

  const totalRepoBytes = codeEntries.reduce((sum, e) => sum + e.size, 0);
  const bytesByServer = new Map<string, number>();

  for (const sDir of sortedServers) {
    const bytes = codeEntries
      .filter((e) => e.path.startsWith(sDir))
      .reduce((sum, e) => sum + e.size, 0);
    bytesByServer.set(sDir, bytes);
  }

  let bestServer = "";
  if (sortedServers.length > 0) {
    const rankedServers = [...sortedServers].sort((a, b) => {
      const diff = (bytesByServer.get(b) ?? 0) - (bytesByServer.get(a) ?? 0);
      if (diff !== 0) {
        return diff;
      }
      return a.localeCompare(b);
    });
    bestServer = rankedServers[0];
  }

  if (
    (clientDirs.size >= 1 && serverDirs.size >= 1) ||
    serverDirs.size >= 2
  ) {
    is_monorepo = true;
    root_dir_offset = bestServer;
  } else if (serverDirs.size === 1 && clientDirs.size === 0) {
    const singleServer = sortedServers[0];
    const serverBytes = bytesByServer.get(singleServer) ?? 0;
    const ratio = totalRepoBytes > 0 ? serverBytes / totalRepoBytes : 0;
    if (ratio > CONFIG.MONOREPO_DOMINANT_RATIO) {
      root_dir_offset = singleServer;
      is_monorepo = false;
    } else {
      root_dir_offset = "";
      is_monorepo = false;
    }
  } else {
    root_dir_offset = "";
    is_monorepo = false;
  }

  // 4. Warning nhiều backend
  if (serverDirs.size >= 2) {
    const listStr = sortedServers.join(", ");
    const warn = `Phát hiện nhiều thư mục backend: ${listStr}. Đang phân tích ${root_dir_offset}; có thể chọn thư mục khác.`;
    if (report && !report.warnings.includes(warn)) {
      report.warnings.push(warn);
    }
  }

  return {
    root_dir_offset,
    is_monorepo,
    candidates: sortedServers,
    explicit: false,
  };
}
