"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import type { HybridArchitecturalNode, NodeAnalysisView } from "@/contracts";
import { buildSliceModel, stepAtLine } from "./slice-model";

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
  onSelectStep?: (step: number) => void;
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
  onSelectStep,
  fontSize,
}: CodePaneProps) {
  const model = useMemo(() => buildSliceModel(node), [node]);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const modelRef = useRef(model);
  const onSelectStepRef = useRef(onSelectStep);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    onSelectStepRef.current = onSelectStep;
  }, [onSelectStep]);

  const collectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Cập nhật decorations theo [model, activeStep, hintStep, analysis]
  useEffect(() => {
    if (!editor) return;
    if (!collectionRef.current) {
      collectionRef.current = editor.createDecorationsCollection();
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Bước activeStep: isWholeLine, className: "sf-step-active", linesDecorationsClassName: "sf-bar-amber"
    if (activeStep !== null && model.stepRanges[activeStep]) {
      const range = model.stepRanges[activeStep];
      decorations.push({
        range: new monaco.Range(range.startLine, 1, range.endLine, 1),
        options: {
          isWholeLine: true,
          className: "sf-step-active",
          linesDecorationsClassName: "sf-bar-amber",
        },
      });
    }

    // Bước có trong analysis.weak_points: linesDecorationsClassName: "sf-bar-red"; dòng tiêu đề bước thêm glyphMarginClassName: "sf-glyph-warn" và hoverMessage: { value: "Nhận định của AI: " + what }
    if (analysis?.weak_points) {
      for (const wp of analysis.weak_points) {
        const range = model.stepRanges[wp.step];
        if (range) {
          decorations.push({
            range: new monaco.Range(range.startLine, 1, range.endLine, 1),
            options: {
              isWholeLine: true,
              linesDecorationsClassName: "sf-bar-red",
            },
          });
          decorations.push({
            range: new monaco.Range(range.startLine, 1, range.startLine, 1),
            options: {
              glyphMarginClassName: "sf-glyph-warn",
              hoverMessage: { value: "Nhận định của AI: " + wp.what },
            },
          });
        }
      }
    }

    // Bước hintStep: linesDecorationsClassName: "sf-bar-violet", dòng tiêu đề thêm glyphMarginClassName: "sf-glyph-hint"
    if (hintStep !== null && model.stepRanges[hintStep]) {
      const range = model.stepRanges[hintStep];
      decorations.push({
        range: new monaco.Range(range.startLine, 1, range.endLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: "sf-bar-violet",
        },
      });
      decorations.push({
        range: new monaco.Range(range.startLine, 1, range.startLine, 1),
        options: {
          glyphMarginClassName: "sf-glyph-hint",
        },
      });
    }

    // Dòng bắt đầu bằng // ... hoặc # ...: inlineClassName: "sf-marker"
    const lines = model.text.split("\n");
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("// ...") || trimmed.startsWith("# ...")) {
        const lineNum = idx + 1;
        decorations.push({
          range: new monaco.Range(lineNum, 1, lineNum, line.length + 1),
          options: {
            inlineClassName: "sf-marker",
          },
        });
      }
    });

    collectionRef.current.set(decorations);
  }, [editor, model, activeStep, hintStep, analysis]);

  // Cuộn tới bước target: revealLinesInCenter tới stepRanges[hintStep ?? activeStep]
  useEffect(() => {
    if (!editor) return;
    const targetStep = hintStep ?? activeStep;
    if (targetStep === null || targetStep === undefined) return;
    const range = model.stepRanges[targetStep];
    if (range) {
      editor.revealLinesInCenter(range.startLine, range.endLine);
    }
  }, [editor, activeStep, hintStep, model]);

  // Dọn dẹp decorations collection khi unmount
  useEffect(() => {
    return () => {
      collectionRef.current?.clear();
      collectionRef.current = null;
    };
  }, [editor]);

  const handleEditorMount: OnMount = (editorInstance) => {
    setEditor(editorInstance);

    editorInstance.onMouseDown((e) => {
      const pos = e.target?.position;
      if (pos?.lineNumber) {
        const step = stepAtLine(modelRef.current, pos.lineNumber);
        if (step !== null) {
          onSelectStepRef.current?.(step);
        }
      }
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
