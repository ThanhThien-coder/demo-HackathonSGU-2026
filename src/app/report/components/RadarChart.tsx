"use client";

import React, { useState } from "react";
import type { SWESkill, CognitiveSkillState, LearnerTier } from "@/contracts";
import { SWE_SKILLS } from "@/contracts/base";
import { getDecayedMastery, tierOf, isDecaying } from "@/lib/bkt-engine";
import { cn } from "@/lib/utils";
import { Award, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface SkillDisplayInfo {
  skill: SWESkill;
  label: string;
  category: "Architecture" | "Data" | "Security" | "Performance";
  rawMastery: number;
  decayedMastery: number;
  tier: LearnerTier;
  practiceCount: number;
  correctCount: number;
  isPracticed: boolean;
  isDecaying: boolean;
}

export const SKILL_METADATA: Record<
  SWESkill,
  { label: string; short: string; category: SkillDisplayInfo["category"] }
> = {
  HTTP_ROUTING: { label: "Điều hướng HTTP", short: "HTTP", category: "Architecture" },
  DTO_VALIDATION: { label: "Xác thực DTO", short: "DTO", category: "Data" },
  AUTH_SECURITY: { label: "Bảo mật & Auth", short: "AUTH", category: "Security" },
  DEPENDENCY_INJECTION: { label: "Tiêm phụ thuộc (DI)", short: "DI", category: "Architecture" },
  LAYERED_SEPARATION: { label: "Phân tầng kiến trúc", short: "LAYER", category: "Architecture" },
  DB_OPTIMIZATION: { label: "Tối ưu Database", short: "DB", category: "Data" },
  ASYNC_CONCURRENCY: { label: "Bất đồng bộ & Luồng", short: "ASYNC", category: "Performance" },
  TRANSACTION_INTEGRITY: { label: "Toàn vẹn Transaction", short: "TX", category: "Data" },
  ERROR_HANDLING: { label: "Xử lý ngoại lệ", short: "ERR", category: "Architecture" },
  STATE_MANAGEMENT: { label: "Quản lý trạng thái", short: "STATE", category: "Architecture" },
  ALGORITHMIC_COMPLEXITY: { label: "Độ phức tạp thuật toán", short: "ALGO", category: "Performance" },
  MEMORY_MANAGEMENT: { label: "Quản lý bộ nhớ", short: "MEM", category: "Performance" },
  API_CONTRACT_DESIGN: { label: "Hợp đồng API", short: "API", category: "Architecture" },
  CACHING_STRATEGY: { label: "Chiến lược Caching", short: "CACHE", category: "Performance" },
  RATE_LIMIT_RESILIENCE: { label: "Chống nghẽn Rate Limit", short: "LIMIT", category: "Security" },
  DATA_SERIALIZATION: { label: "Tuần tự hóa dữ liệu", short: "SERIA", category: "Data" },
};

interface RadarChartProps {
  skills?: Partial<Record<SWESkill, CognitiveSkillState>>;
  overallTier?: LearnerTier;
  serverNow?: number;
  className?: string;
}

export function RadarChart({
  skills = {},
  overallTier = "NOVICE",
  serverNow = Date.now(),
  className,
}: RadarChartProps) {
  const [hoveredSkill, setHoveredSkill] = useState<SkillDisplayInfo | null>(null);

  // 1. Tính toán điểm decay và tier cho 16 kỹ năng
  const skillDetails: SkillDisplayInfo[] = SWE_SKILLS.map((skill) => {
    const state = skills[skill];
    const decayed = getDecayedMastery(state, serverNow);
    const meta = SKILL_METADATA[skill];
    return {
      skill,
      label: meta.label,
      category: meta.category,
      rawMastery: state?.p_mastery ?? 0.25,
      decayedMastery: decayed,
      tier: tierOf(decayed),
      practiceCount: state?.practice_count ?? 0,
      correctCount: state?.correct_count ?? 0,
      isPracticed: !!state && state.practice_count > 0,
      isDecaying: isDecaying(state, serverNow),
    };
  });

  // Điểm trung bình thông thạo BKT
  const practicedSkills = skillDetails.filter((s) => s.isPracticed);
  const avgMastery =
    practicedSkills.length > 0
      ? Math.round(
          (practicedSkills.reduce((sum, s) => sum + s.decayedMastery, 0) /
            practicedSkills.length) *
            100
        )
      : 25;

  // 2. Tọa độ Radar SVG
  const size = 420;
  const center = size / 2;
  const maxRadius = 145;
  const levels = [0.25, 0.5, 0.75, 1.0];
  const numAxes = SWE_SKILLS.length;

  const getCoordinates = (index: number, value: number, radius = maxRadius) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / numAxes;
    const r = radius * Math.max(0.08, Math.min(1, value));
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Polygon của người học
  const polygonPoints = skillDetails
    .map((s, idx) => {
      const { x, y } = getCoordinates(idx, s.decayedMastery);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Tier Badge Theme
  const tierConfig: Record<
    LearnerTier,
    { label: string; color: string; bg: string; border: string; desc: string }
  > = {
    NOVICE: {
      label: "Tập sự (Novice)",
      color: "text-[#944b00]",
      bg: "bg-[#fff7ed]",
      border: "border-[#ffedd5]",
      desc: "Đang nắm vững các khái niệm cơ bản & luồng thực thi",
    },
    PRACTITIONER: {
      label: "Thực hành (Practitioner)",
      color: "text-[#0369a1]",
      bg: "bg-[#f0f9ff]",
      border: "border-[#e0f2fe]",
      desc: "Vận dụng linh hoạt các mẫu kiến trúc trong dự án",
    },
    ARCHITECT: {
      label: "Kiến trúc sư (Architect)",
      color: "text-[#047857]",
      bg: "bg-[#ecfdf5]",
      border: "border-[#d1fae5]",
      desc: "Nắm trọn vẹn toàn cảnh hệ thống & tối ưu chuyên sâu",
    },
  };

  const currentTierInfo = tierConfig[overallTier];

  return (
    <div
      className={cn(
        "bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col gap-6 w-full",
        className
      )}
      data-node-id="report:radar-chart"
    >
      {/* Header section with overall tier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f3f4f6] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#131b2e] text-[20px] sm:text-[22px] leading-[30px]">
              Bản đồ năng lực 16 kỹ năng SWE (BKT Radar)
            </h2>
            <span className="text-xs bg-[#faf8ff] text-[#554337] px-2 py-0.5 rounded border border-[#eaedff] font-medium hidden sm:inline-block">
              Bayesian Knowledge Tracing
            </span>
          </div>
          <p className="text-[13px] text-[#554337] mt-0.5">
            Đánh giá độ thông thạo kiến trúc thời gian thực và tự động tính toán mài mòn theo thời gian
          </p>
        </div>

        {/* Overall Tier Pill */}
        <div
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[13px] font-bold self-start sm:self-auto",
            currentTierInfo.bg,
            currentTierInfo.color,
            currentTierInfo.border
          )}
        >
          <Award className="size-4 shrink-0" />
          <span>{currentTierInfo.label}</span>
        </div>
      </div>

      {/* Main Grid: Radar SVG on left, Skill stats & breakdown on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Interactive Radar SVG */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full overflow-visible select-none"
            >
              <defs>
                {/* Radial Gradient for user mastery polygon */}
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff9640" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#ff9640" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#944b00" stopOpacity="0.15" />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Concentric Grid Levels (25%, 50%, 75%, 100%) */}
              {levels.map((lvl) => {
                const pts = SWE_SKILLS.map((_, idx) => {
                  const { x, y } = getCoordinates(idx, lvl);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(" ");
                return (
                  <polygon
                    key={lvl}
                    points={pts}
                    fill="none"
                    stroke="#eaedff"
                    strokeWidth={lvl === 1.0 ? "1.5" : "1"}
                    strokeDasharray={lvl < 1.0 ? "3 3" : undefined}
                  />
                );
              })}

              {/* Radial Axis Lines */}
              {SWE_SKILLS.map((_, idx) => {
                const { x, y } = getCoordinates(idx, 1.0);
                return (
                  <line
                    key={idx}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#f0f1f7"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Level % Labels along the top vertical axis */}
              {levels.map((lvl) => (
                <text
                  key={lvl}
                  x={center + 4}
                  y={center - maxRadius * lvl + 10}
                  fill="#9ca3af"
                  fontSize="9"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {Math.round(lvl * 100)}%
                </text>
              ))}

              {/* User Mastery Shaded Polygon */}
              <polygon
                points={polygonPoints}
                fill="url(#radarFill)"
                stroke="#ff9640"
                strokeWidth="2.5"
                filter="url(#glow)"
                className="transition-all duration-700 ease-out"
              />

              {/* Vertex Nodes & Hover Targets */}
              {skillDetails.map((s, idx) => {
                const { x, y } = getCoordinates(idx, s.decayedMastery);
                const isHovered = hoveredSkill?.skill === s.skill;

                return (
                  <g
                    key={s.skill}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredSkill(s)}
                    onMouseLeave={() => setHoveredSkill(null)}
                  >
                    {/* Pulsing ring on hover */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill="none"
                        stroke="#ff9640"
                        strokeWidth="1.5"
                        className="animate-ping"
                      />
                    )}

                    {/* Vertex point */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "6" : "4"}
                      fill={s.isPracticed ? "#944b00" : "#cbd5e1"}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}

              {/* Outer Axis Labels */}
              {skillDetails.map((s, idx) => {
                const { x, y, angle } = getCoordinates(idx, 1.0, maxRadius + 22);
                const meta = SKILL_METADATA[s.skill];
                const isHovered = hoveredSkill?.skill === s.skill;

                // Căn chỉnh chữ theo góc
                let textAnchor: "start" | "middle" | "end" = "middle";
                if (Math.cos(angle) > 0.25) textAnchor = "start";
                else if (Math.cos(angle) < -0.25) textAnchor = "end";

                return (
                  <text
                    key={s.skill}
                    x={x}
                    y={y + 4}
                    textAnchor={textAnchor}
                    className={cn(
                      "text-[10px] font-bold transition-colors cursor-pointer",
                      isHovered
                        ? "fill-[#ff9640] font-black"
                        : s.isPracticed
                        ? "fill-[#131b2e]"
                        : "fill-[#94a3b8]"
                    )}
                    onMouseEnter={() => setHoveredSkill(s)}
                    onMouseLeave={() => setHoveredSkill(null)}
                  >
                    {meta.short}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredSkill && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#131b2e] text-white px-3.5 py-2 rounded-[10px] shadow-lg pointer-events-none text-xs flex flex-col items-center gap-0.5 z-20 whitespace-nowrap border border-white/10">
                <div className="font-bold text-[#ff9640] flex items-center gap-1.5">
                  <span>{hoveredSkill.label}</span>
                  <span className="text-[10px] bg-white/20 px-1 rounded text-white">
                    {hoveredSkill.tier}
                  </span>
                  {hoveredSkill.isDecaying && (
                    <span className="text-[9px] bg-[#ea580c] text-white px-1 py-0.5 rounded font-bold">
                      Đang mài mòn
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-300 flex items-center gap-2">
                  <span>
                    Điểm BKT: <strong>{Math.round(hoveredSkill.decayedMastery * 100)}%</strong>
                  </span>
                  <span>•</span>
                  <span>Đã luyện: {hoveredSkill.practiceCount} lần</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[12px] text-[#554337] mt-2">
            Di chuột vào từng điểm đỉnh để xem chi tiết độ thông thạo và số lần luyện tập
          </div>
        </div>

        {/* Right Column: Skill Summary & Tier Diagnostics */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Average Mastery Card */}
          <div className="bg-[#faf8ff] border border-[#eaedff] rounded-[14px] p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[12px] text-[#554337] font-semibold">
                Độ thông thạo trung bình
              </span>
              <span className="text-[26px] font-extrabold text-[#131b2e] leading-tight">
                {avgMastery}%
              </span>
              <span className="text-[11px] text-[#554337] mt-0.5">
                {practicedSkills.length}/16 kỹ năng đã ghi nhận lượt làm bài
              </span>
            </div>
            <div className="size-12 rounded-full bg-[#ff9640]/15 flex items-center justify-center text-[#ff9640]">
              <TrendingUp className="size-6" />
            </div>
          </div>

          {/* Quick List: Top Skills Mastered */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[13px] font-bold text-[#131b2e]">
              <span>Kỹ năng nổi bật</span>
              <span className="text-[#944b00] text-[11px] font-semibold">BKT Mastery</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {skillDetails
                .filter((s) => s.isPracticed)
                .sort((a, b) => b.decayedMastery - a.decayedMastery)
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.skill}
                    className="flex items-center justify-between p-2.5 rounded-[10px] bg-white border border-[#f3f4f6] text-[12px]"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#00b380] shrink-0" />
                      <span className="font-semibold text-[#131b2e]">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isDecaying && (
                        <span className="text-[10px] font-bold text-[#ea580c] bg-[#fff7ed] px-1.5 py-0.5 rounded border border-[#fed7aa]">
                          Mài mòn
                        </span>
                      )}
                      <span className="font-bold text-[#047857]">
                        {Math.round(item.decayedMastery * 100)}%
                      </span>
                    </div>
                  </div>
                ))}

              {practicedSkills.length === 0 && (
                <div className="p-3 text-center text-[12px] text-[#887365] bg-[#faf8ff] rounded-[10px] border border-dashed border-[#eaedff]">
                  Chưa có kỹ năng nào được ghi nhận. Bắt đầu trả lời câu hỏi Feynman trong buồng lái để cập nhật!
                </div>
              )}
            </div>
          </div>

          {/* Skills Needing Refresh (Decay Warning) */}
          <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-[12px] p-3.5 flex items-start gap-3">
            <AlertTriangle className="size-5 text-[#ff9640] shrink-0 mt-0.5" />
            <div className="flex flex-col text-[12px] text-[#944b00]">
              <span className="font-bold text-[13px]">Quy luật mài mòn trí nhớ (Decay)</span>
              <p className="mt-0.5 leading-relaxed text-[#7c3700]">
                Theo mô hình BKT của SimpliFey, điểm kỹ năng sẽ giảm dần theo thời gian nếu không được luyện tập định kỳ. Hãy quay lại ôn tập các hàm liên quan để duy trì danh hiệu!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
