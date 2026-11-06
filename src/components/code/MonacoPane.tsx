"use client";
// 30 Mục 5 — Monaco chỉ đọc, tự host (không CDN). Tải chậm qua next/dynamic (ssr: false) ở CodePane.
import * as monaco from "monaco-editor";
import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { stepAtLine, type SliceModel } from "./slice-model";
import { useTheme } from "@/components/ui/theme";

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
  // 2 theme theo bảng màu sáng / tối của globals.css (nền --code-bg, chữ --text, số dòng --muted).
  monaco.editor.defineTheme("simplifey-dark", {
    base: "vs-dark", inherit: true,
    rules: [{ token: "comment", foreground: "6E6889", fontStyle: "italic" }],
    colors: {
      "editor.background": "#0D0B14", "editor.foreground": "#EEECF6", "editorLineNumber.foreground": "#5D5872",
      "editorLineNumber.activeForeground": "#B69CFF", "editorGutter.background": "#0D0B14", "editor.lineHighlightBackground": "#00000000",
      "scrollbarSlider.background": "#9D98B333", "scrollbarSlider.hoverBackground": "#9D98B355", "editorWidget.background": "#12101A",
      "editorHoverWidget.background": "#12101A", "editorHoverWidget.border": "#C4B5FD33",
    },
  });
  monaco.editor.defineTheme("simplifey-light", {
    base: "vs", inherit: true,
    rules: [{ token: "comment", foreground: "64748B", fontStyle: "italic" }],
    colors: {
      "editor.background": "#FFFFFF", "editor.foreground": "#0F172A", "editorLineNumber.foreground": "#94A3B8",
      "editorLineNumber.activeForeground": "#9333EA", "editorGutter.background": "#FFFFFF", "editor.lineHighlightBackground": "#00000000",
      "scrollbarSlider.background": "#64748B33", "scrollbarSlider.hoverBackground": "#64748B55", "editorWidget.background": "#FFFFFF",
      "editorHoverWidget.background": "#FFFFFF", "editorHoverWidget.border": "#E2E8F0",
    },
  });
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
  const theme = useTheme((t) => t.theme);
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
      theme={theme === "light" ? "simplifey-light" : "simplifey-dark"}
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
