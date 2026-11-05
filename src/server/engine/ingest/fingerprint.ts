// 10 Mục 12 — vân tay dự án: manifest, tech_stack, archetype, framework, ngôn ngữ, graph_confidence.
import { CONFIG } from "@/contracts/config";
import type {
  IngestOutput, IngestionReport, LanguageId, LanguageSupportInfo, ProjectArchetype, ProjectFingerprint,
} from "@/contracts";
import { tierOfLanguage } from "../graph/registry";
import type { ClassifiedEntry, ScopeDecision } from "./prune";

interface ManifestInfo { path: string; packages: string[]; has_bin: boolean; main: string | null; bin_paths: string[] }

function parseJsonLoose(text: string): unknown {
  try { return JSON.parse(text); } catch { /* thử bỏ comment, dấu phẩy thừa, BOM */ }
  try {
    const t = text.replace(/^﻿/, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1").replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(t);
  } catch { return null; }
}

const pep503 = (s: string) => s.toLowerCase().replace(/[-_.]+/g, "-");

export function parseManifests(manifests: Map<string, string>, report: IngestionReport): ManifestInfo[] {
  const out: ManifestInfo[] = [];
  for (const [path, text] of [...manifests.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const base = path.slice(path.lastIndexOf("/") + 1);
    const info: ManifestInfo = { path, packages: [], has_bin: false, main: null, bin_paths: [] };
    if (base === "package.json") {
      const j = parseJsonLoose(text) as Record<string, unknown> | null;
      if (!j || typeof j !== "object") { report.warnings.push(`Manifest ${path} không đọc được`); continue; }
      for (const k of ["dependencies", "devDependencies", "peerDependencies"]) {
        const d = j[k];
        if (d && typeof d === "object") info.packages.push(...Object.keys(d as object).map((s) => s.trim().toLowerCase()));
      }
      const bin = j.bin;
      if (typeof bin === "string") { info.has_bin = true; info.bin_paths.push(bin); }
      else if (bin && typeof bin === "object") { info.has_bin = true; info.bin_paths.push(...Object.values(bin as Record<string, string>)); }
      if (typeof j.main === "string") info.main = j.main;
    } else if (base === "requirements.txt") {
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#") || t.startsWith("-r") || t.startsWith("-e") || t.startsWith("-")) continue;
        const m = /^\s*([A-Za-z0-9_.-]+)/.exec(t);
        if (m) info.packages.push(pep503(m[1]));
      }
    } else if (base === "pyproject.toml") {
      const dep = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(text);
      if (dep) for (const m of dep[1].matchAll(/["']([A-Za-z0-9_.-]+)[^"']*["']/g)) info.packages.push(pep503(m[1]));
      const poetry = /\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/.exec(text);
      if (poetry) for (const m of poetry[1].matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=/gm)) if (m[1].toLowerCase() !== "python") info.packages.push(pep503(m[1]));
    } else if (base === "Pipfile") {
      for (const sec of ["packages", "dev-packages"]) {
        const m = new RegExp(`\\[${sec}\\]([\\s\\S]*?)(?:\\n\\[|$)`).exec(text);
        if (m) for (const l of m[1].matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=/gm)) info.packages.push(pep503(l[1]));
      }
    }
    // tsconfig/jsconfig/setup.py: giữ nguyên cho resolver (không có gói)
    info.packages = [...new Set(info.packages)];
    out.push(info);
  }
  return out;
}

const WEB_BACKEND = ["express", "koa", "fastify", "@nestjs/core", "@hapi/hapi", "fastapi", "flask", "django"];
const WEB_FRONTEND = ["react-dom", "vue", "svelte", "@angular/core", "next", "nuxt"];
const FRAMEWORKS: Array<[string, string]> = [
  ["@nestjs/core", "NestJS"], ["express", "Express"], ["fastify", "Fastify"], ["koa", "Koa"], ["fastapi", "FastAPI"],
  ["flask", "Flask"], ["django", "Django"], ["next", "Next.js"], ["nuxt", "Nuxt"], ["@angular/core", "Angular"],
  ["react-native", "React Native"], ["expo", "Expo"], ["electron", "Electron"], ["vue", "Vue"], ["svelte", "Svelte"], ["react-dom", "React"],
];

export function buildFingerprint(
  entries: ClassifiedEntry[], manifests: Map<string, string>, scope: ScopeDecision,
  report: IngestionReport, primaryBytes: Map<LanguageId, number>,
): { fingerprint: ProjectFingerprint; module_info: IngestOutput["module_info"] } {
  const infos = parseManifests(manifests, report);
  const techStack = [...new Set(infos.flatMap((i) => i.packages))].sort();
  const off = scope.root_dir_offset;
  const inScope = (p: string) => off === "" || p.startsWith(off);
  const depsScope = new Set(infos.filter((i) => off === "" || i.path.startsWith(off) || !i.path.includes("/")).flatMap((i) => i.packages));
  const has = (...names: string[]) => names.some((n) => depsScope.has(n));
  const hasFile = (re: RegExp) => entries.some((e) => inScope(e.path) && re.test(e.path));

  let archetype: ProjectArchetype;
  let androidIos: string | null = null;
  if (has("react-native", "expo") || hasFile(/AndroidManifest\.xml$|\.xcodeproj\//)) {
    archetype = "MOBILE_APP";
    if (!has("react-native", "expo")) androidIos = hasFile(/AndroidManifest\.xml$/) ? "Android" : "iOS";
  } else if (has("electron", "@tauri-apps/api", "pyqt5", "pyqt6", "pyside6")) archetype = "DESKTOP_APP";
  else if (has(...WEB_BACKEND)) archetype = "WEB_BACKEND";
  else if (has(...WEB_FRONTEND)) archetype = "WEB_FRONTEND";
  else if (infos.some((i) => (off === "" || i.path.startsWith(off)) && i.has_bin) || has("commander", "yargs", "typer", "click")) archetype = "CLI_TOOL";
  else archetype = "ALGORITHM_CORE";

  const framework = FRAMEWORKS.find(([pkg]) => depsScope.has(pkg))?.[1] ?? androidIos;

  // ngôn ngữ trong scope
  const lang = new Map<LanguageId, number>();
  for (const e of entries) {
    if (!inScope(e.path) || !e.language) continue;
    if (e.cls === "CODE" || e.cls === "SPECIAL" || e.cls === "NO_GRAMMAR") lang.set(e.language, (lang.get(e.language) ?? 0) + e.size);
  }
  for (const [k, v] of primaryBytes) lang.set(k, v); // byte thực đã nạp ghi đè
  const breakdown: LanguageSupportInfo[] = [...lang.entries()]
    .map(([language, code_bytes]) => ({ language, tier: tierOfLanguage(language), code_bytes }))
    .sort((a, b) => b.code_bytes - a.code_bytes || (a.language < b.language ? -1 : 1));
  const primary = breakdown.find((b) => b.tier !== "UNSUPPORTED")?.language ?? breakdown[0]?.language ?? "TYPESCRIPT";

  const resolved = breakdown.filter((b) => b.tier === "RESOLVED").reduce((a, b) => a + b.code_bytes, 0);
  const structural = breakdown.filter((b) => b.tier === "STRUCTURAL").reduce((a, b) => a + b.code_bytes, 0);
  const sample = resolved + structural;
  let confidence: ProjectFingerprint["graph_confidence"] = "MIXED";
  if (sample > 0 && resolved / sample >= CONFIG.GRAPH_CONFIDENCE_HIGH_RATIO) confidence = "HIGH";
  else if (sample > 0 && structural / sample >= CONFIG.GRAPH_CONFIDENCE_LOW_RATIO) {
    confidence = "LOW";
    report.warnings.push("Đồ thị được suy luận bằng bộ phân giải phổ quát; cạnh nét đứt có thể chưa chính xác.");
  }

  const pkg = infos.filter((i) => i.path.endsWith("package.json") && (off === "" || i.path.startsWith(off) || !i.path.includes("/")));
  return {
    fingerprint: {
      archetype, primary_language: primary, language_breakdown: breakdown, graph_confidence: confidence,
      detected_framework: framework, tech_stack: techStack, is_monorepo: scope.is_monorepo, root_dir_offset: off,
    },
    module_info: {
      go_module_path: null, dart_package_name: null,
      package_entry_files: pkg.flatMap((p) => [...(p.main ? [p.main] : []), ...p.bin_paths]),
    },
  };
}
