// 11 Mục 0, 15 — runEngine / buildGraph / toClientResult. Tất định (ENG-01): cùng đầu vào ⇒ cùng đồ thị, node_id, tọa độ.
import { CONFIG } from "@/contracts/config";
import type { ClientStaticEngineResult, IngestOutput, IngestSource, StaticEngineResult } from "@/contracts";
import { fail } from "../errors";
import { buildCallGraph } from "./graph/callgraph";
import { buildSymbolWhitelist, rankFiles } from "./graph/graphalgo";
import { assemble } from "./graph/nodes";
import { initParsers, parseAll } from "./graph/parser";
import { makeContext } from "./graph/slicing";
import { collectSymbols } from "./graph/symbols";
import { runIngest } from "./ingest";

export { initParsers };
export { mainPath } from "./graph/graphalgo";

export async function buildGraph(input: IngestOutput): Promise<StaticEngineResult> {
  const t0 = performance.now();
  await initParsers(); // lần nạp đầu không tính engine_ms (ENG-11)
  const t1 = performance.now();
  const report = input.report;
  const files = await parseAll(input.code, input.file_language, report);
  const idx = collectSymbols(files, input.manifests, input.fingerprint.root_dir_offset);
  const cg = buildCallGraph(idx, input.fingerprint.tech_stack, input.module_info.package_entry_files);

  const warnings: string[] = [];
  const ingressFiles = new Set(cg.entries.filter((e) => e.source !== "PROGRAM").map((e) => idx.functions.get(e.key)?.file).filter(Boolean) as string[]);
  const fileRank = rankFiles(cg.file_graph, ingressFiles, warnings);
  const scope = input.fingerprint.root_dir_offset;
  const ctx = makeContext(idx, cg, input.fingerprint.tech_stack, input.source_map, fileRank, scope);
  const nInScope = files.filter((f) => scope === "" || f.path.startsWith(scope)).length;
  const res = assemble(ctx, input, nInScope);
  if (res.nodes.length === 0) return fail("ERR_NO_ARCHITECTURAL_SLICE");

  const finalFns = res.nodes.length ? [...idx.functions.values()].filter((f) => res.nodes[res.nodes.length - 1].trace_steps.some((s) => s.file_path === f.file && s.function_name === f.name)).map((f) => f.key) : [];
  report.omitted_node_count = res.omitted;
  report.degraded_mode = res.degraded;
  report.warnings.push(...warnings, ...res.warnings);
  const engineMs = Math.round(performance.now() - t1);
  report.engine_ms = engineMs;
  if (engineMs > CONFIG.ENGINE_BUDGET_MS) report.warnings.push(`Bước dựng đồ thị mất ${engineMs} ms (mục tiêu ${CONFIG.ENGINE_BUDGET_MS} ms) — chỉ cảnh báo, không cắt file.`);
  void t0;

  return {
    engine_version: CONFIG.ENGINE_VERSION,
    repo_name: input.repo_name,
    snapshot: input.snapshot,
    fingerprint: input.fingerprint,
    total_files: report.code_file_count,
    nodes: res.nodes,
    edges: res.edges,
    symbol_whitelist: buildSymbolWhitelist(idx, finalFns),
    file_index: files.map((f) => f.path).sort(),
    ingestion_report: report,
  };
}

export async function runEngine(src: IngestSource): Promise<StaticEngineResult> {
  const out = await runIngest(src);
  return buildGraph(out);
}

/** API-03: dựng object mới từng trường, không spread. */
export function toClientResult(r: StaticEngineResult): ClientStaticEngineResult {
  const rep = r.ingestion_report;
  return {
    engine_version: r.engine_version,
    repo_name: r.repo_name,
    snapshot: r.snapshot,
    fingerprint: r.fingerprint,
    total_files: r.total_files,
    nodes: r.nodes,
    edges: r.edges,
    file_index: r.file_index,
    ingestion_report: {
      truncated: rep.truncated, selective_fetch: rep.selective_fetch, code_file_count: rep.code_file_count,
      manifest_count: rep.manifest_count, omitted_node_count: rep.omitted_node_count, skipped: rep.skipped,
      warnings: rep.warnings, degraded_mode: rep.degraded_mode, redacted_secret_count: rep.redacted_secret_count,
      engine_ms: rep.engine_ms, ingest_ms: rep.ingest_ms,
    },
  };
}
