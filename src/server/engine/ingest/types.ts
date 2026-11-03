import type {
  IngestionErrorCode,
  IngestionReport,
  LanguageAdapter,
  LanguageId,
  RepoSnapshotKey,
} from "@/contracts";

export interface ResolvedRef {
  download_url: string;
  ref: string | null;
  ref_label: string | null;
}

export interface RawArchive {
  bytes: Uint8Array;
  stream_cut: boolean;
  source: "GITHUB" | "ZIP";
}

export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly details?: Record<string, string | number | boolean>;

  constructor(
    code: IngestionErrorCode,
    message?: string,
    details?: Record<string, string | number | boolean>
  ) {
    super(message ?? code);
    this.name = "IngestionError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface ZipEntryMeta {
  path: string;
  compressed_size: number;
  size: number;
  method: number;
  local_offset: number | null;
  is_dir: boolean;
  is_symlink: boolean;
  is_encrypted: boolean;
}

export type EntryClass =
  | "GARBAGE"
  | "MANIFEST"
  | "CODE"
  | "SPECIAL"
  | "NO_GRAMMAR"
  | "OTHER";

export interface ClassifiedEntry extends ZipEntryMeta {
  cls: EntryClass;
  language: LanguageId | null;
}

export interface ScopeDecision {
  root_dir_offset: string;
  is_monorepo: boolean;
  candidates: string[];
  explicit: boolean;
}

export interface LanguageRegistry {
  adapters: readonly LanguageAdapter[];
  known_no_grammar: Record<string, LanguageId>;
}

export interface SelectiveFetchInput {
  owner: string;
  repo: string;
  ref: string | null;
  ref_label: string | null;
  explicit_subdir: string;
  report: IngestionReport;
  signal?: AbortSignal;
  token?: string;
}

export interface SelectiveFetchResult {
  snapshot: RepoSnapshotKey;
  entryMetas: ZipEntryMeta[];
  classifiedEntries: ClassifiedEntry[];
  scopeDecision: ScopeDecision;
  rawCodeMap: Map<string, string>;
  manifests: Map<string, string>;
  inflated_cap_hit: boolean;
}
