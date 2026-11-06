import * as path from "node:path";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { IngestionError } from "./types";
import type { RawArchive, ZipEntryMeta } from "./types";
import type { selectFiles } from "./priority";

interface RawParsedEntry {
  rawPath: string;
  compressed_size: number;
  size: number;
  method: number;
  local_offset: number | null;
  is_dir: boolean;
  is_symlink: boolean;
  is_encrypted: boolean;
}

// WeakMap lưu commonPrefix theo bytes archive để lượt 2 dùng lại chính xác
const archiveCommonPrefixMap = new WeakMap<Uint8Array, string>();

/**
 * Entry rác của macOS: thư mục `__MACOSX/` và file `._*` (ING-60.3, lỗi B-19)
 */
function isMacJunk(rawPath: string): boolean {
  const n = rawPath.replace(/\\/g, "/");
  if (n === "__MACOSX" || n.startsWith("__MACOSX/")) return true;
  return n.slice(n.lastIndexOf("/") + 1).startsWith("._");
}

/**
 * Tìm tiền tố thư mục chung cho mọi entry trong zip (ING-60.3)
 */
function findCommonPrefix(rawPaths: string[]): string {
  if (rawPaths.length === 0) return "";
  const firstPath = rawPaths[0].replace(/\\/g, "/");
  const firstSlash = firstPath.indexOf("/");
  if (firstSlash <= 0) return "";
  const candidatePrefix = firstPath.slice(0, firstSlash + 1);
  const allShare = rawPaths.every((p) => {
    const np = p.replace(/\\/g, "/");
    return np.startsWith(candidatePrefix) || np === candidatePrefix.slice(0, -1);
  });
  return allShare ? candidatePrefix : "";
}

/**
 * Chuẩn hóa một đường dẫn theo ING-60 với tiền tố chung đã biết
 */
function normalizeSinglePath(
  rawPath: string,
  commonPrefix: string
): string | null {
  let p = rawPath.replace(/\\/g, "/");
  if (commonPrefix && p.startsWith(commonPrefix)) {
    p = p.slice(commonPrefix.length);
  } else if (commonPrefix && p === commonPrefix.slice(0, -1)) {
    p = "";
  }

  // (4) path.posix.normalize; bắt đầu ../ hoặc /, hoặc chứa NUL => loại
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
 * Chuẩn hóa danh sách đường dẫn theo docs/spec/10_ENGINE_INGEST.md Mục 6 (ING-60)
 */
function normalizeEntries(
  rawList: RawParsedEntry[],
  report?: IngestionReport,
  archiveBytes?: Uint8Array
): ZipEntryMeta[] {
  // (3) Bỏ __MACOSX/ và file ._* trước khi tìm segment đầu chung, nếu không zip nén trên macOS
  // (proj/... và __MACOSX/proj/...) không còn segment chung và giữ nguyên tiền tố proj/ (lỗi B-19)
  rawList = rawList.filter((e) => !isMacJunk(e.rawPath));
  if (rawList.length === 0) {
    return [];
  }

  // Kiểm tra segment đầu chung (như zip GitHub có <repo>-<ref>/)
  const commonPrefix = findCommonPrefix(rawList.map((e) => e.rawPath));
  if (archiveBytes) {
    archiveCommonPrefixMap.set(archiveBytes, commonPrefix);
  }

  const seenPaths = new Set<string>();
  const results: ZipEntryMeta[] = [];

  for (const item of rawList) {
    const norm = normalizeSinglePath(item.rawPath, commonPrefix);
    if (!norm) {
      continue;
    }

    // (5) Trùng path => giữ entry đầu theo thứ tự mục lục, sau đó skipped.garbage++
    if (seenPaths.has(norm)) {
      if (report) {
        report.skipped.garbage++;
      }
      continue;
    }

    seenPaths.add(norm);
    results.push({
      path: norm,
      compressed_size: item.compressed_size,
      size: item.size,
      method: item.method,
      local_offset: item.local_offset,
      is_dir: item.is_dir,
      is_symlink: item.is_symlink,
      is_encrypted: item.is_encrypted,
    });
  }

  return results;
}

/**
 * Đọc mục lục Central Directory của zip theo docs/spec/10_ENGINE_INGEST.md Mục 6 (ING-61)
 */
export function readCentralDirectory(
  bytes: Uint8Array,
  report?: IngestionReport
): ZipEntryMeta[] | null {
  const minLen = 22;
  if (bytes.length < minLen) {
    return null;
  }

  // Tìm EOCD
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length, minLen + 65535);
  const start = bytes.length - minLen;
  const end = bytes.length - maxSearch;

  for (let i = start; i >= end; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  if (cdOffset < 0 || cdSize < 0 || cdOffset + cdSize > bytes.length) {
    return null;
  }

  let cur = cdOffset;
  const cdEnd = cdOffset + cdSize;
  const rawList: RawParsedEntry[] = [];

  while (cur < cdEnd) {
    if (cur + 46 > bytes.length) {
      return null;
    }

    const sig = view.getUint32(cur, true);
    if (sig !== 0x02014b50) {
      return null;
    }

    const flags = view.getUint16(cur + 8, true);
    const method = view.getUint16(cur + 10, true);
    const compressed_size = view.getUint32(cur + 20, true);
    const size = view.getUint32(cur + 24, true);
    const nameLen = view.getUint16(cur + 28, true);
    const extraLen = view.getUint16(cur + 30, true);
    const commentLen = view.getUint16(cur + 32, true);
    const externalAttrs = view.getUint32(cur + 38, true);
    const localOffset = view.getUint32(cur + 42, true);

    const recordLen = 46 + nameLen + extraLen + commentLen;
    if (cur + recordLen > bytes.length) {
      return null;
    }

    const nameBytes = bytes.subarray(cur + 46, cur + 46 + nameLen);
    const isUtf8 = (flags & 0x0800) !== 0;

    let rawName: string;
    let isInvalidEncoding = false;

    if (isUtf8) {
      rawName = new TextDecoder("utf-8").decode(nameBytes);
    } else {
      let isAscii = true;
      for (let b = 0; b < nameBytes.length; b++) {
        if (nameBytes[b] >= 0x80) {
          isAscii = false;
          break;
        }
      }
      if (isAscii) {
        rawName = new TextDecoder("utf-8").decode(nameBytes);
      } else {
        isInvalidEncoding = true;
        if (report) {
          report.skipped.binary++;
        }
        rawName = "";
      }
    }

    rawName = rawName.replace(/\\/g, "/");
    const isDir = rawName.endsWith("/");
    const isSymlink = ((externalAttrs >>> 16) & 0xf000) === 0xa000;
    const isEncrypted = (flags & 1) !== 0;

    if (!isInvalidEncoding) {
      rawList.push({
        rawPath: rawName,
        compressed_size,
        size,
        method,
        local_offset: localOffset,
        is_dir: isDir,
        is_symlink: isSymlink,
        is_encrypted: isEncrypted,
      });
    }

    cur += recordLen;
  }

  return normalizeEntries(rawList, report, bytes);
}

/**
 * Đọc danh sách entry dạng streaming dự phòng theo docs/spec/10_ENGINE_INGEST.md Mục 6
 */
export function listEntriesStreaming(
  bytes: Uint8Array,
  _signal?: AbortSignal,
  report?: IngestionReport
): ZipEntryMeta[] {
  const rawList: (RawParsedEntry & { completed: boolean })[] = [];

  const uz = new fflate.Unzip();
  uz.register(fflate.UnzipInflate);

  uz.onfile = (file) => {
    let uncompressedBytes = 0;
    const entryData: RawParsedEntry & { completed: boolean } = {
      rawPath: file.name.replace(/\\/g, "/"),
      compressed_size: file.size ?? 0,
      size: 0,
      method: file.compression ?? 8,
      local_offset: null,
      is_dir: file.name.replace(/\\/g, "/").endsWith("/"),
      is_symlink: false,
      is_encrypted: false,
      completed: false,
    };

    file.ondata = (err, chunk, final) => {
      if (err) return;
      if (chunk) {
        uncompressedBytes += chunk.length;
      }
      if (final) {
        entryData.size = uncompressedBytes;
        entryData.completed = true;
      }
    };

    file.start();
    rawList.push(entryData);
  };

  try {
    uz.push(bytes, true);
  } catch {
    // Bỏ qua lỗi kết thúc stream hỏng
  }

  const validRaw = rawList.filter((item) => item.completed);
  return normalizeEntries(validRaw, report, bytes);
}

/**
 * Trích xuất danh sách entry kết hợp Central-Directory và streaming theo docs/spec/10_ENGINE_INGEST.md Mục 6 (ING-63)
 */
export function listEntries(
  a: RawArchive,
  signal?: AbortSignal,
  report?: IngestionReport
): ZipEntryMeta[] {
  let entries = readCentralDirectory(a.bytes, report);
  if (entries === null) {
    entries = listEntriesStreaming(a.bytes, signal, report);
  }

  if (entries.length === 0) {
    if (a.source === "GITHUB") {
      throw new IngestionError(
        "ERR_STREAM_CORRUPTED",
        "No valid zip entries found in GitHub archive"
      );
    } else {
      throw new IngestionError(
        "ERR_UPLOAD_INVALID",
        "No valid zip entries found in uploaded archive"
      );
    }
  }

  return entries;
}

/**
 * Giải mã và lọc nội dung văn bản theo docs/spec/10_ENGINE_INGEST.md Mục 9
 */
export function decodeAndFilter(
  buf: Uint8Array,
  report: IngestionReport,
  opts: { check_minified: boolean }
): string | null {
  let text: string;

  // (1) BOM UTF-16LE / BE
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = new TextDecoder("utf-16le").decode(buf.subarray(2));
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    text = new TextDecoder("utf-16be").decode(buf.subarray(2));
  } else {
    // (2) 0x00 trong CONFIG.BINARY_SNIFF_BYTES byte đầu
    const sniffLimit = Math.min(buf.length, CONFIG.BINARY_SNIFF_BYTES);
    for (let i = 0; i < sniffLimit; i++) {
      if (buf[i] === 0x00) {
        report.skipped.binary++;
        return null;
      }
    }

    // (3) UTF-8
    text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (text.startsWith("\uFEFF")) {
      text = text.slice(1);
    }
  }

  // (4) Git LFS pointer
  if (text.startsWith("version https://git-lfs.github.com/spec/v1")) {
    report.skipped.binary++;
    return null;
  }

  // (5) CRLF, CR => LF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // (6) check_minified
  if (opts.check_minified) {
    const lines = text.split("\n");
    let hasLongLine = false;
    let totalChars = 0;
    for (const line of lines) {
      if (line.length > CONFIG.MAX_LINE_LENGTH) {
        hasLongLine = true;
        break;
      }
      totalChars += line.length;
    }

    const avgLineLen = lines.length > 0 ? totalChars / lines.length : 0;
    if (hasLongLine || avgLineLen > CONFIG.MAX_AVG_LINE_LENGTH) {
      report.skipped.oversized++;
      return null;
    }
  }

  return text;
}

/**
 * Nối các chunk Uint8Array thành một buffer duy nhất
 */
function concatChunks(chunks: Uint8Array[], totalLen: number): Uint8Array {
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Giải nén buffer của 1 entry từ local header hoặc buffer nén
 */
function extractFromLocalOffset(
  bytes: Uint8Array,
  entry: ZipEntryMeta,
  report: IngestionReport
): Uint8Array | null {
  if (entry.local_offset === null) {
    return null;
  }

  const offset = entry.local_offset;
  if (offset + 30 > bytes.length) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sig = view.getUint32(offset, true);
  if (sig !== 0x04034b50) {
    return null;
  }

  const method = view.getUint16(offset + 8, true);
  const compressedSize = view.getUint32(offset + 18, true);
  const nameLen = view.getUint16(offset + 26, true);
  const extraLen = view.getUint16(offset + 28, true);

  const dataStart = offset + 30 + nameLen + extraLen;
  const compSize = compressedSize > 0 ? compressedSize : entry.compressed_size;
  if (dataStart + compSize > bytes.length) {
    return null;
  }

  const isNotebook = entry.path.endsWith(".ipynb");
  const maxAllowed = isNotebook
    ? CONFIG.MAX_NOTEBOOK_BYTES
    : CONFIG.MAX_SINGLE_FILE_BYTES;

  if (method === 0) {
    const uncompressedSize =
      entry.size > 0 ? entry.size : compSize;
    if (uncompressedSize > maxAllowed) {
      report.skipped.oversized++;
      return null;
    }
    return bytes.subarray(dataStart, dataStart + uncompressedSize);
  }

  if (method === 8) {
    const compressedData = bytes.subarray(dataStart, dataStart + compSize);
    let totalUncompressed = 0;
    let exceeded = false;
    const chunks: Uint8Array[] = [];

    const inflator = new fflate.Inflate((chunk) => {
      totalUncompressed += chunk.length;
      if (totalUncompressed > maxAllowed) {
        exceeded = true;
      } else {
        chunks.push(chunk);
      }
    });

    try {
      inflator.push(compressedData, true);
    } catch {
      return null;
    }

    if (exceeded) {
      report.skipped.oversized++;
      return null;
    }

    return concatChunks(chunks, totalUncompressed);
  }

  return null;
}

/**
 * Giải nén streaming lượt 2 khi local_offset = null
 */
function extractStreamingPass2(
  bytes: Uint8Array,
  targetPaths: Set<string>,
  report: IngestionReport
): Map<string, Uint8Array> {
  const result = new Map<string, Uint8Array>();
  const uz = new fflate.Unzip();
  uz.register(fflate.UnzipInflate);

  let knownPrefix = archiveCommonPrefixMap.get(bytes);
  const seenPaths = new Set<string>();

  uz.onfile = (file) => {
    // Nếu chưa có prefix từ lượt 1, suy ra từ file đầu tiên
    if (knownPrefix === undefined) {
      const raw = file.name.replace(/\\/g, "/");
      const slashIdx = raw.indexOf("/");
      if (slashIdx > 0) {
        const candidate = raw.slice(0, slashIdx + 1);
        const normWithCand = normalizeSinglePath(raw, candidate);
        const normDirect = normalizeSinglePath(raw, "");
        if (
          normWithCand &&
          targetPaths.has(normWithCand) &&
          (!normDirect || !targetPaths.has(normDirect))
        ) {
          knownPrefix = candidate;
        } else {
          knownPrefix = "";
        }
      } else {
        knownPrefix = "";
      }
    }

    const normPath = normalizeSinglePath(file.name, knownPrefix);
    if (!normPath || !targetPaths.has(normPath) || seenPaths.has(normPath)) {
      return;
    }
    seenPaths.add(normPath);

    const isNotebook = normPath.endsWith(".ipynb");
    const maxAllowed = isNotebook
      ? CONFIG.MAX_NOTEBOOK_BYTES
      : CONFIG.MAX_SINGLE_FILE_BYTES;

    let uncompressedBytes = 0;
    let exceeded = false;
    const chunks: Uint8Array[] = [];

    file.ondata = (err, chunk, final) => {
      if (err) return;
      if (chunk) {
        uncompressedBytes += chunk.length;
        if (uncompressedBytes > maxAllowed) {
          exceeded = true;
        } else {
          chunks.push(chunk);
        }
      }
      if (final && !exceeded) {
        result.set(normPath, concatChunks(chunks, uncompressedBytes));
      } else if (final && exceeded) {
        report.skipped.oversized++;
      }
    };

    file.start();
  };

  try {
    uz.push(bytes, true);
  } catch {
    // Bỏ qua lỗi
  }

  return result;
}

/**
 * Giải nén file đã chọn theo docs/spec/10_ENGINE_INGEST.md Mục 9
 */
export function inflateSelected(
  bytes: Uint8Array,
  plan: ReturnType<typeof selectFiles>,
  report: IngestionReport,
  signal?: AbortSignal
): {
  code: Map<string, string>;
  manifests: Map<string, string>;
  inflated_cap_hit: boolean;
} {
  const code = new Map<string, string>();
  const manifests = new Map<string, string>();
  let inflated_cap_hit = false;
  let inflated_total = 0;

  const allEntries = [...plan.manifests, ...plan.ordered_candidates];
  const hasLocalOffsets = allEntries.every((e) => e.local_offset !== null);

  let streamingMap: Map<string, Uint8Array> | null = null;
  if (!hasLocalOffsets) {
    const targetSet = new Set(allEntries.map((e) => e.path));
    streamingMap = extractStreamingPass2(bytes, targetSet, report);
  }

  const getEntryBuffer = (entry: ZipEntryMeta): Uint8Array | null => {
    if (hasLocalOffsets) {
      return extractFromLocalOffset(bytes, entry, report);
    }
    return streamingMap?.get(entry.path) ?? null;
  };

  // 1. Manifest trước
  for (const mf of plan.manifests) {
    if (signal?.aborted) {
      break;
    }

    const buf = getEntryBuffer(mf);
    if (!buf) {
      continue;
    }

    if (buf.length > CONFIG.MAX_MANIFEST_BYTES) {
      report.warnings.push(
        // Spec Mục 9 ý 2 chỉ ghi "bỏ + warning", chưa có câu chữ: câu tạm, chờ người giữ spec chốt.
        `Tệp cấu hình ${mf.path} vượt quá giới hạn ${Math.round(CONFIG.MAX_MANIFEST_BYTES / 1024)} KB nên bị bỏ qua.`
      );
      continue;
    }

    const text = decodeAndFilter(buf, report, { check_minified: false });
    if (text !== null) {
      manifests.set(mf.path, text);
    }
  }

  // 2. Ứng viên theo ING-88
  for (let i = 0; i < plan.ordered_candidates.length; i++) {
    if (signal?.aborted) {
      break;
    }

    const cand = plan.ordered_candidates[i];

    // Quota check
    if (code.size >= CONFIG.MAX_CLEAN_FILES) {
      report.skipped.quota++;
      continue;
    }

    // Trần tổng byte trước khi nhận
    if (inflated_total + cand.size > CONFIG.MAX_INFLATED_BYTES) {
      inflated_cap_hit = true;
      break;
    }

    const buf = getEntryBuffer(cand);
    if (!buf) {
      continue;
    }

    if (inflated_total + buf.length > CONFIG.MAX_INFLATED_BYTES) {
      inflated_cap_hit = true;
      break;
    }

    const isSpecial =
      cand.path.endsWith(".ipynb") ||
      cand.path.endsWith(".vue") ||
      cand.path.endsWith(".svelte");

    const text = decodeAndFilter(buf, report, {
      check_minified: !isSpecial,
    });

    if (text !== null) {
      code.set(cand.path, text);
      inflated_total += buf.length;
    }
  }

  if (inflated_cap_hit || report.skipped.quota > 0) {
    report.truncated = true;
  }

  if (report.truncated) {
    const warn = `Repository lớn — chỉ phân tích ${code.size} tệp mã nguồn được ưu tiên.`;
    if (!report.warnings.includes(warn)) {
      report.warnings.push(warn);
    }
  }

  return { code, manifests, inflated_cap_hit };
}
