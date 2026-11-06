"use client";
// 30 Mục 6.3 — cửa sổ Tổng quan, 3 giai đoạn (D-71): lúc đầu (client, 0 API) · trong lúc học · học hết (AI).
import type { ArchitecturalLayer } from "@/contracts";
import { Chip, LAYER_LABEL, Modal, PATTERN_LABEL, PlainText } from "@/components/ui/common";
import { mainPath } from "@/lib/graph";
import { useWorkbench } from "@/store/workbench";

export function RepoOverviewModal() {
  const open = useWorkbench((s) => s.ui.overview_open);
  const { result, analyses, overview, progress } = useWorkbench();
  const { setUi, openNode } = useWorkbench.getState();
  if (!open || !result) return null;
  const titleOf = (id: string) => result.nodes.find((n) => n.id === id)?.title ?? id;
  const NodeChip = ({ id }: { id: string }) => {
    const locked = progress?.nodes[id]?.status === "LOCKED";
    return <Chip className="mr-1 mb-1" tone={locked ? "muted" : "blue"} title={locked ? "Chưa mở" : "Mở bài"} onClick={locked ? undefined : () => openNode(id)}>{titleOf(id)}</Chip>;
  };

  const fp = result.fingerprint;
  const facts = overview && overview !== "PENDING" ? overview.facts : null;
  const roots = facts?.root_node_ids ?? result.nodes.filter((n) => n.prerequisites.length === 0).map((n) => n.id).sort();
  const path = facts?.main_path_node_ids ?? mainPath(result);
  const layers = new Map<ArchitecturalLayer, string[]>();
  for (const n of result.nodes) for (const s of n.trace_steps) { const l = layers.get(s.layer) ?? []; if (!l.includes(n.id)) l.push(n.id); layers.set(s.layer, l); }

  const done = result.nodes.filter((n) => typeof analyses[n.id] === "object" || progress?.nodes[n.id]?.analysis_failed);
  const analysed = result.nodes.filter((n) => typeof analyses[n.id] === "object").map((n) => ({ n, a: analyses[n.id] as Exclude<(typeof analyses)[string], "PENDING" | "FAILED"> }));
  const patterns = new Map<string, number>();
  const skills = new Set<string>();
  for (const { a } of analysed) { a.architecture.patterns.forEach((p) => patterns.set(p, (patterns.get(p) ?? 0) + 1)); a.skills.forEach((s) => skills.add(s.skill)); }
  const ai = overview && overview !== "PENDING" ? overview.ai : null;

  return (
    <Modal open={open} onClose={() => setUi({ overview_open: false })} title="Tổng quan kiến trúc" wide>
      <div className="stagger flex flex-col gap-5 text-sm">
        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Dự án</h3>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="blue">{facts?.archetype ?? fp.archetype}</Chip>
            {(facts?.framework ?? fp.detected_framework) && <Chip>{facts?.framework ?? fp.detected_framework}</Chip>}
            {(facts?.tech_stack ?? fp.tech_stack).map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
        </section>
        <section><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Bắt đầu từ</h3>{roots.map((id) => <NodeChip key={id} id={id} />)}</section>
        <section><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Lộ trình học chính</h3>
          <p className="flex flex-wrap items-center gap-1">{path.map((id, i) => <span key={id} className="flex items-center gap-1">{i > 0 && <span className="text-muted">→</span>}<NodeChip id={id} /></span>)}</p></section>
        <section><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Bản đồ tầng</h3>
          {[...layers.entries()].map(([l, ids]) => <p key={l} className="mb-1"><b className="mr-2">{LAYER_LABEL[l]}</b>{ids.map((id) => <NodeChip key={id} id={id} />)}</p>)}</section>

        {!ai && (
          <section aria-live="polite">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Đã phát hiện ({done.length}/{result.nodes.length} node)</h3>
            {analysed.length === 0 ? <p className="text-muted">Nhận định của AI sẽ hiện khi các node được phân tích.</p> : (
              <div className="flex flex-col gap-2">
                <p>Mẫu kiến trúc: {[...patterns.entries()].map(([p, c]) => `${PATTERN_LABEL[p] ?? p} (${c} node)`).join(" · ")}</p>
                <p>Kỹ năng: {[...skills].join(", ")}</p>
                {analysed.flatMap(({ n, a }) => a.weak_points.map((w) => <p key={`${n.id}${w.skill}`} className="text-red">⚠ <NodeChip id={n.id} /> <PlainText text={w.what} /></p>))}
                {done.length < result.nodes.length && <p className="text-xs text-muted">Nhận định của AI sẽ hiện đầy đủ khi mọi node phân tích xong.</p>}
              </div>
            )}
          </section>
        )}
        {overview === "PENDING" && <p className="text-muted">đang tổng hợp nhận định của AI…</p>}
        {ai && (
          <section className="sf-callout p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-violet">Nhận định của AI — có thể chưa chính xác</h3>
            <p><Chip tone="blue">{PATTERN_LABEL[ai.architecture_style] ?? ai.architecture_style}</Chip></p>
            <p className="mt-2"><PlainText text={ai.summary} /></p>
            <p className="mt-2 text-muted"><PlainText text={ai.main_flow} /></p>
            {ai.layers.map((l) => <p key={l.layer} className="mt-2"><b>{LAYER_LABEL[l.layer]}:</b> <PlainText text={l.role} /> {l.nodes.map((id) => <NodeChip key={id} id={id} />)}</p>)}
            {ai.notes.map((n, i) => <p key={i} className="mt-2 text-red">⚠ <PlainText text={n.text} /> {n.nodes.map((id) => <NodeChip key={id} id={id} />)}</p>)}
          </section>
        )}
      </div>
    </Modal>
  );
}
