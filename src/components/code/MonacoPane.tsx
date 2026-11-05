"use client";
// 30 Mục 5 — Monaco chỉ đọc, tự host (không CDN). Tải chậm qua next/dynamic (ssr: false) ở CodePane.
import * as monaco from "monaco-editor";
import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { stepAtLine, type SliceModel } from "./slice-model";

loader.config({ monaco });

if (typeof window !== "undefined") {
  (self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
    getWorker: (_id: string, label: string) =>
      label === "typescript" || label === "javascript"
        ? new Worker(new URL("monaco-editor/language/typescript/ts.worker.js", import.meta.url))
        : new Worker(new URL("monaco-editor/editor/editor.worker.js", import.meta.url)),
  };
  // Khung code chỉ đọc, snippet là lát cắt không đủ ngữ cảnh ⇒ tắt chẩn đoán để không hiện gạch đỏ giả.
  const off = { noSemanticValidation: true, noSyntaxValidation: true, noSuggestionDiagnostics: true };
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions(off);
  monaco.typescript.javascriptDefaults.setDiagnosticsOptions(off);
}

export interface MonacoPaneProps {
  model: SliceModel;
  language: string;
  activeStep: number | null;
  hintStep: number | null;
  weakSteps: Map<number, string>;
  fontSize: number;
  onStepClick: (step: number) => void;
}

export default function MonacoPane({ model, language, activeStep, hintStep, weakSteps, fontSize, onStepClick }: MonacoPaneProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decoRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const lineMapRef = useRef(model.lineMap);
  const modelRef = useRef(model);
  lineMapRef.current = model.lineMap;
  modelRef.current = model;

  // decorations (UI-32)
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const list: monaco.editor.IModelDeltaDecoration[] = [];
    for (const r of model.stepRanges) {
      if (weakSteps.has(r.step)) {
        list.push({
          range: new monaco.Range(r.start, 1, r.end, 1),
          options: { isWholeLine: true, className: "step-weak-line", glyphMarginClassName: undefined },
        });
        list.push({
          range: new monaco.Range(r.header, 1, r.header, 1),
          options: { isWholeLine: true, glyphMarginClassName: "glyph-weak", glyphMarginHoverMessage: { value: `Nhận định của AI: ${weakSteps.get(r.step)}` } },
        });
      }
      if (r.step === activeStep) list.push({ range: new monaco.Range(r.start, 1, r.end, 1), options: { isWholeLine: true, className: "step-active-line" } });
      if (r.step === hintStep) {
        list.push({ range: new monaco.Range(r.start, 1, r.end, 1), options: { isWholeLine: true, className: "step-hint-line" } });
        list.push({ range: new monaco.Range(r.header, 1, r.header, 1), options: { isWholeLine: true, glyphMarginClassName: "glyph-hint" } });
      }
    }
    decoRef.current?.clear();
    decoRef.current = ed.createDecorationsCollection(list);
  }, [model, activeStep, hintStep, weakSteps]);

  // cuộn tới bước được chọn (UI-33)
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const target = hintStep ?? activeStep;
    const r = model.stepRanges.find((x) => x.step === target);
    if (r) ed.revealLinesInCenter(r.start, r.end);
  }, [model, activeStep, hintStep]);

  useEffect(() => { editorRef.current?.updateOptions({ fontSize, lineNumbers: (n: number) => (lineMapRef.current[n - 1] > 0 ? String(lineMapRef.current[n - 1]) : "") }); }, [model, fontSize]);

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      value={model.text}
      options={{
        readOnly: true, domReadOnly: true, glyphMargin: true, minimap: { enabled: false }, contextmenu: false, scrollBeyondLastLine: false,
        fontSize, fontFamily: "var(--font-jetbrains-mono), Consolas, monospace", wordWrap: "off", renderLineHighlight: "none",
        lineNumbers: (n: number) => (lineMapRef.current[n - 1] > 0 ? String(lineMapRef.current[n - 1]) : ""),
        lineNumbersMinChars: 4, automaticLayout: true, inlayHints: { enabled: "off" }, quickSuggestions: false,
      }}
      onMount={(ed) => {
        editorRef.current = ed;
        ed.onMouseDown((e) => {
          const line = e.target.position?.lineNumber;
          if (!line) return;
          const step = stepAtLine(modelRef.current, line);
          if (step !== null) onStepClick(step);
        });
        decoRef.current = ed.createDecorationsCollection([]);
      }}
    />
  );
}
