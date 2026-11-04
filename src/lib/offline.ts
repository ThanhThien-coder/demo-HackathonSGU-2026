import { CONFIG } from "@/contracts/config";
import { SWE_SKILLS, type SWESkill } from "@/contracts/base";
import {
  PERSONAS,
  type PersonaMode,
  type LearnerCognitiveProfile,
  type CognitiveSkillState,
  type SessionProgress,
  type NodeRunView,
  type NodeStateView,
  type QuestionState,
  type SkillChange,
} from "@/contracts/learner";
import type { GraphSkeletonNode } from "@/contracts/storage";
import type {
  OfflineMockBundle,
  IngestResponse,
  EnrichNodeResponse,
  EvaluateFeynmanResponse,
  RevealResponse,
  RepoOverviewView,
  NodeAnalysisView,
  RunMode,
  QuestionView,
} from "@/contracts";
import type { ApiResult } from "@/lib/api";
import { similarity, validateAnswerLength } from "@/lib/similarity";
import { deriveNodeStates, type ProgressRowLike } from "@/lib/derive";
import { nodeStatusFromRuns } from "@/lib/plan";
import { computeSkillChange, overallTier } from "@/lib/bkt-engine";

interface OfflineRuntime {
  profile: LearnerCognitiveProfile;
  runs: Record<string, NodeRunView>;
}

// Biến trạng thái runtime client cho Offline mode
let _isOffline = false;
let _offlineBundle: OfflineMockBundle | null = null;
let _offlinePersona: PersonaMode = "NEWBIE";
let _runtime: OfflineRuntime = {
  profile: buildOfflineProfile(_offlinePersona),
  runs: {},
};

/**
 * Đặt lại trạng thái chạy trong bộ nhớ của chế độ Offline (D08a)
 */
export function resetOfflineRuntime(): void {
  _runtime = {
    profile: buildOfflineProfile(_offlinePersona),
    runs: {},
  };
}

/**
 * Lấy hồ sơ người học offline hiện tại từ runtime
 */
export function getOfflineProfile(): LearnerCognitiveProfile {
  return _runtime.profile;
}

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
    resetOfflineRuntime();
  }
  if (!active) {
    resetOfflineRuntime();
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
  resetOfflineRuntime();
}

/**
 * Trả các persona trong PERSONAS có ít nhất 1 khóa enrich dạng `${node_id}:${mode}:${persona}` trong bundle.
 * Bundle chưa nạp thì trả toàn bộ PERSONAS.
 */
export function offlinePersonas(): PersonaMode[] {
  const allPersonas = Object.keys(PERSONAS) as PersonaMode[];
  if (!_offlineBundle?.enrich) {
    return allPersonas;
  }
  const enrichKeys = Object.keys(_offlineBundle.enrich);
  return allPersonas.filter((persona) =>
    enrichKeys.some((k) => {
      const parts = k.split(":");
      return parts.length >= 3 && parts[parts.length - 1] === persona;
    })
  );
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
  resetOfflineRuntime();
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
 * Tính toán tiến độ đồ thị các bài học ở chế độ Offline (D08a Mục 2)
 */
export function offlineProgress(): SessionProgress {
  if (!_offlineBundle) {
    return {
      session_id: "",
      tokens_used: 0,
      nodes: {},
    };
  }

  const rawNodes = _offlineBundle.ingest.result?.nodes ?? [];
  let skeleton: GraphSkeletonNode[] = [];
  if (Array.isArray(rawNodes) && rawNodes.length > 0) {
    skeleton = rawNodes.map((n) => ({
      node_id: (n as { node_id?: string; id?: string }).node_id ?? n.id ?? "",
      title: n.title ?? "",
      prerequisites: n.prerequisites ?? [],
      is_capstone: Boolean(n.is_capstone),
    }));
  } else if (_offlineBundle.ingest.progress?.nodes) {
    skeleton = Object.keys(_offlineBundle.ingest.progress.nodes).map((id) => ({
      node_id: id,
      title: id,
      prerequisites: [],
      is_capstone: false,
    }));
  }

  if (skeleton.length === 0) {
    const allNodeIds = new Set([
      ...Object.keys(_runtime.runs),
      ...Object.values(_offlineBundle.enrich).map((e) => e.node_id),
    ]);
    skeleton = Array.from(allNodeIds).map((id) => ({
      node_id: id,
      title: id,
      prerequisites: [],
      is_capstone: false,
    }));
  }

  const rows: ProgressRowLike[] = [];
  for (const [nodeId, run] of Object.entries(_runtime.runs)) {
    if (run.finished_at !== null && run.finished_at !== undefined) {
      const status = nodeStatusFromRuns([run]);
      if (status !== null) {
        rows.push({
          node_id: nodeId,
          status,
          analysis_failed: false,
        });
      }
    }
  }

  const derivedStates = deriveNodeStates(skeleton, rows);
  const nodes: Record<string, NodeStateView> = {};

  for (const [id, derived] of Object.entries(derivedStates)) {
    nodes[id] = {
      node_id: id,
      status: derived.status,
      has_warning: derived.has_warning,
      analysis_failed: derived.analysis_failed,
      last_run: _runtime.runs[id] ?? null,
    };
  }

  return {
    session_id: _offlineBundle.ingest.session_id,
    tokens_used: 0,
    nodes,
  };
}

/**
 * Mock Ingest cho chế độ Offline (D08a Mục 3)
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
    data: {
      ..._offlineBundle.ingest,
      progress: offlineProgress(),
    },
    error: null,
  };
}

/**
 * Mock Enrich Node cho chế độ Offline (D08a Mục 4)
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

  if (!_runtime.runs[nodeId]) {
    const newRun: NodeRunView = {
      run_id: enrich.run_id,
      node_id: nodeId,
      mode: enrich.mode ?? mode,
      started_at: Date.now(),
      finished_at: null,
      questions: enrich.questions.map((qv) => ({
        question_index: qv.question_index,
        feynman_question: qv.feynman_question,
        skill: qv.skill,
        tier: qv.tier,
        focus: qv.focus,
        attempts_used: qv.state?.attempts_used ?? 0,
        finished: qv.state?.finished ?? false,
        outcome: qv.state?.outcome ?? null,
        ended_by: qv.state?.ended_by ?? null,
        disputed: qv.state?.disputed ?? false,
        reveal: qv.state?.reveal ?? null,
      })),
    };
    _runtime.runs[nodeId] = newRun;
  }

  const questions: QuestionView[] = enrich.questions.map((qv) => {
    const runQ = _runtime.runs[nodeId].questions.find(
      (q) => q.question_index === qv.question_index
    );
    return {
      ...qv,
      state: runQ ?? qv.state,
    };
  });

  const progress = offlineProgress();
  const node_state: NodeStateView = progress.nodes[nodeId] ?? {
    node_id: nodeId,
    status: "AVAILABLE",
    has_warning: false,
    analysis_failed: false,
    last_run: _runtime.runs[nodeId],
  };

  return {
    ok: true,
    data: {
      ...enrich,
      questions,
      node_state,
    },
    error: null,
  };
}

/**
 * Tra cứu node_id tương ứng với run_id trong gói dữ liệu offline (D08a Mục 5)
 */
export function offlineNodeOfRun(runId: string): string | null {
  if (_offlineBundle?.enrich) {
    for (const enrich of Object.values(_offlineBundle.enrich)) {
      if (enrich.run_id === runId) {
        return enrich.node_id;
      }
    }
  }
  for (const run of Object.values(_runtime.runs)) {
    if (run.run_id === runId) {
      return run.node_id;
    }
  }
  return null;
}

/**
 * Xử lý chung khi hoàn thành một câu hỏi hoặc kết thúc bài tập (D08a Mục 6)
 */
export function applyFinishedQuestion(
  nodeId: string,
  question: QuestionState
): {
  skill_change: SkillChange | null;
  node_state: NodeStateView;
  unlocked_node_ids: string[];
  tokens_used: number;
} {
  const prevProgress = offlineProgress();
  const lockedBefore = new Set<string>();
  for (const [id, state] of Object.entries(prevProgress.nodes)) {
    if (state.status === "LOCKED") {
      lockedBefore.add(id);
    }
  }

  let run = _runtime.runs[nodeId];
  if (!run) {
    run = {
      run_id: `run-${nodeId}`,
      node_id: nodeId,
      mode: "LEARN",
      started_at: Date.now(),
      finished_at: null,
      questions: [question],
    };
    _runtime.runs[nodeId] = run;
  } else {
    const qIndex = run.questions.findIndex(
      (q) => q.question_index === question.question_index
    );
    if (qIndex >= 0) {
      run.questions[qIndex] = question;
    } else {
      run.questions.push(question);
    }
  }

  let skill_change: SkillChange | null = null;
  if (question.finished && question.outcome && question.ended_by !== "DROPPED") {
    const currentSkillState = _runtime.profile.skills[question.skill];
    const { next, change } = computeSkillChange(
      question.skill,
      currentSkillState,
      question.outcome,
      Date.now()
    );
    _runtime.profile.skills[question.skill] = next;
    _runtime.profile.overall_tier = overallTier(
      _runtime.profile.skills,
      Date.now()
    );
    skill_change = change;
  }

  const allFinished =
    run.questions.length > 0 &&
    run.questions.every((q) => q.finished || q.ended_by === "DROPPED");
  if (allFinished) {
    run.finished_at = Date.now();
  }

  const nextProgress = offlineProgress();
  const node_state = nextProgress.nodes[nodeId] ?? {
    node_id: nodeId,
    status: "AVAILABLE",
    has_warning: false,
    analysis_failed: false,
    last_run: run,
  };

  const unlocked_node_ids = Array.from(lockedBefore).filter(
    (id) => nextProgress.nodes[id]?.status !== "LOCKED"
  );

  return {
    skill_change,
    node_state,
    unlocked_node_ids,
    tokens_used: 0,
  };
}

/**
 * Mock Evaluate Feynman cho chế độ Offline (spec/30_UI.md Mục 8, D08a Mục 7)
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
    const existingQ = _runtime.runs[nodeId]?.questions.find(
      (q) => q.question_index === bestMatch!.response.question.question_index
    );
    const mergedQuestion: QuestionState = {
      ...existingQ,
      ...bestMatch.response.question,
    };

    const applied = applyFinishedQuestion(nodeId, mergedQuestion);

    return {
      ok: true,
      data: {
        ...bestMatch.response,
        question: mergedQuestion,
        ...applied,
      },
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
 * Mock Reveal Response cho chế độ Offline (D08a Mục 8)
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

  const existingQ = _runtime.runs[nodeId]?.questions.find(
    (q) => q.question_index === reveal.question.question_index
  );
  const mergedQuestion: QuestionState = {
    ...existingQ,
    ...reveal.question,
  };

  const applied = applyFinishedQuestion(nodeId, mergedQuestion);

  return {
    ok: true,
    data: {
      ...reveal,
      question: mergedQuestion,
      skill_change: applied.skill_change!,
      node_state: applied.node_state,
      unlocked_node_ids: applied.unlocked_node_ids,
    },
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
