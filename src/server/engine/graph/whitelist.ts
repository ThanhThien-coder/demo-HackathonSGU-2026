// Whitelist symbol và tìm đường chính mainPath — spec 11 Mục 15, D-19, ENG-155.
import type { StaticEngineResult } from "@/contracts";
import type { SymbolIndex } from "./types";

/**
 * Xây dựng symbol whitelist ở phạm vi repo (D-19).
 */
export function buildSymbolWhitelist(
  idx: SymbolIndex,
  finalStepFunctions: string[]
): string[] {
  const whitelistSet = new Set<string>();

  // 1. (a) name của mọi SymbolDefinition + Class.method
  for (const [key, sym] of idx.symbols) {
    if (sym.name && !sym.name.includes("<")) {
      whitelistSet.add(sym.name);
    }
    // Class.method
    if (sym.kind === "METHOD" && key.includes("#")) {
      const memberPart = key.split("#")[1];
      if (memberPart && memberPart.includes(".") && !memberPart.includes("<")) {
        whitelistSet.add(memberPart);
      }
    }
  }

  // 2. (b) Field/property trong lớp, interface, type
  for (const [fKey] of idx.field_types) {
    const raw = fKey.includes("#") ? fKey.split("#")[1]! : fKey;
    const parts = raw.split(".");
    const propName = parts[parts.length - 1];
    if (propName && !propName.includes("<")) {
      whitelistSet.add(propName);
    }
    if (parts.length > 1 && !raw.includes("<")) {
      whitelistSet.add(raw);
    }
  }

  // 3. (c) Tham số + biến cục bộ của các hàm là bước trong node cuối
  const finalFuncSet = new Set(finalStepFunctions);
  for (const fnKey of finalFuncSet) {
    const fnInfo = idx.functions.get(fnKey);
    if (fnInfo) {
      for (const p of fnInfo.params) {
        if (p && !p.includes("<")) whitelistSet.add(p);
      }
      for (const loc of fnInfo.locals) {
        if (loc && !loc.includes("<")) whitelistSet.add(loc);
      }
    }

    const localsSet = idx.locals.get(fnKey);
    if (localsSet) {
      for (const v of localsSet) {
        if (v && !v.includes("<")) whitelistSet.add(v);
      }
    }
  }

  // Loại bỏ các chuỗi rỗng hoặc chỉ có khoảng trắng
  const result: string[] = [];
  for (const item of whitelistSet) {
    const trimmed = item.trim();
    if (trimmed.length > 0 && !trimmed.includes("<")) {
      result.push(trimmed);
    }
  }

  // Sort theo UTF-16 (ENG-01)
  return result.sort();
}

/**
 * ENG-155: Đường dài nhất trên đồ thị kiến trúc DAG bằng quy hoạch động (Kahn's Algorithm).
 * Không giới hạn CRITICAL_PATH_MAX_NODES; khi hòa chỉ theo id nhỏ hơn.
 */
export function mainPath(graph: StaticEngineResult): string[] {
  const nodes = graph.nodes;
  const edges = graph.edges;
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
  }

  // Sắp xếp danh sách kề theo id tăng dần để đảm bảo tính tất định
  for (const [u, list] of adj) {
    list.sort();
    adj.set(u, list);
  }

  // Tô-pô Kahn
  const queue: string[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
    }
  }
  queue.sort();

  const topoOrder: string[] = [];
  const currentInDegree = new Map(inDegree);

  while (queue.length > 0) {
    // Luôn lấy phần tử có id nhỏ nhất trước
    queue.sort();
    const u = queue.shift()!;
    topoOrder.push(u);

    for (const v of adj.get(u) ?? []) {
      const d = currentInDegree.get(v)! - 1;
      currentInDegree.set(v, d);
      if (d === 0) {
        queue.push(v);
      }
    }
  }

  // Quy hoạch động tìm đường dài nhất:
  // dist[u] = số đỉnh trên đường đi dài nhất kết thúc tại u
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const n of nodes) {
    dist.set(n.id, 1);
    prev.set(n.id, null);
  }

  for (const u of topoOrder) {
    const dU = dist.get(u)!;
    for (const v of adj.get(u) ?? []) {
      const candidateDist = dU + 1;
      const currentDist = dist.get(v)!;

      if (candidateDist > currentDist) {
        dist.set(v, candidateDist);
        prev.set(v, u);
      } else if (candidateDist === currentDist) {
        // Khi hòa khoảng cách: ưu tiên cha có id nhỏ hơn
        const currentPrev = prev.get(v);
        if (!currentPrev || u < currentPrev) {
          prev.set(v, u);
        }
      }
    }
  }

  // Tìm đỉnh cuối có dist lớn nhất (hòa => id nhỏ hơn)
  let bestEndNode: string | null = null;
  let maxDist = -1;

  for (const n of nodes) {
    const d = dist.get(n.id)!;
    if (d > maxDist) {
      maxDist = d;
      bestEndNode = n.id;
    } else if (d === maxDist && bestEndNode && n.id < bestEndNode) {
      bestEndNode = n.id;
    }
  }

  if (!bestEndNode) return [];

  // Truy vết đường đi từ đỉnh cuối về đỉnh đầu
  const path: string[] = [];
  let cur: string | null = bestEndNode;
  while (cur) {
    path.push(cur);
    cur = prev.get(cur) ?? null;
  }

  path.reverse();
  return path;
}
