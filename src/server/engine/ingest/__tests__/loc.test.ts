import { describe, it, expect } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import { receiveUpload } from "../download";
import {
  readCentralDirectory,
  listEntries,
  inflateSelected,
} from "../unzip";
import { classifyEntry, DEFAULT_LANGUAGE_REGISTRY } from "../prune";
import { filePriorityScore, selectFiles } from "../priority";
import { detectScope } from "../fingerprint";
import type { ClassifiedEntry, RawArchive, ZipEntryMeta } from "../types";

function createReport(): IngestionReport {
  return {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: {
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };
}

// ---------------------------------------------------------------------------
// T-ING-12
// ---------------------------------------------------------------------------
describe("T-ING-12", () => {
  it("T-ING-12: Upload 4 718 593 byte (> MAX_UPLOAD_BYTES) ném ERR_STREAM_QUOTA_EXCEEDED không giải nén", async () => {
    const targetBytes = CONFIG.MAX_UPLOAD_BYTES + 1; // 4 718 593 bytes
    const chunkSize = 64 * 1024;
    let sent = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= targetBytes) {
          controller.close();
          return;
        }
        const toSend = Math.min(chunkSize, targetBytes - sent);
        controller.enqueue(new Uint8Array(toSend));
        sent += toSend;
      },
    });

    await expect(
      receiveUpload(
        stream,
        "multipart/form-data; boundary=----WebKitFormBoundaryXYZ"
      )
    ).rejects.toMatchObject({
      code: "ERR_STREAM_QUOTA_EXCEEDED",
    });
  });
});

// ---------------------------------------------------------------------------
// T-ING-13
// ---------------------------------------------------------------------------
describe("T-ING-13", () => {
  it("T-ING-13: 60 .ts client, 60 .ts server => is_monorepo, offset server/, 60 server nạp trước, skipped.quota 20", () => {
    const files: Record<string, Uint8Array> = {
      "client/package.json": fflate.strToU8(JSON.stringify({ name: "client" })),
      "server/package.json": fflate.strToU8(JSON.stringify({ name: "server" })),
    };

    for (let i = 0; i < 60; i++) {
      files[`client/src/file_${i}.ts`] = fflate.strToU8(
        `export const client_${i} = ${i};`
      );
      files[`server/src/file_${i}.ts`] = fflate.strToU8(
        `export const server_${i} = ${i};`
      );
    }

    const zipBytes = fflate.zipSync(files);
    const report = createReport();

    const archive: RawArchive = {
      bytes: zipBytes,
      stream_cut: false,
      source: "ZIP",
    };

    const entries = listEntries(archive, undefined, report);
    const classified: ClassifiedEntry[] = entries.map((e) => {
      const { cls, language } = classifyEntry(e, DEFAULT_LANGUAGE_REGISTRY, report);
      return { ...e, cls, language };
    });

    const scope = detectScope(classified, null, report);
    expect(scope.is_monorepo).toBe(true);
    expect(scope.root_dir_offset).toBe("server/");

    const plan = selectFiles(classified, scope, report);
    const { code } = inflateSelected(zipBytes, plan, report);

    // MAX_CLEAN_FILES = 100
    expect(code.size).toBe(CONFIG.MAX_CLEAN_FILES);
    expect(report.skipped.quota).toBe(20);

    // 60 file server phải nạp đủ
    for (let i = 0; i < 60; i++) {
      expect(code.has(`server/src/file_${i}.ts`)).toBe(true);
    }

    // 40 file client được nạp, 20 file client bị bỏ qua
    let clientLoaded = 0;
    for (let i = 0; i < 60; i++) {
      if (code.has(`client/src/file_${i}.ts`)) {
        clientLoaded++;
      }
    }
    expect(clientLoaded).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// T-ING-14
// ---------------------------------------------------------------------------
describe("T-ING-14", () => {
  it("T-ING-14: services/order/ 40 KB, services/user/ 60 KB có manifest => offset services/user/, is_monorepo, warning nêu services/order/", () => {
    const report = createReport();

    const classified: ClassifiedEntry[] = [
      {
        path: "services/order/package.json",
        compressed_size: 100,
        size: 150,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "MANIFEST",
        language: null,
      },
      {
        path: "services/order/src/index.ts",
        compressed_size: 10000,
        size: 40 * 1024,
        method: 8,
        local_offset: 200,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
      {
        path: "services/user/package.json",
        compressed_size: 100,
        size: 150,
        method: 8,
        local_offset: 500,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "MANIFEST",
        language: null,
      },
      {
        path: "services/user/src/index.ts",
        compressed_size: 15000,
        size: 60 * 1024,
        method: 8,
        local_offset: 800,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
    ];

    const scope = detectScope(classified, null, report);
    expect(scope.root_dir_offset).toBe("services/user/");
    expect(scope.is_monorepo).toBe(true);

    expect(report.warnings.length).toBe(1);
    expect(report.warnings[0]).toContain("services/order/");
    expect(report.warnings[0]).toContain("services/user/");
  });
});

// ---------------------------------------------------------------------------
// T-ING-15
// ---------------------------------------------------------------------------
describe("T-ING-15", () => {
  it("T-ING-15: Chỉ backend/ 80% byte => backend/, is_monorepo false", () => {
    const classified: ClassifiedEntry[] = [
      {
        path: "backend/index.ts",
        compressed_size: 200,
        size: 800,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
      {
        path: "lib/util.ts",
        compressed_size: 100,
        size: 200,
        method: 8,
        local_offset: 400,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
    ];

    const scope = detectScope(classified, null);
    expect(scope.root_dir_offset).toBe("backend/");
    expect(scope.is_monorepo).toBe(false);
  });

  it("T-ING-15: Chỉ backend/ 60% byte => offset rỗng, is_monorepo false", () => {
    const classified: ClassifiedEntry[] = [
      {
        path: "backend/index.ts",
        compressed_size: 200,
        size: 600,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
      {
        path: "lib/util.ts",
        compressed_size: 150,
        size: 400,
        method: 8,
        local_offset: 400,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
    ];

    const scope = detectScope(classified, null);
    expect(scope.root_dir_offset).toBe("");
    expect(scope.is_monorepo).toBe(false);
  });

  it("T-ING-15: api-docs/x.ts không là ứng viên server", () => {
    const classified: ClassifiedEntry[] = [
      {
        path: "api-docs/x.ts",
        compressed_size: 100,
        size: 200,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
        cls: "CODE",
        language: "TYPESCRIPT",
      },
    ];

    const scope = detectScope(classified, null);
    expect(scope.candidates).not.toContain("api-docs/");
    expect(scope.root_dir_offset).toBe("");
  });
});

// ---------------------------------------------------------------------------
// T-ING-16
// ---------------------------------------------------------------------------
describe("T-ING-16", () => {
  it("T-ING-16: Điểm FPS với scope server/ cho 4 file mẫu", () => {
    const scope = "server/";

    // 1. server/src/controllers/order.controller.ts (500 B) => 5.25
    const fps1 = filePriorityScore(
      "server/src/controllers/order.controller.ts",
      500,
      scope
    );
    expect(fps1).toBeCloseTo(5.25, 4);

    // 2. client/src/App.tsx (500 B) => 2.3333
    const fps2 = filePriorityScore("client/src/App.tsx", 500, scope);
    expect(fps2).toBeCloseTo(2.3333, 4);

    // 3. server/tests/order.test.ts (500 B) => 1.3333
    const fps3 = filePriorityScore("server/tests/order.test.ts", 500, scope);
    expect(fps3).toBeCloseTo(1.3333, 4);

    // 4. index.ts gốc (100 B) => 2
    const fps4 = filePriorityScore("index.ts", 100, scope);
    expect(fps4).toBeCloseTo(2, 4);
  });
});

// ---------------------------------------------------------------------------
// T-ING-17
// ---------------------------------------------------------------------------
describe("T-ING-17", () => {
  it("T-ING-17: Phân loại 9 entry mẫu, giữ 3 file đầu, còn lại GARBAGE", () => {
    const report = createReport();

    const sampleEntries: ZipEntryMeta[] = [
      {
        path: "src/distance.ts",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "lib/builder.ts",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "bin/cli.js",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "dist/a.js",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "node_modules/x/i.js",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "a.min.js",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "types.d.ts",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "bin/Debug/app.dll",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: false,
        is_encrypted: false,
      },
      {
        path: "link_file.ts",
        compressed_size: 50,
        size: 100,
        method: 8,
        local_offset: 0,
        is_dir: false,
        is_symlink: true,
        is_encrypted: false,
      },
    ];

    const results = sampleEntries.map((e) =>
      classifyEntry(e, DEFAULT_LANGUAGE_REGISTRY, report)
    );

    expect(results[0].cls).toBe("CODE");
    expect(results[1].cls).toBe("CODE");
    expect(results[2].cls).toBe("CODE");
    expect(results[3].cls).toBe("GARBAGE");
    expect(results[4].cls).toBe("GARBAGE");
    expect(results[5].cls).toBe("GARBAGE");
    expect(results[6].cls).toBe("GARBAGE");
    expect(results[7].cls).toBe("GARBAGE");
    expect(results[8].cls).toBe("GARBAGE");
  });
});

// ---------------------------------------------------------------------------
// T-ING-18
// ---------------------------------------------------------------------------
describe("T-ING-18", () => {
  it("T-ING-18: Upload src/a.ts + README.md và GitHub b-main/src/a.ts + b-main/README.md đều chuẩn hóa ra src/a.ts", () => {
    // 1. Upload
    const uploadZip = fflate.zipSync({
      "src/a.ts": fflate.strToU8("export const a = 1;"),
      "README.md": fflate.strToU8("# Readme"),
    });

    const entriesUpload = readCentralDirectory(uploadZip);
    expect(entriesUpload).not.toBeNull();
    const pathsUpload = entriesUpload!.map((e) => e.path);
    expect(pathsUpload).toContain("src/a.ts");
    expect(pathsUpload).toContain("README.md");

    // 2. GitHub b-main/
    const githubZip = fflate.zipSync({
      "b-main/src/a.ts": fflate.strToU8("export const a = 1;"),
      "b-main/README.md": fflate.strToU8("# Readme"),
    });

    const entriesGithub = readCentralDirectory(githubZip);
    expect(entriesGithub).not.toBeNull();
    const pathsGithub = entriesGithub!.map((e) => e.path);
    expect(pathsGithub).toContain("src/a.ts");
    expect(pathsGithub).toContain("README.md");
  });
});

// ---------------------------------------------------------------------------
// T-ING-19
// ---------------------------------------------------------------------------
describe("T-ING-19", () => {
  it("T-ING-19: Loại bỏ ../../etc/x.ts, a/../../x.ts và tên non-UTF8 không cờ bit 11", () => {
    const report = createReport();

    // Dựng zip có path traversal
    const zipBytes = fflate.zipSync({
      "../../etc/x.ts": fflate.strToU8("code"),
      "a/../../x.ts": fflate.strToU8("code"),
      "valid.ts": fflate.strToU8("code"),
    });

    const entries = readCentralDirectory(zipBytes, report);
    expect(entries).not.toBeNull();
    const paths = entries!.map((e) => e.path);
    expect(paths).not.toContain("../../etc/x.ts");
    expect(paths).not.toContain("../x.ts");
    expect(paths).toContain("valid.ts");

    // Dựng thủ công một zip CD entry có bit 11 tắt và chứa byte non-ASCII (>= 0x80)
    // Tên file 5 bytes: [0xfe, 0x61, 0x2e, 0x74, 0x73]
    const nonUtf8Name = new Uint8Array([0xfe, 0x61, 0x2e, 0x74, 0x73]);
    const fileContent = fflate.strToU8("content");

    // Local file header: 30 + 5 + 7 = 42 bytes
    const localHeader = new Uint8Array(30 + 5 + fileContent.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true); // bit 11 = 0
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(18, fileContent.length, true);
    lv.setUint32(22, fileContent.length, true);
    lv.setUint16(26, nonUtf8Name.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nonUtf8Name, 30);
    localHeader.set(fileContent, 35);

    // Central directory header: 46 + 5 = 51 bytes
    const cdHeader = new Uint8Array(46 + 5);
    const cv = new DataView(cdHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); // bit 11 = 0
    cv.setUint16(10, 0, true);
    cv.setUint32(20, fileContent.length, true);
    cv.setUint32(24, fileContent.length, true);
    cv.setUint16(28, nonUtf8Name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, 0, true); // local header offset = 0
    cdHeader.set(nonUtf8Name, 46);

    // EOCD: 22 bytes
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, cdHeader.length, true);
    ev.setUint32(16, localHeader.length, true); // CD offset

    const totalZip = new Uint8Array(localHeader.length + cdHeader.length + eocd.length);
    totalZip.set(localHeader, 0);
    totalZip.set(cdHeader, localHeader.length);
    totalZip.set(eocd, localHeader.length + cdHeader.length);

    const nonUtf8Report = createReport();
    const nonUtf8Entries = readCentralDirectory(totalZip, nonUtf8Report);
    expect(nonUtf8Entries).not.toBeNull();
    expect(nonUtf8Entries!.length).toBe(0);
    expect(nonUtf8Report.skipped.binary).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-ING-20
// ---------------------------------------------------------------------------
describe("T-ING-20", () => {
  it("T-ING-20: Tỷ lệ nén vượt 100 bị oversized trước giải nén", () => {
    const report = createReport();

    // File khai báo 10 KB (10240 B), nén 50 B => ratio = 204.8 > 100
    const fakeEntry: ClassifiedEntry = {
      path: "src/bomb.ts",
      compressed_size: 50,
      size: 10240,
      method: 8,
      local_offset: 0,
      is_dir: false,
      is_symlink: false,
      is_encrypted: false,
      cls: "CODE",
      language: "TYPESCRIPT",
    };

    const scope = {
      root_dir_offset: "",
      is_monorepo: false,
      candidates: [],
      explicit: false,
    };

    const plan = selectFiles([fakeEntry], scope, report);
    expect(plan.ordered_candidates.length).toBe(0);
    expect(report.skipped.oversized).toBe(1);
  });

  it("T-ING-20: Giải nén thật 1.5 MB dù khai báo 10 KB => dừng ở 1 MB, oversized", () => {
    const report = createReport();

    // 1.5 MB data
    const rawData = new Uint8Array(Math.floor(1.5 * 1024 * 1024));
    rawData.fill(0x61); // 'a'
    const deflated = fflate.deflateSync(rawData);

    const filename = fflate.strToU8("src/big.ts");

    // Dựng Local Header với uncompressed size khai báo là 10240
    const localHdr = new Uint8Array(30 + filename.length + deflated.length);
    const lv = new DataView(localHdr.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8
    lv.setUint16(8, 8, true); // deflate
    lv.setUint32(18, deflated.length, true);
    lv.setUint32(22, 10240, true); // Khai báo 10 KB
    lv.setUint16(26, filename.length, true);
    lv.setUint16(28, 0, true);
    localHdr.set(filename, 30);
    localHdr.set(deflated, 30 + filename.length);

    // Central Directory Header
    const cdHdr = new Uint8Array(46 + filename.length);
    const cv = new DataView(cdHdr.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, deflated.length, true);
    cv.setUint32(24, 10240, true); // Khai báo 10 KB
    cv.setUint16(28, filename.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, 0, true);
    cdHdr.set(filename, 46);

    // EOCD
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, cdHdr.length, true);
    ev.setUint32(16, localHdr.length, true);

    const zipBytes = new Uint8Array(localHdr.length + cdHdr.length + eocd.length);
    zipBytes.set(localHdr, 0);
    zipBytes.set(cdHdr, localHdr.length);
    zipBytes.set(eocd, localHdr.length + cdHdr.length);

    const archive: RawArchive = {
      bytes: zipBytes,
      stream_cut: false,
      source: "ZIP",
    };

    const entries = listEntries(archive, undefined, report);
    const classified: ClassifiedEntry[] = entries.map((e) => ({
      ...e,
      cls: "CODE",
      language: "TYPESCRIPT",
    }));

    const scope = {
      root_dir_offset: "",
      is_monorepo: false,
      candidates: [],
      explicit: false,
    };

    const plan = selectFiles(classified, scope, report);
    expect(plan.ordered_candidates.length).toBe(1);

    const { code } = inflateSelected(zipBytes, plan, report);
    expect(code.size).toBe(0);
    expect(report.skipped.oversized).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-ING-21
// ---------------------------------------------------------------------------
function generateDeterministicHexContent(
  targetBytes: number,
  seed: number
): Uint8Array {
  let state = seed >>> 0;
  const chunks: string[] = [];
  let currentBytes = 0;
  while (currentBytes < targetBytes) {
    let line = "// ";
    for (let j = 0; j < 16; j++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      line += state.toString(16).padStart(8, "0");
    }
    line += "\n";
    chunks.push(line);
    currentBytes += line.length;
  }
  return fflate.strToU8(chunks.join(""));
}

describe("T-ING-21", () => {
  it("T-ING-21: 30 ứng viên x 400 KB => Nhận 20 file, inflated_cap_hit, truncated", () => {
    const report = createReport();
    const files: Record<string, Uint8Array> = {};

    // Mỗi file ~400 KB sinh bằng LCG tất định, dòng ngắn < MAX_LINE_LENGTH
    const sample400KB = generateDeterministicHexContent(400 * 1024, 12345);

    for (let i = 0; i < 30; i++) {
      files[`src/file_${i}.ts`] = sample400KB;
    }

    const zipBytes = fflate.zipSync(files);
    const archive: RawArchive = {
      bytes: zipBytes,
      stream_cut: false,
      source: "ZIP",
    };

    const entries = listEntries(archive, undefined, report);
    const classified: ClassifiedEntry[] = entries.map((e) => ({
      ...e,
      cls: "CODE",
      language: "TYPESCRIPT",
    }));

    const scope = {
      root_dir_offset: "",
      is_monorepo: false,
      candidates: [],
      explicit: false,
    };

    const plan = selectFiles(classified, scope, report);
    expect(plan.ordered_candidates.length).toBe(30);

    const { code, inflated_cap_hit } = inflateSelected(
      zipBytes,
      plan,
      report
    );

    // 20 file x ~400 KB = ~8 MB = MAX_INFLATED_BYTES
    expect(code.size).toBe(20);
    expect(inflated_cap_hit).toBe(true);
    expect(report.truncated).toBe(true);
    expect(report.warnings.length).toBeGreaterThanOrEqual(1);
    expect(report.warnings[0]).toContain("Repository lớn");
  });
});
