// Chẩn đoán Uncle Bob — spec 11 Mục 12 (ENG-120).
import {
  CONFIG,
  type HybridArchitecturalNode,
  type ProjectFingerprint,
  type UncleBobMetrics,
} from "@/contracts";
import { getAdapter } from "./registry";
import type { EngineContext } from "./types";

/**
 * Chẩn đoán Uncle Bob Metrics cho một Node kiến trúc.
 */
export function diagnoseUncleBob(
  node: HybridArchitecturalNode,
  fg: Map<
    string,
    Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>
  >,
  ctx: EngineContext,
  fingerprint?: ProjectFingerprint
): UncleBobMetrics {
  const S = new Set(node.files);

  // 1. Kiểm tra miễn trừ node ảo
  if (node.id.startsWith("vnode-") || node.entry_symbol === null) {
    return {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    };
  }

  // 2. Archetype UI
  const isUiArchetype =
    fingerprint?.archetype === "WEB_FRONTEND" ||
    fingerprint?.archetype === "MOBILE_APP" ||
    fingerprint?.archetype === "DESKTOP_APP";

  const firstFile = node.files[0] ?? "";
  const isUiFile =
    firstFile.endsWith(".tsx") ||
    firstFile.endsWith(".jsx") ||
    firstFile.endsWith(".vue") ||
    firstFile.endsWith(".svelte") ||
    (firstFile.endsWith(".dart") &&
      (ctx.files.get(firstFile)?.source.includes("package:flutter") ?? false));

  if (isUiArchetype && isUiFile) {
    return {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    };
  }

  // 3. Mọi file của S là JAVASCRIPT hoặc STRUCTURAL thiếu abstraction_kinds
  let allJsOrStructuralNoAbstract = S.size > 0;
  for (const f of S) {
    const pf = ctx.files.get(f);
    if (!pf) continue;
    const adapter = getAdapter(pf.language);
    const hasAbstractionKinds =
      adapter?.abstraction_kinds && adapter.abstraction_kinds.length > 0;

    if (
      pf.language === "JAVASCRIPT" ||
      (pf.tier === "STRUCTURAL" && !hasAbstractionKinds)
    ) {
      // thỏa mãn
    } else {
      allJsOrStructuralNoAbstract = false;
      break;
    }
  }

  if (allJsOrStructuralNoAbstract) {
    return {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    };
  }

  // 4. Tính Ce và Ca
  const outFiles = new Set<string>();
  const inFiles = new Set<string>();

  for (const f of S) {
    const adj = fg.get(f);
    if (adj) {
      for (const target of adj.keys()) {
        if (!S.has(target)) {
          outFiles.add(target);
        }
      }
    }
  }

  for (const [src, adj] of fg) {
    if (!S.has(src)) {
      for (const target of adj.keys()) {
        if (S.has(target)) {
          inFiles.add(src);
        }
      }
    }
  }

  const Ce = outFiles.size;
  const Ca = inFiles.size;

  if (Ca + Ce === 0) {
    return {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    };
  }

  // 5. Tính Na và Nc
  let Na = 0;
  let Nc = 0;

  for (const [, sym] of ctx.idx.symbols) {
    if (!S.has(sym.file_path)) continue;

    if (sym.kind === "INTERFACE" || sym.kind === "TYPE") {
      Na++;
    } else if (sym.kind === "CLASS") {
      // Kiểm tra abstract class
      const pf = ctx.files.get(sym.file_path);
      const isAbstract =
        pf &&
        /\b(abstract\s+class|class\s+\w+\s*\(.*(ABC|Protocol).*\))\b/.test(
          pf.source.slice(
            Math.max(0, sym.line_start - 1),
            Math.min(pf.source.length, sym.line_end * 100)
          )
        );

      if (isAbstract) {
        Na++;
      } else {
        Nc++;
      }
    }
  }

  if (Na + Nc === 0) {
    return {
      instability: 0,
      abstractness: 0,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: true,
    };
  }

  // 6. Tính chỉ số I, A, D
  const I = Number((Ce / (Ca + Ce)).toFixed(4));
  const A = Number((Na / (Na + Nc)).toFixed(4));
  const D = Number(Math.abs(A + I - 1).toFixed(4));

  let diagnosis: UncleBobMetrics["diagnosis"] = "BALANCED";
  if (D < CONFIG.UNCLE_BOB_BALANCED_MAX_D) {
    diagnosis = "BALANCED";
  } else if (D >= CONFIG.UNCLE_BOB_ZONE_MIN_D && A + I < 1) {
    diagnosis = "ZONE_OF_PAIN";
  } else if (D >= CONFIG.UNCLE_BOB_ZONE_MIN_D && A + I > 1) {
    diagnosis = "ZONE_OF_USELESSNESS";
  } else {
    diagnosis = "BALANCED";
  }

  return {
    instability: I,
    abstractness: A,
    distance: D,
    diagnosis,
    is_exempt: false,
  };
}
