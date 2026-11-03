"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  CockpitHeader,
  GraphSidebarButton,
  LessonGraphDrawer,
  CodeSnippetViewer,
  FeynmanQuestionSection,
  FullFileModal,
  SubmitEvaluationDialog,
} from "@/components/learn";

export default function LearnPage() {
  const [isGraphDrawerOpen, setIsGraphDrawerOpen] = useState(false);
  const [isFullFileModalOpen, setIsFullFileModalOpen] = useState(false);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");

  const handleAnswerSubmit = (answer: string) => {
    setIsSubmitting(true);
    setUserAnswer(answer);

    // Simulate Bayesian Knowledge Tracing analysis
    setTimeout(() => {
      setIsSubmitting(false);
      setIsEvaluationDialogOpen(true);
    }, 700);
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
        <CockpitHeader />

        {/* 3. Left-side Floating Tab Button: "Đồ thị bài học" (Figma node 5:217) */}
        <GraphSidebarButton onClick={() => setIsGraphDrawerOpen(true)} />

        {/* 4. Lesson Knowledge Graph Drawer (Figma node 5:1751) */}
        <LessonGraphDrawer
          isOpen={isGraphDrawerOpen}
          onClose={() => setIsGraphDrawerOpen(false)}
        />

        {/* 5. Main Cockpit Learning Workspace (Figma node 5:63) */}
        <main
          className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-start gap-5 lg:gap-[20px] px-4 sm:px-8 lg:pl-[120px] lg:pr-[45px] py-6 sm:py-8 w-full max-w-[1536px] mx-auto z-10"
          data-node-id="5:63"
          data-name="Container"
        >
          {/* Left Column: Code Snippet Viewer (Figma node 5:64) */}
          <CodeSnippetViewer
            onOpenFullFile={() => setIsFullFileModalOpen(true)}
          />

          {/* Right Column: Feynman Question & Explanation Form (Figma node 5:170) */}
          <FeynmanQuestionSection
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
          />
        </main>
      </div>

      {/* 6. Full Source File Modal */}
      <FullFileModal
        isOpen={isFullFileModalOpen}
        onClose={() => setIsFullFileModalOpen(false)}
      />

      {/* 7. Interactive BKT Submission Evaluation Dialog */}
      <SubmitEvaluationDialog
        isOpen={isEvaluationDialogOpen}
        onClose={() => setIsEvaluationDialogOpen(false)}
        userAnswer={userAnswer}
      />
    </div>
  );
}
