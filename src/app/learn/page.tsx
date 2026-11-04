"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  CockpitHeader,
  LessonGraphDrawer,
  CodeSnippetViewer,
  FeynmanQuestionSection,
  RepoOverviewModal,
  SubmitEvaluationDialog,
  SkipConfirmDialog,
  ReportWrongDialog,
  FullFileModal,
  GraphSidebarButton,
} from "./components";
import {
  getSessionProgressSafe,
  analyzeNodeSafe,
  analyzeOverviewSafe,
  enrichNodeSafe,
  evaluateFeynmanSafe,
  revealSafe,
  reportWrongSafe,
  ingestRepoSafe,
} from "@/lib/api";
import type {
  SessionProgress,
  NodeAnalysisView,
  RepoOverviewView,
  QuestionView,
  QuestionState,
  EvaluateFeynmanResponse,
  ClientStaticEngineResult,
} from "@/contracts";
import { CONFIG } from "@/contracts";
import { isOfflineMode, loadOfflineBundle } from "@/lib/offline";
import { getErrorMessage } from "./utils/messages";

// Offline không có phiên thật; dữ liệu lấy từ gói offline
const OFFLINE_SESSION_ID = "offline";

function LearnCockpitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOfflineEntry = searchParams.get("offline") === "1" || isOfflineMode();
  const urlSessionId = searchParams.get("session") || searchParams.get("id");
  const urlNodeId = searchParams.get("node") || searchParams.get("nodeId");

  const [sessionId, setSessionId] = useState<string>(
    urlSessionId || (isOfflineEntry ? OFFLINE_SESSION_ID : "")
  );

  // Thiếu phiên thì về lộ trình để chọn, trừ Offline
  useEffect(() => {
    if (!urlSessionId && !isOfflineEntry) {
      router.replace("/roadmap");
    }
  }, [urlSessionId, isOfflineEntry, router]);

  useEffect(() => {
    if (urlSessionId && urlSessionId !== sessionId) {
      setSessionId(urlSessionId);
    }
  }, [urlSessionId, sessionId]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    urlNodeId || ""
  );

  // Dialog & Drawer toggles
  const [isGraphDrawerOpen, setIsGraphDrawerOpen] = useState(false);
  const [isFullFileModalOpen, setIsFullFileModalOpen] = useState(false);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isReportWrongDialogOpen, setIsReportWrongDialogOpen] = useState(false);

  // API State: Progress (Step 6)
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  // API State: Analyze Node (Step 8) & Analysis Prefetch Queue (D-46, UI-73, UI-74)
  const [analysis, setAnalysis] = useState<NodeAnalysisView | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, NodeAnalysisView | "PENDING" | "FAILED">>({});
  const analysesRef = useRef<Record<string, NodeAnalysisView | "PENDING" | "FAILED">>({});
  analysesRef.current = analyses;
  const inFlightRef = useRef<Set<string>>(new Set());
  const isOverviewRequestedRef = useRef<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [highlightedStep, setHighlightedStep] = useState<number | null>(null);

  // API State: Analyze Overview (Step 9)
  const [overview, setOverview] = useState<RepoOverviewView | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // API State: Enrich Node (Step 10)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionView[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // API State: Evaluate Feynman (Step 11)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<EvaluateFeynmanResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // API State: Reveal (Step 12)
  const [isRevealing, setIsRevealing] = useState(false);
  const [activeRevealData, setActiveRevealData] = useState<QuestionState["reveal"] | null>(null);

  // API State: Report Wrong (Step 13)
  const [isReportingWrong, setIsReportingWrong] = useState(false);
  const [reportWrongError, setReportWrongError] = useState<string | null>(null);

  // Tokens Used
  const [tokensUsed, setTokensUsed] = useState<number>(0);

  // Static Engine Result from Ingest (graph, nodes, fingerprint, repo_name)
  const [staticResult, setStaticResult] = useState<ClientStaticEngineResult | null>(null);

  // Presentation Mode & Active Step synchronization
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Drafts per question index (UI-52) & Last Failed Answers for duplicate checking
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [lastFailedAnswers, setLastFailedAnswers] = useState<Record<number, string>>({});

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

  // Escape key handler for presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode]);

  const handleSaveDraft = useCallback((qIdx: number, text: string) => {
    setDrafts((prev) => ({ ...prev, [qIdx]: text }));
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 6: Fetch Session Progress & Static Result (POST /api/ingest or GET /api/sessions/{id}/progress)
  // ---------------------------------------------------------------------------
  const fetchSessionProgress = useCallback(async (sid: string) => {
    setIsLoadingProgress(true);
    setProgressError(null);

    // Nếu isOfflineMode() trả true thì tải offline bundle trước, tải lỗi thì báo lỗi và dừng hàm
    if (isOfflineMode()) {
      try {
        await loadOfflineBundle();
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Không thể tải gói dữ liệu offline.";
        setProgressError(errorMsg);
        setIsLoadingProgress(false);
        return;
      }
    }

    // 1. First try to resume session via POST /api/ingest to get full static engine result + progress
    const ingestRes = await ingestRepoSafe({ session_id: sid });
    if (ingestRes.ok) {
      setStaticResult(ingestRes.data.result);
      setProgress(ingestRes.data.progress);
      setTokensUsed(ingestRes.data.progress.tokens_used);

      // Auto-select valid node if available
      if (ingestRes.data.result.nodes?.length > 0) {
        setSelectedNodeId((prev) => {
          const exists = ingestRes.data.result.nodes.some((n) => n.id === prev);
          if (exists) return prev;
          return ingestRes.data.result.nodes[0].id;
        });
      }
      setIsLoadingProgress(false);
      return;
    }

    // 2. If ingest resume fails, fallback to getSessionProgressSafe
    const result = await getSessionProgressSafe(sid);
    if (result.ok) {
      setProgress(result.data.progress);
      setTokensUsed(result.data.progress.tokens_used);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setProgressError(errorMsg);
    }
    setIsLoadingProgress(false);
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 8: Analyze Node (POST /api/analyze-node) & Prefetch Queue (D-46, UI-73, UI-74)
  // ---------------------------------------------------------------------------
  const checkAndTriggerOverview = useCallback(
    async (sid: string) => {
      if (overview || isOverviewRequestedRef.current) return;
      if (!staticResult?.nodes || staticResult.nodes.length === 0) return;

      // Kiểm tra: mọi node đều đã có bản phân tích hoặc FAILED / analysis_failed (UI-74)
      const allDone = staticResult.nodes.every((n) => {
        const cached = analysesRef.current[n.id];
        const serverFailed = progress?.nodes?.[n.id]?.analysis_failed;
        return (cached && cached !== "PENDING") || serverFailed;
      });

      if (allDone) {
        isOverviewRequestedRef.current = true;
        const res = await analyzeOverviewSafe(sid);
        if (res.ok) {
          setOverview(res.data.overview);
          setTokensUsed(res.data.tokens_used);
        } else {
          // ERR_OVERVIEW_NOT_READY => im lặng, cho phép gọi lại ở lần sau (UI-74)
          isOverviewRequestedRef.current = false;
        }
      }
    },
    [overview, staticResult, progress]
  );

  const triggerPrefetch = useCallback(
    async (sid: string, currentNid: string) => {
      if (!staticResult?.nodes || staticResult.nodes.length === 0) return;
      if (tokensUsed >= CONFIG.SESSION_TOKEN_QUOTA) return;

      const nodes = staticResult.nodes;
      const currentIndex = nodes.findIndex((n) => n.id === currentNid);

      // Ưu tiên thứ tự tô-pô sau node đang mở, bỏ qua node đã có bản phân tích (D-46, UI-73)
      const candidateNodes = [
        ...nodes.slice(currentIndex + 1),
        ...nodes.slice(0, Math.max(0, currentIndex)),
      ].filter((n) => {
        const cached = analysesRef.current[n.id];
        return !cached && !inFlightRef.current.has(n.id);
      });

      // Chỉ lấy 1–2 node kế tiếp (tối đa CONFIG.ANALYZE_CONCURRENCY đồng thời)
      const toPrefetch = candidateNodes.slice(0, 2);

      for (const targetNode of toPrefetch) {
        if (inFlightRef.current.size >= CONFIG.ANALYZE_CONCURRENCY) break;

        inFlightRef.current.add(targetNode.id);
        setAnalyses((prev) => ({ ...prev, [targetNode.id]: "PENDING" }));

        analyzeNodeSafe(sid, targetNode.id)
          .then((res) => {
            inFlightRef.current.delete(targetNode.id);
            if (res.ok) {
              const analysisVal = res.data.analysis ?? "FAILED";
              setAnalyses((prev) => ({ ...prev, [targetNode.id]: analysisVal }));
              setTokensUsed(res.data.tokens_used);
            } else {
              setAnalyses((prev) => ({ ...prev, [targetNode.id]: "FAILED" }));
            }
            checkAndTriggerOverview(sid);
          })
          .catch(() => {
            inFlightRef.current.delete(targetNode.id);
            setAnalyses((prev) => ({ ...prev, [targetNode.id]: "FAILED" }));
          });
      }

      checkAndTriggerOverview(sid);
    },
    [staticResult, tokensUsed, checkAndTriggerOverview]
  );

  const fetchNodeAnalysis = useCallback(
    async (sid: string, nid: string, isRetry = false) => {
      // 1. Kiểm tra cache trước (chuyển node tức thì, 0 network call nếu đã tải trước)
      const cached = analysesRef.current[nid];
      if (!isRetry && cached && typeof cached === "object") {
        setAnalysis(cached as NodeAnalysisView);
        setIsLoadingAnalysis(false);
        setAnalysisError(null);
        triggerPrefetch(sid, nid);
        return;
      }

      setIsLoadingAnalysis(true);
      setAnalysisError(null);
      setAnalyses((prev) => ({ ...prev, [nid]: "PENDING" }));
      inFlightRef.current.add(nid);

      const result = await analyzeNodeSafe(sid, nid);
      inFlightRef.current.delete(nid);

      if (result.ok) {
        const analysisVal = result.data.analysis ?? "FAILED";
        setAnalysis(result.data.analysis);
        setAnalyses((prev) => ({ ...prev, [nid]: analysisVal }));
        setTokensUsed(result.data.tokens_used);

        // If unlocked nodes returned
        if (result.data.unlocked_node_ids && result.data.unlocked_node_ids.length > 0) {
          fetchSessionProgress(sid);
        }

        triggerPrefetch(sid, nid);
      } else {
        const errorCode = result.error?.error?.code;
        const errorMsg = getErrorMessage(errorCode, result.error?.error?.message);
        setAnalysisError(errorMsg);
        setAnalyses((prev) => ({ ...prev, [nid]: "FAILED" }));

        if (errorCode === "ERR_TOKEN_QUOTA_EXCEEDED") {
          inFlightRef.current.clear();
        }
      }
      setIsLoadingAnalysis(false);
    },
    [fetchSessionProgress, triggerPrefetch]
  );

  // ---------------------------------------------------------------------------
  // STEP 9: Analyze Overview (POST /api/analyze-overview)
  // ---------------------------------------------------------------------------
  const handleOpenOverview = async () => {
    setIsOverviewModalOpen(true);
    if (overview) return; // already cached

    setIsLoadingOverview(true);
    setOverviewError(null);

    const result = await analyzeOverviewSafe(sessionId);
    if (result.ok) {
      setOverview(result.data.overview);
      setTokensUsed(result.data.tokens_used);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setOverviewError(errorMsg);
    }
    setIsLoadingOverview(false);
  };

  // ---------------------------------------------------------------------------
  // STEP 10: Enrich Node (POST /api/enrich-node)
  // ---------------------------------------------------------------------------
  const fetchNodeQuestions = useCallback(async (sid: string, nid: string) => {
    setIsLoadingQuestions(true);
    setQuestionsError(null);
    setActiveRevealData(null);

    const result = await enrichNodeSafe(sid, nid, "LEARN");
    if (result.ok) {
      setCurrentRunId(result.data.run_id);
      setQuestions(result.data.questions);
      // Mở = active_question_index (câu chưa xong đầu tiên không bị DROPPED, UI Mục 6)
      const firstValidIdx = result.data.questions.findIndex(
        (q) => !q.state?.finished && q.state?.ended_by !== "DROPPED"
      );
      setActiveQuestionIdx(firstValidIdx >= 0 ? firstValidIdx : 0);
      setTokensUsed(result.data.tokens_used);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setQuestionsError(errorMsg);
    }
    setIsLoadingQuestions(false);
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 11: Evaluate Feynman (POST /api/evaluate-feynman)
  // ---------------------------------------------------------------------------
  const handleAnswerSubmit = async (answer: string) => {
    setIsSubmittingAnswer(true);
    setSubmitError(null);
    setLastSubmittedAnswer(answer);

    const activeQ = questions[activeQuestionIdx];
    const currentRun = currentRunId || "run-default";
    const qIndex = activeQ?.question_index || 1;
    const attemptNumber = (activeQ?.state?.attempts_used || 0) + 1;

    const result = await evaluateFeynmanSafe({
      session_id: sessionId,
      run_id: currentRun,
      question_index: qIndex,
      student_answer: answer,
      attempt_number: attemptNumber,
    });

    if (result.ok) {
      setEvaluationResult(result.data);
      setTokensUsed(result.data.tokens_used);
      setIsEvaluationDialogOpen(true);

      // If follow_up has step_index, highlight it in code viewer
      if (result.data.follow_up?.step_index !== null && result.data.follow_up?.step_index !== undefined) {
        setHighlightedStep(result.data.follow_up.step_index);
      } else {
        setHighlightedStep(null);
      }

      // If question finished, store reveal data
      if (result.data.question?.reveal) {
        setActiveRevealData(result.data.question.reveal);
      }

      // Update question state in local list
      setQuestions((prev) =>
        prev.map((q, idx) =>
          idx === activeQuestionIdx ? { ...q, state: result.data.question } : q
        )
      );

      // Record failed answer for similarity duplicate check
      if (!result.data.is_passed) {
        setLastFailedAnswers((prev) => ({ ...prev, [qIndex]: answer }));
      }

      // If unlocked nodes or passed, refresh progress
      if (result.data.is_passed || (result.data.unlocked_node_ids && result.data.unlocked_node_ids.length > 0)) {
        fetchSessionProgress(sessionId);
      }
    } else {
      const errorCode = result.error?.error?.code;
      const errorMsg = getErrorMessage(errorCode, result.error?.error?.message);
      setSubmitError(errorMsg);

      // Handle multi-tab sync error (T16 / UI-77): refresh run silently without losing input
      if (errorCode === "ERR_ATTEMPT_OUT_OF_SYNC" || errorCode === "ERR_QUESTION_FINISHED") {
        fetchNodeQuestions(sessionId, selectedNodeId);
      }
    }

    setIsSubmittingAnswer(false);
  };

  // ---------------------------------------------------------------------------
  // STEP 12: Reveal Answer / Skip Question (POST /api/reveal)
  // ---------------------------------------------------------------------------
  const handleConfirmSkip = async () => {
    setIsRevealing(true);
    const activeQ = questions[activeQuestionIdx];
    const currentRun = currentRunId || "run-default";
    const qIndex = activeQ?.question_index || 1;

    const result = await revealSafe({
      session_id: sessionId,
      run_id: currentRun,
      question_index: qIndex,
    });

    if (result.ok) {
      setActiveRevealData(result.data.question.reveal);
      setQuestions((prev) =>
        prev.map((q, idx) =>
          idx === activeQuestionIdx ? { ...q, state: result.data.question } : q
        )
      );

      // Refresh progress to reflect failed attempt penalty
      fetchSessionProgress(sessionId);
    } else {
      setSubmitError(getErrorMessage(result.error?.error?.code, result.error?.error?.message));
    }

    setIsRevealing(false);
    setIsSkipDialogOpen(false);
  };

  // ---------------------------------------------------------------------------
  // STEP 13: Report Wrong AI Grading (POST /api/report-wrong)
  // ---------------------------------------------------------------------------
  const handleReportWrongSubmit = async (note: string) => {
    setIsReportingWrong(true);
    setReportWrongError(null);

    const activeQ = questions[activeQuestionIdx];
    const currentRun = currentRunId || "run-default";
    const qIndex = activeQ?.question_index || 1;

    const result = await reportWrongSafe({
      session_id: sessionId,
      run_id: currentRun,
      question_index: qIndex,
      note,
    });

    if (result.ok) {
      // Cập nhật state.disputed = true cho đúng câu trong questions (Mục 3)
      setQuestions((prev) =>
        prev.map((q, idx) =>
          idx === activeQuestionIdx
            ? { ...q, state: { ...q.state, disputed: true } }
            : q
        )
      );
      setIsReportWrongDialogOpen(false);
      setIsEvaluationDialogOpen(false);

      // Refresh progress to reflect reverted BKT state
      fetchSessionProgress(sessionId);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setReportWrongError(errorMsg);
    }

    setIsReportingWrong(false);
  };

  // Switch node handler
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveStep(null);
    fetchNodeAnalysis(sessionId, nodeId);
    fetchNodeQuestions(sessionId, nodeId);
  };

  // Khi selectedNodeId đổi thì đặt activeStep về null (Mục 5)
  useEffect(() => {
    setActiveStep(null);
  }, [selectedNodeId]);

  // Initial load
  useEffect(() => {
    if (!sessionId) return;
    fetchSessionProgress(sessionId);
    if (selectedNodeId) {
      fetchNodeAnalysis(sessionId, selectedNodeId);
      fetchNodeQuestions(sessionId, selectedNodeId);
    }
  }, [sessionId, selectedNodeId, fetchSessionProgress, fetchNodeAnalysis, fetchNodeQuestions]);

  const activeQuestion = questions[activeQuestionIdx] || null;

  // hasNextQuestion: kiểm tra còn câu nào phía sau chưa bị DROPPED
  const hasNextQuestion = useMemo(() => {
    for (let i = activeQuestionIdx + 1; i < questions.length; i++) {
      if (questions[i]?.state?.ended_by !== "DROPPED") {
        return true;
      }
    }
    return false;
  }, [questions, activeQuestionIdx]);

  // Current node derived from staticResult
  const currentNode = useMemo(() => {
    return staticResult?.nodes?.find((n) => n.id === selectedNodeId) || null;
  }, [staticResult, selectedNodeId]);

  // Generate full file code from node's trace steps if available
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

  // Khi chuyển câu thì bỏ qua câu bị DROPPED
  const handleNextQuestion = () => {
    let nextIdx = activeQuestionIdx + 1;
    while (nextIdx < questions.length && questions[nextIdx]?.state?.ended_by === "DROPPED") {
      nextIdx++;
    }
    if (nextIdx < questions.length) {
      setActiveQuestionIdx(nextIdx);
      setActiveRevealData(null);
    }
  };

  // Chặn đổi câu khi đang nộp (Mục 1)
  const handleSelectQuestion = (idx: number) => {
    if (isSubmittingAnswer) return;
    setActiveQuestionIdx(idx);
    setActiveRevealData(null);
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
          repoName={staticResult?.repo_name || ""}
          filePath={currentNode?.files?.[0] || ""}
          categoryTag={
            staticResult?.fingerprint?.detected_framework ||
            staticResult?.fingerprint?.archetype ||
            ""
          }
          sessionId={sessionId}
          tokensUsed={tokensUsed}
          tokensQuota={CONFIG.SESSION_TOKEN_QUOTA}
          onOpenOverview={handleOpenOverview}
          isLoadingOverview={isLoadingOverview}
          engineMetrics={staticResult?.ingestion_report}
        />

        {/* 3. Left-side Floating Tab Button: "Đồ thị bài học" (Figma node 5:217) */}
        <GraphSidebarButton onClick={() => setIsGraphDrawerOpen(true)} />

        {/* 4. Lesson Knowledge Graph Drawer (Figma node 5:1751) - Step 6 GET /api/sessions/{id}/progress */}
        <LessonGraphDrawer
          isOpen={isGraphDrawerOpen}
          onClose={() => setIsGraphDrawerOpen(false)}
          graphNodes={staticResult?.nodes}
          graphEdges={staticResult?.edges}
          progress={progress}
          isLoading={isLoadingProgress}
          errorMessage={progressError}
          onRetry={() => fetchSessionProgress(sessionId)}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
        />

        {/* 5. Main Cockpit Learning Workspace (Figma node 5:63) */}
        <main
          className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-start gap-5 lg:gap-[20px] px-4 sm:px-8 lg:pl-[120px] lg:pr-[45px] py-6 sm:py-8 w-full max-w-[1536px] mx-auto z-10"
          data-node-id="5:63"
          data-name="Container"
        >
          {/* Left Column: Code Snippet Viewer (Figma node 5:64) - Step 8 POST /api/analyze-node */}
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
            onRetry={() => fetchNodeAnalysis(sessionId, selectedNodeId, true)}
            onOpenFullFile={() => setIsFullFileModalOpen(true)}
            highlightedStep={highlightedStep}
            activeStep={activeStep}
            onSelectStep={(step) => setActiveStep(step)}
            isPresentationMode={isPresentationMode}
            onTogglePresentationMode={() => setIsPresentationMode((prev) => !prev)}
            allNodes={staticResult?.nodes}
          />

          {/* Right Column: Feynman Question & Form (Figma node 5:170) - Steps 10, 11, 12, 13 */}
          <FeynmanQuestionSection
            question={activeQuestion}
            questionIndex={activeQuestionIdx + 1}
            totalQuestions={questions.length || 1}
            questions={questions}
            onSelectQuestion={handleSelectQuestion}
            isLoadingQuestion={isLoadingQuestions}
            isSubmitting={isSubmittingAnswer}
            onSubmit={handleAnswerSubmit}
            onSkip={() => setIsSkipDialogOpen(true)}
            onReportWrong={() => setIsReportWrongDialogOpen(true)}
            isRevealed={Boolean(activeRevealData)}
            revealData={activeRevealData}
            isDisputed={Boolean(activeQuestion?.state?.disputed)}
            validationError={submitError}
            errorMessage={questionsError}
            onNextQuestion={handleNextQuestion}
            hasNextQuestion={hasNextQuestion}
            lastFailedAnswer={
              lastFailedAnswers[activeQuestion?.question_index || activeQuestionIdx + 1]
            }
            isQuotaExceeded={tokensUsed >= CONFIG.SESSION_TOKEN_QUOTA}
            drafts={drafts}
            onSaveDraft={handleSaveDraft}
          />
        </main>
      </div>

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
        overview={overview}
        isLoading={isLoadingOverview}
        errorMessage={overviewError}
        onRetry={handleOpenOverview}
      />

      {/* 9. Skip Question Confirmation Dialog - Step 12 POST /api/reveal */}
      <SkipConfirmDialog
        isOpen={isSkipDialogOpen}
        onClose={() => setIsSkipDialogOpen(false)}
        onConfirm={handleConfirmSkip}
        skillName={activeQuestion?.skill || "DB_OPTIMIZATION"}
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
