import { createHash } from "node:crypto";
import type { RepoSnapshotKey } from "@/contracts";
import type { RawArchive } from "./types";

/**
 * Đọc comment EOCD của zip bằng cách dò ngược 22 + 65535 byte cuối theo docs/spec/10_ENGINE_INGEST.md Mục 5 (ING-50)
 */
export function readEocdComment(bytes: Uint8Array): string | null {
  const minLen = 22;
  if (bytes.length < minLen) {
    return null;
  }

  const maxSearch = Math.min(bytes.length, minLen + 65535);
  const start = bytes.length - minLen;
  const end = bytes.length - maxSearch;

  for (let i = start; i >= end; i--) {
    // 0x06054b50 (PK\x05\x06)
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      const commentLen = bytes[i + 20] | (bytes[i + 21] << 8);
      if (i + 22 + commentLen <= bytes.length) {
        const commentBytes = bytes.subarray(i + 22, i + 22 + commentLen);
        const comment = new TextDecoder("utf-8").decode(commentBytes).trim();
        return comment;
      }
    }
  }

  return null;
}

/**
 * Băm SHA-256 toàn bộ buffer zip theo D-10 và ING-52
 */
export function computeArchiveHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Định danh phiên bản và sinh RepoSnapshotKey theo docs/spec/10_ENGINE_INGEST.md Mục 5 (ING-50..52)
 */
export function computeSnapshot(
  a: RawArchive,
  ctx: {
    repo_key: string;
    ref: string | null;
    ref_label: string | null;
    explicit_subdir: string;
  }
): RepoSnapshotKey {
  const repo_key =
    a.source === "GITHUB" ? ctx.repo_key.toLowerCase() : ctx.repo_key;
  const subdir = ctx.explicit_subdir;
  const ref_label = a.source === "ZIP" ? null : ctx.ref_label;

  let snapshot_id: string;
  let snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";

  const is40Hex = (val: string | null | undefined): val is string => {
    return typeof val === "string" && /^[0-9a-f]{40}$/i.test(val.trim());
  };

  if (a.source === "GITHUB") {
    if (is40Hex(ctx.ref)) {
      snapshot_id = ctx.ref.trim().toLowerCase();
      snapshot_id_kind = "COMMIT_SHA";
    } else if (!a.stream_cut) {
      const comment = readEocdComment(a.bytes);
      if (is40Hex(comment)) {
        snapshot_id = comment.toLowerCase();
        snapshot_id_kind = "COMMIT_SHA";
      } else {
        snapshot_id = computeArchiveHash(a.bytes);
        snapshot_id_kind = "ARCHIVE_HASH";
      }
    } else {
      // stream_cut và ref không phải 40 hex: không có EOCD => ING-52
      snapshot_id = computeArchiveHash(a.bytes);
      snapshot_id_kind = "ARCHIVE_HASH";
    }
  } else {
    // ZIP hoặc khác
    snapshot_id = computeArchiveHash(a.bytes);
    snapshot_id_kind = "ARCHIVE_HASH";
  }

  return {
    source: a.source,
    repo_key,
    snapshot_id,
    snapshot_id_kind,
    subdir,
    ref_label,
  };
}
