// 10 Mục 10 — định dạng đặc biệt: .ipynb / .vue / .svelte ⇒ file ảo + VirtualFileOrigin.
import type { IngestionReport, LanguageId, VirtualFileOrigin } from "@/contracts";

interface NotebookCell { cell_type?: string; source?: string | string[]; input?: string | string[] }
const joinSrc = (s: string | string[] | undefined): string => (Array.isArray(s) ? s.join("") : (s ?? ""));

/** ING-100 */
export function extractNotebook(path: string, json: string, report: IngestionReport):
  { virtual_path: string; code: string; origin: VirtualFileOrigin } | null {
  let nb: {
    cells?: NotebookCell[]; worksheets?: Array<{ cells?: NotebookCell[] }>;
    metadata?: { kernelspec?: { language?: string }; language_info?: { name?: string } };
  };
  try { nb = JSON.parse(json); } catch {
    report.warnings.push(`Notebook ${path} bị hỏng định dạng`);
    return null;
  }
  const lang = (nb.metadata?.kernelspec?.language ?? nb.metadata?.language_info?.name ?? "python").toLowerCase();
  if (lang !== "python") { report.skipped.unsupported_lang++; return null; }
  const cells = nb.cells ?? nb.worksheets?.[0]?.cells ?? [];
  const lines: string[] = [];
  const origin: string[] = [];
  cells.forEach((c, idx) => {
    if (c.cell_type !== "code") return;
    const label = `cell ${idx + 1}`;
    lines.push(`# %% [cell ${idx + 1}]`); origin.push(label);
    const src = joinSrc(c.source ?? c.input).replace(/\n$/, "");
    for (const l of src.split("\n")) {
      lines.push(/^\s*[%!]/.test(l) ? `# [magic] ${l}` : l);
      origin.push(label);
    }
  });
  if (lines.length === 0) return null;
  return {
    virtual_path: `${path}.py`, code: lines.join("\n"),
    origin: { kind: "NOTEBOOK", original_path: path, line_origin: origin },
  };
}

/** ING-101 */
export function extractSfcScript(path: string, text: string):
  { virtual_path: string; code: string; language: LanguageId; origin: VirtualFileOrigin } | null {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const m = re.exec(text);
  if (!m) return null;
  const ts = /lang\s*=\s*["'](?:ts|typescript)["']/i.test(m[1]);
  const start = m.index + m[0].indexOf(">") + 1; // ký tự đầu nội dung <script>
  const end = start + m[2].length;
  let code = "";
  const lineOrigin: string[] = [""];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const inside = i >= start && i < end;
    if (ch === "\n") { code += "\n"; lineOrigin.push(""); continue; }
    if (inside) { code += ch; lineOrigin[lineOrigin.length - 1] = "<script>"; }
  }
  return {
    virtual_path: `${path}${ts ? ".ts" : ".js"}`, code, language: ts ? "TYPESCRIPT" : "JAVASCRIPT",
    origin: { kind: "SFC", original_path: path, line_origin: lineOrigin },
  };
}

/** ING-102 */
export function originNoteFor(origin: VirtualFileOrigin, lines: number[]): string | undefined {
  const labels = new Set<string>();
  for (const n of lines) { if (n > 0) { const l = origin.line_origin[n - 1]; if (l) labels.add(l); } }
  if (labels.size === 0) return undefined;
  if (origin.kind === "SFC") return "<script>";
  const nums = [...labels].map((l) => Number(l.replace("cell ", ""))).filter((x) => !Number.isNaN(x));
  if (nums.length === 0) return undefined;
  const a = Math.min(...nums), b = Math.max(...nums);
  return a === b ? `cell ${a}` : `cell ${a}–${b}`;
}
