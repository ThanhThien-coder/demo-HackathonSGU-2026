import { CONFIG } from "@/contracts/config";
import { SWE_SKILLS, type SWESkill } from "@/contracts/base";
import {
  PERSONAS,
  type PersonaMode,
  type LearnerCognitiveProfile,
  type CognitiveSkillState,
} from "@/contracts/learner";
import type {
  OfflineMockBundle,
  IngestResponse,
  EnrichNodeResponse,
  EvaluateFeynmanResponse,
  RevealResponse,
  RepoOverviewView,
  NodeAnalysisView,
  RunMode,
} from "@/contracts";
import type { ApiResult } from "@/lib/api";
import { similarity, validateAnswerLength } from "@/lib/similarity";

// Biến trạng thái runtime client cho Offline mode
let _isOffline = false;
let _offlineBundle: OfflineMockBundle | null = null;
let _offlinePersona: PersonaMode = "NEWBIE";

/**
 * Kiểm tra xem client có đang chạy trong chế độ Offline hay không
 */
export function isOfflineMode(): boolean {
  if (typeof window !== "undefined") {
    // Kiểm tra query param ?offline=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("offline") === "1") {
      return true;
    }
  }
  return _isOffline;
}

/**
 * Thiết lập chế độ Offline
 */
export function setOfflineMode(
  active: boolean,
  bundle?: OfflineMockBundle | null
): void {
  _isOffline = active;
  if (bundle !== undefined) {
    _offlineBundle = bundle;
  }
}

/**
 * Lấy gói mock bundle hiện tại
 */
export function getOfflineBundle(): OfflineMockBundle | null {
  return _offlineBundle;
}

/**
 * Lấy persona offline hiện tại
 */
export function getOfflinePersona(): PersonaMode {
  return _offlinePersona;
}

/**
 * Đặt persona offline
 */
export function setOfflinePersona(persona: PersonaMode): void {
  _offlinePersona = persona;
}

/**
 * Tải file public/demo/mock_bundle.json tĩnh
 */
export async function loadOfflineBundle(): Promise<OfflineMockBundle> {
  if (_offlineBundle) {
    return _offlineBundle;
  }

  const res = await fetch("/demo/mock_bundle.json");
  if (!res.ok) {
    throw new Error(
      `Không thể tải bundle demo offline (/demo/mock_bundle.json): HTTP ${res.status}`
    );
  }

  const bundle = (await res.json()) as OfflineMockBundle;
  _offlineBundle = bundle;
  return bundle;
}

/**
 * Dựng hồ sơ người học giả lập theo PERSONAS cho chế độ Offline (UI-62)
 */
export function buildOfflineProfile(
  persona: PersonaMode = _offlinePersona,
  now: number = Date.now()
): LearnerCognitiveProfile {
  const pConfig = PERSONAS[persona] || PERSONAS.NEWBIE;
  const MS_PER_DAY = CONFIG.MS_PER_DAY;
  const lastPracticedAt = now - pConfig.days_idle * MS_PER_DAY;

  const skills: Partial<Record<SWESkill, CognitiveSkillState>> = {};
  for (const skill of SWE_SKILLS) {
    skills[skill] = {
      skill,
      p_mastery: pConfig.initial_p_mastery,
      last_practiced_at: lastPracticedAt,
      practice_count: 5,
      correct_count: 3,
    };
  }

  return {
    user_id: `offline-${persona.toLowerCase()}`,
    display_name: `Demo Learner (${pConfig.label})`,
    skills,
    overall_tier:
      pConfig.initial_p_mastery >= CONFIG.TIER_ARCHITECT_MIN
        ? "ARCHITECT"
        : pConfig.initial_p_mastery >= CONFIG.TIER_PRACTITIONER_MIN
        ? "PRACTITIONER"
        : "NOVICE",
  };
}

/**
 * Mock Ingest cho chế độ Offline
 */
export function offlineIngestRepo(): ApiResult<IngestResponse> {
  if (!_offlineBundle) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_PERSISTENCE_UNAVAILABLE",
          message: "Chưa nạp được gói dữ liệu offline (mock_bundle.json).",
          retryable: true,
        },
      },
    };
  }
  return {
    ok: true,
    data: _offlineBundle.ingest,
    error: null,
  };
}

/**
 * Mock Enrich Node cho chế độ Offline
 */
export function offlineEnrichNode(
  nodeId: string,
  mode: RunMode = "LEARN",
  persona: PersonaMode = _offlinePersona
): ApiResult<EnrichNodeResponse> {
  if (!_offlineBundle) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_ANALYSIS_NOT_READY",
          message: "Chưa nạp gói dữ liệu offline.",
          retryable: true,
        },
      },
    };
  }

  const key = `${nodeId}:${mode}:${persona}`;
  const enrich = _offlineBundle.enrich[key];

  if (!enrich) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_ANALYSIS_NOT_READY",
          message: "Kịch bản offline không có câu hỏi cho node / persona này.",
          retryable: false,
        },
      },
    };
  }

  return {
    ok: true,
    data: enrich,
    error: null,
  };
}

/**
 * Mock Evaluate Feynman cho chế độ Offline (spec/30_UI.md Mục 8)
 * So khớp Levenshtein với kịch bản trả lời, ngưỡng ANSWER_DUPLICATE_SIMILARITY
 */
export function offlineEvaluateFeynman(
  nodeId: string,
  mode: RunMode,
  questionIndex: number,
  attemptNumber: number,
  answer: string,
  persona: PersonaMode = _offlinePersona
): ApiResult<EvaluateFeynmanResponse> {
  if (!_offlineBundle) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_AI_UNAVAILABLE",
          message: "Chưa nạp gói dữ liệu offline.",
          retryable: false,
        },
      },
    };
  }

  // 1. Kiểm tra độ dài câu trả lời
  const lengthErr = validateAnswerLength(answer);
  if (lengthErr) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: lengthErr,
          message:
            lengthErr === "ERR_ANSWER_TOO_SHORT"
              ? "Câu trả lời quá ngắn — vui lòng viết chi tiết hơn."
              : "Câu trả lời quá dài — vui lòng tóm tắt cô đọng hơn.",
          retryable: false,
        },
      },
    };
  }

  // 2. Tra cứu câu trả lời trong scripted_answers
  const R = `${nodeId}:${mode}:${persona}`;
  const scriptKey = `${R}:${questionIndex}:${attemptNumber}`;
  const candidates = _offlineBundle.scripted_answers[scriptKey];

  if (!candidates || candidates.length === 0) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_ANSWER_INAPPROPRIATE",
          message: "Chế độ offline chỉ chấm được câu trả lời trong kịch bản.",
          retryable: false,
        },
      },
    };
  }

  // 3. Tìm câu trả lời khớp nhất theo similarity
  let bestMatch: { answer: string; response: EvaluateFeynmanResponse } | null =
    null;
  let maxSim = -1;

  for (const candidate of candidates) {
    const sim = similarity(answer, candidate.answer);
    if (sim > maxSim) {
      maxSim = sim;
      bestMatch = candidate;
    }
  }

  if (bestMatch && maxSim >= CONFIG.ANSWER_DUPLICATE_SIMILARITY) {
    return {
      ok: true,
      data: bestMatch.response,
      error: null,
    };
  }

  return {
    ok: false,
    data: null,
    error: {
      error: {
        code: "ERR_ANSWER_INAPPROPRIATE",
        message: "Chế độ offline chỉ chấm được câu trả lời trong kịch bản.",
        retryable: false,
      },
    },
  };
}

/**
 * Mock Reveal Response cho chế độ Offline
 */
export function offlineRevealQuestion(
  nodeId: string,
  mode: RunMode,
  questionIndex: number,
  persona: PersonaMode = _offlinePersona
): ApiResult<RevealResponse> {
  if (!_offlineBundle) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_AI_UNAVAILABLE",
          message: "Chưa nạp gói dữ liệu offline.",
          retryable: false,
        },
      },
    };
  }

  const R = `${nodeId}:${mode}:${persona}`;
  const key = `${R}:${questionIndex}`;
  const reveal = _offlineBundle.reveals[key];

  if (!reveal) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_QUESTION_FINISHED",
          message: "Không có đáp án mẫu offline cho câu hỏi này.",
          retryable: false,
        },
      },
    };
  }

  return {
    ok: true,
    data: reveal,
    error: null,
  };
}

/**
 * Mock Repo Overview
 */
export function offlineGetOverview(): ApiResult<RepoOverviewView> {
  if (!_offlineBundle) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_OVERVIEW_NOT_READY",
          message: "Chưa nạp gói dữ liệu offline.",
          retryable: false,
        },
      },
    };
  }
  return {
    ok: true,
    data: _offlineBundle.overview,
    error: null,
  };
}

/**
 * Mock Node Analysis
 */
export function offlineGetAnalysis(nodeId: string): ApiResult<NodeAnalysisView> {
  if (!_offlineBundle || !_offlineBundle.analyses[nodeId]) {
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_ANALYSIS_NOT_READY",
          message: "Không tìm thấy phân tích offline cho node này.",
          retryable: false,
        },
      },
    };
  }
  return {
    ok: true,
    data: _offlineBundle.analyses[nodeId],
    error: null,
  };
}
