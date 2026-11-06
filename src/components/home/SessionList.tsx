"use client";
// 30 Mục 2.1 — "Tiếp tục học": GET /api/sessions (mới nhất trước).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LearningSessionSummary } from "@/contracts";
import { Button, Chip, Modal } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";

const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} phút`;
  if (m < 60 * 24) return `${Math.round(m / 60)} giờ`;
  return `${Math.round(m / 1440)} ngày`;
};

export const sessionLine = (s: LearningSessionSummary) => {
  const sha = `${s.snapshot.snapshot_id.slice(0, 7)}${s.snapshot.snapshot_id_kind === "ARCHIVE_HASH" ? " zip" : ""}`;
  return `${s.repo_name} · ${s.snapshot.ref_label ?? ""} @ ${sha}${s.snapshot.subdir ? ` · ${s.snapshot.subdir}` : ""}`;
};

export function SessionList({ compact }: { compact?: boolean }) {
  const sessions = useWorkbench((s) => s.ui.sessions);
  const auth = useWorkbench((s) => s.ui.auth);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const offline = useWorkbench((s) => s.is_offline_mode);
  const { resumeSession, loadSessions } = useWorkbench.getState();
  const router = useRouter();
  const [restartOf, setRestartOf] = useState<LearningSessionSummary | null>(null);
  useEffect(() => { if (auth === "user" && !offline && sessions === null) void loadSessions(); }, [auth, offline, sessions, loadSessions]);
  if (auth !== "user" || offline) return null;
  if (!sessions || sessions.length === 0) return compact ? <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-panel/60 px-4 py-8 text-center text-sm text-muted">Chưa có phiên học nào — dán link repo ở trang chủ để bắt đầu.</p> : null;

  const open = async (id: string, restart = false) => { await resumeSession(id, restart); if (useWorkbench.getState().session_id) router.push(`/learn?session=${useWorkbench.getState().session_id}`); };

  return (
    <section aria-label="Tiếp tục học" className="mt-8">
      <h2 className="sf-metric-label mb-2">Tiếp tục học</h2>
      <ul className="sf-list">
        {sessions.map((s) => (
          <li key={s.session_id} className="sf-row flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-text">{sessionLine(s)}</p>
              <p className="mt-1 font-mono text-xs text-subtle">
                {s.completed_count}/{s.total_nodes} node{s.failed_count > 0 && <> (<span className="text-red">{s.failed_count} ✗</span>)</>} · {ago(s.last_active_at)} trước
              </p>
            </div>
            <div className="flex items-center gap-2">
              {s.can_resume ? (
                <>
                  <Button disabled={ingesting} onClick={() => void open(s.session_id)}>Học tiếp</Button>
                  <Button variant="ghost" disabled={ingesting} onClick={() => setRestartOf(s)}>Học lại từ đầu</Button>
                </>
              ) : <Chip tone="amber" title="Phiên tạo bằng phiên bản engine cũ">Engine đã cập nhật</Chip>}
              <Link href={`/history?session=${s.session_id}`} className="btn-secondary rounded-lg px-3 py-1.5 text-sm font-semibold">{s.can_resume ? "Lịch sử" : "Xem lịch sử"}</Link>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!restartOf} onClose={() => setRestartOf(null)} title="Học lại từ đầu"
        footer={<><Button variant="ghost" onClick={() => setRestartOf(null)}>Hủy</Button>
          <Button onClick={() => { const id = restartOf!.session_id; setRestartOf(null); void open(id, true); }}>Mở phiên mới</Button></>}>
        <p className="text-sm text-muted">Mở phiên mới cho repo này: tiến độ node làm lại, điểm kỹ năng giữ nguyên, câu hỏi sinh mới.</p>
      </Modal>
    </section>
  );
}
