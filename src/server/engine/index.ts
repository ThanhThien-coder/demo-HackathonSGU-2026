// Điểm xuất phát của Engine SimpliFey — spec 10 Mục 0, spec 11 Mục 0, 15.
import type {
  ClientStaticEngineResult,
  IngestSource,
  StaticEngineResult,
} from "@/contracts";
import { runIngest } from "./ingest";
import { buildGraph } from "./graph";

export * from "./ingest";
export * from "./graph";

/**
 * Chạy toàn bộ quy trình Engine: Tầng 0 (Ingest) rồi Tầng 1–2 (Đồ thị & Lát cắt).
 * Chỉ Ingest 1 lần duy nhất trong RAM.
 *
 * @param src Nguồn Ingest (GITHUB_URL, GITHUB_COMMIT, hoặc ZIP_UPLOAD).
 * @param signal AbortSignal tùy chọn để dừng quy trình Ingest khi request bị hủy (ghi chú cho Vai A - A06).
 */
export async function runEngine(
  src: IngestSource,
  signal?: AbortSignal
): Promise<StaticEngineResult> {
  const ingestOutput = await runIngest(src, signal);
  return await buildGraph(ingestOutput);
}

/**
 * Chuyển kết quả StaticEngineResult phía server thành bản ClientStaticEngineResult gửi về trình duyệt.
 * Dựng object mới từng trường (API-03, không spread):
 * Lược bỏ symbol_whitelist và suspicious_instruction_files.
 */
export function toClientResult(
  r: StaticEngineResult
): ClientStaticEngineResult {
  return {
    engine_version: r.engine_version,
    repo_name: r.repo_name,
    snapshot: {
      source: r.snapshot.source,
      repo_key: r.snapshot.repo_key,
      snapshot_id: r.snapshot.snapshot_id,
      snapshot_id_kind: r.snapshot.snapshot_id_kind,
      subdir: r.snapshot.subdir,
      ref_label: r.snapshot.ref_label,
    },
    fingerprint: {
      archetype: r.fingerprint.archetype,
      primary_language: r.fingerprint.primary_language,
      language_breakdown: r.fingerprint.language_breakdown.map((lb) => ({
        language: lb.language,
        tier: lb.tier,
        code_bytes: lb.code_bytes,
      })),
      graph_confidence: r.fingerprint.graph_confidence,
      detected_framework: r.fingerprint.detected_framework,
      tech_stack: r.fingerprint.tech_stack.slice(),
      is_monorepo: r.fingerprint.is_monorepo,
      root_dir_offset: r.fingerprint.root_dir_offset,
    },
    total_files: r.total_files,
    nodes: r.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      title_source: n.title_source,
      title_evidence: n.title_evidence,
      node_type: n.node_type,
      entry_symbol: n.entry_symbol,
      prerequisites: n.prerequisites.slice(),
      position: {
        x: n.position.x,
        y: n.position.y,
      },
      files: n.files.slice(),
      languages: n.languages.slice(),
      support_tier: n.support_tier,
      cognitive_complexity: n.cognitive_complexity,
      rank_score: n.rank_score,
      is_vip_algorithm: n.is_vip_algorithm,
      is_capstone: n.is_capstone,
      uncle_bob: {
        instability: n.uncle_bob.instability,
        abstractness: n.uncle_bob.abstractness,
        distance: n.uncle_bob.distance,
        diagnosis: n.uncle_bob.diagnosis,
        is_exempt: n.uncle_bob.is_exempt,
      },
      trace_steps: n.trace_steps.map((st) => ({
        step_number: st.step_number,
        layer: st.layer,
        file_path: st.file_path,
        function_name: st.function_name,
        line_start: st.line_start,
        line_end: st.line_end,
        snippet: st.snippet,
        snippet_line_map: st.snippet_line_map.slice(),
        origin_note: st.origin_note,
      })),
      dto_snippet: n.dto_snippet,
    })),
    edges: r.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      confidence: e.confidence,
    })),
    file_index: r.file_index.slice(),
    ingestion_report: {
      truncated: r.ingestion_report.truncated,
      selective_fetch: r.ingestion_report.selective_fetch,
      code_file_count: r.ingestion_report.code_file_count,
      manifest_count: r.ingestion_report.manifest_count,
      omitted_node_count: r.ingestion_report.omitted_node_count,
      skipped: {
        garbage: r.ingestion_report.skipped.garbage,
        binary: r.ingestion_report.skipped.binary,
        oversized: r.ingestion_report.skipped.oversized,
        unsupported_lang: r.ingestion_report.skipped.unsupported_lang,
        quota: r.ingestion_report.skipped.quota,
        parse_error: r.ingestion_report.skipped.parse_error,
      },
      warnings: r.ingestion_report.warnings.slice(),
      degraded_mode: r.ingestion_report.degraded_mode,
      redacted_secret_count: r.ingestion_report.redacted_secret_count,
      engine_ms: r.ingestion_report.engine_ms,
      ingest_ms: r.ingestion_report.ingest_ms,
    },
  };
}
