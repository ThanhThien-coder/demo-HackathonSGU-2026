// Node thuật toán, ghép node, cạnh, Display Budget, Capstone — spec 11 Mục 9, 11 (ENG-90, 91, 110, 111, 112, 114), D-07, D-08, D-12, D-56.
import type { Node } from "web-tree-sitter";
import {
  CONFIG,
  type ExecutionTraceStep,
  type GraphEdge,
  type HybridArchitecturalNode,
  type IngestionReport,
} from "@/contracts";
import { IngestionError } from "../ingest/types";
import { getAdapter } from "./registry";
import { cognitiveComplexity } from "./complexity";
import { hash6, nameCandidate, slug } from "./naming";
import { isTestPath } from "../ingest/priority";
import { tarjanScc } from "./tarjan";
import type {
  Candidate,
  EngineContext,
  FunctionInfo,
} from "./types";

// ENG-91: bước không có câu lệnh, chỉ còn dòng trống hoặc ngoặc đóng.
const EMPTY_STEP_REGEX = /^[\s})\];,]*$/;

/**
 * Tính điểm Cognitive Complexity cho một AST statement theo ENG-71.
 */
function calculateStmtComplexity(n: Node): number {
  let score = 0;
  function walk(curr: Node, nesting: number): void {
    const type = curr.type;
    const isControl =
      type === "if_statement" ||
      type === "for_statement" ||
      type === "enhanced_for_statement" ||
      type === "for_in_statement" ||
      type === "for_of_statement" ||
      type === "while_statement" ||
      type === "do_statement" ||
      type === "switch_statement" ||
      type === "switch_expression" ||
      type === "match_statement" ||
      type === "catch_clause" ||
      type === "except_clause" ||
      type === "ternary_expression" ||
      type === "conditional_expression";

    if (isControl) {
      score += 1 + nesting;
      for (let i = 0; i < curr.childCount; i++) {
        const child = curr.child(i);
        if (child) walk(child, nesting + 1);
      }
      return;
    }

    if (type === "else_clause" || type === "elif_clause") {
      score += 1;
      for (let i = 0; i < curr.childCount; i++) {
        const child = curr.child(i);
        if (child) walk(child, nesting);
      }
      return;
    }

    for (let i = 0; i < curr.childCount; i++) {
      const child = curr.child(i);
      if (child) walk(child, nesting);
    }
  }
  walk(n, 0);
  return Math.max(1, score);
}

/**
 * Xây dựng các candidate cho node thuật toán ALGORITHMIC_CORE theo Mục 9 (ENG-90, ENG-91).
 */
export function buildAlgoCandidates(
  fns: FunctionInfo[],
  ctx: EngineContext
): Candidate[] {
  const result: Candidate[] = [];

  for (const fn of fns) {
    // Chỉ tạo từ các hàm trong scope
    const pf = ctx.files.get(fn.file_path);
    if (!pf) continue;

    if (fn.complexity === 0) {
      try {
        fn.complexity = cognitiveComplexity(fn, pf);
      } catch {
        fn.complexity = 1;
      }
    }

    const sourceLines = pf.source.split(/\r?\n/);
    const commentPrefix = getAdapter(pf.language)?.comment_prefix ?? "//";

    // Tìm AST node của hàm
    let fnNode: Node | null = null;
    if (fn.name === "<module>") {
      fnNode = pf.tree.rootNode;
    } else {
      let bestNode: Node | null = null;
      let minSpan = Infinity;
      const searchFn = (n: Node): void => {
        const isFn =
          n.type === "function_definition" ||
          n.type === "function_declaration" ||
          n.type === "function_expression" ||
          n.type === "arrow_function" ||
          n.type === "method_definition" ||
          n.type === "method_declaration" ||
          n.type === "constructor_declaration" ||
          n.type === "compact_constructor_declaration";
        if (isFn) {
          const s = n.startPosition.row + 1;
          const e = n.endPosition.row + 1;
          const isMatch =
            pf.language === "JAVA"
              ? e === fn.line_end || (s <= fn.line_start && e >= fn.line_end)
              : s <= fn.line_start && e >= fn.line_end;
          if (isMatch) {
            const span = e - s;
            if (span < minSpan) {
              minSpan = span;
              bestNode = n;
            }
          }
        }
        for (let i = 0; i < n.childCount; i++) {
          const c = n.child(i);
          if (c) searchFn(c);
        }
      };
      searchFn(pf.tree.rootNode);
      fnNode = bestNode ?? pf.tree.rootNode;
    }

    if (!fnNode) continue;

    // ENG-91: Chia bước cho node thuật toán
    // Thân hàm: các câu lệnh cấp 1
    const bodyNode = fnNode.childForFieldName("body") ?? fnNode;
    const stmts: { node: Node; startLine: number; endLine: number; isLoop: boolean; complexity: number }[] = [];

    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (!child) continue;
      if (child.type === "comment" || child.type === "{" || child.type === "}") continue;

      const isLoop =
        child.type === "for_statement" ||
        child.type === "enhanced_for_statement" ||
        child.type === "for_in_statement" ||
        child.type === "for_of_statement" ||
        child.type === "while_statement" ||
        child.type === "do_statement";

      let comp = 0;
      try {
        comp = calculateStmtComplexity(child);
      } catch {
        comp = isLoop ? 2 : 1;
      }

      stmts.push({
        node: child,
        startLine: child.startPosition.row + 1,
        endLine: child.endPosition.row + 1,
        isLoop,
        complexity: comp,
      });
    }

    // Câu chính = vòng lặp cấp 1 nhiều dòng nhất (hòa ⇒ đầu tiên); thiếu ⇒ câu có điểm ENG-71 lớn nhất
    let mainStmtIdx = -1;
    let maxLoopLines = -1;

    for (let i = 0; i < stmts.length; i++) {
      const st = stmts[i]!;
      if (st.isLoop) {
        const lines = st.endLine - st.startLine + 1;
        if (lines > maxLoopLines) {
          maxLoopLines = lines;
          mainStmtIdx = i;
        }
      }
    }

    if (mainStmtIdx < 0 && stmts.length > 0) {
      let maxComp = -1;
      for (let i = 0; i < stmts.length; i++) {
        const st = stmts[i]!;
        if (st.complexity > maxComp) {
          maxComp = st.complexity;
          mainStmtIdx = i;
        }
      }
    }

    const traceSteps: ExecutionTraceStep[] = [];
    const sigLine = fn.name === "<module>" ? 1 : fn.line_start;
    const closeLine = fn.line_end;

    if (mainStmtIdx >= 0 && stmts.length > 1) {
      const mainStmt = stmts[mainStmtIdx]!;

      // 1. ALGO_SETUP = chữ ký + câu trước
      const setupStart = sigLine;
      const setupEnd = mainStmt.startLine - 1;
      if (setupEnd >= setupStart) {
        const lines = sourceLines.slice(setupStart - 1, setupEnd);
        traceSteps.push({
          step_number: traceSteps.length + 1,
          layer: "ALGO_SETUP",
          file_path: fn.file_path,
          function_name: fn.name,
          line_start: setupStart,
          line_end: setupEnd,
          snippet: lines.join("\n"),
          snippet_line_map: Array.from({ length: lines.length }, (_, k) => setupStart + k),
        });
      }

      // 2. ALGO_EXECUTION = câu chính
      const execLines = sourceLines.slice(mainStmt.startLine - 1, mainStmt.endLine);
      traceSteps.push({
        step_number: traceSteps.length + 1,
        layer: "ALGO_EXECUTION",
        file_path: fn.file_path,
        function_name: fn.name,
        line_start: mainStmt.startLine,
        line_end: mainStmt.endLine,
        snippet: execLines.join("\n"),
        snippet_line_map: Array.from({ length: execLines.length }, (_, k) => mainStmt.startLine + k),
      });

      // 3. ALGO_TERMINATION = câu sau + đóng
      const termStart = mainStmt.endLine + 1;
      const termEnd = closeLine;
      if (termEnd >= termStart) {
        const termLines = sourceLines.slice(termStart - 1, termEnd);
        traceSteps.push({
          step_number: traceSteps.length + 1,
          layer: "ALGO_TERMINATION",
          file_path: fn.file_path,
          function_name: fn.name,
          line_start: termStart,
          line_end: termEnd,
          snippet: termLines.join("\n"),
          snippet_line_map: Array.from({ length: termLines.length }, (_, k) => termStart + k),
        });
      }
    } else {
      // Không câu điều khiển hoặc chỉ có 1 câu: SETUP = mọi câu trừ cuối, TERMINATION = câu cuối
      const allLines = sourceLines.slice(sigLine - 1, closeLine);
      if (allLines.length > 1) {
        const setupLines = allLines.slice(0, allLines.length - 1);
        traceSteps.push({
          step_number: 1,
          layer: "ALGO_SETUP",
          file_path: fn.file_path,
          function_name: fn.name,
          line_start: sigLine,
          line_end: sigLine + setupLines.length - 1,
          snippet: setupLines.join("\n"),
          snippet_line_map: Array.from({ length: setupLines.length }, (_, k) => sigLine + k),
        });
        const termLine = [allLines[allLines.length - 1]!];
        traceSteps.push({
          step_number: 2,
          layer: "ALGO_TERMINATION",
          file_path: fn.file_path,
          function_name: fn.name,
          line_start: closeLine,
          line_end: closeLine,
          snippet: termLine.join("\n"),
          snippet_line_map: [closeLine],
        });
      } else {
        traceSteps.push({
          step_number: 1,
          layer: "ALGO_EXECUTION",
          file_path: fn.file_path,
          function_name: fn.name,
          line_start: sigLine,
          line_end: closeLine,
          snippet: allLines.join("\n"),
          snippet_line_map: [sigLine],
        });
      }
    }

    // Clamp các bước > CONFIG.STEP_MAX_LINES (ENG-87). Marker có map = 0 (ENG-86).
    for (const st of traceSteps) {
      const sLines = st.snippet.split("\n");
      if (sLines.length > CONFIG.STEP_MAX_LINES) {
        const keepCount = CONFIG.STEP_MAX_LINES - 1;
        const kept = sLines.slice(0, keepCount);
        const dropped = sLines.slice(keepCount);
        const firstDropped = dropped.find((l) => l.trim() !== "") ?? "";
        const indent = firstDropped.slice(0, firstDropped.length - firstDropped.trimStart().length);
        const keptMap = st.snippet_line_map.slice(0, keepCount);
        st.snippet = [...kept, `${indent}${commentPrefix} … (${dropped.length} dòng)`].join("\n");
        st.snippet_line_map = [...keptMap, 0];
        st.line_end = Math.max(...keptMap);
      }
    }

    // ENG-91: bỏ bước rỗng (không có câu lệnh, chỉ còn dòng trống hoặc ngoặc đóng)
    const codeSteps = traceSteps.filter((st) => !EMPTY_STEP_REGEX.test(st.snippet));
    if (codeSteps.length === 0) continue;
    codeSteps.forEach((st, idx) => {
      st.step_number = idx + 1;
    });

    const rankScore = ctx.rank.get(fn.file_path) ?? 0;

    const cand: Candidate = {
      id: `algo-${fn.key}`,
      node_type: "ALGORITHMIC_CORE",
      entry_symbol: fn.key,
      trace_steps: codeSteps,
      dto_snippet: "",
      cognitive_complexity: fn.complexity,
      rank_score: rankScore,
      title_source: "ENTRY_SYMBOL",
      title_evidence: fn.name,
      kind: "ALGO",
      order_key: fn.key,
      functions: [fn.key],
      binding: null,
      base_title: fn.name,
    };

    result.push(cand);
  }

  return result;
}

/**
 * Rút gọn bắc cầu (Transitive Reduction) trên đồ thị có hướng không chu trình.
 */
export function transitiveReduction(
  nodesList: string[],
  adjMap: Map<string, Set<string>>
): Map<string, Set<string>> {
  const reduced = new Map<string, Set<string>>();
  for (const u of nodesList) {
    reduced.set(u, new Set(adjMap.get(u) ?? []));
  }

  for (const u of nodesList) {
    const targets = Array.from(adjMap.get(u) ?? []);
    for (const v of targets) {
      let hasIndirectPath = false;
      for (const w of targets) {
        if (w === v) continue;
        const visited = new Set<string>([u, w]);
        const q = [w];
        while (q.length > 0) {
          const cur = q.shift()!;
          if (cur === v) {
            hasIndirectPath = true;
            break;
          }
          const nxts = adjMap.get(cur);
          if (nxts) {
            for (const nxt of nxts) {
              if (!visited.has(nxt)) {
                visited.add(nxt);
                q.push(nxt);
              }
            }
          }
        }
        if (hasIndirectPath) break;
      }

      if (hasIndirectPath) {
        reduced.get(u)?.delete(v);
      }
    }
  }

  return reduced;
}

/**
 * Tính cạnh trên tập giữ K = rút gọn bắc cầu của {(u,v) in K^2 : v đến được từ u trong G0} — Mục 11 ý 6.
 */
export function computeEdgesOnKept(
  keptIds: string[],
  g0Adj: Map<string, Set<string>>,
  rawEdges?: { source: { id: string }; target: { id: string }; isVnodeSequential?: boolean }[]
): GraphEdge[] {
  const keptIdSet = new Set(keptIds);
  const kAdj = new Map<string, Set<string>>();
  for (const id of keptIdSet) kAdj.set(id, new Set());

  for (const u of keptIdSet) {
    const visited = new Set<string>([u]);
    const q = [u];
    while (q.length > 0) {
      const cur = q.shift()!;
      for (const nxt of g0Adj.get(cur) ?? []) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          q.push(nxt);
          if (keptIdSet.has(nxt)) {
            kAdj.get(u)!.add(nxt);
          }
        }
      }
    }
  }

  const kReducedAdj = transitiveReduction(Array.from(keptIdSet), kAdj);

  const finalEdges: GraphEdge[] = [];
  for (const [src, tgts] of kReducedAdj) {
    for (const tgt of tgts) {
      const edgeId = `${src}->${tgt}`;
      let confidence: "RESOLVED" | "INFERRED" = "RESOLVED";
      const edgeObj = rawEdges?.find((e) => e.source.id === src && e.target.id === tgt);
      if (edgeObj && edgeObj.isVnodeSequential) {
        confidence = "RESOLVED";
      } else {
        confidence = "RESOLVED";
      }

      finalEdges.push({
        id: edgeId,
        source: src,
        target: tgt,
        confidence,
      });
    }
  }

  return finalEdges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Ghép node, sinh id, dựng cạnh, Display Budget, Capstone — spec 11 Mục 11.
 */
/** Candidate có file đầu (`files[0]`) mang cờ ING-87. */
export function isTestCandidate(c: Candidate): boolean {
  const file = c.trace_steps[0]?.file_path;
  return !!file && isTestPath(file);
}

// ENG-110: đủ candidate sạch ⇒ bỏ candidate mang cờ; thiếu ⇒ bù cho đủ; không có candidate sạch ⇒ giữ nguyên
function dropTestCandidates(candidates: Candidate[]): Candidate[] {
  const clean = candidates.filter((c) => !isTestCandidate(c));
  if (clean.length === 0 || clean.length === candidates.length) return candidates;
  const missing = CONFIG.DISPLAY_MIN_NODES - clean.length;
  if (missing <= 0) return clean;
  const fill = candidates
    .filter(isTestCandidate)
    .sort(
      (a, b) =>
        b.rank_score - a.rank_score ||
        b.cognitive_complexity - a.cognitive_complexity ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
    .slice(0, missing);
  return [...clean, ...fill];
}

export function assembleGraph(
  candidates: Candidate[],
  ctx: EngineContext,
  report: IngestionReport
): { nodes: HybridArchitecturalNode[]; edges: GraphEdge[] } {
  // ENG-40 / B07: Bỏ candidate có trace_steps rỗng trước bước gộp ENG-110 (không cộng vào omitted_node_count)
  const validCandidates = dropTestCandidates(
    candidates.filter((c) => c.trace_steps && c.trace_steps.length > 0)
  );
  if (validCandidates.length === 0) {
    throw new IngestionError("ERR_NO_ARCHITECTURAL_SLICE", "Không tìm thấy lát cắt kiến trúc nào");
  }

  // 1. ENG-110 Gộp: cùng tập functions ⇒ giữ order_key nhỏ nhất. Node ảo không gộp chung với nhau.
  const functionGroupMap = new Map<string, Candidate>();
  for (const c of validCandidates) {
    const key = c.kind === "VNODE" ? `vnode::${c.order_key}` : c.functions.slice().sort().join("::");
    const existing = functionGroupMap.get(key);
    if (!existing) {
      functionGroupMap.set(key, c);
    } else {
      if (c.order_key < existing.order_key) {
        functionGroupMap.set(key, c);
      }
    }
  }

  const mergedCandidates = Array.from(functionGroupMap.values());

  // 2. ENG-111 Tên gốc & sinh id tất định (D-08)
  for (const c of mergedCandidates) {
    const named = nameCandidate(c, ctx);
    c.base_title = named.base_title;
    c.title_source = named.title_source;
    c.title_evidence = named.title_evidence;

    const titleSlug = slug(c.base_title);
    if (c.kind === "SLICE") {
      const hash = hash6(c.entry_symbol ?? c.order_key);
      c.id = `slice-${titleSlug}-${hash}`;
    } else if (c.kind === "ALGO") {
      const hash = hash6(c.entry_symbol ?? c.order_key);
      c.id = `algo-${titleSlug}-${hash}`;
    } else if (c.kind === "VNODE") {
      // id của node ảo đã được gán sẵn ở degraded.ts theo vnode-<hash6(file#NHÃN)>
      if (!c.id.startsWith("vnode-")) {
        const hash = hash6(c.order_key);
        c.id = `vnode-${hash}`;
      }
    }
  }

  // 3. ENG-112 Dựng cạnh D-07, D-56
  const callGraphAdj = new Map<string, Set<string>>();
  for (const edge of ctx.edges) {
    let targets = callGraphAdj.get(edge.caller);
    if (!targets) {
      targets = new Set();
      callGraphAdj.set(edge.caller, targets);
    }
    targets.add(edge.callee);
  }

  const matchFnKey = (a: string, b: string): boolean => {
    if (a === b) return true;
    if (a.endsWith(`#${b}`) || b.endsWith(`#${a}`)) return true;
    return false;
  };

  const canReach = (startFn: string, targetFn: string): boolean => {
    if (matchFnKey(startFn, targetFn)) return true;
    const visited = new Set<string>([startFn]);
    const queue = [startFn];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (matchFnKey(cur, targetFn)) return true;
      const neighbors = callGraphAdj.get(cur);
      if (neighbors) {
        for (const nxt of neighbors) {
          if (matchFnKey(nxt, targetFn)) return true;
          if (!visited.has(nxt)) {
            visited.add(nxt);
            queue.push(nxt);
          }
        }
      }
    }
    return false;
  };

  interface RawEdge {
    source: Candidate;
    target: Candidate;
    isVnodeSequential?: boolean;
  }

  const rawEdges: RawEdge[] = [];

  // Ngoại lệ: chuỗi node ảo P2 nối tuần tự theo thứ tự ban đầu
  const vnodesOnly = mergedCandidates.filter((c) => c.kind === "VNODE");
  if (vnodesOnly.length > 1) {
    for (let i = 0; i < vnodesOnly.length - 1; i++) {
      rawEdges.push({
        source: vnodesOnly[i]!,
        target: vnodesOnly[i + 1]!,
        isVnodeSequential: true,
      });
    }
  }

  // Các candidate thông thường (không phải vnode nối chuỗi với nhau)
  for (let i = 0; i < mergedCandidates.length; i++) {
    for (let j = i + 1; j < mergedCandidates.length; j++) {
      const a = mergedCandidates[i]!;
      const b = mergedCandidates[j]!;

      // Cả 2 cùng là vnode thì đã nối chuỗi ở trên
      if (a.kind === "VNODE" && b.kind === "VNODE") continue;

      let hasRelation = false;

      // D-07: hàm chung
      if (a.functions.length > 0 && b.functions.length > 0) {
        const common = a.functions.some((fa) => b.functions.includes(fa));
        if (common) hasRelation = true;
      }

      // D-56: Lát cắt gọi tới ALGO
      if (!hasRelation) {
        if (a.kind === "SLICE" && b.kind === "ALGO" && b.entry_symbol) {
          const reach = a.functions.some((fa) => canReach(fa, b.entry_symbol!));
          if (reach) hasRelation = true;
        } else if (b.kind === "SLICE" && a.kind === "ALGO" && a.entry_symbol) {
          const reach = b.functions.some((fb) => canReach(fb, a.entry_symbol!));
          if (reach) hasRelation = true;
        }
      }

      if (hasRelation) {
        // Chiều cạnh: A -> B nếu A "dễ hơn" B (ENG-112)
        let aIsEasier = false;
        if (a.cognitive_complexity !== b.cognitive_complexity) {
          aIsEasier = a.cognitive_complexity < b.cognitive_complexity;
        } else if (a.rank_score !== b.rank_score) {
          aIsEasier = a.rank_score > b.rank_score;
        } else {
          aIsEasier = a.id < b.id;
        }

        if (aIsEasier) {
          rawEdges.push({ source: a, target: b });
        } else {
          rawEdges.push({ source: b, target: a });
        }
      }
    }
  }

  // Dựng đồ thị G0
  const g0Adj = new Map<string, Set<string>>();
  for (const c of mergedCandidates) {
    g0Adj.set(c.id, new Set());
  }
  for (const re of rawEdges) {
    g0Adj.get(re.source.id)?.add(re.target.id);
  }

  // Kiểm tra G0 không chu trình bằng Tarjan (assert)
  const candidateIds = mergedCandidates.map((c) => c.id);
  const sccs = tarjanScc(candidateIds, g0Adj);
  for (const scc of sccs) {
    if (scc.length > 1) {
      // Phá chu trình nếu có bằng cách chỉ giữ cạnh theo thứ tự dễ hơn
      for (const u of scc) {
        for (const v of scc) {
          if (u !== v) {
            const candU = mergedCandidates.find((c) => c.id === u);
            const candV = mergedCandidates.find((c) => c.id === v);
            if (candU && candV && candU.cognitive_complexity >= candV.cognitive_complexity) {
              g0Adj.get(u)?.delete(v);
            }
          }
        }
      }
    }
  }

  // 4. Rút gọn bắc cầu G0 ⇒ G0r
  const g0rAdj = transitiveReduction(candidateIds, g0Adj);

  // 5. ENG-114 Display Budget: tối đa CONFIG.DISPLAY_MAX_NODES (20)
  let keptCandidates: Candidate[] = [];
  const maxNodes = CONFIG.DISPLAY_MAX_NODES;

  if (mergedCandidates.length <= maxNodes) {
    keptCandidates = mergedCandidates;
  } else {
    // Tìm đường dài nhất trên G0r bằng DP theo Kahn
    const inDeg = new Map<string, number>();
    for (const id of candidateIds) inDeg.set(id, 0);
    for (const [, tgts] of g0rAdj) {
      for (const t of tgts) inDeg.set(t, (inDeg.get(t) ?? 0) + 1);
    }

    const q = candidateIds.filter((id) => (inDeg.get(id) ?? 0) === 0).sort();
    const topo: string[] = [];
    const curInDeg = new Map(inDeg);

    while (q.length > 0) {
      q.sort();
      const u = q.shift()!;
      topo.push(u);
      for (const v of g0rAdj.get(u) ?? []) {
        const d = curInDeg.get(v)! - 1;
        curInDeg.set(v, d);
        if (d === 0) q.push(v);
      }
    }

    const dist = new Map<string, number>();
    const prevNode = new Map<string, string | null>();
    for (const id of candidateIds) {
      dist.set(id, 1);
      prevNode.set(id, null);
    }

    for (const u of topo) {
      const dU = dist.get(u)!;
      for (const v of g0rAdj.get(u) ?? []) {
        if (dU + 1 > dist.get(v)!) {
          dist.set(v, dU + 1);
          prevNode.set(v, u);
        } else if (dU + 1 === dist.get(v)!) {
          const cp = prevNode.get(v);
          if (!cp || u < cp) prevNode.set(v, u);
        }
      }
    }

    let bestEnd: string | null = null;
    let maxDist = -1;
    for (const id of candidateIds) {
      const d = dist.get(id)!;
      if (d > maxDist) {
        maxDist = d;
        bestEnd = id;
      } else if (d === maxDist && bestEnd && id < bestEnd) {
        bestEnd = id;
      }
    }

    const criticalPath: string[] = [];
    let curP = bestEnd;
    while (curP) {
      criticalPath.push(curP);
      curP = prevNode.get(curP) ?? null;
    }
    criticalPath.reverse();

    // Giữ tối đa CONFIG.CRITICAL_PATH_MAX_NODES (6) node đầu tiên của đường chính
    const keptIdsSet = new Set<string>(
      criticalPath.slice(0, CONFIG.CRITICAL_PATH_MAX_NODES)
    );

    // Thêm các node còn lại theo thứ tự ưu tiên ENG-114
    const remaining = mergedCandidates
      .filter((c) => !keptIdsSet.has(c.id))
      .sort((a, b) => {
        const aIsVip = a.cognitive_complexity > CONFIG.VIP_COMPLEXITY_MIN ? 1 : 0;
        const bIsVip = b.cognitive_complexity > CONFIG.VIP_COMPLEXITY_MIN ? 1 : 0;
        if (bIsVip !== aIsVip) return bIsVip - aIsVip;
        if (b.rank_score !== a.rank_score) return b.rank_score - a.rank_score;
        if (b.cognitive_complexity !== a.cognitive_complexity) {
          return b.cognitive_complexity - a.cognitive_complexity;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

    for (const r of remaining) {
      if (keptIdsSet.size >= maxNodes) break;
      keptIdsSet.add(r.id);
    }

    keptCandidates = mergedCandidates.filter((c) => keptIdsSet.has(c.id));

    const omittedCount = mergedCandidates.length - keptCandidates.length;
    report.omitted_node_count = omittedCount;
    if (omittedCount > 0) {
      report.warnings.push(`${omittedCount} luồng khác không hiển thị trên bản đồ`);
    }
  }

  // 6. Cạnh trên tập giữ K = rút gọn bắc cầu của {(u,v) in K^2 : v đến được từ u trong G0}
  const keptIdSet = new Set(keptCandidates.map((c) => c.id));
  const finalEdges = computeEdgesOnKept(
    Array.from(keptIdSet),
    g0Adj,
    rawEdges
  );

  const inDegreeMap = new Map<string, string[]>();
  for (const id of keptIdSet) inDegreeMap.set(id, []);
  for (const e of finalEdges) {
    inDegreeMap.get(e.target)?.push(e.source);
  }

  // 7. Capstone (D-12)
  let capstoneId: string | null = null;
  let maxComp = -1;
  let maxRank = -1;

  const cleanKept = keptCandidates.filter((c) => !isTestCandidate(c));
  for (const c of cleanKept.length > 0 ? cleanKept : keptCandidates) {
    if (c.cognitive_complexity > maxComp) {
      maxComp = c.cognitive_complexity;
      maxRank = c.rank_score;
      capstoneId = c.id;
    } else if (c.cognitive_complexity === maxComp) {
      if (c.rank_score > maxRank) {
        maxRank = c.rank_score;
        capstoneId = c.id;
      } else if (c.rank_score === maxRank) {
        if (!capstoneId || c.id < capstoneId) {
          capstoneId = c.id;
        }
      }
    }
  }

  // 8. Chuyển đổi sang HybridArchitecturalNode
  const finalNodes: HybridArchitecturalNode[] = [];

  for (const c of keptCandidates) {
    const rawFiles: string[] = [];
    for (const st of c.trace_steps) {
      if (st.file_path && !rawFiles.includes(st.file_path)) {
        rawFiles.push(st.file_path);
      }
    }
    if (rawFiles.length === 0 && c.entry_symbol) {
      rawFiles.push(c.entry_symbol.split("#")[0]!);
    }

    const languages = Array.from(
      new Set(
        rawFiles
          .map((f) => ctx.files.get(f)?.language)
          .filter(Boolean) as string[]
      )
    ).sort();

    const hasStructural = rawFiles.some((f) => ctx.files.get(f)?.tier === "STRUCTURAL");
    const support_tier = hasStructural ? "STRUCTURAL" : "RESOLVED";

    const prereqs = (inDegreeMap.get(c.id) ?? []).sort();

    const node: HybridArchitecturalNode = {
      id: c.id,
      title: c.base_title,
      title_source: c.title_source,
      title_evidence: c.title_evidence,
      node_type: c.node_type,
      entry_symbol: c.entry_symbol,
      prerequisites: prereqs,
      position: { x: 0, y: 0 },
      files: rawFiles,
      languages,
      support_tier,
      cognitive_complexity: c.cognitive_complexity,
      rank_score: c.rank_score,
      is_vip_algorithm: c.kind === "ALGO",
      is_capstone: c.id === capstoneId,
      uncle_bob: {
        instability: 0,
        abstractness: 0,
        distance: 0,
        diagnosis: "BALANCED",
        is_exempt: true,
      },
      trace_steps: c.trace_steps,
      dto_snippet: c.dto_snippet,
    };

    finalNodes.push(node);
  }

  // Sắp xếp các node theo id tăng dần
  finalNodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (finalNodes.length === 0) {
    throw new IngestionError("ERR_NO_ARCHITECTURAL_SLICE", "Không tìm thấy lát cắt kiến trúc nào");
  }

  return { nodes: finalNodes, edges: finalEdges };
}
