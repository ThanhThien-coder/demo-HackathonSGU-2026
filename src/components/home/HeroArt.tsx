// Hình minh họa trang chủ (chỉ trang trí, aria-hidden): bản đồ lát cắt thu nhỏ với 4 trạng thái node (INV-11), cạnh chạy chấm.
const NODES = [
  { x: 150, y: 34, label: "Đăng nhập", st: "done" },
  { x: 58, y: 128, label: "Giỏ hàng", st: "done" },
  { x: 242, y: 128, label: "Sản phẩm", st: "ready" },
  { x: 150, y: 222, label: "Thanh toán", st: "locked" },
  { x: 290, y: 222, label: "Gợi ý", st: "failed" },
] as const;
const EDGES: Array<[number, number, boolean]> = [[0, 1, false], [0, 2, false], [1, 3, false], [2, 3, true], [2, 4, false]];
const COLOR = { done: "var(--green)", ready: "var(--amber)", locked: "var(--locked)", failed: "var(--red)" } as const;
const ICON = { done: "✓", ready: "●", locked: "🔒", failed: "✗" } as const;

export function HeroArt({ className }: { className?: string }) {
  const W = 92, H = 34;
  return (
    <svg viewBox="0 0 360 270" className={className} aria-hidden fill="none">
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: "var(--accent-2)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id="hero-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--panel-hi)" }} />
          <stop offset="100%" style={{ stopColor: "var(--panel-2)" }} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="360" height="270" fill="url(#hero-glow)" />
      {EDGES.map(([a, b, inferred], i) => {
        const s = NODES[a], t = NODES[b];
        const done = s.st === "done";
        const d = `M${s.x} ${s.y + H / 2} C ${s.x} ${(s.y + t.y) / 2 + 10}, ${t.x} ${(s.y + t.y) / 2 - 10}, ${t.x} ${t.y - H / 2}`;
        return (
          <g key={i}>
            <path d={d} style={{ stroke: done ? "var(--green)" : "var(--locked)" }} strokeOpacity={done ? 0.7 : 0.6} strokeWidth="1.6" strokeDasharray={inferred ? "5 4" : undefined} />
            {done && <path d={d} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2 14" className="hero-flow" style={{ stroke: "var(--green)", animationDelay: `${i * 0.3}s` }} />}
          </g>
        );
      })}
      {NODES.map((n, i) => (
        <g key={n.label} className="hero-node" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
          <rect x={n.x - W / 2} y={n.y - H / 2} width={W} height={H} rx="8" fill="url(#hero-card)"
            style={{ stroke: COLOR[n.st] }} strokeWidth="1.5" strokeDasharray={n.st === "locked" ? "4 3" : undefined}
            className={n.st === "ready" ? "hero-pulse" : undefined} />
          <rect x={n.x - W / 2 + 5} y={n.y - H / 2 + 7} width="3" height={H - 14} rx="1.5" style={{ fill: COLOR[n.st] }} opacity={n.st === "locked" ? 0.5 : 1} />
          <text x={n.x - W / 2 + 14} y={n.y + 4} fontSize="11" fontWeight="700" style={{ fill: n.st === "locked" ? "var(--muted)" : "var(--text)", fontFamily: "var(--font-sans)" }}>{n.label}</text>
          <text x={n.x + W / 2 - 8} y={n.y + 4} fontSize="10" textAnchor="end" style={{ fill: COLOR[n.st] }}>{ICON[n.st]}</text>
        </g>
      ))}
    </svg>
  );
}
