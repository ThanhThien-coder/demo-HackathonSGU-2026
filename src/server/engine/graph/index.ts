// Điều phối toàn bộ Tầng 1–2 buildGraph — spec 11 Mục 0..15.
import {
  CONFIG,
  type IngestOutput,
  type StaticEngineResult,
} from "@/contracts";
import { IngestionError } from "../ingest/types";
import { parseAll } from "./parser";
import { collectSymbols, resolveImports } from "./symbols";
import { buildCallGraph, fileGraph, findEntries } from "./callgraph";
import { rankFiles } from "./pagerank";
import { cognitiveComplexity } from "./complexity";
import { buildSlice } from "./slicing";
import { chooseMode, buildProceduralCandidates } from "./degraded";
import { assembleGraph, buildAlgoCandidates } from "./nodes";
import { diagnoseUncleBob } from "./unclebob";
import { dedupeTitles } from "./naming";
import { layoutGraph } from "./layout";
import { buildSymbolWhitelist } from "./whitelist";
import type { Candidate, EngineContext } from "./types";

export * from "./types";
export * from "./registry";
export * from "./parser";
export * from "./symbols";
export * from "./callgraph";
export * from "./tarjan";
export * from "./pagerank";
export * from "./complexity";
export * from "./slicing";
export * from "./degraded";
export * from "./nodes";
export * from "./unclebob";
export * from "./naming";
export * from "./layout";
export * from "./whitelist";

/**
 * Xây dựng đồ thị kiến trúc tất định từ kết quả Ingest Tầng 0.
 * async theo spec để hỗ trợ nạp Tree-sitter WASM grammar.
 */
export async function buildGraph(
  input: IngestOutput
): Promise<StaticEngineResult> {
  const t0 = performance.now();

  // G1: PARSE (ENG-10..12)
  const parsedFiles = await parseAll(
    input.code,
    input.file_language,
    input.report
  );

  if (parsedFiles.length === 0) {
    input.report.engine_ms = Math.round(performance.now() - t0);
    throw new IngestionError(
      "ERR_NO_ARCHITECTURAL_SLICE",
      "Không có tệp mã nguồn hợp lệ nào sau khi phân tích cú pháp"
    );
  }

  // G2: SYMBOLS (ENG-20..27)
  const idx = collectSymbols(parsedFiles);
  resolveImports(parsedFiles, idx, input.manifests, input.module_info);

  // G3: CALLGRAPH (ENG-30..35)
  const callGraphRes = buildCallGraph(parsedFiles, idx);

  // G4: ENTRIES (ENG-40)
  const rootDirOffset = input.fingerprint.root_dir_offset;
  const entries = findEntries(
    parsedFiles,
    idx,
    callGraphRes,
    rootDirOffset,
    input.report
  );

  // G5: MODE (ENG-51)
  const parsedInScope = parsedFiles.filter(
    (f) => !rootDirOffset || f.path.startsWith(rootDirOffset)
  ).length;
  const degradedMode = chooseMode(entries, parsedInScope);
  input.report.degraded_mode = degradedMode;

  // G6: RANK & G7: COMPLEXITY
  const fg = fileGraph(callGraphRes.edges);
  const ingressFiles = new Set<string>();
  for (const e of entries) {
    const fPath = e.key.split("#")[0];
    if (fPath) ingressFiles.add(fPath);
  }
  for (const b of callGraphRes.bindings) {
    ingressFiles.add(b.file_path);
  }

  const rank = rankFiles(fg, ingressFiles, input.report);

  // Đảm bảo mọi hàm trong idx.functions đã có điểm Cognitive Complexity
  for (const [, fn] of idx.functions) {
    if (fn.complexity === 0) {
      const pf = parsedFiles.find((f) => f.path === fn.file_path);
      if (pf) {
        try {
          fn.complexity = cognitiveComplexity(fn, pf);
        } catch {
          fn.complexity = 0;
        }
      }
    }
  }

  // G8: CANDIDATES
  const ctx: EngineContext = {
    files: new Map(parsedFiles.map((f) => [f.path, f])),
    idx,
    edges: callGraphRes.edges,
    external: callGraphRes.external,
    tech_stack: input.fingerprint.tech_stack,
    rank,
    source_map: input.source_map,
  };

  let candidates: Candidate[] = [];

  if (degradedMode === "PROCEDURAL") {
    candidates = buildProceduralCandidates(parsedFiles, ctx);
  } else {
    // NORMAL mode: cắt lát từ từng entry point
    for (const e of entries) {
      try {
        const slice = buildSlice(e, ctx);
        candidates.push(slice);
      } catch {
        // Bỏ qua nếu lát cắt thất bại
      }
    }

    // Node thuật toán (ENG-90 (a)): VIP trong scope không là bước của lát cắt
    const inScopeFns = Array.from(idx.functions.values()).filter(
      (fn) => !rootDirOffset || fn.file_path.startsWith(rootDirOffset)
    );

    const usedFunctionKeys = new Set<string>();
    for (const c of candidates) {
      for (const fnKey of c.functions) {
        usedFunctionKeys.add(fnKey);
      }
    }

    const vipFns = inScopeFns.filter(
      (fn) =>
        fn.complexity > CONFIG.VIP_COMPLEXITY_MIN &&
        !usedFunctionKeys.has(fn.key)
    );

    const algoCandidates = buildAlgoCandidates(vipFns, ctx);
    candidates.push(...algoCandidates);

    // ENG-90 (b): NORMAL có < DISPLAY_MIN_NODES candidate sau ENG-110
    // ⇒ thêm hàm có complexity >= VIP_FALLBACK_MIN_SCORE
    if (candidates.length < CONFIG.DISPLAY_MIN_NODES) {
      const remainingFns = inScopeFns
        .filter(
          (fn) =>
            fn.complexity >= CONFIG.VIP_FALLBACK_MIN_SCORE &&
            !usedFunctionKeys.has(fn.key) &&
            !algoCandidates.some((ac) => ac.entry_symbol === fn.key)
        )
        .sort((a, b) => {
          if (b.complexity !== a.complexity) return b.complexity - a.complexity;
          const rankA = rank.get(a.file_path) ?? 0;
          const rankB = rank.get(b.file_path) ?? 0;
          if (rankB !== rankA) return rankB - rankA;
          return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
        });

      const fallbackAlgos = buildAlgoCandidates(remainingFns, ctx);
      for (const fa of fallbackAlgos) {
        if (candidates.length >= CONFIG.DISPLAY_MIN_NODES) break;
        candidates.push(fa);
      }
    }
  }

  if (candidates.length === 0) {
    input.report.engine_ms = Math.round(performance.now() - t0);
    throw new IngestionError(
      "ERR_NO_ARCHITECTURAL_SLICE",
      "Không tìm thấy lát cắt kiến trúc nào"
    );
  }

  // G9: ASSEMBLE (ENG-110, ENG-111, ENG-112, ENG-114, D-12)
  const { nodes, edges } = assembleGraph(candidates, ctx, input.report);

  // G10: UNCLE_BOB (ENG-120)
  for (const node of nodes) {
    node.uncle_bob = diagnoseUncleBob(node, fg, ctx, input.fingerprint);
  }

  // G11: NAMING (Mục 13 ý 9)
  dedupeTitles(nodes);

  // G12: LAYOUT (Mục 14, D-55)
  layoutGraph(nodes, edges);

  // G13: OUTPUT (Mục 15)
  const finalStepFunctionKeys: string[] = [];
  for (const node of nodes) {
    for (const st of node.trace_steps) {
      // Tìm key trong SymbolTable khớp với function_name và file_path
      for (const [k, fn] of idx.functions) {
        if (fn.file_path === st.file_path && fn.name === st.function_name) {
          finalStepFunctionKeys.push(k);
        }
      }
    }
  }

  const symbol_whitelist = buildSymbolWhitelist(idx, finalStepFunctionKeys);
  const file_index = parsedFiles.map((f) => f.path).sort();

  input.report.engine_ms = Math.round(performance.now() - t0);
  if (input.report.engine_ms > CONFIG.ENGINE_BUDGET_MS) {
    input.report.warnings.push(
      `Thời gian phân tích đồ thị (${input.report.engine_ms}ms) vượt mức khuyến nghị (${CONFIG.ENGINE_BUDGET_MS}ms).`
    );
  }

  return {
    engine_version: CONFIG.ENGINE_VERSION,
    repo_name: input.repo_name,
    snapshot: input.snapshot,
    fingerprint: input.fingerprint,
    total_files: input.report.code_file_count,
    nodes: nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    edges: edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    symbol_whitelist,
    file_index,
    ingestion_report: input.report,
  };
}
