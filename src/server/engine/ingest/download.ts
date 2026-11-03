import { CONFIG } from "@/contracts";
import { IngestionError, type RawArchive } from "./types";

/**
 * Tải file zip repo từ URL trong RAM có trần byte và timer theo docs/spec/10_ENGINE_INGEST.md Mục 4 (ING-01, ING-40..44)
 */
export async function downloadArchive(
  url: string,
  signal?: AbortSignal
): Promise<RawArchive> {
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    const controller = new AbortController();
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CONFIG.STREAM_TIMEOUT_MS);

    const onParentAbort = () => controller.abort();
    signal?.addEventListener("abort", onParentAbort);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "SimpliFey" },
        signal: controller.signal,
      });

      if (res.status === 404) {
        throw new IngestionError(
          "ERR_BRANCH_NOT_FOUND",
          `Archive or branch not found at ${url} (HTTP 404)`
        );
      }
      if (res.status === 429 || res.status === 403) {
        throw new IngestionError(
          "ERR_GITHUB_RATE_LIMIT_CDN",
          `GitHub CDN rate limit or access denied downloading archive (HTTP ${res.status})`
        );
      }
      if (res.status === 451) {
        throw new IngestionError(
          "ERR_REPO_UNAVAILABLE_451",
          `Repository unavailable (HTTP 451) downloading archive`
        );
      }
      if (res.status >= 500) {
        throw new Error(`Server error HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      // Đọc chunk trong RAM và cắt cụt nếu vượt trần MAX_STREAM_BYTES (ING-42)
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let stream_cut = false;

      if (res.body && typeof res.body.getReader === "function") {
        const reader = res.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              if (totalBytes + value.byteLength > CONFIG.MAX_STREAM_BYTES) {
                const needed = CONFIG.MAX_STREAM_BYTES - totalBytes;
                if (needed > 0) {
                  chunks.push(value.subarray(0, needed));
                  totalBytes += needed;
                }
                stream_cut = true;
                await reader.cancel().catch(() => {});
                break;
              } else {
                chunks.push(value);
                totalBytes += value.byteLength;
              }
            }
          }
        } catch (readErr) {
          if (!stream_cut) {
            throw readErr;
          }
        }
      } else {
        // Fallback cho môi trường test hoặc mock fetch không có ReadableStream reader
        const arrayBuf = await res.arrayBuffer();
        const rawBytes = new Uint8Array(arrayBuf);
        if (rawBytes.byteLength > CONFIG.MAX_STREAM_BYTES) {
          chunks.push(rawBytes.subarray(0, CONFIG.MAX_STREAM_BYTES));
          totalBytes = CONFIG.MAX_STREAM_BYTES;
          stream_cut = true;
        } else {
          chunks.push(rawBytes);
          totalBytes = rawBytes.byteLength;
        }
      }

      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onParentAbort);

      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return {
        bytes: merged,
        stream_cut,
        source: "GITHUB",
      };
    } catch (err) {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onParentAbort);

      if (err instanceof IngestionError) {
        throw err;
      }

      // Thử lại 1 lần nếu là 5xx, lỗi mạng, đứt stream, hoặc hết giờ (ING-44)
      if (attempts < 2) {
        await new Promise((resolve) => setTimeout(resolve, CONFIG.STREAM_RETRY_DELAY_MS));
        continue;
      }

      if (timedOut) {
        throw new IngestionError(
          "ERR_STREAM_TIMEOUT",
          `Timeout downloading archive after retry (${CONFIG.STREAM_TIMEOUT_MS}ms)`
        );
      }

      throw new IngestionError(
        "ERR_STREAM_CORRUPTED",
        `Failed to download archive: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new IngestionError("ERR_STREAM_CORRUPTED", "Failed to download archive after retry");
}

function isValidZipMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return true;
  }
  // PK\x05\x06 (archive rỗng)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x05 && bytes[3] === 0x06) {
    return true;
  }
  return false;
}

/**
 * Nhận file upload qua multipart hoặc stream, kiểm trần byte và magic bytes theo ING-45
 */
export async function receiveUpload(
  body: ReadableStream<Uint8Array>,
  contentType: string
): Promise<{ file_name: string; bytes: Uint8Array; subdir: string | null }> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > CONFIG.MAX_UPLOAD_BYTES) {
          await reader.cancel().catch(() => {});
          throw new IngestionError(
            "ERR_STREAM_QUOTA_EXCEEDED",
            `Upload size (${totalBytes} bytes) exceeded MAX_UPLOAD_BYTES (${CONFIG.MAX_UPLOAD_BYTES})`
          );
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    if (err instanceof IngestionError) {
      throw err;
    }
    throw err;
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new IngestionError(
      "ERR_UPLOAD_INVALID",
      `Expected multipart/form-data but received ${contentType}`
    );
  }

  const response = new Response(merged, {
    headers: { "Content-Type": contentType },
  });

  let formData: FormData;
  try {
    formData = await response.formData();
  } catch {
    throw new IngestionError("ERR_UPLOAD_INVALID", "Failed to parse multipart upload body");
  }

  const archiveEntry = formData.get("archive");
  if (!archiveEntry || typeof (archiveEntry as Blob).arrayBuffer !== "function") {
    throw new IngestionError(
      "ERR_UPLOAD_INVALID",
      "Missing 'archive' field in multipart form upload"
    );
  }

  const file = archiveEntry as File;
  const fileBytes = new Uint8Array(await file.arrayBuffer());

  if (!isValidZipMagic(fileBytes)) {
    throw new IngestionError(
      "ERR_UPLOAD_INVALID",
      "Uploaded file does not start with PK\\x03\\x04 or PK\\x05\\x06"
    );
  }

  const rawSubdir = formData.get("subdir");
  const subdir =
    typeof rawSubdir === "string" && rawSubdir.trim().length > 0
      ? rawSubdir.trim()
      : null;

  const file_name = file.name || "archive.zip";
  return { file_name, bytes: fileBytes, subdir };
}
