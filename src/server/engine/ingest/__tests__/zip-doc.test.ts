import { beforeAll, describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { inflateSelected, listEntries, listEntriesStreaming } from "../unzip";
import type { RawArchive, ZipEntryMeta } from "../types";

function report(): IngestionReport {
  return {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: { garbage: 0, binary: 0, oversized: 0, unsupported_lang: 0, quota: 0, parse_error: 0 },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };
}

const BOMB_BYTES = 64 * 1024 * 1024;
const MAX_MS = 100;

/** Đặt lại trường `size` trong Central Directory về `fake` để mô phỏng zip khai gian. */
function lieAboutSize(zip: Uint8Array, fake: number): void {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  for (let i = 0; i + 46 < zip.length; i++) {
    if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, fake, true);
  }
}

let bombZip: Uint8Array;
let bombArchive: RawArchive;

beforeAll(() => {
  // File thật bung 64 MB nhưng Central Directory khai 10 KB
  bombZip = fflate.zipSync({
    "repo/package.json": new Uint8Array(BOMB_BYTES),
    "repo/src/bomb.ts": new Uint8Array(BOMB_BYTES),
    "repo/src/ok.ts": fflate.strToU8("export const ok = 1;\n"),
  });
  lieAboutSize(bombZip, 10_000);
  bombArchive = { bytes: bombZip, stream_cut: false, source: "ZIP" };
}, 60000);

function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = performance.now();
  const value = fn();
  return { value, ms: performance.now() - t0 };
}

describe("B-18: chống zip bomb dừng giải nén thật", () => {
  it(`inflateSelected (mục lục): file khai gian size dừng dưới ${MAX_MS}ms, file thường vẫn nhận`, () => {
    const metas = listEntries(bombArchive);
    const rep = report();
    const plan = {
      manifests: metas.filter((m) => m.path.endsWith("package.json")),
      ordered_candidates: metas.filter((m) => m.path.endsWith(".ts")),
    };
    const { value, ms } = timed(() => inflateSelected(bombZip, plan, rep));
    expect(ms).toBeLessThan(MAX_MS);
    expect([...value.code.keys()]).toEqual(["src/ok.ts"]);
    expect(value.manifests.size).toBe(0);
    expect(rep.skipped.oversized).toBeGreaterThanOrEqual(1);
    // Manifest bomb bị bỏ kèm cảnh báo, giống manifest quá lớn
    expect(rep.warnings.some((w) => w.includes("package.json"))).toBe(true);
  });

  it(`listEntriesStreaming: dừng bung từng entry, dưới ${MAX_MS}ms, entry bomb có size vượt trần`, () => {
    const { value, ms } = timed(() => listEntriesStreaming(bombZip, undefined, report()));
    expect(ms).toBeLessThan(MAX_MS);
    const bomb = value.find((e) => e.path === "src/bomb.ts");
    expect(bomb).toBeDefined();
    expect(bomb!.size).toBeGreaterThan(CONFIG.MAX_SINGLE_FILE_BYTES);
    expect(value.find((e) => e.path === "src/ok.ts")?.size).toBe(21);
  });

  it(`chế độ streaming lượt 2 (local_offset null): dừng dưới ${MAX_MS}ms`, () => {
    const metas: ZipEntryMeta[] = listEntriesStreaming(bombZip, undefined, report());
    const rep = report();
    const plan = {
      manifests: metas.filter((m) => m.path.endsWith("package.json")),
      ordered_candidates: metas.filter((m) => m.path.endsWith(".ts")),
    };
    const { value, ms } = timed(() => inflateSelected(bombZip, plan, rep));
    expect(ms).toBeLessThan(MAX_MS);
    expect(value.code.has("src/bomb.ts")).toBe(false);
    expect(value.code.get("src/ok.ts")).toBe("export const ok = 1;\n");
  });

  it("signal đã hủy: listEntriesStreaming không giải nén gì", () => {
    const controller = new AbortController();
    controller.abort();
    const { value, ms } = timed(() => listEntriesStreaming(bombZip, controller.signal, report()));
    expect(ms).toBeLessThan(MAX_MS);
    expect(value).toEqual([]);
  });

  it("zip bình thường vẫn giải nén đúng (không ảnh hưởng file hợp lệ)", () => {
    // Nội dung thật (đủ khác nhau) để tỉ lệ nén ở mức bình thường
    const text =
      Array.from({ length: 800 }, (_, i) => `export const v${i} = ${(i * 7919) % 10007};`).join("\n") +
      "\n";
    const zip = fflate.zipSync({ "r/package.json": fflate.strToU8('{"name":"x"}'), "r/src/a.ts": fflate.strToU8(text) });
    const archive: RawArchive = { bytes: zip, stream_cut: false, source: "ZIP" };
    const metas = listEntries(archive);
    const plan = {
      manifests: metas.filter((m) => m.path.endsWith("package.json")),
      ordered_candidates: metas.filter((m) => m.path.endsWith(".ts")),
    };
    const out = inflateSelected(zip, plan, report());
    expect(out.manifests.get("package.json")).toBe('{"name":"x"}');
    expect(out.code.get("src/a.ts")).toBe(text);
  });
});
