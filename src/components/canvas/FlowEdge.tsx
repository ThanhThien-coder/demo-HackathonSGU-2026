"use client";
// Cạnh có chuyển động (30 Mục 4): nét gốc giữ đúng luật (RESOLVED liền, INFERRED đứt, màu theo nguồn khi COMPLETED/FAILED),
// chuyển động là lớp phủ riêng (vệt sáng + chấm chạy theo hướng học) — KHÔNG dùng `animated` của xyflow
// nên nét đứt vẫn chỉ mang nghĩa "suy luận". `prefers-reduced-motion` ⇒ không vẽ lớp chuyển động.
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

export interface FlowEdgeData extends Record<string, unknown> {
  color: string;       // màu chấm / vệt (CSS var)
  idle: boolean;       // nguồn chưa mở ⇒ chạy chậm, mờ
  hot: boolean;        // nối với node đang mở ⇒ sáng hơn
  motion: boolean;
  delay: number;       // lệch pha để các chấm không chạy đều tăm tắp
}
export type FlowEdgeT = Edge<FlowEdgeData, "flow">;

export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data }: EdgeProps<FlowEdgeT>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12 });
  const d = data ?? { color: "var(--locked)", idle: true, hot: false, motion: false, delay: 0 };
  const dur = d.idle ? 5 : d.hot ? 1.8 : 2.8;
  return (
    <>
      {d.hot && <path d={path} fill="none" className="edge-halo" style={{ stroke: d.color }} />}
      <BaseEdge id={id} path={path} style={style} />
      {d.motion && (
        <g className={d.idle ? "edge-idle" : undefined} style={{ color: d.color }}>
          {!d.idle && (
            <path d={path} fill="none" pathLength={100} className="edge-comet"
              style={{ stroke: d.color, animationDuration: `${dur}s`, animationDelay: `-${d.delay}s` }} />
          )}
          <circle r={d.hot ? 3.4 : 2.6} className="edge-dot" style={{ fill: d.color }}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`-${d.delay}s`} path={path} rotate="auto" />
          </circle>
        </g>
      )}
    </>
  );
}
