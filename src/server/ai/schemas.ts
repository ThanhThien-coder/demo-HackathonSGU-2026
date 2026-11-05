// 20 AI-17, AI-29 — responseSchema của 4 lời gọi. Schema chỉ định hướng model; ràng buộc do cổng gác (21) kiểm lại.
import { Type, type Schema } from "@google/genai";
import { CONFIG } from "@/contracts/config";
import { ARCHITECTURE_PATTERNS, SWE_SKILLS } from "@/contracts/base";
import type { ArchitecturalLayer, QuestionPlanItem } from "@/contracts";

const S: Schema = { type: Type.STRING }, I: Schema = { type: Type.INTEGER }, B: Schema = { type: Type.BOOLEAN };
const en = (v: readonly string[]): Schema => ({ type: Type.STRING, enum: [...v] });
const nul = (s: Schema): Schema => ({ ...s, nullable: true });
const obj = (p: Record<string, Schema>): Schema => ({ type: Type.OBJECT, properties: p, required: Object.keys(p), propertyOrdering: Object.keys(p) });
const arr = (items: Schema, min?: number, max?: number): Schema => ({
  type: Type.ARRAY, items,
  ...(min !== undefined && { minItems: String(min) }), ...(max !== undefined && { maxItems: String(max) }),
});
export const LAYERS: readonly ArchitecturalLayer[] = ["ENTRY_POINT", "MIDDLEWARE", "BUSINESS_LOGIC", "DATA_ACCESS", "ALGO_SETUP", "ALGO_EXECUTION", "ALGO_TERMINATION"];

export const ANALYZE_SCHEMA = obj({
  skills: arr(obj({ skill: en(SWE_SKILLS), step: I, symbol: S, reason: S }), CONFIG.ANALYSIS_MIN_SKILLS, CONFIG.ANALYSIS_MAX_SKILLS),
  architecture: obj({ patterns: arr(en(ARCHITECTURE_PATTERNS), 1, CONFIG.ANALYSIS_MAX_PATTERNS), summary: S }),
  steps: arr(obj({ step: I, text: S })), strengths: arr(obj({ step: I, text: S })),
  weak_points: arr(obj({ skill: en(SWE_SKILLS), step: I, symbol: S, what: S, consequence: S })),
});

export const OVERVIEW_SCHEMA = obj({
  architecture_style: en(ARCHITECTURE_PATTERNS), summary: S,
  layers: arr(obj({ layer: en(LAYERS), role: S, nodes: arr(S) })), main_flow: S,
  notes: arr(obj({ text: S, nodes: arr(S) })),
});

export const questionsSchema = (items: QuestionPlanItem[]) => obj({
  questions: arr(obj({
    skill: en([...new Set(items.map((i) => i.skill))]), feynman_question: S, reference_answer: S,
    must_have_points: arr(S, CONFIG.MUST_HAVE_POINTS_MIN, CONFIG.MUST_HAVE_POINTS_MAX), fix: S,
  }), items.length, items.length),
});

export const gradeSchema = (n: number) => obj({
  intent: en(["ANSWER", "GIVE_UP", "OFF_TOPIC"]), points: arr(obj({ index: I, covered: B, quote: S }), n, n),
  misconception: S, core_accuracy: { type: Type.INTEGER, minimum: 0, maximum: 100 },
  simplicity: { type: Type.INTEGER, minimum: 0, maximum: 100 }, feedback: S,
  follow_up_type: nul(en(["CONCEPT", "CODE_POINTER"])), follow_up_step_index: nul(I), follow_up_question: nul(S),
  detected_jargons: arr(S),
});
