"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import type { HybridArchitecturalNode, NodeAnalysisView } from "@/contracts";
import {
  buildDtoModel,
  buildStepModel,
  toOriginalSelection,
  type CodeSelection,
} from "./slice-model";

loader.config({ monaco });

if (typeof self !== "undefined") {
  (self as unknown as {
    MonacoEnvironment?: {
      getWorker: (workerId: string, label: string) => Worker;
    };
  }).MonacoEnvironment = {
    getWorker: (_workerId, label) =>
      label === "typescript" || label === "javascript"
        ? new Worker(
            new URL("monaco-editor/language/typescript/ts.worker.js", import.meta.url),
            { type: "module" }
          )
        : new Worker(
            new URL("monaco-editor/editor/editor.worker.js", import.meta.url),
            { type: "module" }
          ),
  };
}

export interface CodePaneProps {
  node: HybridArchitecturalNode;
  analysis: NodeAnalysisView | null;
  activeStep: number | null;
  hintStep: number | null;
  showDto?: boolean; // Tab "Kiểu dữ liệu": hiện dto_snippet, không đổi active_step
  onSelect?: (selection: CodeSelection | null) => void;
  fontSize: number;
}

function getMonacoLanguage(rawLang?: string): string {
  if (!rawLang) return "plaintext";
  const upper = rawLang.toUpperCase();
  switch (upper) {
    case "TSX":
    case "TYPESCRIPT":
      return "typescript";
    case "JSX":
    case "JAVASCRIPT":
      return "javascript";
    case "PYTHON":
      return "python";
    case "DART":
      return "dart";
    case "KOTLIN":
      return "kotlin";
    case "SWIFT":
      return "swift";
    case "JAVA":
      return "java";
    default:
      return "plaintext";
  }
}

export default function CodePane({
  node,
  analysis,
  activeStep,
  hintStep,
  showDto = false,
  onSelect,
  fontSize,
}: CodePaneProps) {
  const model = useMemo(
    () => (showDto ? buildDtoModel(node) : buildStepModel(node, activeStep)),
    [node, activeStep, showDto]
  );
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const modelRef = useRef(model);
  const activeStepRef = useRef(activeStep);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const collectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Cập nhật decorations theo [model, activeStep, hintStep, analysis]
  useEffect(() => {
    if (!editor) return;
    if (!collectionRef.current) {
      collectionRef.current = editor.createDecorationsCollection();
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const lineCount = model.lineMap.length;

    // Model chỉ có code của 1 bước, nên mọi lớp tô đều phủ từ dòng đầu tới dòng cuối của model.
    if (!showDto && lineCount > 0) {
      const wholeStep = new monaco.Range(1, 1, lineCount, 1);
      const firstLine = new monaco.Range(1, 1, 1, 1);

      // Bước activeStep: isWholeLine, className: "sf-step-active", linesDecorationsClassName: "sf-bar-amber"
      decorations.push({
        range: wholeStep,
        options: {
          isWholeLine: true,
          className: "sf-step-active",
          linesDecorationsClassName: "sf-bar-amber",
        },
      });

      // Bước có trong analysis.weak_points: vạch đỏ, dòng đầu thêm glyph ⚠ và hover "Nhận định của AI: {what}"
      for (const wp of analysis?.weak_points ?? []) {
        if (wp.step !== activeStep) continue;
        decorations.push({
          range: wholeStep,
          options: {
            isWholeLine: true,
            linesDecorationsClassName: "sf-bar-red",
          },
        });
        decorations.push({
          range: firstLine,
          options: {
            glyphMarginClassName: "sf-glyph-warn",
            hoverMessage: { value: "Nhận định của AI: " + wp.what },
          },
        });
      }

      // Bước hintStep: vạch tím, dòng đầu thêm glyph gợi ý
      if (hintStep !== null && hintStep === activeStep) {
        decorations.push({
          range: wholeStep,
          options: {
            isWholeLine: true,
            linesDecorationsClassName: "sf-bar-violet",
          },
        });
        decorations.push({
          range: firstLine,
          options: {
            glyphMarginClassName: "sf-glyph-hint",
          },
        });
      }
    }

    // Marker là dòng có lineMap = 0 (UI-31). Tab "Kiểu dữ liệu" mọi dòng đều 0 nên không tô.
    if (!showDto) {
      model.text.split("\n").forEach((line, idx) => {
        if (model.lineMap[idx] !== 0) return;
        const lineNum = idx + 1;
        decorations.push({
          range: new monaco.Range(lineNum, 1, lineNum, line.length + 1),
          options: {
            inlineClassName: "sf-marker",
          },
        });
      });
    }

    collectionRef.current.set(decorations);
  }, [editor, model, activeStep, hintStep, analysis, showDto]);

  // Đổi bước hoặc đổi tab: về đầu code, bỏ vùng chọn cũ
  useEffect(() => {
    if (!editor) return;
    editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
    onSelectRef.current?.(null);
  }, [editor, model]);

  // Dọn dẹp decorations collection khi unmount
  useEffect(() => {
    return () => {
      collectionRef.current?.clear();
      collectionRef.current = null;
    };
  }, [editor]);

  const handleEditorMount: OnMount = (editorInstance) => {
    setEditor(editorInstance);

    editorInstance.onDidChangeCursorSelection(({ selection }) => {
      const stepNumber = activeStepRef.current;
      const original = toOriginalSelection(modelRef.current, selection);
      const box = editorInstance.getDomNode()?.getBoundingClientRect();
      const start = editorInstance.getScrolledVisiblePosition(selection.getStartPosition());
      const end = editorInstance.getScrolledVisiblePosition(selection.getEndPosition());
      if (!original || stepNumber === null || !box || !start || !end) {
        onSelectRef.current?.(null);
        return;
      }

      const left = box.left + Math.min(start.left, end.left);
      const right = box.left + Math.max(start.left, end.left);
      const top = box.top + start.top;
      const bottom = box.top + end.top + end.height;
      onSelectRef.current?.({
        ...original,
        step_number: stepNumber,
        rect: new DOMRect(left, top, right - left, bottom - top),
      });
    });
  };

  const options: monaco.editor.IStandaloneEditorConstructionOptions = useMemo(
    () => ({
      readOnly: true,
      domReadOnly: true,
      glyphMargin: true,
      minimap: { enabled: false },
      contextmenu: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize,
      fontFamily: "var(--font-jetbrains-mono), Consolas, monospace",
      lineNumbers: (n: number) =>
        model.lineMap[n - 1] > 0 ? String(model.lineMap[n - 1]) : "",
    }),
    [fontSize, model.lineMap]
  );

  return (
    <div className="w-full h-full relative">
      <style>{`
        .sf-step-active {
          background-color: rgba(254, 243, 199, 0.45) !important;
        }
        .sf-bar-amber {
          border-left: 3px solid #f59e0b !important;
          box-sizing: border-box;
        }
        .sf-bar-red {
          border-left: 3px solid #ef4444 !important;
          box-sizing: border-box;
        }
        .sf-bar-violet {
          border-left: 3px solid #a78bfa !important;
          box-sizing: border-box;
        }
        .sf-glyph-warn::before {
          content: "⚠";
          color: #ef4444;
          font-weight: bold;
        }
        .sf-glyph-hint::before {
          content: "💡";
        }
        .sf-marker {
          opacity: 0.45 !important;
          font-style: italic;
        }
      `}</style>
      <Editor
        value={model.text}
        language={getMonacoLanguage(node?.languages?.[0])}
        theme="vs"
        height="100%"
        options={options}
        onMount={handleEditorMount}
      />
    </div>
  );
}
