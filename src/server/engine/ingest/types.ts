import type { IngestionErrorCode } from "@/contracts";

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
