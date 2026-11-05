// 30 Mục 7 — client gọi API có kiểu. Trả response hoặc ApiError, không throw.
import type {
  AnalyzeNodeResponse, AnalyzeOverviewResponse, ApiError, EnrichNodeResponse, EvaluateFeynmanRequest, EvaluateFeynmanResponse,
  HistoryResponse, IngestResponse, MeResponse, PersonaMode, PersonaResponse, ProgressResponse, ReportWrongRequest,
  ReportWrongResponse, RevealRequest, RevealResponse, SessionsResponse,
} from "@/contracts";
import { createClient } from "@/lib/supabase/client";
import { ERROR_MESSAGES } from "./messages";

export type ApiFail = ApiError["error"];
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFail };

const networkError = (): ApiFail => ({ code: "ERR_CLIENT_NETWORK", message: ERROR_MESSAGES.ERR_CLIENT_NETWORK, retryable: true });

async function token(refresh = false): Promise<string | null> {
  const supabase = createClient();
  if (refresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function call<T>(path: string, init: RequestInit = {}, retried = false): Promise<ApiResult<T>> {
  const t = await token(retried);
  let res: Response;
  try {
    const headers = new Headers(init.headers);
    if (t) headers.set("Authorization", `Bearer ${t}`);
    res = await fetch(path, { ...init, headers });
  } catch {
    return { ok: false, error: networkError() };
  }
  if (res.status === 204) return { ok: true, data: null as T };
  let body: unknown;
  try { body = await res.json(); } catch { return { ok: false, error: networkError() }; }
  if (res.ok) return { ok: true, data: body as T };
  const err = (body as Partial<ApiError>).error;
  if (res.status === 401 && !retried) return call<T>(path, init, true); // refreshSession + gửi lại 1 lần
  return { ok: false, error: err ?? networkError() };
}

const post = <T>(path: string, body: unknown) =>
  call<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  getMe: () => call<MeResponse>("/api/me"),
  deleteMe: () => call<null>("/api/me", { method: "DELETE" }),
  getSessions: () => call<SessionsResponse>("/api/sessions"),
  getHistory: (id: string) => call<HistoryResponse>(`/api/sessions/${id}/history`),
  getProgress: (id: string) => call<ProgressResponse>(`/api/sessions/${id}/progress`),
  ingestUrl: (repo_url: string, subdir_override?: string) => post<IngestResponse>("/api/ingest", { repo_url, ...(subdir_override ? { subdir_override } : {}) }),
  ingestZip: (file: File, subdir?: string) => {
    const f = new FormData();
    f.set("archive", file);
    if (subdir) f.set("subdir", subdir);
    return call<IngestResponse>("/api/ingest", { method: "POST", body: f });
  },
  ingestSession: (session_id: string, restart = false) => post<IngestResponse>("/api/ingest", { session_id, restart }),
  analyzeNode: (session_id: string, node_id: string) => post<AnalyzeNodeResponse>("/api/analyze-node", { session_id, node_id }),
  analyzeOverview: (session_id: string) => post<AnalyzeOverviewResponse>("/api/analyze-overview", { session_id }),
  enrichNode: (session_id: string, node_id: string) => post<EnrichNodeResponse>("/api/enrich-node", { session_id, node_id, mode: "LEARN" }),
  evaluate: (b: EvaluateFeynmanRequest) => post<EvaluateFeynmanResponse>("/api/evaluate-feynman", b),
  reveal: (b: RevealRequest) => post<RevealResponse>("/api/reveal", b),
  reportWrong: (b: ReportWrongRequest) => post<ReportWrongResponse>("/api/report-wrong", b),
  setPersona: (mode: PersonaMode) => post<PersonaResponse>("/api/demo/persona", { mode }),
};

export type Api = typeof api;
