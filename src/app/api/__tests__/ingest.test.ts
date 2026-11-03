import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type IngestResponse,
  type StaticEngineResult,
} from "@/contracts";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { IngestionError } from "@/server/engine/ingest/types";
import { clearEngineCache } from "@/server/cache";
import {
  ingestionSemaphore,
  type SessionRecord,
} from "@/server/session";
import { POST } from "../ingest/route";

const { mockGetUser, mockSql, mockRunEngine } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = vi.fn();
  const runEngineFn = vi.fn();
  return { mockGetUser: getUser, mockSql: sqlFn, mockRunEngine: runEngineFn };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock("@/server/db", () => ({
  sql: mockSql,
  db: {
    sql: mockSql,
    tx: (cb: (tx: unknown) => unknown) => cb(mockSql),
  },
}));

vi.mock("@/server/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/engine")>();
  return {
    ...actual,
    runEngine: mockRunEngine,
  };
});

const typedShopApi = shopApiFixture as unknown as StaticEngineResult;

const mockSessionRecord: SessionRecord = {
  id: "session-test-uuid-1",
  user_id: "user-test-123",
  source: "GITHUB",
  repo_key: typedShopApi.snapshot.repo_key,
  snapshot_id: typedShopApi.snapshot.snapshot_id,
  snapshot_id_kind: "COMMIT_SHA",
  subdir: typedShopApi.snapshot.subdir,
  ref_label: typedShopApi.snapshot.ref_label,
  repo_name: typedShopApi.repo_name,
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 0,
  created_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
  graph_skeleton: typedShopApi.nodes.map((n) => ({
    node_id: n.id,
    title: n.title,
    prerequisites: n.prerequisites,
    is_capstone: n.is_capstone,
  })),
};

function createMockRequest(
  body: Record<string, unknown> | null,
  options?: {
    token?: string;
    isFormData?: boolean;
    formData?: FormData;
  }
): Request {
  const headers = new Headers();
  if (options?.token !== undefined) {
    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }
  } else {
    headers.set("Authorization", "Bearer valid-test-token");
  }

  if (options?.isFormData && options.formData) {
    return new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers,
      body: options.formData,
    });
  }

  headers.set("Content-Type", "application/json");
  return new Request("http://localhost:3000/api/ingest", {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : "",
  });
}

describe("POST /api/ingest (TASK_07 — A06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();
    ingestionSemaphore.reset();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-test-123",
          email: "learner@test.com",
        },
      },
      error: null,
    });

    mockRunEngine.mockResolvedValue(typedShopApi);

    mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

      if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
        return [mockSessionRecord];
      }

      if (query.includes("INSERT INTO learning_sessions")) {
        return [mockSessionRecord];
      }

      if (query.includes("FROM session_snapshots")) {
        return [{ result: typedShopApi }];
      }

      if (query.includes("FROM node_progress")) {
        return [];
      }

      if (query.includes("FROM node_runs")) {
        return [];
      }

      if (query.includes("FROM ai_cache")) {
        return [];
      }

      if (query.includes("UPDATE learning_sessions")) {
        return [];
      }

      if (query.includes("INSERT INTO session_snapshots")) {
        return [];
      }

      if (query.includes("FROM learning_sessions") && query.includes("source =")) {
        // Tim phien trung khoa: mac dinh chua co phien
        return [];
      }

      return [];
    });
  });

  describe("1. Xác thực (API-04)", () => {
    it("trả HTTP 401 ERR_UNAUTHENTICATED khi thiếu header Authorization", async () => {
      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" }, { token: "" });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });

    it("trả HTTP 401 ERR_UNAUTHENTICATED khi token Supabase không hợp lệ", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" }, { token: "bad-token" });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });
  });

  describe("2. B1 — Ingest link GitHub", () => {
    it("chạy runEngine thành công, ghi CSDL và trả IngestResponse (HTTP 200)", async () => {
      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();

      expect(json.session_id).toBe("session-test-uuid-1");
      expect(json.resumed).toBe(false);
      expect(json.from_cache).toBe(false);
      expect(json.result).toBeDefined();
      expect(json.result.nodes.length).toBeGreaterThanOrEqual(1);
      expect(json.progress).toBeDefined();
      expect(json.progress.session_id).toBe("session-test-uuid-1");

      // API-03: Khong lo cac truong noi bo
      expect((json.result as unknown as Record<string, unknown>).symbol_whitelist).toBeUndefined();
      expect(
        (json.result.ingestion_report as unknown as Record<string, unknown>).suspicious_instruction_files
      ).toBeUndefined();

      expect(mockRunEngine).toHaveBeenCalledWith(
        {
          kind: "GITHUB_URL",
          repo_url: "https://github.com/simplifey/shop-api",
          subdir_override: null,
        },
        expect.anything()
      );
    });

    it("trùng khóa phiên thì mở lại phiên đã có và trả kết quả ĐÃ LƯU của phiên đó (resumed = true, from_cache = true)", async () => {
      // Ket qua da luu khac ket qua engine vua chay => phai tra ban da luu (03 Muc 6.6)
      const storedResult: StaticEngineResult = { ...typedShopApi, repo_name: "ban-da-luu" };
      let insertedSnapshot = false;

      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

        if (query.includes("INSERT INTO")) {
          insertedSnapshot = true;
          return [mockSessionRecord];
        }

        if (query.includes("FROM session_snapshots")) {
          return [{ result: storedResult }];
        }

        if (query.includes("FROM learning_sessions") && query.includes("source =")) {
          // Co phien trung khoa
          return [mockSessionRecord];
        }

        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return [mockSessionRecord];
        }

        if (query.includes("FROM node_progress") || query.includes("FROM node_runs") || query.includes("FROM ai_cache")) {
          return [];
        }

        if (query.includes("UPDATE learning_sessions")) {
          return [];
        }

        return [];
      });

      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();
      expect(json.session_id).toBe("session-test-uuid-1");
      expect(json.resumed).toBe(true);
      expect(json.from_cache).toBe(true);
      expect(json.result.repo_name).toBe("ban-da-luu");
      expect(insertedSnapshot).toBe(false);
    });

    it("trả analyses rỗng khi chưa có toAnalysisView (C06) — không gửi NodeAnalysis thô cho client", async () => {
      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();
      expect(json.analyses).toEqual({});
    });

    it("truyền subdir_override thành công", async () => {
      const req = createMockRequest({
        repo_url: "https://github.com/simplifey/shop-api",
        subdir_override: "packages/backend",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockRunEngine).toHaveBeenCalledWith(
        {
          kind: "GITHUB_URL",
          repo_url: "https://github.com/simplifey/shop-api",
          subdir_override: "packages/backend",
        },
        expect.anything()
      );
    });

    it("body không hợp lệ hoặc thiếu repo_url trả HTTP 400 ERR_INVALID_GITHUB_URL", async () => {
      const req = createMockRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_INVALID_GITHUB_URL");
    });
  });

  describe("3. B2 — Mở lại phiên { session_id } & restart (D-42)", () => {
    it("mở lại phiên cũ không restart: đọc từ snapshot CSDL, resumed=true, không gọi runEngine", async () => {
      const req = createMockRequest({ session_id: "session-test-uuid-1" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();

      expect(json.session_id).toBe("session-test-uuid-1");
      expect(json.resumed).toBe(true);
      expect(json.from_cache).toBe(true);
      expect(json.result).toBeDefined();

      // Tieu chi quan trong: khong chay lai engine
      expect(mockRunEngine).not.toHaveBeenCalled();
    });

    it("mở lại phiên với restart: true (D-42) tạo phiên mới cùng snapshot, resumed=false, không gọi runEngine", async () => {
      const newSessionRecord: SessionRecord = {
        ...mockSessionRecord,
        id: "restarted-new-session-uuid-2",
      };

      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

        if (query.includes("INSERT INTO learning_sessions")) {
          return [newSessionRecord];
        }

        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return [mockSessionRecord];
        }

        if (query.includes("FROM session_snapshots")) {
          return [{ result: typedShopApi }];
        }

        if (query.includes("FROM node_progress") || query.includes("FROM node_runs") || query.includes("FROM ai_cache")) {
          return [];
        }

        return [];
      });

      const req = createMockRequest({ session_id: "session-test-uuid-1", restart: true });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();

      expect(json.session_id).toBe("restarted-new-session-uuid-2");
      expect(json.resumed).toBe(false);
      expect(json.from_cache).toBe(true);
      expect(mockRunEngine).not.toHaveBeenCalled();
    });

    it("mở lại phiên khác engine_version trả HTTP 410 ERR_SESSION_ENGINE_OUTDATED", async () => {
      const outdatedSession: SessionRecord = {
        ...mockSessionRecord,
        engine_version: "1.0.0", // Khac CONFIG.ENGINE_VERSION
      };

      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);
        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return [outdatedSession];
        }
        return [];
      });

      const req = createMockRequest({ session_id: "session-test-uuid-1" });
      const res = await POST(req);

      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_ENGINE_OUTDATED");
    });

    it("phiên không thuộc user_id trả HTTP 404 ERR_SESSION_NOT_FOUND (API-05)", async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);
        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return []; // Khong tim thay
        }
        return [];
      });

      const req = createMockRequest({ session_id: "non-existent-session" });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });
  });

  describe("4. B3 — Upload file .zip qua multipart/form-data (D-27)", () => {
    it("upload file .zip hợp lệ chạy runEngine và tạo phiên thành công (HTTP 200)", async () => {
      const formData = new FormData();
      const file = new File([new Uint8Array([80, 75, 3, 4])], "test-repo.zip", {
        type: "application/zip",
      });
      formData.append("archive", file);
      formData.append("subdir", "backend");

      const req = createMockRequest(null, { isFormData: true, formData });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: IngestResponse = await res.json();
      expect(json.session_id).toBe("session-test-uuid-1");

      expect(mockRunEngine).toHaveBeenCalledWith(
        {
          kind: "ZIP_UPLOAD",
          file_name: "test-repo.zip",
          bytes: expect.any(Uint8Array),
          subdir_override: "backend",
        },
        expect.anything()
      );
    });

    it("upload file .zip vượt trần CONFIG.MAX_UPLOAD_BYTES trả HTTP 413 ERR_STREAM_QUOTA_EXCEEDED", async () => {
      const formData = new FormData();
      // File that lon hon tran 1 byte (gan gia size khong qua duoc buoc dong goi Request)
      const fakeLargeFile = new File([new Uint8Array(CONFIG.MAX_UPLOAD_BYTES + 1)], "huge.zip", {
        type: "application/zip",
      });

      formData.append("archive", fakeLargeFile);

      const req = createMockRequest(null, { isFormData: true, formData });
      const res = await POST(req);

      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_STREAM_QUOTA_EXCEEDED");
      expect(mockRunEngine).not.toHaveBeenCalled();
    });

    it("upload multipart thiếu archive trả HTTP 400 ERR_UPLOAD_INVALID", async () => {
      const formData = new FormData();
      formData.append("some_other_field", "value");

      const req = createMockRequest(null, { isFormData: true, formData });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UPLOAD_INVALID");
    });
  });

  describe("5. B4 — Bắt lỗi engine và Semaphore (D-31)", () => {
    it("runEngine ném IngestionError('ERR_INVALID_GITHUB_URL') ⇒ HTTP 400, không rơi về ERR_PERSISTENCE_UNAVAILABLE", async () => {
      mockRunEngine.mockRejectedValueOnce(
        new IngestionError("ERR_INVALID_GITHUB_URL")
      );

      const req = createMockRequest({ repo_url: "https://notgithub.com/user/repo" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_INVALID_GITHUB_URL");
      expect(json.error.code).not.toBe("ERR_PERSISTENCE_UNAVAILABLE");
    });

    it("runEngine ném IngestionError('ERR_UNSUPPORTED_LANGUAGE', undefined, { language: 'Go' }) ⇒ HTTP 422, giữ đúng details.language", async () => {
      mockRunEngine.mockRejectedValueOnce(
        new IngestionError("ERR_UNSUPPORTED_LANGUAGE", undefined, { language: "Go" })
      );

      const req = createMockRequest({ repo_url: "https://github.com/user/go-repo" });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNSUPPORTED_LANGUAGE");
      expect(json.error.details).toBeDefined();
      expect(json.error.details?.language).toBe("Go");
      expect(json.error.code).not.toBe("ERR_PERSISTENCE_UNAVAILABLE");
    });

    it("lỗi không phải IngestionError thì ném tiếp và rơi về HTTP 503 ERR_PERSISTENCE_UNAVAILABLE", async () => {
      mockRunEngine.mockRejectedValueOnce(new Error("Unexpected DB crash"));

      const req = createMockRequest({ repo_url: "https://github.com/simplifey/shop-api" });
      const res = await POST(req);

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    });

    it("semaphore hàng đợi chờ quá CONFIG.INGEST_QUEUE_TIMEOUT_MS ném ERR_SERVER_BUSY (503)", async () => {
      const releaseFns: Array<() => void> = [];
      for (let i = 0; i < CONFIG.MAX_CONCURRENT_INGESTIONS; i++) {
        releaseFns.push(await ingestionSemaphore.acquire());
      }

      vi.useFakeTimers();
      const waitingAcquire = ingestionSemaphore.acquire();

      vi.advanceTimersByTime(CONFIG.INGEST_QUEUE_TIMEOUT_MS + 50);

      await expect(waitingAcquire).rejects.toMatchObject({
        code: "ERR_SERVER_BUSY",
        status: 503,
      });

      vi.useRealTimers();
      for (const release of releaseFns) {
        release();
      }
    });
  });
});
