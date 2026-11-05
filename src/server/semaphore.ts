// 03 Mục 6.6 — semaphore ingest trong 1 instance, hàng đợi FIFO; chờ quá INGEST_QUEUE_TIMEOUT_MS ⇒ ERR_SERVER_BUSY.
import { CONFIG } from "@/contracts/config";
import { fail } from "./errors";

class Semaphore {
  private active = 0;
  private waiters: Array<() => void> = [];
  constructor(private max: number) {}
  async acquire(timeoutMs: number): Promise<void> {
    if (this.active < this.max) { this.active++; return; }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { this.waiters = this.waiters.filter((w) => w !== go); reject(new Error("busy")); }, timeoutMs);
      const go = () => { clearTimeout(t); this.active++; resolve(); };
      this.waiters.push(go);
    }).catch(() => fail("ERR_SERVER_BUSY"));
  }
  release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }
}

declare global { var _ingestSem: Semaphore | undefined }
const sem = (globalThis._ingestSem ??= new Semaphore(CONFIG.MAX_CONCURRENT_INGESTIONS));

export async function withIngestSlot<T>(fn: () => Promise<T>): Promise<T> {
  await sem.acquire(CONFIG.INGEST_QUEUE_TIMEOUT_MS);
  try { return await fn(); } finally { sem.release(); }
}
