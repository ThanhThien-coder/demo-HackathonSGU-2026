// Thuật toán Tarjan tìm thành phần liên thông mạnh (SCC) — spec 11 Mục 6 (ENG-60).
// ENG-01: DFS theo khóa sort, bỏ self-loop, tất định.

export function tarjanScc(
  nodes: string[],
  adj: Map<string, Iterable<string> | Map<string, unknown> | string[]>
): string[][] {
  const sortedNodes = nodes.slice().sort(); // ENG-01
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(u: string): void {
    indices.set(u, index);
    lowlink.set(u, index);
    index++;
    stack.push(u);
    onStack.set(u, true);

    // Lấy neighbors, bỏ self-loop, sort theo UTF-16
    const neighborsRaw = adj.get(u);
    const neighbors: string[] = [];
    if (neighborsRaw) {
      if (neighborsRaw instanceof Map) {
        for (const v of neighborsRaw.keys()) {
          if (v !== u) neighbors.push(v);
        }
      } else {
        for (const v of neighborsRaw) {
          if (v !== u) neighbors.push(v);
        }
      }
    }
    neighbors.sort(); // ENG-01

    for (const v of neighbors) {
      if (!indices.has(v)) {
        strongConnect(v);
        const lowU = lowlink.get(u)!;
        const lowV = lowlink.get(v)!;
        lowlink.set(u, Math.min(lowU, lowV));
      } else if (onStack.get(v)) {
        const lowU = lowlink.get(u)!;
        const idxV = indices.get(v)!;
        lowlink.set(u, Math.min(lowU, idxV));
      }
    }

    if (lowlink.get(u) === indices.get(u)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.set(w, false);
        scc.push(w);
      } while (w !== u);
      scc.sort(); // ENG-01
      sccs.push(scc);
    }
  }

  for (const u of sortedNodes) {
    if (!indices.has(u)) {
      strongConnect(u);
    }
  }

  // Sắp xếp các SCC theo phần tử đầu tiên để thứ tự luôn tất định
  sccs.sort((a, b) => {
    const firstA = a[0] ?? "";
    const firstB = b[0] ?? "";
    if (firstA < firstB) return -1;
    if (firstA > firstB) return 1;
    return 0;
  });

  return sccs;
}
