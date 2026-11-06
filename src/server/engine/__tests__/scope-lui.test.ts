import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fflate from "fflate";
import type { IngestOutput } from "@/contracts";
import { IngestionError } from "../ingest";

vi.mock("../graph", () => ({ buildGraph: vi.fn() }));

import { buildGraph } from "../graph";
import { runEngine } from "../index";

const enc = fflate.strToU8;

// Hai server (api/, backend/) và một client (web/), đều có code
function monorepoZip(): Uint8Array {
  return fflate.zipSync({
    "package.json": enc("{}"),
    "backend/package.json": enc("{}"),
    "backend/src/a.ts": enc("export const a = 1;\n".repeat(50)),
    "api/package.json": enc("{}"),
    "api/src/b.ts": enc("export const b = 1;\n".repeat(20)),
    "web/package.json": enc("{}"),
    "web/src/c.ts": enc("export const c = 1;\n".repeat(10)),
  });
}

const upload = (subdir: string | null) =>
  ({ kind: "ZIP_UPLOAD", file_name: "m.zip", bytes: monorepoZip(), subdir_override: subdir }) as const;

const noSlice = () => new IngestionError("ERR_NO_ARCHITECTURAL_SLICE", "không có lát cắt");

describe("B-17: runEngine lùi sang ứng viên kế tiếp", () => {
  beforeEach(() => {
    vi.mocked(buildGraph).mockReset();
  });

  it("B-17: lỗi không có lát cắt => thử api/, web/, cuối cùng rỗng; dừng ở lần dựng được", async () => {
    const tried: string[] = [];
    vi.mocked(buildGraph).mockImplementation(async (input: IngestOutput) => {
      tried.push(input.fingerprint.root_dir_offset);
      if (input.fingerprint.root_dir_offset === "") return { ok: true } as never;
      throw noSlice();
    });

    const res = await runEngine(upload(null));
    expect(res).toEqual({ ok: true });
    expect(tried).toEqual(["backend/", "api/", "web/", ""]);
  });

  it("B-17: mọi ứng viên đều lỗi => giữ lỗi đầu tiên", async () => {
    vi.mocked(buildGraph).mockImplementation(async () => {
      throw noSlice();
    });
    await expect(runEngine(upload(null))).rejects.toMatchObject({
      code: "ERR_NO_ARCHITECTURAL_SLICE",
    });
    expect(vi.mocked(buildGraph)).toHaveBeenCalledTimes(4);
  });

  it("B-17: scope tường minh => không lùi", async () => {
    vi.mocked(buildGraph).mockImplementation(async () => {
      throw noSlice();
    });
    await expect(runEngine(upload("api/"))).rejects.toMatchObject({
      code: "ERR_NO_ARCHITECTURAL_SLICE",
    });
    expect(vi.mocked(buildGraph)).toHaveBeenCalledTimes(1);
  });

  it("B-17: lỗi khác không bị nuốt, không lùi", async () => {
    vi.mocked(buildGraph).mockRejectedValue(new Error("boom"));
    await expect(runEngine(upload(null))).rejects.toThrow("boom");
    expect(vi.mocked(buildGraph)).toHaveBeenCalledTimes(1);
  });
});
