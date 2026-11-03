"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { GraphSidebarButton } from "@/components/learn";
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
} from "./components";
import {
  getSessionProgressSafe,
  analyzeNodeSafe,
  analyzeOverviewSafe,
  enrichNodeSafe,
  evaluateFeynmanSafe,
  revealSafe,
  reportWrongSafe,
} from "@/lib/api";
import type {
  SessionProgress,
  NodeAnalysisView,
  RepoOverviewView,
  QuestionView,
  QuestionState,
  EvaluateFeynmanResponse,
} from "@/contracts";
import { getErrorMessage } from "./utils/messages";

function LearnCockpitContent() {
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session") || searchParams.get("id");
  const urlNodeId = searchParams.get("node") || searchParams.get("nodeId");

  const [sessionId, setSessionId] = useState<string>(
    urlSessionId || "demo-session-shop-api"
  );

  useEffect(() => {
    if (urlSessionId && urlSessionId !== sessionId) {
      setSessionId(urlSessionId);
    }
  }, [urlSessionId, sessionId]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    urlNodeId || "slice-order-checkout"
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

  // API State: Analyze Node (Step 8)
  const [analysis, setAnalysis] = useState<NodeAnalysisView | null>(null);
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
  const [isCurrentQuestionDisputed, setIsCurrentQuestionDisputed] = useState(false);

  // Tokens Used
  const [tokensUsed, setTokensUsed] = useState<number>(14250);

  // ---------------------------------------------------------------------------
  // STEP 6: Fetch Session Progress (GET /api/sessions/{id}/progress)
  // ---------------------------------------------------------------------------
  const fetchSessionProgress = useCallback(async (sid: string) => {
    setIsLoadingProgress(true);
    setProgressError(null);

    const result = await getSessionProgressSafe(sid);
    if (result.ok) {
      setProgress(result.data.progress);
      setTokensUsed(result.data.progress.tokens_used);
    } else {
      // Dev bypass auth / network fallback
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setProgressError(errorMsg);

      // Provide mock progress in dev mode if needed
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true" || !result.error) {
        setProgress({
          session_id: sid,
          tokens_used: 14250,
          nodes: {
            "slice-auth-login": {
              node_id: "slice-auth-login",
              status: "COMPLETED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-catalog-browse": {
              node_id: "slice-catalog-browse",
              status: "COMPLETED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-order-checkout": {
              node_id: "slice-order-checkout",
              status: "AVAILABLE",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-promo-apply": {
              node_id: "slice-promo-apply",
              status: "LOCKED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-inventory-reserve": {
              node_id: "slice-inventory-reserve",
              status: "LOCKED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-payment-gateway": {
              node_id: "slice-payment-gateway",
              status: "LOCKED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "slice-shipping-dijkstra": {
              node_id: "slice-shipping-dijkstra",
              status: "LOCKED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            "scc-user-order-cluster": {
              node_id: "scc-user-order-cluster",
              status: "LOCKED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
          },
        });
      }
    }
    setIsLoadingProgress(false);
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 8: Analyze Node (POST /api/analyze-node)
  // ---------------------------------------------------------------------------
  const fetchNodeAnalysis = useCallback(async (sid: string, nid: string) => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    const result = await analyzeNodeSafe(sid, nid);
    if (result.ok) {
      setAnalysis(result.data.analysis);
      setTokensUsed(result.data.tokens_used);

      // If unlocked nodes returned
      if (result.data.unlocked_node_ids && result.data.unlocked_node_ids.length > 0) {
        fetchSessionProgress(sid);
      }
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setAnalysisError(errorMsg);

      // Dev mock fallback if bypass auth enabled
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        setAnalysis({
          node_id: nid,
          skills: [
            {
              skill: "DB_OPTIMIZATION",
              step: 2,
              symbol: "inventoryRepo.updateStock",
              reason: "Truy vấn tuần tự trong vòng lặp gây N+1 I/O Bottleneck",
              file_path: "src/services/order.service.ts",
              line_start: 21,
              line_end: 23,
            },
          ],
          architecture: {
            patterns: ["LAYERED", "DEPENDENCY_INJECTION"],
            summary: "Xử lý quy trình thanh toán đơn hàng qua các tầng Service, Repository và Payment Gateway Adapter.",
          },
          steps: [
            {
              step: 1,
              layer: "BUSINESS_LOGIC",
              file_path: "src/services/order.service.ts",
              line_start: 18,
              line_end: 20,
              text: "Khởi tạo bản ghi đơn hàng mới trong cơ sở dữ liệu",
            },
            {
              step: 2,
              layer: "DATA_ACCESS",
              file_path: "src/services/order.service.ts",
              line_start: 21,
              line_end: 23,
              text: "Lặp từng sản phẩm để cập nhật tồn kho (N+1 bottleneck)",
            },
          ],
          strengths: [
            {
              step: 1,
              text: "Kiến trúc chia nhỏ các dependency qua cơ chế tiêm phụ thuộc (DI).",
            },
          ],
          weak_points: [
            {
              skill: "DB_OPTIMIZATION",
              step: 2,
              symbol: "updateStock",
              what: "N+1 Query Loop Mutation",
              consequence: "Khi giỏ hàng có 100 sản phẩm, hệ thống thực hiện 100 truy vấn riêng lẻ làm nghẽn kết nối DB.",
              file_path: "src/services/order.service.ts",
              line_start: 21,
              line_end: 23,
            },
          ],
          shared_files: [],
          skeleton_only: false,
        });
      }
    }
    setIsLoadingAnalysis(false);
  }, [fetchSessionProgress]);

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

      // Dev mock fallback if bypass auth
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        setOverview({
          facts: {
            archetype: "WEB_BACKEND",
            framework: "NestJS / Express",
            tech_stack: ["TypeScript", "TypeORM", "PostgreSQL", "Redis"],
            root_node_ids: ["slice-auth-login"],
            main_path_node_ids: ["slice-auth-login", "slice-catalog-browse", "slice-order-checkout"],
          },
          ai: {
            architecture_style: "LAYERED",
            summary: "Kiến trúc phân tầng chuẩn NestJS với Controller tiếp nhận request, Service xử lý nghiệp vụ đơn hàng và Repository tương tác dữ liệu.",
            layers: [
              { layer: "ENTRY_POINT", role: "Tiếp nhận HTTP Request & validate DTO", nodes: ["slice-auth-login"] },
              { layer: "BUSINESS_LOGIC", role: "Xử lý nghiệp vụ thanh toán & khuyến mãi", nodes: ["slice-order-checkout", "slice-promo-apply"] },
              { layer: "DATA_ACCESS", role: "Tương tác cơ sở dữ liệu qua TypeORM", nodes: ["slice-inventory-reserve"] },
              { layer: "MIDDLEWARE", role: "Tích hợp cổng thanh toán bên thứ ba", nodes: ["slice-payment-gateway"] },
            ],
            main_flow: "HTTP POST /checkout → OrderController → OrderService.processCheckout → InventoryRepo → PaymentAdapter",
            notes: [
              { text: "Cần tối ưu gộp batch update tồn kho để cải thiện thông lượng I/O", nodes: ["slice-order-checkout"] },
            ],
          },
        });
      }
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
    setIsCurrentQuestionDisputed(false);

    const result = await enrichNodeSafe(sid, nid, "LEARN");
    if (result.ok) {
      setCurrentRunId(result.data.run_id);
      setQuestions(result.data.questions);
      setActiveQuestionIdx(0);
      setTokensUsed(result.data.tokens_used);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setQuestionsError(errorMsg);

      // Dev mock fallback if bypass auth
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        setCurrentRunId("mock-run-01");
        setQuestions([
          {
            question_index: 1,
            skill: "DB_OPTIMIZATION",
            tier: "NOVICE",
            focus: "WEAKNESS",
            feynman_question:
              "Hãy đóng vai bạn đang giải thích cho một lập trình viên mới vào nghề: Dòng code trên đang tiềm ẩn nguy cơ hiệu năng gì và hệ thống sẽ phản ứng ra sao khi số lượng đơn hàng tăng đột biến?",
            state: {
              question_index: 1,
              feynman_question:
                "Hãy đóng vai bạn đang giải thích cho một lập trình viên mới vào nghề: Dòng code trên đang tiềm ẩn nguy cơ hiệu năng gì và hệ thống sẽ phản ứng ra sao khi số lượng đơn hàng tăng đột biến?",
              skill: "DB_OPTIMIZATION",
              tier: "NOVICE",
              focus: "WEAKNESS",
              attempts_used: 0,
              finished: false,
              outcome: null,
              ended_by: null,
              disputed: false,
              reveal: null,
            },
          },
        ]);
      }
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

      // If unlocked nodes or passed, refresh progress
      if (result.data.is_passed || (result.data.unlocked_node_ids && result.data.unlocked_node_ids.length > 0)) {
        fetchSessionProgress(sessionId);
      }
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setSubmitError(errorMsg);

      // Dev mock fallback if bypass auth
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        const mockEval: EvaluateFeynmanResponse = {
          question_index: qIndex,
          attempt_number: attemptNumber,
          core_accuracy: 0.89,
          simplicity: 0.95,
          intent: "ANSWER",
          is_passed: true,
          points_covered: [true, true],
          feedback: "Phép ẩn dụ bồi bàn chạy nhiều chuyến trong quán ăn phản ánh trực quan 100% cơ chế I/O bottleneck.",
          detected_jargons: [],
          follow_up: null,
          question: {
            question_index: qIndex,
            feynman_question: activeQ?.feynman_question || "",
            skill: "DB_OPTIMIZATION",
            tier: "NOVICE",
            focus: "WEAKNESS",
            attempts_used: attemptNumber,
            finished: true,
            outcome: "PASS_FIRST",
            ended_by: "ANSWER",
            disputed: false,
            reveal: {
              reference_answer: "Thay vì cập nhật từng dòng trong vòng lặp, nên gộp thành một truy vấn bulk UPDATE duy nhất trong một transaction.",
              must_have_points: ["I/O Bottleneck do truy vấn lặp", "Gộp batch update trong transaction"],
              fix: "await this.inventoryRepo.updateStockBatch(dto.items);",
            },
          },
          skill_change: {
            skill: "DB_OPTIMIZATION",
            p_before: 0.65,
            p_after: 0.79,
            outcome: "PASS_FIRST",
          },
          node_state: {
            node_id: selectedNodeId,
            status: "COMPLETED",
            has_warning: false,
            analysis_failed: false,
            last_run: null,
          },
          unlocked_node_ids: ["slice-promo-apply"],
          tokens_used: tokensUsed + 450,
        };

        setEvaluationResult(mockEval);
        setActiveRevealData(mockEval.question.reveal);
        setIsEvaluationDialogOpen(true);
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
      // Dev mock fallback if bypass auth
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        setActiveRevealData({
          reference_answer: "Thay vì cập nhật từng dòng trong vòng lặp, nên gộp thành một truy vấn bulk UPDATE duy nhất trong một transaction.",
          must_have_points: ["I/O Bottleneck do truy vấn lặp", "Gộp batch update trong transaction"],
          fix: "await this.inventoryRepo.updateStockBatch(dto.items);",
        });
      }
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
      setIsCurrentQuestionDisputed(true);
      setIsReportWrongDialogOpen(false);
      setIsEvaluationDialogOpen(false);

      // Refresh progress to reflect reverted BKT state
      fetchSessionProgress(sessionId);
    } else {
      const errorMsg = getErrorMessage(result.error?.error?.code, result.error?.error?.message);
      setReportWrongError(errorMsg);

      // Dev mock fallback
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        setIsCurrentQuestionDisputed(true);
        setIsReportWrongDialogOpen(false);
        setIsEvaluationDialogOpen(false);
      }
    }

    setIsReportingWrong(false);
  };

  // Switch node handler
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    fetchNodeAnalysis(sessionId, nodeId);
    fetchNodeQuestions(sessionId, nodeId);
  };

  // Initial load
  useEffect(() => {
    fetchSessionProgress(sessionId);
    fetchNodeAnalysis(sessionId, selectedNodeId);
    fetchNodeQuestions(sessionId, selectedNodeId);
  }, [sessionId, selectedNodeId, fetchSessionProgress, fetchNodeAnalysis, fetchNodeQuestions]);

  const activeQuestion = questions[activeQuestionIdx] || null;
  const hasNextQuestion = activeQuestionIdx < questions.length - 1;

  const handleNextQuestion = () => {
    if (hasNextQuestion) {
      setActiveQuestionIdx((prev) => prev + 1);
      setActiveRevealData(null);
      setIsCurrentQuestionDisputed(false);
    }
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
        <Navbar user={{ name: "Quý", avatarUrl: "/assets/learn/avatar.png" }} />

        {/* 2. Cockpit Context Sub-Header (Figma node 5:29) */}
        <CockpitHeader
          repoName="shop-vibecode"
          filePath="src/services/order.service.ts"
          categoryTag="Java Backend"
          sessionId={sessionId}
          tokensUsed={tokensUsed}
          tokensQuota={200000}
          onOpenOverview={handleOpenOverview}
          isLoadingOverview={isLoadingOverview}
        />

        {/* 3. Left-side Floating Tab Button: "Đồ thị bài học" (Figma node 5:217) */}
        <GraphSidebarButton onClick={() => setIsGraphDrawerOpen(true)} />

        {/* 4. Lesson Knowledge Graph Drawer (Figma node 5:1751) - Step 6 GET /api/sessions/{id}/progress */}
        <LessonGraphDrawer
          isOpen={isGraphDrawerOpen}
          onClose={() => setIsGraphDrawerOpen(false)}
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
            fileName="order.service.ts"
            scope="Scope: OrderService.processCheckout"
            analysis={analysis}
            isLoading={isLoadingAnalysis}
            errorMessage={analysisError}
            onRetry={() => fetchNodeAnalysis(sessionId, selectedNodeId)}
            onOpenFullFile={() => setIsFullFileModalOpen(true)}
            highlightedStep={highlightedStep}
          />

          {/* Right Column: Feynman Question & Form (Figma node 5:170) - Steps 10, 11, 12, 13 */}
          <FeynmanQuestionSection
            question={activeQuestion}
            questionIndex={activeQuestionIdx + 1}
            totalQuestions={questions.length || 1}
            isLoadingQuestion={isLoadingQuestions}
            isSubmitting={isSubmittingAnswer}
            onSubmit={handleAnswerSubmit}
            onSkip={() => setIsSkipDialogOpen(true)}
            onReportWrong={() => setIsReportWrongDialogOpen(true)}
            isRevealed={Boolean(activeRevealData)}
            revealData={activeRevealData}
            isDisputed={isCurrentQuestionDisputed}
            validationError={submitError}
            errorMessage={questionsError}
            onNextQuestion={handleNextQuestion}
            hasNextQuestion={hasNextQuestion}
          />
        </main>
      </div>

      {/* 6. Full Source File Modal */}
      <FullFileModal
        isOpen={isFullFileModalOpen}
        onClose={() => setIsFullFileModalOpen(false)}
        fileName="order.service.ts"
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
