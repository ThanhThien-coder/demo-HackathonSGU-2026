// 10 Mục 6–9, 13: đường dẫn trong zip, scope monorepo, quota file / trần byte, upload (T-ING-12/13/18/19/21).
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { CONFIG } from "@/contracts/config";
import { processArchive, runIngest } from "./index";

const zctx = { repo_name: "x", repo_key: "x", source: "ZIP" as const, ref: null, ref_label: null, explicit_subdir: null };
/** level 0: tỉ lệ nén = 1, không vướng ING-88 (nén bất thường) khi dựng file lớn lặp lại. */
const zip = (files: Record<string, string>): Uint8Array =>
  zipSync(Object.fromEntries(Object.entries(files).map(([p, c]) => [p, strToU8(c)])), { level: 0 });
const tiny = (name: string, i: number) => `export const ${name}${i} = ${i};\n`;

describe("Quota & phạm vi (Mục 8–9)", () => {
  it("T-ING-13: 60 file client + 60 file server (mỗi thư mục có package.json) ⇒ monorepo, server nạp trước, skipped.quota 20", () => {
    const files: Record<string, string> = {
      "client/package.json": '{"dependencies":{"react-dom":"18.0.0"}}',
      "server/package.json": '{"dependencies":{"express":"4.18.0"}}',
    };
    for (let i = 0; i < 60; i++) { files[`client/src/c${i}.ts`] = tiny("c", i); files[`server/src/s${i}.ts`] = tiny("s", i); }
    const out = processArchive(zip(files), zctx);
    expect(out.fingerprint).toMatchObject({ is_monorepo: true, root_dir_offset: "server/" });
    const keys = [...out.code.keys()];
    expect(keys.filter((p) => p.startsWith("server/"))).toHaveLength(60);
    expect(keys.filter((p) => p.startsWith("client/"))).toHaveLength(CONFIG.MAX_CLEAN_FILES - 60);
    expect(out.report.skipped.quota).toBe(20);
    expect(out.report.truncated).toBe(true);
  });

  it("T-ING-21: 30 ứng viên × ~400 KB ⇒ nhận 20 file, chạm trần byte (dừng hẳn), truncated", () => {
    const body = "const x = 1;\n".repeat(30770); // 400 010 byte, dòng ngắn nên không bị coi là minified
    const files: Record<string, string> = {};
    for (let i = 0; i < 30; i++) files[`src/f${String(i).padStart(2, "0")}.ts`] = body;
    const out = processArchive(zip(files), zctx);
    expect(out.code.size).toBe(20);
    expect(out.report.truncated).toBe(true);
    expect(out.report.skipped.quota).toBe(10); // 10 ứng viên chưa xét khi dừng
    expect(out.report.warnings).toContain("Repository lớn — chỉ phân tích 20 tệp mã nguồn được ưu tiên.");
  });
});

describe("Đường dẫn trong zip (ING-60)", () => {
  it("T-ING-18: upload không có segment đầu chung giữ nguyên; zip GitHub cắt segment <repo>-<ref>/ ⇒ cùng ra src/a.ts", () => {
    const upload = processArchive(zip({ "src/a.ts": tiny("a", 1), "README.md": "# x\n" }), zctx);
    const github = processArchive(zip({ "b-main/src/a.ts": tiny("a", 1), "b-main/README.md": "# x\n" }), {
      ...zctx, source: "GITHUB", repo_key: "o/b", ref: "0123456789abcdef0123456789abcdef01234567",
    });
    expect([...upload.code.keys()]).toEqual(["src/a.ts"]);
    expect([...github.code.keys()]).toEqual(["src/a.ts"]);
  });

  it("T-ING-19: đường dẫn thoát khỏi gốc (../..) bị loại", () => {
    const out = processArchive(zip({ "src/ok.ts": tiny("ok", 1), "../../etc/x.ts": tiny("x", 1), "a/../../y.ts": tiny("y", 1) }), zctx);
    expect([...out.code.keys()]).toEqual(["src/ok.ts"]);
  });
});

describe("Upload (ING-45)", () => {
  const upload = (bytes: Uint8Array) => ({ kind: "ZIP_UPLOAD" as const, file_name: "big.zip", bytes, subdir_override: null });

  it("T-ING-12: vượt MAX_UPLOAD_BYTES (4 718 593 byte) ⇒ ERR_STREAM_QUOTA_EXCEEDED, không giải nén", async () => {
    const bytes = new Uint8Array(CONFIG.MAX_UPLOAD_BYTES + 1);
    bytes.set([0x50, 0x4b, 3, 4]);
    expect(bytes.length).toBe(4_718_593);
    await expect(runIngest(upload(bytes))).rejects.toMatchObject({ code: "ERR_STREAM_QUOTA_EXCEEDED" });
  });

  it("4 byte đầu không phải chữ ký zip ⇒ ERR_UPLOAD_INVALID", async () => {
    await expect(runIngest(upload(strToU8("không phải zip")))).rejects.toMatchObject({ code: "ERR_UPLOAD_INVALID" });
  });

  it("repo_name = tên file bỏ .zip; snapshot theo mã băm", async () => {
    const out = await runIngest({ ...upload(zip({ "src/a.ts": tiny("a", 1), "README.md": "# x\n" })), file_name: "demo.zip" });
    expect(out.repo_name).toBe("demo");
    expect(out.snapshot).toMatchObject({ source: "ZIP", repo_key: "demo.zip", snapshot_id_kind: "ARCHIVE_HASH", subdir: "" });
  });
});
