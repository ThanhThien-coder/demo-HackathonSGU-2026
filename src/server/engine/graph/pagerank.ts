// Thuật toán PageRank trên DAG co cụm và xếp hạng file — spec 11 Mục 6 (ENG-60, ENG-62, D-09).
import { CONFIG, type IngestionReport } from "@/contracts";
import { tarjanScc } from "./tarjan";
import type { fileGraph } from "./callgraph";

export function pageRank(dag: Map<string, Iterable<string>>): Map<string, number> {
  const nodeSet = new Set<string>(dag.keys());
  for (const [, targets] of dag) {
    for (const t of targets) {
      nodeSet.add(t);
    }
  }

  const nodes = Array.from(nodeSet).sort(); // ENG-01
  const N = nodes.length;
  const result = new Map<string, number>();
  if (N === 0) return result;
  if (N === 1) {
    result.set(nodes[0]!, 1);
    return result;
  }

  const d = CONFIG.PAGERANK_DAMPING;
  const maxIter = CONFIG.PAGERANK_MAX_ITER;
  const tol = CONFIG.PAGERANK_TOLERANCE;

  const outDegree = new Map<string, number>();
  const inNeighbors = new Map<string, string[]>();

  for (const u of nodes) {
    inNeighbors.set(u, []);
    outDegree.set(u, 0);
  }

  for (const u of nodes) {
    const rawTargets = dag.get(u);
    const targetSet = new Set<string>();
    if (rawTargets) {
      for (const t of rawTargets) {
        if (t !== u) targetSet.add(t); // bỏ self-loop
      }
    }
    const targets = Array.from(targetSet).sort(); // ENG-01
    outDegree.set(u, targets.length);
    for (const v of targets) {
      inNeighbors.get(v)?.push(u);
    }
  }

  // Khởi tạo PR_0 = 1 / N
  let pr = new Map<string, number>();
  for (const u of nodes) {
    pr.set(u, 1 / N);
  }

  // Lặp PageRank
  for (let iter = 0; iter < maxIter; iter++) {
    let danglingSum = 0;
    for (const w of nodes) {
      if ((outDegree.get(w) ?? 0) === 0) {
        danglingSum += pr.get(w)!;
      }
    }

    const nextPr = new Map<string, number>();
    let diffSum = 0;

    for (const u of nodes) {
      let inSum = 0;
      const inList = inNeighbors.get(u) ?? [];
      for (const v of inList) {
        const degV = outDegree.get(v) ?? 1;
        inSum += pr.get(v)! / degV;
      }

      const val = (1 - d) / N + d * (inSum + (1 / N) * danglingSum);
      nextPr.set(u, val);
      diffSum += Math.abs(val - pr.get(u)!);
    }

    pr = nextPr;
    if (diffSum < tol) break;
  }

  return pr;
}

export function rankFiles(
  fg: ReturnType<typeof fileGraph>,
  ingressFiles: Set<string>,
  report?: IngestionReport
): Map<string, number> {
  const allFilesSet = new Set<string>();
  for (const [src, adj] of fg) {
    allFilesSet.add(src);
    for (const dst of adj.keys()) {
      allFilesSet.add(dst);
    }
  }
  for (const f of ingressFiles) {
    allFilesSet.add(f);
  }

  const allFiles = Array.from(allFilesSet).sort(); // ENG-01
  const n = allFiles.length;
  const result = new Map<string, number>();
  if (n === 0) return result;
  if (n === 1) {
    const only = allFiles[0]!;
    result.set(only, 1 + (ingressFiles.has(only) ? CONFIG.INGRESS_BONUS : 0));
    return result;
  }

  // Tạo bản đồ cạnh nội bộ có thể chỉnh sửa
  const graphAdj = new Map<string, Map<string, number>>();
  for (const f of allFiles) {
    graphAdj.set(f, new Map());
  }
  for (const [src, adj] of fg) {
    for (const [dst, info] of adj) {
      if (src !== dst) {
        graphAdj.get(src)?.set(dst, info.weight);
      }
    }
  }

  // Xử lý SCC khổng lồ
  let sccs = tarjanScc(allFiles, graphAdj);
  function findLargestScc(currentSccs: string[][]): string[] {
    let largest: string[] = [];
    for (const scc of currentSccs) {
      if (scc.length > largest.length) {
        largest = scc;
      } else if (scc.length === largest.length && scc.length > 0) {
        const firstA = scc[0] ?? "";
        const firstB = largest[0] ?? "";
        if (firstA < firstB) largest = scc;
      }
    }
    return largest;
  }

  let largestScc = findLargestScc(sccs);
  // SCC 1 file không có vòng phụ thuộc ⇒ không bao giờ là "cụm vòng lớn" (repo nhỏ: 0.4 × 2 file = 0.8 < 1).
  const giantThreshold = Math.max(1, n * CONFIG.GIANT_SCC_RATIO);

  for (
    let removalCount = 0;
    removalCount < CONFIG.GIANT_SCC_MAX_WEAK_EDGE_REMOVALS;
    removalCount++
  ) {
    if (largestScc.length <= giantThreshold) break;

    // Tìm cạnh nội bộ có weight nhỏ nhất trong largestScc
    const sccNodeSet = new Set(largestScc);
    let minWeight = Infinity;
    let candidateEdge: { src: string; dst: string } | null = null;

    const sortedSccNodes = largestScc.slice().sort();
    for (const u of sortedSccNodes) {
      const uAdj = graphAdj.get(u);
      if (!uAdj) continue;
      const sortedTargets = Array.from(uAdj.keys()).sort();
      for (const v of sortedTargets) {
        if (sccNodeSet.has(v)) {
          const w = uAdj.get(v)!;
          if (w < minWeight) {
            minWeight = w;
            candidateEdge = { src: u, dst: v };
          } else if (w === minWeight && candidateEdge) {
            if (
              u < candidateEdge.src ||
              (u === candidateEdge.src && v < candidateEdge.dst)
            ) {
              candidateEdge = { src: u, dst: v };
            }
          }
        }
      }
    }

    if (!candidateEdge) break;

    // Xóa cạnh
    graphAdj.get(candidateEdge.src)?.delete(candidateEdge.dst);
    sccs = tarjanScc(allFiles, graphAdj);
    largestScc = findLargestScc(sccs);
  }

  if (largestScc.length > giantThreshold) {
    report?.warnings.push(
      `Phát hiện cụm phụ thuộc vòng lớn (${largestScc.length} file)`
    );
  }

  // Co SCC thành DAG
  const fileToSccLeader = new Map<string, string>();
  for (const scc of sccs) {
    const leader = scc[0]!;
    for (const f of scc) {
      fileToSccLeader.set(f, leader);
    }
  }

  const dag = new Map<string, Set<string>>();
  for (const scc of sccs) {
    dag.set(scc[0]!, new Set());
  }

  for (const [src, adj] of graphAdj) {
    const leaderSrc = fileToSccLeader.get(src)!;
    for (const dst of adj.keys()) {
      const leaderDst = fileToSccLeader.get(dst)!;
      if (leaderSrc !== leaderDst) {
        dag.get(leaderSrc)?.add(leaderDst);
      }
    }
  }

  // Tính PageRank trên DAG
  const dagRank = pageRank(dag);

  // Gán điểm cho từng file
  for (const f of allFiles) {
    const leader = fileToSccLeader.get(f)!;
    const pr = dagRank.get(leader) ?? 0;
    const bonus = ingressFiles.has(f) ? CONFIG.INGRESS_BONUS : 0;
    result.set(f, pr + bonus);
  }

  return result;
}
