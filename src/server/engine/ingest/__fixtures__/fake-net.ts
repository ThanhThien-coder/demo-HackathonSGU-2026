// Mạng giả cho test Tầng 0: thay `fetch` toàn cục bằng bộ định tuyến theo "METHOD url"; ghi lại mọi cuộc gọi.
import { vi } from "vitest";

export interface Call { url: string; method: string; headers: Record<string, string> }
export type Route = (m: RegExpExecArray, call: Call, init: RequestInit) => Response | Promise<Response>;

export function fakeNet(routes: Array<[RegExp, Route]>): { calls: Call[] } {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const call: Call = { url, method: init.method ?? "GET", headers: { ...(init.headers as Record<string, string> | undefined) } };
    calls.push(call);
    for (const [re, route] of routes) {
      const m = re.exec(`${call.method} ${url}`);
      if (m) return route(m, call, init);
    }
    throw new Error(`fakeNet: không có route cho ${call.method} ${url}`);
  });
  return { calls };
}

export const text = (body: string, status = 200): Response => new Response(body, { status });
export const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
export const status = (s: number, headers?: Record<string, string>): Response => new Response(null, { status: s, headers });

/** Treo cho tới khi bị abort (mô phỏng hết giờ). */
export function hang(init: RequestInit): Promise<Response> {
  return new Promise<Response>((_, reject) => {
    const s = init.signal;
    const abort = () => reject(new DOMException("aborted", "AbortError"));
    if (s?.aborted) return abort();
    s?.addEventListener("abort", abort, { once: true });
  });
}

/** Thân phản hồi theo từng chunk `chunk` byte (mặc định 1 chunk duy nhất). */
export function bodyResponse(bytes: Uint8Array, chunk = bytes.length): Response {
  let off = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(ctl) {
      if (off >= bytes.length) { ctl.close(); return; }
      ctl.enqueue(bytes.subarray(off, off + chunk));
      off += chunk;
    },
  });
  return new Response(body, { status: 200 });
}

/** Chạy tới khi promise xong khi đang dùng fake timers (tiến thời gian từng 500 ms, có chốt chặn). */
export async function settle<T>(p: Promise<T>): Promise<{ ok: T } | { err: unknown }> {
  let done = false;
  const r = p.then((ok) => ({ ok }), (err: unknown) => ({ err })).finally(() => { done = true; });
  for (let i = 0; !done; i++) {
    if (i > 200) throw new Error("settle: promise không kết thúc");
    await vi.advanceTimersByTimeAsync(500);
  }
  return r;
}
