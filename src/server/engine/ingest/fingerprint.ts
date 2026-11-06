import * as path from "node:path";
import { CONFIG } from "@/contracts";
import type {
  IngestionReport,
  IngestOutput,
  LanguageId,
  LanguageSupportInfo,
  LanguageSupportTier,
  ProjectArchetype,
  ProjectFingerprint,
} from "@/contracts";
import { IngestionError } from "./types";
import type {
  ClassifiedEntry,
  LanguageRegistry,
  ScopeDecision,
} from "./types";
import { DEFAULT_LANGUAGE_REGISTRY } from "./prune";
import { stripJsonc } from "../jsonc";
import { redactAndMaskCode } from "./secrets";

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

  const sortedServers = Array.from(serverDirs).sort();
  const sortedClients = Array.from(clientDirs).sort();

  // Ứng viên scope cho đường lùi (B-17): server rồi client, bytes giảm dần, hòa thì path nhỏ hơn
  const bytesUnder = (dir: string): number =>
    codeEntries.filter((e) => e.path.startsWith(dir)).reduce((sum, e) => sum + e.size, 0);
  const byBytesDesc = (dirs: string[]): string[] => {
    const bytes = new Map(dirs.map((d) => [d, bytesUnder(d)] as const));
    return [...dirs].sort((a, b) => {
      const diff = (bytes.get(b) ?? 0) - (bytes.get(a) ?? 0);
      return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
    });
  };
  const candidateDirs = [...byBytesDesc(sortedServers), ...byBytesDesc(sortedClients)];

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
      candidates: candidateDirs,
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
      return a < b ? -1 : a > b ? 1 : 0;
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
    candidates: candidateDirs,
    explicit: false,
  };
}

export interface ParsedManifest {
  path: string;
  packages: string[];
  has_bin: boolean;
  main: string | null;
  bin_paths: string[];
  go_module_path?: string | null;
  dart_package_name?: string | null;
}

/**
 * Làm sạch JSON có comment hoặc trailing comma theo ING-120
 */
function cleanJson(str: string): string {
  return stripJsonc(str);
}

/**
 * Chuẩn hóa tên gói PyPI theo PEP 503 (chuỗi [-_.] => -; chữ thường)
 */
function normalizePypiPackage(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-");
}

/**
 * Quét tay [project].dependencies trong pyproject.toml theo TASK_13:
 * - Tìm dòng [project], kết thúc ở dòng kế tiếp bắt đầu bằng [
 * - Tìm dependencies = [, đếm dấu ngoặc vuông và bỏ qua mọi ký tự nằm trong chuỗi "...", '...', tới ] đóng mảng
 * - Lấy từng chuỗi, tên gói là phần khớp ^\s*([A-Za-z0-9_.-]+) qua normalizePypiPackage
 */
function extractPyprojectProjectDependencies(content: string): string[] {
  const cleanContent = content.replace(/^\uFEFF/, "");
  const lines = cleanContent.split(/\r?\n/);
  let inProject = false;
  const projectLines: string[] = [];

  for (const line of lines) {
    if (!inProject) {
      if (/^\s*\[project\]\s*$/.test(line)) {
        inProject = true;
      }
    } else {
      if (/^\s*\[/.test(line)) {
        break;
      }
      projectLines.push(line);
    }
  }

  if (!inProject) {
    return [];
  }

  const projectText = projectLines.join("\n");
  const depsMatch = projectText.match(/dependencies\s*=\s*\[/);
  if (!depsMatch || depsMatch.index === undefined) {
    return [];
  }

  const openBracketIndex = depsMatch.index + depsMatch[0].length - 1;
  const packages: string[] = [];

  let depth = 0;
  let inQuote: '"' | "'" | null = null;
  let currentString = "";

  for (let i = openBracketIndex; i < projectText.length; i++) {
    const ch = projectText[i];

    if (inQuote !== null) {
      if (ch === "\\") {
        i++;
        if (i < projectText.length) {
          currentString += projectText[i];
        }
        continue;
      }
      if (ch === inQuote) {
        const m = currentString.match(/^\s*([A-Za-z0-9_.-]+)/);
        if (m) {
          packages.push(normalizePypiPackage(m[1]));
        }
        inQuote = null;
        currentString = "";
      } else {
        currentString += ch;
      }
    } else {
      if (ch === "#") {
        while (i < projectText.length && projectText[i] !== "\n") {
          i++;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        inQuote = ch;
        currentString = "";
      } else if (ch === "[") {
        depth++;
      } else if (ch === "]") {
        depth--;
        if (depth === 0) {
          break;
        }
      }
    }
  }

  return packages;
}

/**
 * Đọc manifest để trích xuất tên gói và metadata theo docs/spec/10_ENGINE_INGEST.md Mục 12 (ING-120..122)
 */
export function parseManifests(
  manifests: Map<string, string>,
  report?: IngestionReport
): ParsedManifest[] {
  const result: ParsedManifest[] = [];

  for (const [manifestPath, content] of manifests.entries()) {
    const basename = path.posix.basename(manifestPath);
    const dir = path.posix.dirname(manifestPath);
    const dirPrefix = dir === "." ? "" : `${dir}/`;

    let packages: string[] = [];
    let has_bin = false;
    let main: string | null = null;
    let bin_paths: string[] = [];
    let go_module_path: string | null = null;
    let dart_package_name: string | null = null;

    if (
      basename === "package.json" ||
      basename === "tsconfig.json" ||
      basename === "jsconfig.json"
    ) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        try {
          parsed = JSON.parse(cleanJson(content)) as Record<string, unknown>;
        } catch {
          if (report && basename === "package.json") {
            const warn = `Tệp cấu hình ${manifestPath} bị hỏng định dạng.`;
            if (!report.warnings.includes(warn)) {
              report.warnings.push(warn);
            }
          }
          continue;
        }
      }

      if (basename === "package.json" && parsed) {
        const pkgSet = new Set<string>();

        const deps = parsed.dependencies as Record<string, string> | undefined;
        if (deps && typeof deps === "object") {
          for (const k of Object.keys(deps)) {
            pkgSet.add(k.trim().toLowerCase());
          }
        }

        const devDeps = parsed.devDependencies as
          | Record<string, string>
          | undefined;
        if (devDeps && typeof devDeps === "object") {
          for (const k of Object.keys(devDeps)) {
            pkgSet.add(k.trim().toLowerCase());
          }
        }

        const peerDeps = parsed.peerDependencies as
          | Record<string, string>
          | undefined;
        if (peerDeps && typeof peerDeps === "object") {
          for (const k of Object.keys(peerDeps)) {
            pkgSet.add(k.trim().toLowerCase());
          }
        }

        packages = Array.from(pkgSet);

        // bin
        if (typeof parsed.bin === "string" && parsed.bin.trim() !== "") {
          has_bin = true;
          bin_paths = [
            path.posix.normalize(`${dirPrefix}${parsed.bin.trim()}`),
          ];
        } else if (parsed.bin && typeof parsed.bin === "object") {
          const vals = Object.values(parsed.bin as Record<string, string>)
            .filter((v) => typeof v === "string" && v.trim() !== "")
            .map((v) => path.posix.normalize(`${dirPrefix}${v.trim()}`));
          if (vals.length > 0) {
            has_bin = true;
            bin_paths = vals;
          }
        }

        // main
        if (typeof parsed.main === "string" && parsed.main.trim() !== "") {
          main = path.posix.normalize(`${dirPrefix}${parsed.main.trim()}`);
        }
      }
    } else if (basename === "requirements.txt") {
      const lines = content.split(/\r?\n/);
      const pkgSet = new Set<string>();
      for (const line of lines) {
        const clean = line.replace(/#.*$/, "").trim();
        if (
          !clean ||
          clean.startsWith("-r") ||
          clean.startsWith("-e") ||
          clean.startsWith("-f") ||
          clean.startsWith("-i")
        ) {
          continue;
        }
        const m = clean.match(/^\s*([A-Za-z0-9_.-]+)/);
        if (m) {
          pkgSet.add(normalizePypiPackage(m[1]));
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "pyproject.toml") {
      const pkgSet = new Set<string>();
      // [project].dependencies = [...] (quét tay theo TASK_13)
      const projDeps = extractPyprojectProjectDependencies(content);
      for (const p of projDeps) {
        pkgSet.add(p);
      }
      // [tool.poetry.dependencies]
      const poetryMatch = content.match(
        /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\s*\[|$(?![\s\S]))/
      );
      if (poetryMatch) {
        const lines = poetryMatch[1].split(/\r?\n/);
        for (const l of lines) {
          const m = l.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
          if (m && m[1].toLowerCase() !== "python") {
            pkgSet.add(normalizePypiPackage(m[1]));
          }
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "Pipfile") {
      const pkgSet = new Set<string>();
      const sections = content.matchAll(
        /\[(?:packages|dev-packages)\]([\s\S]*?)(?=\n\s*\[|\z)/g
      );
      for (const sec of sections) {
        const lines = sec[1].split(/\r?\n/);
        for (const l of lines) {
          const m = l.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
          if (m) {
            pkgSet.add(normalizePypiPackage(m[1]));
          }
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "pom.xml") {
      const pkgSet = new Set<string>();
      const depMatches = content.matchAll(
        /<dependency>([\s\S]*?)<\/dependency>/g
      );
      for (const dm of depMatches) {
        const gMatch = dm[1].match(/<groupId>\s*([^<]+)\s*<\/groupId>/);
        const aMatch = dm[1].match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/);
        if (gMatch && aMatch) {
          pkgSet.add(`${gMatch[1].trim()}:${aMatch[1].trim()}`);
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "build.gradle" || basename === "build.gradle.kts") {
      const pkgSet = new Set<string>();
      const gradleMatches = content.matchAll(
        /(?:implementation|api|compile\w*)\s*\(?\s*["']([^"':]+):([^"':]+)/g
      );
      for (const gm of gradleMatches) {
        pkgSet.add(`${gm[1].trim()}:${gm[2].trim()}`);
      }
      packages = Array.from(pkgSet);
    } else if (basename === "go.mod") {
      const modMatch = content.match(/^module\s+(\S+)/m);
      if (modMatch) {
        go_module_path = modMatch[1].trim();
      }
      const pkgSet = new Set<string>();
      const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/);
      if (blockMatch) {
        const lines = blockMatch[1].split(/\r?\n/);
        for (const l of lines) {
          const m = l.trim().match(/^([^\s()]+)/);
          if (m && !m[1].startsWith("//")) {
            pkgSet.add(m[1].trim());
          }
        }
      }
      const singleRequires = content.matchAll(/^require\s+([^\s()]+)/gm);
      for (const sr of singleRequires) {
        if (!sr[1].startsWith("(")) {
          pkgSet.add(sr[1].trim());
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "pubspec.yaml") {
      const nameMatch = content.match(/^name:\s*(\S+)/m);
      if (nameMatch) {
        dart_package_name = nameMatch[1].trim();
      }
      const pkgSet = new Set<string>();
      const depSections = content.matchAll(
        /^(?:dependencies|dev_dependencies):\s*([\s\S]*?)(?=^\w|\z)/gm
      );
      for (const ds of depSections) {
        const lines = ds[1].split(/\r?\n/);
        for (const l of lines) {
          const m = l.match(/^  ([A-Za-z0-9_-]+):/);
          if (m && m[1] !== "flutter" && m[1] !== "sdk") {
            pkgSet.add(m[1].trim().toLowerCase());
          } else if (m && m[1] === "flutter") {
            pkgSet.add("flutter");
          }
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "Cargo.toml") {
      const pkgSet = new Set<string>();
      const sections = content.matchAll(
        /\[(?:dependencies|dev-dependencies)\]([\s\S]*?)(?=\n\s*\[|\z)/g
      );
      for (const s of sections) {
        const lines = s[1].split(/\r?\n/);
        for (const l of lines) {
          const m = l.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
          if (m) {
            pkgSet.add(m[1].trim().toLowerCase());
          }
        }
      }
      packages = Array.from(pkgSet);
    } else if (basename === "composer.json") {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        try {
          parsed = JSON.parse(cleanJson(content)) as Record<string, unknown>;
        } catch {
          // bỏ qua nếu hỏng
        }
      }
      if (parsed) {
        const pkgSet = new Set<string>();
        const req = parsed.require as Record<string, string> | undefined;
        if (req && typeof req === "object") {
          for (const k of Object.keys(req)) {
            if (k.toLowerCase() !== "php") {
              pkgSet.add(k.trim().toLowerCase());
            }
          }
        }
        packages = Array.from(pkgSet);
      }
    } else if (basename === "Gemfile") {
      const pkgSet = new Set<string>();
      const gemMatches = content.matchAll(/gem\s+['"]([^'"]+)['"]/g);
      for (const gm of gemMatches) {
        pkgSet.add(gm[1].trim().toLowerCase());
      }
      packages = Array.from(pkgSet);
    }

    result.push({
      path: manifestPath,
      packages,
      has_bin,
      main,
      bin_paths,
      go_module_path,
      dart_package_name,
    });
  }

  return result;
}

/**
 * Xây dựng ProjectFingerprint và module_info theo docs/spec/10_ENGINE_INGEST.md Mục 12 (ING-120..128)
 */
export function buildFingerprint(
  entries: ClassifiedEntry[],
  manifests: Map<string, string>,
  scope: ScopeDecision,
  report: IngestionReport,
  registry: LanguageRegistry = DEFAULT_LANGUAGE_REGISTRY
): {
  fingerprint: ProjectFingerprint;
  module_info: IngestOutput["module_info"];
} {
  const parsedManifestList = parseManifests(manifests, report);

  // 1. tech_stack = hợp gói của mọi manifest, sort tăng dần, không trùng (ING-121)
  const allPackagesSet = new Set<string>();
  for (const pm of parsedManifestList) {
    for (const pkg of pm.packages) {
      allPackagesSet.add(pkg);
    }
  }
  const tech_stack = Array.from(allPackagesSet).sort();

  // 2. deps_scope = gói của manifest trong offset ∪ manifest ở gốc (offset rỗng => mọi manifest)
  const scopePackagesSet = new Set<string>();
  for (const pm of parsedManifestList) {
    const isAtRoot = !pm.path.includes("/");
    const isInScope =
      scope.root_dir_offset === "" ||
      pm.path.startsWith(scope.root_dir_offset) ||
      isAtRoot;

    if (isInScope) {
      for (const pkg of pm.packages) {
        scopePackagesSet.add(pkg);
      }
    }
  }

  // 3. Archetype trên deps_scope theo thứ tự luật (ING-123)
  const scopeEntries = entries.filter((e) => {
    if (scope.root_dir_offset === "") return true;
    return e.path.startsWith(scope.root_dir_offset) || !e.path.includes("/");
  });

  const hasAndroidManifest = scopeEntries.some(
    (e) => path.posix.basename(e.path) === "AndroidManifest.xml"
  );
  const hasXcodeproj = scopeEntries.some((e) =>
    e.path.split("/").some((s) => s.endsWith(".xcodeproj"))
  );
  const hasFlutterInScopePubspec = parsedManifestList.some((pm) => {
    const isPubspec = path.posix.basename(pm.path) === "pubspec.yaml";
    const isInScope =
      scope.root_dir_offset === "" ||
      pm.path.startsWith(scope.root_dir_offset) ||
      !pm.path.includes("/");
    return isPubspec && isInScope && pm.packages.includes("flutter");
  });

  const hasBinInScopePkgJson = parsedManifestList.some((pm) => {
    const isPkgJson = path.posix.basename(pm.path) === "package.json";
    const isInScope =
      scope.root_dir_offset === "" ||
      pm.path.startsWith(scope.root_dir_offset) ||
      !pm.path.includes("/");
    return isPkgJson && isInScope && pm.has_bin;
  });

  let archetype: ProjectArchetype = "ALGORITHM_CORE";

  // Luật 1: MOBILE_APP
  if (
    scopePackagesSet.has("react-native") ||
    scopePackagesSet.has("expo") ||
    scopePackagesSet.has("expo-router") ||
    hasFlutterInScopePubspec ||
    hasAndroidManifest ||
    hasXcodeproj
  ) {
    archetype = "MOBILE_APP";
  }
  // Luật 2: DESKTOP_APP
  else if (
    scopePackagesSet.has("electron") ||
    scopePackagesSet.has("@tauri-apps/api") ||
    scopePackagesSet.has("pyqt5") ||
    scopePackagesSet.has("pyqt6") ||
    scopePackagesSet.has("pyside6")
  ) {
    archetype = "DESKTOP_APP";
  }
  // Luật 3: WEB_BACKEND
  else if (
    scopePackagesSet.has("express") ||
    scopePackagesSet.has("koa") ||
    scopePackagesSet.has("fastify") ||
    scopePackagesSet.has("@nestjs/core") ||
    scopePackagesSet.has("@hapi/hapi") ||
    scopePackagesSet.has("fastapi") ||
    scopePackagesSet.has("flask") ||
    scopePackagesSet.has("django") ||
    scopePackagesSet.has("org.springframework.boot:spring-boot-starter-web") ||
    scopePackagesSet.has(
      "org.springframework.boot:spring-boot-starter-webflux"
    ) ||
    Array.from(scopePackagesSet).some(
      (p) =>
        p.startsWith("github.com/gin-gonic/gin") ||
        p.startsWith("github.com/labstack/echo") ||
        p.startsWith("github.com/gofiber/fiber") ||
        p.startsWith("github.com/go-chi/chi")
    )
  ) {
    archetype = "WEB_BACKEND";
  }
  // Luật 4: WEB_FRONTEND
  else if (
    scopePackagesSet.has("react-dom") ||
    scopePackagesSet.has("vue") ||
    scopePackagesSet.has("svelte") ||
    scopePackagesSet.has("@angular/core") ||
    scopePackagesSet.has("next") ||
    scopePackagesSet.has("nuxt")
  ) {
    archetype = "WEB_FRONTEND";
  }
  // Luật 5: CLI_TOOL
  else if (
    hasBinInScopePkgJson ||
    scopePackagesSet.has("commander") ||
    scopePackagesSet.has("yargs") ||
    scopePackagesSet.has("typer") ||
    scopePackagesSet.has("click") ||
    scopePackagesSet.has("github.com/spf13/cobra") ||
    scopePackagesSet.has("clap")
  ) {
    archetype = "CLI_TOOL";
  } else {
    archetype = "ALGORITHM_CORE";
  }

  // 4. detected_framework (ING-124)
  let detected_framework: string | null = null;
  const FRAMEWORK_ORDER: Array<{ pkg: string; label: string; prefix?: boolean }> = [
    { pkg: "@nestjs/core", label: "NestJS" },
    { pkg: "express", label: "Express" },
    { pkg: "fastify", label: "Fastify" },
    { pkg: "koa", label: "Koa" },
    { pkg: "fastapi", label: "FastAPI" },
    { pkg: "flask", label: "Flask" },
    { pkg: "django", label: "Django" },
    { pkg: "org.springframework.boot:spring-boot-starter-web", label: "Spring Boot" },
    { pkg: "github.com/gin-gonic/gin", label: "Gin", prefix: true },
    { pkg: "github.com/labstack/echo", label: "Echo", prefix: true },
    { pkg: "next", label: "Next.js" },
    { pkg: "nuxt", label: "Nuxt" },
    { pkg: "@angular/core", label: "Angular" },
    { pkg: "react-native", label: "React Native" },
    { pkg: "expo", label: "Expo" },
    { pkg: "flutter", label: "Flutter" },
    { pkg: "electron", label: "Electron" },
    { pkg: "vue", label: "Vue" },
    { pkg: "svelte", label: "Svelte" },
    { pkg: "react-dom", label: "React" },
  ];

  for (const fw of FRAMEWORK_ORDER) {
    if (fw.prefix) {
      if (Array.from(scopePackagesSet).some((p) => p.startsWith(fw.pkg))) {
        detected_framework = fw.label;
        break;
      }
    } else {
      if (scopePackagesSet.has(fw.pkg)) {
        detected_framework = fw.label;
        break;
      }
    }
  }

  if (!detected_framework) {
    if (hasAndroidManifest) {
      detected_framework = "Android";
    } else if (hasXcodeproj) {
      detected_framework = "iOS";
    }
  }

  // 5. Ngôn ngữ & language_breakdown (ING-125)
  const bytesByLanguage = new Map<LanguageId, number>();

  for (const e of scopeEntries) {
    if (e.cls !== "CODE" && e.cls !== "SPECIAL" && e.cls !== "NO_GRAMMAR") {
      continue;
    }

    let langId: LanguageId | null = e.language;
    if (!langId && e.cls === "SPECIAL") {
      if (e.path.endsWith(".ipynb")) {
        langId = "PYTHON";
      } else if (e.path.endsWith(".vue") || e.path.endsWith(".svelte")) {
        langId = "TYPESCRIPT";
      }
    }

    if (langId) {
      bytesByLanguage.set(langId, (bytesByLanguage.get(langId) ?? 0) + e.size);
    }
  }

  const language_breakdown: LanguageSupportInfo[] = [];
  for (const [langId, codeBytes] of bytesByLanguage.entries()) {
    let tier: LanguageSupportTier = "UNSUPPORTED";
    const adapter = registry.adapters.find((a) => a.id === langId);
    if (adapter) {
      tier = adapter.import_resolver ? "RESOLVED" : "STRUCTURAL";
    } else if (registry.known_no_grammar[langId]) {
      tier = "UNSUPPORTED";
    } else {
      tier = "UNSUPPORTED";
    }

    language_breakdown.push({
      language: langId,
      tier,
      code_bytes: codeBytes,
    });
  }

  language_breakdown.sort((a, b) => {
    if (b.code_bytes !== a.code_bytes) {
      return b.code_bytes - a.code_bytes;
    }
    return a.language < b.language ? -1 : a.language > b.language ? 1 : 0;
  });

  const primaryObj =
    language_breakdown.find((item) => item.tier !== "UNSUPPORTED") ??
    language_breakdown[0];

  const primary_language: LanguageId = primaryObj ? primaryObj.language : "TYPESCRIPT";

  // 6. graph_confidence (ING-126)
  let resolvedBytes = 0;
  let structuralBytes = 0;

  for (const item of language_breakdown) {
    if (item.tier === "RESOLVED") {
      resolvedBytes += item.code_bytes;
    } else if (item.tier === "STRUCTURAL") {
      structuralBytes += item.code_bytes;
    }
  }

  const sample = resolvedBytes + structuralBytes;
  let graph_confidence: ProjectFingerprint["graph_confidence"] = "HIGH";

  if (sample > 0) {
    if (resolvedBytes / sample >= CONFIG.GRAPH_CONFIDENCE_HIGH_RATIO) {
      graph_confidence = "HIGH";
    } else if (structuralBytes / sample >= CONFIG.GRAPH_CONFIDENCE_LOW_RATIO) {
      graph_confidence = "LOW";
      const warn = `Đồ thị của ${primary_language} được suy luận bằng bộ phân giải phổ quát; cạnh nét đứt có thể chưa chính xác.`;
      if (!report.warnings.includes(warn)) {
        report.warnings.push(warn);
      }
    } else {
      graph_confidence = "MIXED";
    }
  }

  // 7. module_info
  let go_module_path: string | null = null;
  let dart_package_name: string | null = null;
  const entryFilesSet = new Set<string>();

  for (const pm of parsedManifestList) {
    if (pm.go_module_path) {
      go_module_path = pm.go_module_path;
    }
    if (pm.dart_package_name) {
      dart_package_name = pm.dart_package_name;
    }

    const isInScope =
      scope.root_dir_offset === "" ||
      pm.path.startsWith(scope.root_dir_offset) ||
      !pm.path.includes("/");

    if (isInScope) {
      if (pm.main) {
        entryFilesSet.add(pm.main);
      }
      for (const bp of pm.bin_paths) {
        entryFilesSet.add(bp);
      }
    }
  }

  const package_entry_files = Array.from(entryFilesSet).sort();

  return {
    fingerprint: {
      archetype,
      primary_language,
      language_breakdown,
      graph_confidence,
      detected_framework,
      tech_stack,
      is_monorepo: scope.is_monorepo,
      root_dir_offset: scope.root_dir_offset,
    },
    module_info: {
      go_module_path,
      dart_package_name,
      package_entry_files,
    },
  };
}

/**
 * Kiểm tra kết quả rỗng và ném lỗi phù hợp theo docs/spec/10_ENGINE_INGEST.md Mục 13 (ING-130..131)
 */
export function assertNotEmpty(
  out: IngestOutput,
  flags: {
    stream_cut: boolean;
    inflated_cap_hit: boolean;
    has_submodules: boolean;
    unsupported_ratio: number;
    top_unsupported: LanguageId | null;
  }
): void {
  if (out.code.size > 0) {
    return;
  }

  // ING-131: code_file_count = 0
  // (1) stream_cut hoặc inflated_cap_hit
  if (flags.stream_cut || flags.inflated_cap_hit) {
    throw new IngestionError(
      "ERR_STREAM_QUOTA_EXCEEDED",
      "Stream quota exceeded or inflated capacity limit hit with 0 code files retained"
    );
  }

  // (2) unsupported_ratio > CONFIG.UNSUPPORTED_LANGUAGE_RATIO
  if (flags.unsupported_ratio > CONFIG.UNSUPPORTED_LANGUAGE_RATIO) {
    throw new IngestionError(
      "ERR_UNSUPPORTED_LANGUAGE",
      `Repository code is primarily written in unsupported language: ${flags.top_unsupported ?? "UNKNOWN"}`,
      { language: flags.top_unsupported ?? "" }
    );
  }

  // (3) còn lại => ERR_NO_SOURCE_FILES_FOUND
  let hint = "no_code";
  if (flags.has_submodules) {
    hint = "submodule";
  } else if (flags.unsupported_ratio > 0) {
    hint = "only_unsupported";
  } else if (out.manifests.size > 0) {
    hint = "only_manifests";
  }

  throw new IngestionError(
    "ERR_NO_SOURCE_FILES_FOUND",
    `No source code files found in repository (${hint})`,
    { hint }
  );
}

const README_BASENAME_REGEX = /^readme(\.(md|rst|txt))?$/i;

/**
 * Chọn file README theo ING-123: ở root_dir_offset, không có thì ở gốc repo; nhiều file thì path nhỏ nhất.
 * Trả null nếu không có hoặc size > CONFIG.MAX_MANIFEST_BYTES.
 */
export function pickReadmeEntry(
  entries: ClassifiedEntry[],
  scope: ScopeDecision
): ClassifiedEntry | null {
  const inDir = (dir: string): ClassifiedEntry[] =>
    entries
      .filter((e) => {
        if (e.is_dir || e.is_symlink || e.is_encrypted || !e.path.startsWith(dir)) return false;
        const rest = e.path.slice(dir.length);
        return !rest.includes("/") && README_BASENAME_REGEX.test(rest);
      })
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  let found = scope.root_dir_offset ? inDir(scope.root_dir_offset) : [];
  if (found.length === 0) found = inDir("");
  const chosen = found[0];
  if (!chosen || chosen.size > CONFIG.MAX_MANIFEST_BYTES) return null;
  return chosen;
}

/** Che secret và PII rồi cắt theo CONFIG.OVERVIEW_README_MAX_CHARS. Rỗng sau trim thì null. */
function sanitizeProjectText(text: string, report: IngestionReport): string | null {
  const cleaned = redactAndMaskCode(text);
  // Mất bảo toàn dòng nghĩa là bản che không dùng được: bỏ, không giữ bản chưa che
  if (!cleaned.linePreserved) return null;
  report.redacted_secret_count += cleaned.count;
  const cut = cleaned.code.trim().slice(0, CONFIG.OVERVIEW_README_MAX_CHARS).trim();
  return cut === "" ? null : cut;
}

function tomlProjectDescription(content: string): string | null {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let inProject = false;
  for (const line of lines) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (header) {
      inProject = header[1].trim() === "project";
      continue;
    }
    if (!inProject) continue;
    const m = line.match(/^\s*description\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/);
    if (m) return (m[1] ?? m[2] ?? "").trim() || null;
  }
  return null;
}

function pomDescription(content: string): string | null {
  // Bỏ comment và các khối có <description> lồng (dependency, plugin, parent...)
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(parent|dependencies|dependencyManagement|build|profiles|reporting|modules)>[\s\S]*?<\/\1>/g, "");
  const m = stripped.match(/<description>([\s\S]*?)<\/description>/);
  return m ? m[1].trim() || null : null;
}

function manifestDescription(manifestPath: string, content: string): string | null {
  const base = manifestPath.slice(manifestPath.lastIndexOf("/") + 1);
  if (base === "package.json") {
    try {
      const parsed = JSON.parse(stripJsonc(content)) as { description?: unknown };
      return typeof parsed.description === "string" && parsed.description.trim() !== ""
        ? parsed.description.trim()
        : null;
    } catch {
      return null;
    }
  }
  if (base === "pyproject.toml") return tomlProjectDescription(content);
  if (base === "pom.xml") return pomDescription(content);
  return null;
}

/**
 * Mô tả dự án cho tổng quan (ING-123, D-83): README đầu tiên và mô tả trong manifest.
 * Cả hai đã che secret, cắt theo CONFIG.OVERVIEW_README_MAX_CHARS; không có thì null.
 */
export function buildProjectText(
  readme: string | null,
  manifests: Map<string, string>,
  scope: ScopeDecision,
  report: IngestionReport
): Pick<IngestOutput, "readme_excerpt" | "manifest_description"> {
  const readme_excerpt = readme === null ? null : sanitizeProjectText(readme, report);

  // Manifest trong offset trước, rồi ở gốc repo; trong mỗi nhóm path tăng dần
  const paths = Array.from(manifests.keys()).sort();
  const inOffset = scope.root_dir_offset
    ? paths.filter((p) => p.startsWith(scope.root_dir_offset))
    : [];
  const atRoot = paths.filter((p) => !p.includes("/"));
  let manifest_description: string | null = null;
  for (const p of [...inOffset, ...atRoot]) {
    const raw = manifestDescription(p, manifests.get(p) ?? "");
    if (raw === null) continue;
    const cleaned = sanitizeProjectText(raw, report);
    if (cleaned !== null) {
      manifest_description = cleaned;
      break;
    }
  }

  return { readme_excerpt, manifest_description };
}
