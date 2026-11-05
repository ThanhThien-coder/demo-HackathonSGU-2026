import { CONFIG } from "@/contracts/config";
import type { IngestResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { fail, handle } from "@/server/errors";
import { readJson, str } from "@/server/http";
import { ingestFromSession, ingestFromUrl, ingestFromZip } from "@/server/ingestService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => handle<IngestResponse>(async () => {
  const u = await requireUser(req);
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > CONFIG.MAX_UPLOAD_BYTES + 64 * 1024) return fail("ERR_STREAM_QUOTA_EXCEEDED");
    const form = await req.formData().catch(() => fail("ERR_UPLOAD_INVALID"));
    const file = form.get("archive");
    if (!(file instanceof File)) return fail("ERR_UPLOAD_INVALID");
    if (file.size > CONFIG.MAX_UPLOAD_BYTES) return fail("ERR_STREAM_QUOTA_EXCEEDED");
    const sub = str(form.get("subdir"));
    return ingestFromZip(u.userId, u.displayName, file.name || "upload.zip", new Uint8Array(await file.arrayBuffer()), sub || null);
  }
  const b = await readJson(req);
  if (typeof b.session_id === "string") return ingestFromSession(u.userId, b.session_id, b.restart === true);
  const url = str(b.repo_url);
  if (!url.trim()) return fail("ERR_INVALID_GITHUB_URL");
  return ingestFromUrl(u.userId, u.displayName, url, str(b.subdir_override) || null);
});
