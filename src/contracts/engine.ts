// 02_CONTRACTS Mục 3–4 — đầu ra Engine và kiểu nội bộ Engine
import type {
  ArchitecturalLayer, DegradedMode, GraphConfidence, LanguageId, LanguageSupportTier,
  NodeType, ProjectArchetype,
} from "./base";

export interface LanguageSupportInfo {
  language: LanguageId;
  tier: LanguageSupportTier;
  code_bytes: number;
}

export interface ProjectFingerprint {
  archetype: ProjectArchetype;
  primary_language: LanguageId;
  language_breakdown: LanguageSupportInfo[];
  graph_confidence: GraphConfidence;
  detected_framework: string | null;
  tech_stack: string[];
  is_monorepo: boolean;
  root_dir_offset: string;
}

export type NodeTitleSource = "ROUTE" | "ENTRY_SYMBOL" | "DOMAIN_TERMS" | "DIRECTORY" | "FILE_BASENAME" | "VIRTUAL";

export interface ExecutionTraceStep {
  step_number: number;
  layer: ArchitecturalLayer;
  file_path: string;
  function_name: string;
  line_start: number;
  line_end: number;
  snippet: string;
  snippet_line_map: number[];
  origin_note?: string;
}

export interface UncleBobMetrics {
  instability: number;
  abstractness: number;
  distance: number;
  diagnosis: "BALANCED" | "ZONE_OF_PAIN" | "ZONE_OF_USELESSNESS";
  is_exempt: boolean;
}

export interface HybridArchitecturalNode {
  id: string;
  title: string;
  title_source: NodeTitleSource;
  title_evidence: string;
  node_type: NodeType;
  entry_symbol: string | null;
  prerequisites: string[];
  position: { x: number; y: number };
  files: string[];
  languages: LanguageId[];
  support_tier: LanguageSupportTier;
  cognitive_complexity: number;
  rank_score: number;
  is_vip_algorithm: boolean;
  is_capstone: boolean;
  uncle_bob: UncleBobMetrics;
  trace_steps: ExecutionTraceStep[];
  dto_snippet: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  confidence: "RESOLVED" | "INFERRED";
}

export type IngestionErrorCode =
  | "ERR_INVALID_GITHUB_URL" | "ERR_PREFLIGHT_404_OR_PRIVATE" | "ERR_NETWORK_TIMEOUT" | "ERR_BRANCH_NOT_FOUND"
  | "ERR_EMPTY_REPOSITORY" | "ERR_REPO_UNAVAILABLE_451" | "ERR_GITHUB_RATE_LIMIT_CDN" | "ERR_STREAM_TIMEOUT"
  | "ERR_STREAM_CORRUPTED" | "ERR_STREAM_QUOTA_EXCEEDED" | "ERR_UNSUPPORTED_LANGUAGE" | "ERR_NO_SOURCE_FILES_FOUND"
  | "ERR_NO_ARCHITECTURAL_SLICE" | "ERR_UPLOAD_INVALID" | "ERR_SERVER_BUSY";

export interface IngestionReport {
  truncated: boolean;
  selective_fetch: boolean;
  code_file_count: number;
  manifest_count: number;
  omitted_node_count: number;
  skipped: { garbage: number; binary: number; oversized: number; unsupported_lang: number; quota: number; parse_error: number };
  warnings: string[];
  degraded_mode: DegradedMode | null;
  redacted_secret_count: number;
  engine_ms: number;
  ingest_ms: number;
  suspicious_instruction_files: string[];
}

export interface RepoSnapshotKey {
  source: "GITHUB" | "ZIP";
  repo_key: string;
  snapshot_id: string;
  snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";
  subdir: string;
  ref_label: string | null;
}

// Bản đầy đủ — CHỈ SERVER
export interface StaticEngineResult {
  engine_version: string;
  repo_name: string;
  snapshot: RepoSnapshotKey;
  fingerprint: ProjectFingerprint;
  total_files: number;
  nodes: HybridArchitecturalNode[];
  edges: GraphEdge[];
  symbol_whitelist: string[];
  file_index: string[];
  ingestion_report: IngestionReport;
}

// Bản gửi trình duyệt
export type ClientStaticEngineResult =
  Omit<StaticEngineResult, "symbol_whitelist" | "ingestion_report"> & {
    ingestion_report: Omit<IngestionReport, "suspicious_instruction_files">;
  };

// ---------- Mục 4: kiểu nội bộ Engine ----------
export interface LanguageAdapter {
  id: LanguageId;
  extensions: string[];
  wasm_grammar: string;
  query_file: string;
  manifest_files: string[];
  import_resolver?: "TS_JS" | "PYTHON" | "JAVA" | "GO" | "DART";
  ingress_patterns?: string[];
  abstraction_kinds?: string[];
  comment_prefix: string;
}

export interface GithubRepoInfo {
  owner: string;
  repo: string;
  path_trimmed: boolean;
  clean_url: string;
}

export type ProbeResult = "OK" | "NOT_FOUND_OR_PRIVATE" | "UNAVAILABLE_451" | "RATE_LIMITED" | "TIMEOUT" | "EMPTY";

export interface SymbolDefinition {
  key: string;
  kind: "FUNCTION" | "METHOD" | "CLASS" | "INTERFACE" | "TYPE" | "VARIABLE";
  name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  is_exported: boolean;
}

export interface FunctionCallEdge {
  caller: string;
  callee: string;
  confidence: "RESOLVED" | "INFERRED";
  ambiguous: boolean;
  call_count: number;
}

export type IngestSource =
  | { kind: "GITHUB_URL"; repo_url: string; subdir_override: string | null }
  | { kind: "GITHUB_COMMIT"; owner: string; repo: string; sha: string; subdir: string }
  | { kind: "ZIP_UPLOAD"; file_name: string; bytes: Uint8Array; subdir_override: string | null };

export interface VirtualFileOrigin {
  kind: "NOTEBOOK" | "SFC";
  original_path: string;
  line_origin: string[];
}

export interface IngestOutput {
  repo_name: string;
  snapshot: RepoSnapshotKey;
  fingerprint: ProjectFingerprint;
  report: IngestionReport;
  code: Map<string, string>;
  file_language: Map<string, LanguageId>;
  manifests: Map<string, string>;
  source_map: Map<string, VirtualFileOrigin>;
  module_info: { go_module_path: string | null; dart_package_name: string | null; package_entry_files: string[] };
}
