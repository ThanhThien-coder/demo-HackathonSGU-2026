// Lát cắt gọi hàm (Forward Slicing) từ entry point — spec 11 Mục 8 (ENG-80..89).
import {
  CONFIG,
  type ArchitecturalLayer,
  type ExecutionTraceStep,
  type FunctionCallEdge,
  type SymbolDefinition,
} from "@/contracts";
import type { Node } from "web-tree-sitter";
import { getAdapter } from "./registry";
import type {
  Candidate,
  EngineContext,
  EntryPoint,
  ExternalCall,
  ParsedFile,
} from "./types";

// Mục 8 ý 6 "Điều khiển": câu lệnh giữ nằm trong câu ghép ⇒ giữ header + dòng đóng của câu ghép đó
// (gồm else, case, catch, finally). Đi theo cây AST (ENG-04), không theo văn bản.
const CONTROL_NODE_TYPES = new Set([
  // TS/JS
  "if_statement", "else_clause", "for_statement", "for_in_statement", "while_statement",
  "do_statement", "try_statement", "catch_clause", "finally_clause", "switch_statement",
  "switch_case", "switch_default",
  // Python
  "elif_clause", "except_clause", "with_statement", "match_statement", "case_clause",
]);

function addEnclosingControlLines(
  keptLines: Set<number>,
  file: ParsedFile,
  fnStartLine: number,
  fnEndLine: number
): boolean {
  let changed = false;
  const lines = file.source.split(/\r?\n/);
  const add = (l: number) => {
    if (l >= fnStartLine && l <= fnEndLine && !keptLines.has(l)) {
      keptLines.add(l);
      changed = true;
    }
  };
  for (const l of Array.from(keptLines).sort((a, b) => a - b)) {
    if (l <= fnStartLine || l >= fnEndLine) continue;
    const text = lines[l - 1] ?? "";
    const col = text.length - text.trimStart().length;
    let node: Node | null = file.tree.rootNode.descendantForPosition({ row: l - 1, column: col });
    while (node) {
      const startRow = node.startPosition.row + 1;
      if (startRow < fnStartLine) break;
      if (CONTROL_NODE_TYPES.has(node.type)) {
        // Header: từ dòng đầu tới dòng mở thân (điều kiện nhiều dòng vẫn đủ)
        const body = node.childForFieldName("body") ?? node.childForFieldName("consequence");
        const headerEnd = body ? body.startPosition.row + 1 : startRow;
        for (let h = startRow; h <= headerEnd; h++) add(h);
        add(node.endPosition.row + 1);
      }
      node = node.parent;
    }
  }
  return changed;
}

const DATA_ACCESS_STEM_TOKENS = new Set([
  "repository",
  "repositories",
  "repo",
  "repos",
  "dao",
  "daos",
  "model",
  "models",
  "entity",
  "entities",
]);

const DATA_SINK_METHOD_REGEX =
  /^(save|insert.*|update.*|delete.*|remove|find.*|create|upsert|query|execute|exec|aggregate|count|get|add|commit)$/i;

const DATA_SINK_RECEIVER_REGEX =
  /(repository|repo|model|dao|entity|db|database|prisma|knex|pool|conn|connection|client|session|cursor|collection|datasource|manager|tx|trx|jdbcTemplate)$/i;

const DATA_SINK_IMPORT_SOURCES = new Set([
  "pg",
  "mysql",
  "mysql2",
  "mongodb",
  "mongoose",
  "sequelize",
  "typeorm",
  "@prisma/client",
  "sqlite3",
  "better-sqlite3",
  "redis",
  "ioredis",
  "knex",
  "sqlalchemy",
  "psycopg2",
  "pymongo",
  "database/sql",
  "gorm.io/gorm",
]);

const NON_VAR_TOKENS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "default", "try", "catch", "finally", "throw",
  "new", "typeof", "instanceof", "in", "of", "void", "delete", "await", "async", "yield",
  "import", "export", "from", "as", "class", "extends", "implements", "interface", "type",
  "this", "super", "null", "undefined", "true", "false", "NaN", "Infinity",
  "any", "number", "string", "boolean", "unknown", "never", "object", "symbol", "bigint",
  "def", "elif", "except", "pass", "raise", "with", "is", "lambda", "global", "nonlocal",
  "self", "None", "True", "False", "and", "or", "not", "print",
]);

// Kiểm tra ExternalCall có phải là DATA_SINK không (ENG-82 ý 4)
function isDataSinkCall(call: ExternalCall, techStack: string[]): boolean {
  const method = call.method;
  const receiverLast = call.receiver_chain[call.receiver_chain.length - 1] ?? "";
  const receiverFull = call.receiver_chain.join(".");

  // (a) method in regex and receiver in regex or prisma.
  const isMethodA = DATA_SINK_METHOD_REGEX.test(method);
  const isReceiverA =
    DATA_SINK_RECEIVER_REGEX.test(receiverLast) ||
    receiverFull.startsWith("prisma.");
  if (isMethodA && isReceiverA) return true;

  // (b) receiver có import_source thuộc DB libraries
  if (call.import_source && DATA_SINK_IMPORT_SOURCES.has(call.import_source)) {
    return true;
  }

  // (c) receiver viết hoa + method in (a) khi tech_stack có mongoose/sequelize/typeorm
  const hasOrm = techStack.some((t) =>
    ["mongoose", "sequelize", "typeorm"].includes(t.toLowerCase())
  );
  if (
    hasOrm &&
    isMethodA &&
    receiverLast.length > 0 &&
    receiverLast[0] === receiverLast[0]!.toUpperCase()
  ) {
    return true;
  }

  return false;
}

// Kiểm tra dòng text có phải là OUTPUT không (ENG-82 ý 4)
function isOutputStatement(lineText: string): boolean {
  if (
    lineText.includes("console.") ||
    lineText.includes("logger.") ||
    lineText.includes("logging.")
  ) {
    return false;
  }

  const outputPatterns = [
    /res\.(json|send|status|render|redirect|end|sendStatus)/,
    /reply\.send/,
    /next\s*\(/,
    /return\s+(jsonify|Response|HttpResponse)\s*\(/,
    /\bprint\s*\(/,
    /\bfetch\s*\(/,
    /\baxios\./,
    /\bsetState\s*\(/,
    /\bset[A-Z]\w*\s*\(/,
  ];

  return outputPatterns.some((p) => p.test(lineText));
}

// Tính độ dài tiền tố chung giữa 2 đường dẫn
function commonPrefixLength(a: string, b: string): number {
  let len = 0;
  const minLen = Math.min(a.length, b.length);
  while (len < minLen && a[len] === b[len]) {
    len++;
  }
  return len;
}

// Xác định comment prefix cho file
function getCommentPrefix(file?: ParsedFile): string {
  if (!file) return "//";
  const adapter = getAdapter(file.language);
  return adapter?.comment_prefix ?? "//";
}

// Xác định xem file có thuộc tầng DATA_ACCESS không (ENG-82)
function isDataAccessFile(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, "/");
  const segments = norm.split("/");
  const fileName = segments[segments.length - 1] ?? "";
  const stem = fileName.replace(/\.[^.]+$/, "");
  const stemTokens = stem.toLowerCase().split(/[-_.]/);
  const lastStemToken = stemTokens[stemTokens.length - 1] ?? "";

  for (const seg of segments) {
    if (DATA_ACCESS_STEM_TOKENS.has(seg.toLowerCase())) return true;
  }
  if (DATA_ACCESS_STEM_TOKENS.has(lastStemToken)) return true;
  return false;
}

// Trích xuất các định danh biến được đọc trong một dòng code
function extractReadIdentifiers(lineText: string): string[] {
  // Bỏ comment
  const clean = lineText.replace(/\/\/.*$|#.*$/, "");
  // Bỏ chuỗi literals
  const noStrings = clean.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, " ");
  const matches = noStrings.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g);
  if (!matches) return [];
  const results: string[] = [];
  for (const m of matches) {
    if (!NON_VAR_TOKENS.has(m)) {
      results.push(m);
    }
  }
  return results;
}

interface StepBuildingContext {
  fnKey: string;
  fnSym: SymbolDefinition;
  hop: number;
  isEntry: boolean;
  isMiddleware: boolean;
  file: ParsedFile;
  hasDataSink: boolean;
  dataSinkLines: number[];
  callsDataAccessFile: boolean;
}

export function buildSlice(entry: EntryPoint, ctx: EngineContext): Candidate {
  const entrySym =
    ctx.idx.functions.get(entry.key) ?? ctx.idx.symbols.get(entry.key);
  const entryFile = entry.key.split("#")[0] ?? "";
  const parsedEntryFile = ctx.files.get(entryFile);

  // 1. ENG-80 Thu hàm (Forward Slicing)
  const stepsMeta: StepBuildingContext[] = [];
  const visitedFns = new Set<string>();

  // Map từ caller đến danh sách callee edges
  const callerEdges = new Map<string, FunctionCallEdge[]>();
  for (const edge of ctx.edges) {
    let list = callerEdges.get(edge.caller);
    if (!list) {
      list = [];
      callerEdges.set(edge.caller, list);
    }
    list.push(edge);
  }

  // Thu thập các ExternalCall theo từng hàm caller
  const fnExternalCalls = new Map<string, ExternalCall[]>();
  for (const ext of ctx.external) {
    let list = fnExternalCalls.get(ext.caller);
    if (!list) {
      list = [];
      fnExternalCalls.set(ext.caller, list);
    }
    list.push(ext);
  }

  function resolveCalleeKey(callerKey: string, calleeKey: string): string {
    const callerFile = callerKey.split("#")[0] ?? "";
    const edges = callerEdges.get(callerKey) ?? [];
    const edge = edges.find((e) => e.callee === calleeKey);
    if (!edge || !edge.ambiguous) return calleeKey;

    // Call site ambiguous ⇒ chọn 1 đích: file có tiền tố chung dài nhất, hòa ⇒ khóa nhỏ
    const candidates = edges
      .filter((e) => e.callee.endsWith(calleeKey.split("#")[1] ?? ""))
      .map((e) => e.callee);
    if (candidates.length <= 1) return calleeKey;

    candidates.sort((a, b) => {
      const fileA = a.split("#")[0] ?? "";
      const fileB = b.split("#")[0] ?? "";
      const pA = commonPrefixLength(callerFile, fileA);
      const pB = commonPrefixLength(callerFile, fileB);
      if (pB !== pA) return pB - pA;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    return candidates[0] ?? calleeKey;
  }

  function collectFromFunction(
    curKey: string,
    hop: number,
    isEntry: boolean,
    isMiddleware: boolean
  ): void {
    if (hop > CONFIG.SLICE_MAX_HOPS) return;
    if (visitedFns.has(curKey)) return;

    const sym = ctx.idx.functions.get(curKey) ?? ctx.idx.symbols.get(curKey);
    if (!sym) return;
    const file = ctx.files.get(sym.file_path);
    if (!file) return;

    visitedFns.add(curKey);

    const extCalls = fnExternalCalls.get(curKey) ?? [];
    const dataSinkLines: number[] = [];
    for (const ext of extCalls) {
      if (isDataSinkCall(ext, ctx.tech_stack)) {
        dataSinkLines.push(ext.line);
      }
    }

    const curStep: StepBuildingContext = {
      fnKey: curKey,
      fnSym: sym,
      hop,
      isEntry,
      isMiddleware,
      file,
      hasDataSink: dataSinkLines.length > 0,
      dataSinkLines,
      callsDataAccessFile: false,
    };
    stepsMeta.push(curStep);

    // Lấy các callee
    const edges = callerEdges.get(curKey) ?? [];
    // Sort callee theo UTF-16
    const sortedEdges = edges.slice().sort((a, b) => {
      if (a.callee < b.callee) return -1;
      if (a.callee > b.callee) return 1;
      return 0;
    });

    for (const e of sortedEdges) {
      const resolvedKey = resolveCalleeKey(curKey, e.callee);
      const targetFile = resolvedKey.split("#")[0] ?? "";
      if (isDataAccessFile(targetFile)) {
        curStep.callsDataAccessFile = true;
      }
      collectFromFunction(resolvedKey, hop + 1, false, false);
    }
  }

  // Bước 1: Entry (hop 0)
  if (entrySym) {
    visitedFns.add(entry.key);
    const extCalls = fnExternalCalls.get(entry.key) ?? [];
    const dataSinkLines: number[] = [];
    for (const ext of extCalls) {
      if (isDataSinkCall(ext, ctx.tech_stack)) {
        dataSinkLines.push(ext.line);
      }
    }

    stepsMeta.push({
      fnKey: entry.key,
      fnSym: entrySym,
      hop: 0,
      isEntry: true,
      isMiddleware: false,
      file: parsedEntryFile ?? {
        path: entryFile,
        language: "TYPESCRIPT",
        tier: "RESOLVED",
        tree: null as unknown as ParsedFile["tree"],
        source: "",
      },
      hasDataSink: dataSinkLines.length > 0,
      dataSinkLines,
      callsDataAccessFile: false,
    });

    // Middlewares của binding (hop 1)
    if (entry.binding?.middlewares) {
      for (const mwName of entry.binding.middlewares) {
        let mwKey: string | null = null;
        for (const [k, s] of ctx.idx.symbols) {
          if (
            (s.name === mwName || k.endsWith(`#${mwName}`)) &&
            (s.kind === "FUNCTION" || s.kind === "METHOD")
          ) {
            mwKey = k;
            break;
          }
        }
        if (mwKey) {
          collectFromFunction(mwKey, 1, false, true);
        }
      }
    }

    // Các hàm mà entry gọi
    const entryEdges = callerEdges.get(entry.key) ?? [];
    const sortedEntryEdges = entryEdges.slice().sort((a, b) => {
      if (a.callee < b.callee) return -1;
      if (a.callee > b.callee) return 1;
      return 0;
    });

    for (const e of sortedEntryEdges) {
      const resolvedKey = resolveCalleeKey(entry.key, e.callee);
      const targetFile = resolvedKey.split("#")[0] ?? "";
      if (isDataAccessFile(targetFile)) {
        stepsMeta[0]!.callsDataAccessFile = true;
      }
      collectFromFunction(resolvedKey, 1, false, false);
    }
  }

  // 2. ENG-81 Lọc liên quan
  // Giữ callee G khi: cây con G có DATA_SINK, hoặc G dùng kết quả, hoặc G có throw/raise.
  const keptStepsMeta = stepsMeta.filter((st) => {
    if (st.isEntry || st.isMiddleware) return true;
    if (st.hasDataSink) return true;

    // Kiểm tra source code có throw / raise không
    const src = st.file.source;
    if (/\b(throw|raise)\b/.test(src)) return true;

    // Kiểm tra cây con có DATA_SINK không
    const hasSubtreeSink = stepsMeta.some(
      (other) =>
        other.hasDataSink &&
        (callerEdges.get(st.fnKey) ?? []).some((e) => e.callee === other.fnKey)
    );
    if (hasSubtreeSink) return true;

    // Kiểm tra giá trị trả về có được dùng không (callee có gọi tiếp thì coi như được dùng)
    const outEdges = callerEdges.get(st.fnKey) ?? [];
    if (outEdges.length > 0) return true;

    return false;
  });

  // 3. Xác định Criterion (ENG-82 ý 5)
  // Criterion = câu lệnh DATA_SINK đầu tiên theo (thứ tự bước, dòng);
  // không có ⇒ OUTPUT cuối của entry; không ⇒ return cuối của entry; không ⇒ dòng cuối thân entry.
  let criterionStepIndex = 0;
  let criterionLine = 0;
  let foundCriterion = false;

  for (let i = 0; i < keptStepsMeta.length; i++) {
    const st = keptStepsMeta[i]!;
    if (st.dataSinkLines.length > 0) {
      st.dataSinkLines.sort((a, b) => a - b);
      criterionStepIndex = i;
      criterionLine = st.dataSinkLines[0]!;
      foundCriterion = true;
      break;
    }
  }

  if (!foundCriterion && keptStepsMeta.length > 0) {
    const entryStep = keptStepsMeta[0]!;
    const lines = entryStep.file.source.split(/\r?\n/);
    let lastOutputLine = 0;
    let lastReturnLine = 0;

    for (
      let lineNum = entryStep.fnSym.line_start;
      lineNum <= entryStep.fnSym.line_end;
      lineNum++
    ) {
      const text = lines[lineNum - 1] ?? "";
      if (isOutputStatement(text)) {
        lastOutputLine = lineNum;
      }
      if (/\breturn\b/.test(text)) {
        lastReturnLine = lineNum;
      }
    }

    if (lastOutputLine > 0) {
      criterionLine = lastOutputLine;
    } else if (lastReturnLine > 0) {
      criterionLine = lastReturnLine;
    } else {
      criterionLine = entryStep.fnSym.line_end;
    }
  }

  // 4. Dựng ExecutionTraceStep cho từng hàm (ENG-82..87)
  const traceSteps: ExecutionTraceStep[] = [];
  const dtoNames = new Set<string>();

  for (let i = 0; i < keptStepsMeta.length; i++) {
    const st = keptStepsMeta[i]!;
    const file = st.file;
    const fileSource = file.source;
    const allLines = fileSource.split(/\r?\n/);
    const commentPrefix = getCommentPrefix(file);

    // Gán layer kiến trúc (ENG-82 ý 3)
    let layer: ArchitecturalLayer = "BUSINESS_LOGIC";
    if (st.isEntry) {
      layer = "ENTRY_POINT";
    } else if (st.isMiddleware) {
      layer = "MIDDLEWARE";
    } else if (isDataAccessFile(st.fnSym.file_path)) {
      layer = "DATA_ACCESS";
    } else if (st.hasDataSink && !st.callsDataAccessFile) {
      layer = "DATA_ACCESS";
    }

    // Xác định tên hàm hiển thị
    // ENG-86: function_name = `Class.method` / tên hàm / `display_name`. Khóa ENG-20 là
    // `file#Class.method` ⇒ lấy phần sau `#` để giữ tên lớp.
    let funcName = st.fnSym.key.includes("#")
      ? st.fnSym.key.slice(st.fnSym.key.indexOf("#") + 1)
      : st.fnSym.name;
    if (st.isEntry && entry.binding) {
      funcName = entry.binding.display_name;
    }

    // Tập dòng giữ trong hàm (ENG-82 ý 6)
    const keptLines = new Set<number>();
    const startLine = st.fnSym.line_start;
    const endLine = st.fnSym.line_end;

    // Giữ chữ ký hàm
    let sigEnd = startLine;
    for (let l = startLine; l <= Math.min(endLine, startLine + 10); l++) {
      const lineText = allLines[l - 1] ?? "";
      if (lineText.includes("{") || lineText.trim().endsWith(":")) {
        sigEnd = l;
        break;
      }
    }
    for (let l = startLine; l <= sigEnd; l++) {
      keptLines.add(l);
    }
    // Giữ dòng đóng
    keptLines.add(endLine);

    // Nếu handler ẩn danh: snippet = cả câu lệnh đăng ký
    const isAnonHandler =
      st.isEntry &&
      entry.binding &&
      (entry.key.includes("<POST ") ||
        entry.key.includes("<GET ") ||
        entry.key.includes("<PUT ") ||
        entry.key.includes("<DELETE ") ||
        entry.key.includes("<anon@"));

    let moduleVarLine = 0;

    if (isAnonHandler && entry.binding) {
      for (
        let l = entry.binding.line_start;
        l <= entry.binding.line_end;
        l++
      ) {
        keptLines.add(l);
      }
    } else {
      // 1) Hạt giống: dòng chứa call site, DATA_SINK, OUTPUT, return/throw/raise/yield
      for (let l = startLine; l <= endLine; l++) {
        const text = allLines[l - 1] ?? "";

        if (st.dataSinkLines.includes(l)) {
          keptLines.add(l);
        }
        if (isOutputStatement(text)) {
          keptLines.add(l);
        }
        if (/\b(return|throw|raise|yield)\b/.test(text)) {
          keptLines.add(l);
        }
        const edges = callerEdges.get(st.fnKey) ?? [];
        for (const e of edges) {
          // Hạt giống "câu lệnh chứa call site tới callee giữ": so theo TÊN ĐƯỢC GỌI (phần cuối khóa
          // `file#Class.method` ⇒ `method`) đi kèm `(`, vì call site viết qua biến instance
          // (`categoryRepo.findById(…)`), không viết tên lớp `CategoryRepo`.
          const local = e.callee.includes("#") ? e.callee.slice(e.callee.indexOf("#") + 1) : e.callee;
          if (local.startsWith("<")) continue; // <module>, handler ẩn danh: không có tên gọi
          const calledName = local.slice(local.lastIndexOf(".") + 1).replace(/~\d+$/, "");
          if (!calledName) continue;
          const escaped = calledName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`(^|[^\\w$])${escaped}\\s*\\(`).test(text)) {
            keptLines.add(l);
          }
        }
        if (/^\s*if\s*\(/.test(text) && /\b(return|throw|res\.)\b/.test(text)) {
          keptLines.add(l);
        }
      }

      // 2) Def-use lùi: với câu lệnh giữ và tên v đọc, giữ định nghĩa v trong F trước nó;
      // lặp tới bất động. v là biến module cùng file ⇒ giữ khai báo trong snippet.
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 20) {
        changed = false;
        iterations++;

        if (addEnclosingControlLines(keptLines, file, startLine, endLine)) changed = true;
        const currentKept = Array.from(keptLines);
        for (const l of currentKept) {
          const lineText = allLines[l - 1] ?? "";
          const readVars = extractReadIdentifiers(lineText);

          for (const v of readVars) {
            // Tìm định nghĩa v trong thân hàm trước dòng l
            let defLine = 0;
            for (let prevL = l - 1; prevL >= startLine; prevL--) {
              const prevText = allLines[prevL - 1] ?? "";
              const isVarDecl = new RegExp(`\\b(const|let|var)\\s+[^=;]*\\b${v}\\b`).test(prevText);
              // Gán thường và gán phức hợp (`+=`, `-=`, `??=`…), không nhầm phép so sánh `==`.
              const ASSIGN_OP = `([-+*/%&|^]|\\*\\*|<<|>>|\\?\\?|&&|\\|\\|)?=(?!=)`;
              const isAssign = new RegExp(`\\b${v}\\s*${ASSIGN_OP}`).test(prevText);
              const isDestruct = new RegExp(`[\\{\\[][^\\}\\]]*\\b${v}\\b[^\\}\\]]*[\\}\\]]\\s*=`).test(prevText);
              const isLoop = new RegExp(`\\bfor\\s*\\([^;]*\\b${v}\\b`).test(prevText);
              const isCatch = new RegExp(`\\bcatch\\s*\\(\\s*${v}\\b`).test(prevText);
              // Mục 8 ý 6: `v.push(…)`, `v.x = …`, kể cả `v.x -= …`
              const isMutate = new RegExp(`\\b${v}\\.(push|set|add|append)\\b|\\b${v}\\.[a-zA-Z0-9_$]+\\s*${ASSIGN_OP}`).test(prevText);

              if (isVarDecl || isAssign || isDestruct || isLoop || isCatch || isMutate) {
                defLine = prevL;
                break;
              }
            }

            if (defLine > 0 && !keptLines.has(defLine)) {
              keptLines.add(defLine);
              changed = true;
            }

            // Nếu không tìm thấy trong hàm, kiểm tra biến module ở cấp file
            if (defLine === 0) {
              for (let modL = 1; modL < startLine; modL++) {
                const modText = allLines[modL - 1] ?? "";
                const isModDecl = new RegExp(`\\b(const|let|var|export const|export let)\\s+[^=;]*\\b${v}\\b`).test(modText);
                if (isModDecl) {
                  if (!keptLines.has(modL)) {
                    keptLines.add(modL);
                    changed = true;
                  }
                  moduleVarLine = moduleVarLine > 0 ? Math.min(moduleVarLine, modL) : modL;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Thu thập tên kiểu DTO xuất hiện trong các dòng giữ
    for (const l of keptLines) {
      const text = allLines[l - 1] ?? "";
      const matches = text.matchAll(/\b([A-Z][A-Za-z0-9]+(?:Dto|Request|Response|Input|Payload|Schema|Model|Entity))\b/g);
      for (const m of matches) {
        if (m[1]) dtoNames.add(m[1]);
      }
    }

    // ENG-87 Hard Clamp: khi bước > CONFIG.STEP_MAX_LINES (30 dòng)
    const sortedKeptLines = Array.from(keptLines).sort((a, b) => a - b);
    const minLine = moduleVarLine > 0 ? moduleVarLine : sortedKeptLines[0] ?? startLine;
    const maxLine = sortedKeptLines[sortedKeptLines.length - 1] ?? endLine;

    // Sinh snippet và snippet_line_map với marker lược dòng (ENG-86)
    const rawSnippetLines: string[] = [];
    const rawLineMap: number[] = [];

    let currentOmittedStart = 0;
    let currentOmittedCount = 0;

    for (let l = minLine; l <= maxLine; l++) {
      if (keptLines.has(l)) {
        if (currentOmittedCount > 0) {
          const firstOmittedText = allLines[currentOmittedStart - 1] ?? "";
          const indent = firstOmittedText.match(/^\s*/)?.[0] ?? "  ";
          rawSnippetLines.push(
            `${indent}${commentPrefix} … (${currentOmittedCount} dòng)`
          );
          rawLineMap.push(0);
          currentOmittedStart = 0;
          currentOmittedCount = 0;
        }

        rawSnippetLines.push(allLines[l - 1] ?? "");
        rawLineMap.push(l);
      } else {
        const text = allLines[l - 1] ?? "";
        if (text.trim().length > 0) {
          if (currentOmittedCount === 0) {
            currentOmittedStart = l;
          }
          currentOmittedCount++;
        }
      }
    }

    if (currentOmittedCount > 0) {
      const firstOmittedText = allLines[currentOmittedStart - 1] ?? "";
      const indent = firstOmittedText.match(/^\s*/)?.[0] ?? "  ";
      rawSnippetLines.push(
        `${indent}${commentPrefix} … (${currentOmittedCount} dòng)`
      );
      rawLineMap.push(0);
    }

    // Áp dụng Hard Clamp nếu > CONFIG.STEP_MAX_LINES (30) dòng (ENG-87)
    let finalSnippetLines = rawSnippetLines;
    let finalLineMap = rawLineMap;

    if (rawSnippetLines.length > CONFIG.STEP_MAX_LINES) {
      const sigLineCount = 1;
      const closeLineCount = 1;
      const W = Math.min(
        CONFIG.CLAMP_WINDOW_LINES,
        CONFIG.STEP_MAX_LINES - sigLineCount - closeLineCount - 2
      ); // W = 26 khi sig=1, close=1

      // Tìm vị trí của criterionLine trong rawLineMap
      let targetIndex = rawLineMap.findIndex((ln) => ln >= criterionLine);
      if (targetIndex < 0) targetIndex = Math.floor(rawLineMap.length / 2);

      const halfW = Math.floor(W / 2);
      let windowStart = Math.max(sigLineCount, targetIndex - halfW);
      let windowEnd = windowStart + W;

      if (windowEnd >= rawSnippetLines.length - closeLineCount) {
        windowEnd = rawSnippetLines.length - closeLineCount;
        windowStart = Math.max(sigLineCount, windowEnd - W);
      }

      const clampedSnippet: string[] = [];
      const clampedMap: number[] = [];

      // Chữ ký
      for (let k = 0; k < sigLineCount; k++) {
        clampedSnippet.push(rawSnippetLines[k] ?? "");
        clampedMap.push(rawLineMap[k] ?? 0);
      }

      // Marker trước cửa sổ
      if (windowStart > sigLineCount) {
        const omittedBefore = windowStart - sigLineCount;
        clampedSnippet.push(`  ${commentPrefix} … (${omittedBefore} dòng)`);
        clampedMap.push(0);
      }

      // Cửa sổ W dòng
      for (let k = windowStart; k < windowEnd; k++) {
        clampedSnippet.push(rawSnippetLines[k] ?? "");
        clampedMap.push(rawLineMap[k] ?? 0);
      }

      // Marker sau cửa sổ
      if (windowEnd < rawSnippetLines.length - closeLineCount) {
        const omittedAfter = rawSnippetLines.length - closeLineCount - windowEnd;
        clampedSnippet.push(`  ${commentPrefix} … (${omittedAfter} dòng)`);
        clampedMap.push(0);
      }

      // Dòng đóng
      for (let k = rawSnippetLines.length - closeLineCount; k < rawSnippetLines.length; k++) {
        clampedSnippet.push(rawSnippetLines[k] ?? "");
        clampedMap.push(rawLineMap[k] ?? 0);
      }

      finalSnippetLines = clampedSnippet;
      finalLineMap = clampedMap;
    }

    const nonZeroLines = finalLineMap.filter((n) => n > 0);
    const stepLineStart =
      nonZeroLines.length > 0 ? Math.min(...nonZeroLines) : startLine;
    const stepLineEnd =
      nonZeroLines.length > 0 ? Math.max(...nonZeroLines) : endLine;

    // Kiểm tra file ảo từ source_map
    let originNote: string | undefined;
    const origin = ctx.source_map.get(st.fnSym.file_path);
    if (origin && origin.line_origin[stepLineStart - 1]) {
      originNote = origin.line_origin[stepLineStart - 1];
    }

    traceSteps.push({
      step_number: i + 1,
      layer,
      file_path: st.fnSym.file_path,
      function_name: funcName,
      line_start: stepLineStart,
      line_end: stepLineEnd,
      snippet: finalSnippetLines.join("\n"),
      snippet_line_map: finalLineMap,
      origin_note: originNote,
    });
  }

  // 5. ENG-88 Trần node: lines ≤ NODE_MAX_LINES (100), tokens ≤ NODE_MAX_CODE_TOKENS (1500)
  function computeTotalMetrics(steps: ExecutionTraceStep[]): {
    lines: number;
    tokens: number;
  } {
    let lines = 0;
    let chars = 0;
    for (const s of steps) {
      lines += s.snippet.split("\n").length;
      chars += s.snippet.length;
    }
    const tokens = Math.ceil(chars / CONFIG.CHARS_PER_TOKEN);
    return { lines, tokens };
  }

  let metrics = computeTotalMetrics(traceSteps);
  while (
    (metrics.lines > CONFIG.NODE_MAX_LINES ||
      metrics.tokens > CONFIG.NODE_MAX_CODE_TOKENS) &&
    traceSteps.length > 1
  ) {
    // Tìm bước lá không bảo vệ có hop lớn nhất (hòa ⇒ step_number lớn nhất)
    // Các bước bảo vệ: entry (bước 1), middleware, và các bước từ 1 đến criterionStepIndex + 1
    const protectedLimit = Math.max(1, criterionStepIndex + 1);

    let candidateToRemove = -1;
    for (let idx = traceSteps.length - 1; idx >= protectedLimit; idx--) {
      candidateToRemove = idx;
      break;
    }

    if (candidateToRemove >= 0) {
      traceSteps.splice(candidateToRemove, 1);
      metrics = computeTotalMetrics(traceSteps);
    } else {
      break;
    }
  }

  // Đánh số lại step_number 1..n
  for (let idx = 0; idx < traceSteps.length; idx++) {
    traceSteps[idx]!.step_number = idx + 1;
  }

  // 6. ENG-89 dto_snippet
  let dtoSnippet = "";
  if (dtoNames.size > 0) {
    const dtoBlocks: string[] = [];
    const sortedDtoNames = Array.from(dtoNames).sort();
    for (const dName of sortedDtoNames) {
      for (const [, sym] of ctx.idx.symbols) {
        if (
          sym.name === dName &&
          (sym.kind === "INTERFACE" ||
            sym.kind === "TYPE" ||
            sym.kind === "CLASS")
        ) {
          const dFile = ctx.files.get(sym.file_path);
          if (dFile) {
            const dLines = dFile.source.split(/\r?\n/);
            const block = dLines
              .slice(sym.line_start - 1, sym.line_end)
              .join("\n");
            dtoBlocks.push(block);
          }
          break;
        }
      }
    }

    if (dtoBlocks.length > 0) {
      const combined = dtoBlocks.join("\n\n");
      const lines = combined.split("\n");
      if (lines.length > CONFIG.STEP_MAX_LINES) {
        const prefix = getCommentPrefix(parsedEntryFile);
        const kept = lines.slice(0, CONFIG.STEP_MAX_LINES - 1);
        const omitted = lines.length - kept.length;
        kept.push(`${prefix} … (${omitted} dòng)`);
        dtoSnippet = kept.join("\n");
      } else {
        dtoSnippet = combined;
      }
    }
  }

  // 7. Hoàn thiện Candidate SLICE
  const functionsInSlice = Array.from(
    new Set(keptStepsMeta.map((s) => s.fnKey))
  );

  let maxComplexity = 0;
  for (const fnKey of functionsInSlice) {
    const comp = ctx.idx.functions.get(fnKey)?.complexity ?? 0;
    if (comp > maxComplexity) maxComplexity = comp;
  }

  const rankScore = ctx.rank.get(entryFile) ?? 0;
  const baseTitle = entry.binding?.display_name ?? entry.key;

  return {
    id: `slice-${entry.key}`,
    node_type: "ARCHITECTURAL_DATA_FLOW",
    entry_symbol: entry.key,
    trace_steps: traceSteps,
    dto_snippet: dtoSnippet,
    cognitive_complexity: maxComplexity,
    rank_score: rankScore,
    title_source: entry.binding ? "ROUTE" : "ENTRY_SYMBOL",
    title_evidence: entry.binding?.display_name ?? entry.key,
    kind: "SLICE",
    order_key: entry.key,
    functions: functionsInSlice,
    binding: entry.binding,
    base_title: baseTitle,
  };
}
