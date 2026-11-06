"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  CockpitHeader,
  LessonGraphDrawer,
  CodeSnippetViewer,
  FeynmanQuestionSection,
  RepoOverviewModal,
  RepoOverview,
  SubmitEvaluationDialog,
  SkipConfirmDialog,
  ReportWrongDialog,
  FullFileModal,
  GraphSidebarButton,
} from "./components";
import {
  evaluateFeynmanSafe,
  revealSafe,
  reportWrongSafe,
  ingestRepoSafe,
} from "@/lib/api";
import type { QuestionView } from "@/contracts";
import { CONFIG } from "@/contracts";
import { isOfflineMode, loadOfflineBundle } from "@/lib/offline";
import { getErrorMessage } from "./utils/messages";
import { useWorkbenchStore } from "@/store/workbench";
import { useUserStore } from "@/stores/userStore";
import { SelectionPopover } from "@/components/code/SelectionPopover";
import type { CodeSelection } from "@/components/code/slice-model";

// Offline không có phiên thật; dữ liệu lấy từ gói offline
const OFFLINE_SESSION_ID = "offline";

function LearnCockpitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOfflineEntry = searchParams.get("offline") === "1" || isOfflineMode();
  const urlSessionId = searchParams.get("session") || searchParams.get("id");
  const urlNodeId = searchParams.get("node") || searchParams.get("nodeId");

  // 2. sessionId tính trực tiếp, không dùng useState
  const sessionId = urlSessionId || (isOfflineEntry ? OFFLINE_SESSION_ID : "");

  // Thiếu phiên thì về lộ trình để chọn, trừ Offline
  useEffect(() => {
    if (!urlSessionId && !isOfflineEntry) {
      router.replace("/roadmap");
    }
  }, [urlSessionId, isOfflineEntry, router]);

  // Auto-save sf.last_session in localStorage
  useEffect(() => {
    if (sessionId && sessionId !== OFFLINE_SESSION_ID) {
      try {
        localStorage.setItem("sf.last_session", sessionId);
      } catch {
        // ignore storage errors
      }
    }
  }, [sessionId]);

  // 3. Đọc từ store bằng selector
  const result = useWorkbenchStore((s) => s.result);
  const progress = useWorkbenchStore((s) => s.progress);
  const analyses = useWorkbenchStore((s) => s.analyses);
  const overview = useWorkbenchStore((s) => s.overview);
  const runs = useWorkbenchStore((s) => s.runs);
  const active_node_id = useWorkbenchStore((s) => s.active_node_id);
  const active_question_index = useWorkbenchStore((s) => s.active_question_index);
  const active_step = useWorkbenchStore((s) => s.active_step);
  const last_failed_answers = useWorkbenchStore((s) => s.last_failed_answers);
  const hint_step = useWorkbenchStore((s) => s.ui.hint_step);
  const ui_drafts = useWorkbenchStore((s) => s.ui.drafts);
  const presentation_pane = useWorkbenchStore((s) => s.ui.presentation_pane);
  const ui_pending = useWorkbenchStore((s) => s.ui.pending);
  const ui_errors = useWorkbenchStore((s) => s.ui.errors);
  const ui_last_evaluations = useWorkbenchStore((s) => s.ui.last_evaluations);
  const ui_skill_changes = useWorkbenchStore((s) => s.ui.skill_changes);

  // Đồng bộ hồ sơ từ userStore sang workbenchStore khi đổi (TASK_10 mục 3)
  const userProfile = useUserStore((s) => s.profile);
  const serverClockOffsetMs = useUserStore((s) => s.serverClockOffsetMs);

  useEffect(() => {
    useWorkbenchStore.getState().setProfile(userProfile, serverClockOffsetMs);
  }, [userProfile, serverClockOffsetMs]);

  // 4. Chỉ giữ useState cục bộ cho 6 hộp thoại/ngăn kéo, các cờ nộp/bỏ qua/báo sai, và reloadKey
  const [isGraphDrawerOpen, setIsGraphDrawerOpen] = useState(false);
  const [isFullFileModalOpen, setIsFullFileModalOpen] = useState(false);
  // D19: vùng bôi đen trong khung code (D11 onSelect)
  const [codeSelection, setCodeSelection] = useState<CodeSelection | null>(null);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isReportWrongDialogOpen, setIsReportWrongDialogOpen] = useState(false);

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [canRetrySubmit, setCanRetrySubmit] = useState(false);

  const [isRevealing, setIsRevealing] = useState(false);

  const [isReportingWrong, setIsReportingWrong] = useState(false);
  const [reportWrongError, setReportWrongError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState<number>(0);

  // Đổi persona offline: đọc currentPersona của useUserStore; useEffect khi đổi và đang offline => tăng reloadKey, bỏ qua lần chạy đầu bằng useRef
  const currentPersona = useUserStore((s) => s.currentPersona);
  const isFirstPersonaMount = useRef(true);

  useEffect(() => {
    if (isFirstPersonaMount.current) {
      isFirstPersonaMount.current = false;
      return;
    }
    if (isOfflineMode()) {
      setReloadKey((k) => k + 1);
    }
  }, [currentPersona]);

  // Escape key handler for presentation mode (tắt trình chiếu qua store)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useWorkbenchStore.getState().ui.presentation_pane) {
        useWorkbenchStore.getState().setPresentationPane(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 5. Một effect nạp phiên, deps đúng [sessionId, reloadKey]; đọc node trên URL qua useRef(urlNodeId)
  const urlNodeIdRef = useRef(urlNodeId);
  urlNodeIdRef.current = urlNodeId;

  useEffect(() => {
    if (!sessionId) return;

    useWorkbenchStore.getState().setOfflineMode(isOfflineMode());

    let cancelled = false;
    const store = useWorkbenchStore.getState();
    store.setUiPending("session", true);
    store.setUiError("session", null);

    async function loadSession() {
      if (isOfflineMode()) {
        try {
          await loadOfflineBundle();
        } catch (err) {
          if (cancelled) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Không thể tải gói dữ liệu offline.";
          useWorkbenchStore.getState().setUiError("session", msg);
          useWorkbenchStore.getState().setUiPending("session", false);
          return;
        }
      }

      const res = await ingestRepoSafe({ session_id: sessionId });
      if (cancelled) return;

      if (res.ok) {
        useWorkbenchStore.getState().applyIngest(res.data);
        const nodes = res.data.result?.nodes || [];
        const requestedNode = urlNodeIdRef.current;
        const targetNode = requestedNode
          ? nodes.find((n) => n.id === requestedNode)
          : undefined;
        const targetNodeState = requestedNode
          ? res.data.progress?.nodes?.[requestedNode]
          : undefined;
        const isLocked = targetNodeState?.status === "LOCKED";

        if (targetNode && !isLocked) {
          void useWorkbenchStore.getState().openNode(targetNode.id);
        }

        if (res.data.resumed && !isOfflineMode()) {
          const repoName = res.data.result?.repo_name || "repo";
          const completedCount = Object.values(res.data.progress?.nodes || {}).filter(
            (n) => n.status === "COMPLETED"
          ).length;
          const totalNodes = nodes.length;
          useUserStore
            .getState()
            .showToast(
              `Đã mở lại ${repoName} — ${completedCount}/${totalNodes} node`,
              "info"
            );
        }
      } else {
        const code = res.error?.error?.code;
        const msg = res.error?.error?.message;
        useWorkbenchStore.getState().setUiError("session", getErrorMessage(code, msg));
        try {
          localStorage.removeItem("sf.last_session");
        } catch {
          // ignore storage errors
        }
      }

      if (!cancelled) {
        useWorkbenchStore.getState().setUiPending("session", false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  // 6. Dẫn xuất bằng useMemo hoặc tính thẳng
  const currentNode = useMemo(() => {
    if (!active_node_id || !result?.nodes) return null;
    return result.nodes.find((n) => n.id === active_node_id) || null;
  }, [active_node_id, result]);

  // D19: đổi bài, đổi bước ⇒ bỏ vùng chọn cũ
  useEffect(() => {
    setCodeSelection(null);
  }, [active_node_id, active_step]);

  const activeEntry = active_node_id ? analyses[active_node_id] : undefined;
  const analysis = typeof activeEntry === "object" && activeEntry !== null ? activeEntry : null;
  const isLoadingAnalysis = activeEntry === "PENDING";
  const analysisError =
    activeEntry === "FAILED"
      ? (active_node_id ? ui_errors["analyze:" + active_node_id] : null) ?? "Chưa phân tích được"
      : null;

  const currentRun = active_node_id ? runs[active_node_id] : undefined;

  const questions: QuestionView[] = useMemo(() => {
    if (!active_node_id) return [];
    if (runs[active_node_id]?.questions) {
      return runs[active_node_id].questions;
    }
    const lastRunQuestions = progress?.nodes?.[active_node_id]?.last_run?.questions;
    if (lastRunQuestions && lastRunQuestions.length > 0) {
      return lastRunQuestions.map((qState) => ({
        question_index: qState.question_index,
        skill: qState.skill,
        tier: qState.tier,
        focus: qState.focus,
        feynman_question: qState.feynman_question,
        state: qState,
      }));
    }
    return [];
  }, [active_node_id, runs, progress]);

  const activeQuestionIdx = useMemo(() => {
    if (active_question_index === null || active_question_index === undefined) return 0;
    const idx = questions.findIndex((q) => q.question_index === active_question_index);
    return idx >= 0 ? idx : 0;
  }, [questions, active_question_index]);

  const activeQuestion = questions[activeQuestionIdx] ?? null;

  const tokensUsed = progress?.tokens_used ?? 0;
  const revealData = activeQuestion?.state?.reveal ?? null;

  const evalKey =
    currentRun && activeQuestion
      ? `${currentRun.run_id}:${activeQuestion.question_index}`
      : "";
  const evaluationResult = evalKey ? ui_last_evaluations[evalKey] ?? null : null;

  const draftsForSection: Record<number, string> = useMemo(() => {
    if (!currentRun) return {};
    const res: Record<number, string> = {};
    for (const q of questions) {
      const draftKey = `${currentRun.run_id}:${q.question_index}`;
      if (ui_drafts[draftKey] !== undefined) {
        res[q.question_index] = ui_drafts[draftKey];
      }
    }
    return res;
  }, [currentRun, questions, ui_drafts]);

  const handleSaveDraft = (qIdx: number, text: string) => {
    if (!currentRun) return;
    const draftKey = `${currentRun.run_id}:${qIdx}`;
    useWorkbenchStore.getState().setDraft(draftKey, text);
  };

  const lastFailedAnswer = evalKey ? last_failed_answers[evalKey] ?? null : null;

  const hasNextQuestion = useMemo(() => {
    for (let i = activeQuestionIdx + 1; i < questions.length; i++) {
      if (questions[i]?.state?.ended_by !== "DROPPED") {
        return true;
      }
    }
    return false;
  }, [questions, activeQuestionIdx]);

  const fullFileCode = useMemo(() => {
    if (currentNode?.trace_steps && currentNode.trace_steps.length > 0) {
      const stepsCode = currentNode.trace_steps
        .map(
          (s) =>
            `// ── Bước ${s.step_number} · ${s.layer} · ${s.file_path} · ${s.function_name}\n${s.snippet}`
        )
        .join("\n\n");
      return currentNode.dto_snippet
        ? `${stepsCode}\n\n// ── Kiểu dữ liệu (DTO / Interface)\n${currentNode.dto_snippet}`
        : stepsCode;
    }
    return undefined;
  }, [currentNode]);

  // 7. Event Handlers
  const handleSelectNode = (nodeId: string) => {
    void useWorkbenchStore.getState().openNode(nodeId);
  };

  const handleSelectQuestion = (idx: number) => {
    if (isSubmittingAnswer) return;
    const targetQ = questions[idx];
    if (targetQ && targetQ.state?.ended_by !== "DROPPED") {
      useWorkbenchStore.getState().setActiveQuestionIndex(targetQ.question_index);
    }
  };

  const handleNextQuestion = () => {
    let nextIdx = activeQuestionIdx + 1;
    while (nextIdx < questions.length && questions[nextIdx]?.state?.ended_by === "DROPPED") {
      nextIdx++;
    }
    if (nextIdx < questions.length) {
      useWorkbenchStore.getState().setActiveQuestionIndex(questions[nextIdx].question_index);
    }
  };

  // 8. handleAnswerSubmit
  const handleAnswerSubmit = async (answer: string) => {
    const store = useWorkbenchStore.getState();
    const nodeId = store.active_node_id;
    if (!nodeId) return;

    const run = store.runs[nodeId];
    if (!run || !activeQuestion) return;

    setIsSubmittingAnswer(true);
    setSubmitError(null);
    setCanRetrySubmit(false);
    setLastSubmittedAnswer(answer);

    const qIndex = activeQuestion.question_index;
    const attemptNumber = (activeQuestion.state?.attempts_used || 0) + 1;

    const result = await evaluateFeynmanSafe({
      session_id: sessionId,
      run_id: run.run_id,
      question_index: qIndex,
      student_answer: answer,
      attempt_number: attemptNumber,
    });

    if (result.ok) {
      const data = result.data;
      const currentEvalKey = `${run.run_id}:${qIndex}`;
      store.setLastEvaluation(currentEvalKey, data);
      store.setTokensUsed(data.tokens_used);
      store.applyQuestionState(nodeId, data.question);

      if (data.skill_change !== null && data.skill_change !== undefined) {
        store.setSkillChange(currentEvalKey, data.skill_change);
        void useUserStore.getState().fetchProfile();
      }

      const prev = store.progress?.nodes?.[nodeId]?.status;
      store.applyNodeState(data.node_state);

      if (data.follow_up?.step_index !== null && data.follow_up?.step_index !== undefined) {
        store.setHintStep(data.follow_up.step_index);
        store.setActiveStep(data.follow_up.step_index);
      } else {
        store.setHintStep(null);
      }

      if (!data.is_passed) {
        store.setLastFailedAnswer(currentEvalKey, answer);
      }

      const hasUnlocked = data.unlocked_node_ids && data.unlocked_node_ids.length > 0;
      if (hasUnlocked || data.node_state.status !== prev) {
        void store.refreshProgress();
      }

      setIsEvaluationDialogOpen(true);
    } else {
      const errorCode = result.error?.error?.code;
      if (errorCode === "ERR_ATTEMPT_OUT_OF_SYNC" || errorCode === "ERR_QUESTION_FINISHED") {
        useUserStore.getState().showToast("Câu này vừa được nộp ở tab khác", "info");
        void store.reloadRun(nodeId);
      } else {
        if (errorCode === "ERR_PERSISTENCE_UNAVAILABLE") {
          setCanRetrySubmit(true);
        }
        const errorMsg =
          isOfflineMode() && result.error?.error?.message
            ? result.error.error.message
            : getErrorMessage(errorCode, result.error?.error?.message);
        setSubmitError(errorMsg);
      }
    }

    setIsSubmittingAnswer(false);
  };

  // 9. handleConfirmSkip & handleReportWrongSubmit
  const handleConfirmSkip = async () => {
    const store = useWorkbenchStore.getState();
    const nodeId = store.active_node_id;
    if (!nodeId) return;

    const run = store.runs[nodeId];
    if (!run || !activeQuestion) return;

    setIsRevealing(true);
    const qIndex = activeQuestion.question_index;

    const result = await revealSafe({
      session_id: sessionId,
      run_id: run.run_id,
      question_index: qIndex,
    });

    if (result.ok) {
      const currentEvalKey = `${run.run_id}:${qIndex}`;
      if (result.data.skill_change !== null && result.data.skill_change !== undefined) {
        store.setSkillChange(currentEvalKey, result.data.skill_change);
        void useUserStore.getState().fetchProfile();
      }
      store.applyQuestionState(nodeId, result.data.question);
      store.applyNodeState(result.data.node_state);
      void store.refreshProgress();
    } else {
      setSubmitError(getErrorMessage(result.error?.error?.code, result.error?.error?.message));
    }

    setIsRevealing(false);
    setIsSkipDialogOpen(false);
  };

  const handleReportWrongSubmit = async (note: string) => {
    const store = useWorkbenchStore.getState();
    const nodeId = store.active_node_id;
    if (!nodeId) return;

    const run = store.runs[nodeId];
    if (!run || !activeQuestion) return;

    setIsReportingWrong(true);
    setReportWrongError(null);
    const qIndex = activeQuestion.question_index;

    const result = await reportWrongSafe({
      session_id: sessionId,
      run_id: run.run_id,
      question_index: qIndex,
      note,
    });

    if (result.ok) {
      const evalKey = `${run.run_id}:${qIndex}`;
      useUserStore
        .getState()
        .showToast("Đã ghi nhận — nhóm sẽ xem lại câu này", "success");
      if (
        result.data.skill_change !== null &&
        result.data.skill_change !== undefined
      ) {
        store.setSkillChange(evalKey, result.data.skill_change);
        void useUserStore.getState().fetchProfile();
      }
      store.applyQuestionState(nodeId, result.data.question);
      store.applyNodeState(result.data.node_state);
      void store.refreshProgress();
      setIsReportWrongDialogOpen(false);
      setIsEvaluationDialogOpen(false);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setReportWrongError(errorMsg);
    }

    setIsReportingWrong(false);
  };

  // 10. handleOpenOverview chỉ mở modal, không gọi API (T33)
  const handleOpenOverview = () => {
    setIsOverviewModalOpen(true);
  };

  // 11. handleOtherRepo: reset session, xóa sf.last_session, về trang chủ
  const handleOtherRepo = () => {
    useWorkbenchStore.getState().resetSession();
    try {
      localStorage.removeItem("sf.last_session");
    } catch {
      // ignore storage errors
    }
    router.push("/");
  };

  // 12. handleChangeDir: đổi thư mục con, nạp lại repo
  const handleChangeDir = async (subdir: string): Promise<string | undefined> => {
    const key = result?.snapshot?.repo_key || "";
    const repoUrl = key.startsWith("http") ? key : `https://github.com/${key}`;
    const res = await ingestRepoSafe({
      repo_url: repoUrl,
      subdir_override: subdir,
    });
    if (res.ok) {
      router.push(`/learn?session=${encodeURIComponent(res.data.session_id)}`);
      return undefined;
    }
    const code = res.error?.error?.code;
    const msg = res.error?.error?.message;
    return getErrorMessage(code, msg);
  };

  return (
    <div
      className="bg-white min-h-screen flex flex-col relative size-full antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]"
      data-node-id="5:2"
      data-name="Html → Body"
    >
      <div
        className="bg-[#f2f3ff] flex flex-col isolate min-h-screen relative shrink-0 w-full"
        data-node-id="5:3"
        data-name="Background"
      >
        {/* 1. Global Navigation Header with Logged-in User Profile (Figma node 5:4) */}
        <Navbar />

        {/* 2. Cockpit Context Sub-Header (Figma node 5:29) */}
        <CockpitHeader
          repoName={result?.repo_name || ""}
          filePath={currentNode?.files?.[0] || ""}
          categoryTag={
            result?.fingerprint?.detected_framework ||
            result?.fingerprint?.archetype ||
            ""
          }
          sessionId={sessionId}
          tokensUsed={tokensUsed}
          tokensQuota={CONFIG.SESSION_TOKEN_QUOTA}
          onOpenOverview={handleOpenOverview}
          isLoadingOverview={false}
          engineMetrics={result?.ingestion_report}
          refLabel={result?.snapshot?.ref_label ?? null}
          snapshotId={result?.snapshot?.snapshot_id ?? ""}
          fingerprint={result?.fingerprint ?? null}
          report={result?.ingestion_report ?? null}
          isGithub={result?.snapshot?.source === "GITHUB"}
          isOffline={isOfflineEntry || isOfflineMode()}
          onOtherRepo={handleOtherRepo}
          onChangeDir={handleChangeDir}
        />

        {/* 3. Left-side Floating Tab Button: "Đồ thị bài học" (Figma node 5:217) */}
        <GraphSidebarButton onClick={() => setIsGraphDrawerOpen(true)} />

        {/* 4. Lesson Knowledge Graph Drawer (Figma node 5:1751) - Step 6 GET /api/sessions/{id}/progress */}
        <LessonGraphDrawer
          isOpen={isGraphDrawerOpen}
          onClose={() => setIsGraphDrawerOpen(false)}
          graphNodes={result?.nodes}
          graphEdges={result?.edges}
          progress={progress}
          isLoading={Boolean(ui_pending["session"])}
          errorMessage={ui_errors["session"] ?? null}
          onRetry={() => setReloadKey((k) => k + 1)}
          selectedNodeId={active_node_id ?? ""}
          onSelectNode={handleSelectNode}
        />

        {/* 5. Main Cockpit Learning Workspace (Figma node 5:63) */}
        <main
          className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-start gap-5 lg:gap-[20px] px-4 sm:px-8 lg:pl-[120px] lg:pr-[45px] py-6 sm:py-8 w-full max-w-[1536px] mx-auto z-10"
          data-node-id="5:63"
          data-name="Container"
        >
          {/* Left Column: Code Snippet Viewer (Figma node 5:64) - Step 8 POST /api/analyze-node */}
          {active_node_id ? (
            <CodeSnippetViewer
              fileName={
                currentNode?.files?.[0]
                  ? currentNode.files[0].split("/").pop()
                  : ""
              }
              scope={
                currentNode?.entry_symbol
                  ? `Scope: ${currentNode.entry_symbol}`
                  : currentNode?.title
                  ? `Lát cắt: ${currentNode.title}`
                  : ""
              }
              node={currentNode}
              analysis={analysis}
              isLoading={isLoadingAnalysis}
              errorMessage={analysisError}
              onRetry={() => {
                if (active_node_id) {
                  useWorkbenchStore.getState().requestAnalysis(active_node_id, true);
                }
              }}
              onOpenFullFile={() => setIsFullFileModalOpen(true)}
              highlightedStep={hint_step}
              activeStep={active_step}
              onSelectStep={(step) => useWorkbenchStore.getState().setActiveStep(step)}
              onSelect={setCodeSelection}
              isPresentationMode={presentation_pane}
              onTogglePresentationMode={() =>
                useWorkbenchStore.getState().setPresentationPane(!presentation_pane)
              }
              allNodes={result?.nodes}
            />
          ) : (
            <RepoOverview />
          )}

          {/* Right Column: Feynman Question & Form (Figma node 5:170) - Steps 10, 11, 12, 13 */}
          {active_node_id ? (
            <FeynmanQuestionSection
              question={activeQuestion}
              questionIndex={activeQuestionIdx + 1}
              totalQuestions={questions.length || 1}
              questions={questions}
              onSelectQuestion={handleSelectQuestion}
              isLoadingQuestion={Boolean(active_node_id && ui_pending["enrich:" + active_node_id])}
              isSubmitting={isSubmittingAnswer}
              onSubmit={handleAnswerSubmit}
              onRetrySubmit={canRetrySubmit ? () => handleAnswerSubmit(lastSubmittedAnswer) : undefined}
              onSkip={() => setIsSkipDialogOpen(true)}
              onReportWrong={() => setIsReportWrongDialogOpen(true)}
              isRevealed={Boolean(revealData)}
              revealData={revealData}
              isDisputed={Boolean(activeQuestion?.state?.disputed)}
              validationError={submitError}
              errorMessage={active_node_id ? ui_errors["enrich:" + active_node_id] ?? null : null}
              onNextQuestion={handleNextQuestion}
              hasNextQuestion={hasNextQuestion}
              lastFailedAnswer={lastFailedAnswer}
              isQuotaExceeded={tokensUsed >= CONFIG.SESSION_TOKEN_QUOTA}
              drafts={draftsForSection}
              onSaveDraft={handleSaveDraft}
              pointsCovered={evaluationResult?.points_covered ?? null}
              skillChange={evalKey ? (ui_skill_changes[evalKey] ?? null) : null}
              nodeState={active_node_id && progress?.nodes ? (progress.nodes[active_node_id] ?? null) : null}
              unlockedNodeIds={evaluationResult?.unlocked_node_ids ?? []}
            />
          ) : (
            <div className="flex-1 w-full p-6 text-center text-[#625e56] bg-white rounded-2xl border border-[#eaedff]">
              <h2 className="text-base font-bold text-[#131b2e] mb-1.5" tabIndex={-1}>
                Chưa chọn bài
              </h2>
              <p className="text-xs">
                Chọn một bài ở bản đồ bên trái, hoặc bấm nút bắt đầu ở Tổng quan.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* D19: nút "Giải thích" + popover cho vùng bôi đen */}
      {currentNode && (
        <SelectionPopover
          node={currentNode}
          selection={codeSelection}
          onClose={() => setCodeSelection(null)}
        />
      )}

      {/* 6. Full Source File Modal */}
      <FullFileModal
        isOpen={isFullFileModalOpen}
        onClose={() => setIsFullFileModalOpen(false)}
        fileName={
          currentNode?.files?.[0]
            ? currentNode.files[0].split("/").pop()
            : ""
        }
        codeContent={fullFileCode}
      />

      {/* 7. Interactive BKT Submission Evaluation Dialog - Step 11 POST /api/evaluate-feynman */}
      <SubmitEvaluationDialog
        isOpen={isEvaluationDialogOpen}
        onClose={() => setIsEvaluationDialogOpen(false)}
        evaluation={evaluationResult}
        userAnswer={lastSubmittedAnswer}
        onNextQuestion={handleNextQuestion}
        hasNextQuestion={hasNextQuestion}
        onOpenReportWrong={() => setIsReportWrongDialogOpen(true)}
      />

      {/* 8. Architecture Overview Modal - Step 9 POST /api/analyze-overview */}
      <RepoOverviewModal
        isOpen={isOverviewModalOpen}
        onClose={() => setIsOverviewModalOpen(false)}
        overview={typeof overview === "object" && overview !== null ? overview : null}
      />

      {/* 9. Skip Question Confirmation Dialog - Step 12 POST /api/reveal */}
      <SkipConfirmDialog
        isOpen={isSkipDialogOpen}
        onClose={() => setIsSkipDialogOpen(false)}
        onConfirm={handleConfirmSkip}
        skillName={activeQuestion?.skill}
        isSubmitting={isRevealing}
      />

      {/* 10. Report Wrong AI Grading Dialog - Step 13 POST /api/report-wrong */}
      <ReportWrongDialog
        isOpen={isReportWrongDialogOpen}
        onClose={() => setIsReportWrongDialogOpen(false)}
        onSubmit={handleReportWrongSubmit}
        isSubmitting={isReportingWrong}
        errorMessage={reportWrongError}
      />
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f2f3ff] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-[#ff9640] border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-[#554337]">Đang tải buồng lái SimpliFey...</span>
          </div>
        </div>
      }
    >
      <LearnCockpitContent />
    </Suspense>
  );
}
