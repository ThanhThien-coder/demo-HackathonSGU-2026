// Đồ thị gọi hàm và entry point — spec 11 Mục 3 (ENG-30..35), Mục 4 (ENG-40), spec 12 Mục 1–2.
import type { Node } from "web-tree-sitter";
import type { FunctionCallEdge, IngestionReport } from "@/contracts";
import type {
  ExternalCall,
  EntryPoint,
  FunctionInfo,
  ParsedFile,
  RouteBinding,
  SymbolIndex,
} from "./types";

const HTTP_VERBS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "all",
  "options",
  "head",
]);

const GENERIC_ENTRY_TOKENS = new Set([
  "controller",
  "controllers",
  "route",
  "routes",
  "router",
  "routers",
  "handler",
  "handlers",
  "api",
  "endpoint",
  "endpoints",
  "screen",
  "screens",
  "page",
  "pages",
  "view",
  "views",
  "activity",
  "activities",
  "fragment",
  "fragments",
  "command",
  "commands",
]);

const FUNCTION_NODE_TYPES = new Set([
  "function_declaration",
  "function_expression",
  "arrow_function",
  "method_definition",
  "function_definition",
]);

// Thu thập decorator cho node (gồm con trực tiếp, con của export_statement, và sibling đứng trước)
function getDecorators(n: Node): Node[] {
  const decs: Node[] = [];
  for (let i = 0; i < n.childCount; i++) {
    const c = n.child(i);
    if (c && c.type === "decorator") decs.push(c);
  }
  const parent = n.parent;
  if (parent && parent.type === "export_statement") {
    for (let i = 0; i < parent.childCount; i++) {
      const c = parent.child(i);
      if (c && c.type === "decorator") decs.push(c);
    }
    let prev = parent.previousNamedSibling;
    while (prev && prev.type === "decorator") {
      decs.unshift(prev);
      prev = prev.previousNamedSibling;
    }
  } else {
    let prev = n.previousNamedSibling;
    while (prev && prev.type === "decorator") {
      decs.unshift(prev);
      prev = prev.previousNamedSibling;
    }
  }
  return decs;
}

// Tìm hàm bao bọc gần nhất cho một AST node (ENG-30)
function findEnclosingFunctionKey(
  node: Node,
  filePath: string,
  idx: SymbolIndex
): string {
  let cur: Node | null = node.parent;
  while (cur) {
    if (FUNCTION_NODE_TYPES.has(cur.type)) {
      for (const [key, func] of idx.functions.entries()) {
        if (func.file_path === filePath) {
          const rowStart = cur.startPosition.row + 1;
          const rowEnd = cur.endPosition.row + 1;
          if (
            Math.abs(func.line_start - rowStart) <= 1 &&
            Math.abs(func.line_end - rowEnd) <= 1
          ) {
            return key;
          }
        }
      }
    }
    cur = cur.parent;
  }
  // Mặc định gán cho top-level module nếu có
  const modKey = `${filePath}#<module>`;
  if (idx.symbols.has(modKey)) return modKey;
  return `${filePath}#<anon>`;
}

// Lấy chuỗi receiver: a.b.c -> ['a', 'b'], method -> 'c'
function parseMemberExpression(node: Node): { receiverChain: string[]; method: string } {
  const parts: string[] = [];
  let cur: Node | null = node;

  while (cur && (cur.type === "member_expression" || cur.type === "attribute")) {
    const prop = cur.childForFieldName("property") ?? cur.childForFieldName("attribute");
    if (prop) parts.unshift(prop.text);
    cur = cur.childForFieldName("object") ?? cur.childForFieldName("value");
  }

  if (cur) parts.unshift(cur.text);

  const method = parts.pop() ?? "";
  return { receiverChain: parts, method };
}

// Trích xuất chuỗi tĩnh từ AST node (nếu có)
function extractStaticString(node: Node | null): string | null {
  if (!node) return null;
  if (node.type === "string" || node.type === "string_fragment") {
    return node.text.replace(/^['"]|['"]$/g, "");
  }
  if (node.type === "string_literal") {
    return node.text.replace(/^['"]|['"]$/g, "");
  }
  return null;
}

// Nhận diện route handler từ đối số
function resolveHandlerKey(
  argNode: Node,
  filePath: string,
  verb: string,
  routePath: string | null,
  idx: SymbolIndex,
  anonCounter: { count: number }
): string {
  // Lời gọi bọc: asyncHandler(ctrl.create)
  if (argNode.type === "call_expression" && argNode.namedChildCount > 0) {
    const inner = argNode.namedChild(argNode.namedChildCount - 1);
    if (inner) return resolveHandlerKey(inner, filePath, verb, routePath, idx, anonCounter);
  }

  // Hàm ẩn danh (arrow function hoặc function expression)
  if (
    argNode.type === "arrow_function" ||
    argNode.type === "function_expression" ||
    argNode.type === "function_definition"
  ) {
    let key: string;
    if (routePath !== null) {
      key = `${filePath}#<${verb.toUpperCase()} ${routePath}>`;
    } else {
      key = `${filePath}#<anon@L${argNode.startPosition.row + 1}>`;
    }
    if (idx.symbols.has(key)) {
      anonCounter.count++;
      key = `${key}~${anonCounter.count}`;
    }

    const funcInfo: FunctionInfo = {
      key,
      kind: "FUNCTION",
      name: routePath ? `${verb.toLowerCase()} ${routePath}` : "<anonymous>",
      file_path: filePath,
      line_start: argNode.startPosition.row + 1,
      line_end: argNode.endPosition.row + 1,
      is_exported: false,
      params: [],
      locals: [],
      complexity: 0,
    };
    idx.symbols.set(key, funcInfo);
    idx.functions.set(key, funcInfo);
    return key;
  }

  // Tên trực tiếp: handler hoặc ctrl.create
  const text = argNode.text;
  // Tìm trong symbol table
  const directKey = `${filePath}#${text}`;
  if (idx.symbols.has(directKey)) return directKey;

  // Kiểm tra qua import
  const parts = text.split(".");
  const baseName = parts[0];
  const imported = idx.imports.get(filePath)?.get(baseName);
  if (imported && imported.source_file) {
    if (parts.length > 1) {
      const candidateKey = `${imported.source_file}#${imported.symbol_name}.${parts[1]}`;
      if (idx.symbols.has(candidateKey)) return candidateKey;
      const directCandidate = `${imported.source_file}#${parts[1]}`;
      if (idx.symbols.has(directCandidate)) return directCandidate;
    } else {
      const candidateKey = `${imported.source_file}#${imported.symbol_name}`;
      if (idx.symbols.has(candidateKey)) return candidateKey;
    }
  }

  return `${filePath}#${text}`;
}

export interface CallGraphResult {
  edges: FunctionCallEdge[];
  external: ExternalCall[];
  bindings: RouteBinding[];
}

export function buildCallGraph(
  files: ParsedFile[],
  idx: SymbolIndex
): CallGraphResult {
  const rawEdges: FunctionCallEdge[] = [];
  const external: ExternalCall[] = [];
  const bindings: RouteBinding[] = [];
  const anonCounter = { count: 0 };

  for (const file of files) {
    const filePath = file.path;
    const lang = file.language;
    const root = file.tree.rootNode;

    function visit(node: Node): void {
      // 1. Nhận diện Route Express / Koa / Fastify (ENG-40)
      if (
        (lang === "TYPESCRIPT" || lang === "TSX" || lang === "JAVASCRIPT") &&
        node.type === "call_expression"
      ) {
        const fnNode = node.childForFieldName("function");
        if (fnNode && fnNode.type === "member_expression") {
          const prop = fnNode.childForFieldName("property");
          const obj = fnNode.childForFieldName("object");
          if (prop && obj) {
            const verb = prop.text.toLowerCase();
            if (HTTP_VERBS.has(verb)) {
              const argsNode = node.childForFieldName("arguments");
              if (argsNode && argsNode.namedChildCount >= 2) {
                const firstArg = argsNode.namedChild(0);
                const pathStr = extractStaticString(firstArg);

                // Handler là arg cuối cùng, middlewares là các arg ở giữa
                const argCount = argsNode.namedChildCount;
                const lastArg = argsNode.namedChild(argCount - 1);
                if (lastArg) {
                  const handlerKey = resolveHandlerKey(
                    lastArg,
                    filePath,
                    verb,
                    pathStr,
                    idx,
                    anonCounter
                  );

                  const middlewares: string[] = [];
                  for (let i = 1; i < argCount - 1; i++) {
                    const mwArg = argsNode.namedChild(i);
                    if (mwArg) middlewares.push(mwArg.text);
                  }

                  const displayName = `${obj.text}.${verb}('${pathStr ?? ""}')`;

                  const binding: RouteBinding = {
                    file_path: filePath,
                    line_start: node.startPosition.row + 1,
                    line_end: node.endPosition.row + 1,
                    kind: "HTTP",
                    method: verb.toUpperCase(),
                    path: pathStr,
                    handler: handlerKey,
                    middlewares,
                    display_name: displayName,
                  };
                  bindings.push(binding);

                  // ENG-34: Hàm chứa câu lệnh đăng ký route gọi handler & middlewares
                  let callerKey = findEnclosingFunctionKey(node, filePath, idx);
                  if (callerKey === handlerKey) {
                    callerKey = `${filePath}#<module>`;
                  }
                  if (callerKey !== handlerKey) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: handlerKey,
                      confidence: "RESOLVED",
                      ambiguous: false,
                      call_count: 1,
                    });
                  }
                  for (const mw of middlewares) {
                    const mwDirectKey = `${filePath}#${mw}`;
                    const mwKey = idx.symbols.has(mwDirectKey)
                      ? mwDirectKey
                      : resolveHandlerKey(
                          argsNode.namedChild(1)!,
                          filePath,
                          verb,
                          null,
                          idx,
                          anonCounter
                        );
                    if (callerKey !== mwKey) {
                      rawEdges.push({
                        caller: callerKey,
                        callee: mwKey,
                        confidence: "RESOLVED",
                        ambiguous: false,
                        call_count: 1,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 2. Nhận diện Route NestJS (ENG-40)
      if (
        (lang === "TYPESCRIPT" || lang === "TSX") &&
        node.type === "class_declaration"
      ) {
        // Tìm @Controller(prefix?)
        let controllerPrefix = "";
        let isController = false;
        const classDecorators = getDecorators(node);

        for (const c of classDecorators) {
          const decCall = c.namedChild(0);
          if (decCall && decCall.type === "call_expression") {
            const fn = decCall.childForFieldName("function");
            if (fn && fn.text === "Controller") {
              isController = true;
              const args = decCall.childForFieldName("arguments");
              if (args && args.namedChildCount > 0) {
                controllerPrefix = extractStaticString(args.namedChild(0)) ?? "";
              }
            }
          } else if (decCall && (decCall.type === "identifier" || decCall.text === "Controller")) {
            if (decCall.text === "Controller") {
              isController = true;
            }
          }
        }

        if (isController) {
          const className = node.childForFieldName("name")?.text ?? "";
          const body = node.childForFieldName("body");
          if (body) {
            let pendingDecorators: Node[] = [];

            for (let i = 0; i < body.childCount; i++) {
              const member = body.child(i);
              if (!member) continue;

              if (member.type === "decorator") {
                pendingDecorators.push(member);
                continue;
              }

              if (member.type === "method_definition") {
                const methodName = member.childForFieldName("name")?.text ?? "";
                let methodVerb: string | null = null;
                let methodSubPath: string | null = null;
                const middlewares: string[] = [];

                // Gom tất cả decorator của method
                const methodDecorators: Node[] = [...pendingDecorators];
                for (let j = 0; j < member.childCount; j++) {
                  const mc = member.child(j);
                  if (mc && mc.type === "decorator") {
                    methodDecorators.push(mc);
                  }
                }
                pendingDecorators = [];

                for (const mc of methodDecorators) {
                  const decCall = mc.namedChild(0);
                  if (decCall && decCall.type === "call_expression") {
                    const dfn = decCall.childForFieldName("function")?.text ?? "";
                    const dUpper = dfn.toUpperCase();
                    if (["GET", "POST", "PUT", "PATCH", "DELETE", "ALL", "OPTIONS", "HEAD"].includes(dUpper)) {
                      methodVerb = dUpper;
                      const dargs = decCall.childForFieldName("arguments");
                      if (dargs && dargs.namedChildCount > 0) {
                        methodSubPath = extractStaticString(dargs.namedChild(0));
                      } else {
                        methodSubPath = "";
                      }
                    } else if (dUpper === "USEGUARDS" || dUpper === "USEINTERCEPTORS" || dUpper === "USEPIPES") {
                      const dargs = decCall.childForFieldName("arguments");
                      if (dargs) {
                        for (let a = 0; a < dargs.namedChildCount; a++) {
                          const mw = dargs.namedChild(a);
                          if (mw) {
                            const mwText = mw.text;
                            if (dUpper === "USEGUARDS") {
                              middlewares.push(`${mwText}.canActivate`);
                            } else if (dUpper === "USEINTERCEPTORS") {
                              middlewares.push(`${mwText}.intercept`);
                            } else if (dUpper === "USEPIPES") {
                              middlewares.push(`${mwText}.transform`);
                            } else {
                              middlewares.push(mwText);
                            }
                          }
                        }
                      }
                    }
                  } else if (decCall && decCall.type === "identifier") {
                    const dUpper = decCall.text.toUpperCase();
                    if (["GET", "POST", "PUT", "PATCH", "DELETE", "ALL", "OPTIONS", "HEAD"].includes(dUpper)) {
                      methodVerb = dUpper;
                      methodSubPath = "";
                    }
                  }
                }

                if (methodVerb) {
                  let fullPath = "";
                  const cp = controllerPrefix.replace(/^\/|\/$/g, "");
                  const sp = (methodSubPath ?? "").replace(/^\/|\/$/g, "");
                  if (cp && sp) fullPath = `/${cp}/${sp}`;
                  else if (cp) fullPath = `/${cp}`;
                  else if (sp) fullPath = `/${sp}`;
                  else fullPath = "/";

                  const handlerKey = `${filePath}#${className}.${methodName}`;
                  const displayName = `@${methodVerb.charAt(0) + methodVerb.slice(1).toLowerCase()}('${fullPath}')`;

                  bindings.push({
                    file_path: filePath,
                    line_start: member.startPosition.row + 1,
                    line_end: member.endPosition.row + 1,
                    kind: "HTTP",
                    method: methodVerb,
                    path: fullPath,
                    handler: handlerKey,
                    middlewares,
                    display_name: displayName,
                  });
                }
              } else {
                pendingDecorators = [];
              }
            }
          }
        }
      }

      // 3. Nhận diện Flask / FastAPI Route (Python ENG-40)
      if (lang === "PYTHON" && node.type === "decorated_definition") {
        let routeVerb: string | null = null;
        let routePath: string | null = null;
        const middlewares: string[] = [];

        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (c && c.type === "decorator") {
            const decCall = c.namedChild(0);
            if (decCall && decCall.type === "call") {
              const fn = decCall.childForFieldName("function");
              if (fn && fn.type === "attribute") {
                const attr = fn.childForFieldName("attribute")?.text?.toLowerCase();
                if (attr && (HTTP_VERBS.has(attr) || attr === "route")) {
                  routeVerb = attr === "route" ? "GET" : attr.toUpperCase();
                  const args = decCall.childForFieldName("arguments");
                  if (args && args.namedChildCount > 0) {
                    routePath = extractStaticString(args.namedChild(0));
                  }
                }
              }
            } else if (c.text.includes("login_required") || c.text.includes("auth")) {
              middlewares.push(c.text.replace(/^@/, ""));
            }
          }
        }

        if (routeVerb) {
          const defNode = node.childForFieldName("definition");
          if (defNode && defNode.type === "function_definition") {
            const fnName = defNode.childForFieldName("name")?.text ?? "";
            const handlerKey = `${filePath}#${fnName}`;

            bindings.push({
              file_path: filePath,
              line_start: node.startPosition.row + 1,
              line_end: node.endPosition.row + 1,
              kind: "HTTP",
              method: routeVerb,
              path: routePath,
              handler: handlerKey,
              middlewares,
              display_name: `@app.${routeVerb.toLowerCase()}('${routePath ?? ""}')`,
            });
          }
        }
      }

      // 4. Phân giải Call Site chung (ENG-31)
      const isCallNode =
        node.type === "call_expression" ||
        node.type === "new_expression" ||
        node.type === "call";

      if (isCallNode) {
        const callerKey = findEnclosingFunctionKey(node, filePath, idx);
        const fnNode =
          node.childForFieldName("function") ??
          node.childForFieldName("constructor");

        if (fnNode) {
          const line = node.startPosition.row + 1;

          if (fnNode.type === "identifier") {
            // (1) f() gọi trực tiếp
            const name = fnNode.text;
            const localKey = `${filePath}#${name}`;
            const localSym = idx.symbols.get(localKey);

            if (localSym) {
              if (localSym.kind === "CLASS") {
                // ENG-30: new T() chỉ trỏ tới constructor nếu có, không trỏ tới CLASS
                if (node.type === "new_expression") {
                  const ctorKey = `${filePath}#${name}.constructor`;
                  const initKey = `${filePath}#${name}.__init__`;
                  if (idx.functions.has(ctorKey) || idx.symbols.has(ctorKey)) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: ctorKey,
                      confidence: "RESOLVED",
                      ambiguous: false,
                      call_count: 1,
                    });
                  } else if (idx.functions.has(initKey) || idx.symbols.has(initKey)) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: initKey,
                      confidence: "RESOLVED",
                      ambiguous: false,
                      call_count: 1,
                    });
                  }
                }
              } else if (localSym.kind === "FUNCTION" || localSym.kind === "METHOD") {
                rawEdges.push({
                  caller: callerKey,
                  callee: localKey,
                  confidence: "RESOLVED",
                  ambiguous: false,
                  call_count: 1,
                });
              }
            } else {
              // (2) f import trực tiếp
              const imported = idx.imports.get(filePath)?.get(name);
              if (imported && imported.source_file) {
                const targetSymName =
                  imported.symbol_name === "default" ? name : imported.symbol_name;
                const targetKey = `${imported.source_file}#${targetSymName}`;
                const targetSym = idx.symbols.get(targetKey);

                if (targetSym?.kind === "CLASS") {
                  if (node.type === "new_expression") {
                    const ctorKey = `${imported.source_file}#${targetSymName}.constructor`;
                    const initKey = `${imported.source_file}#${targetSymName}.__init__`;
                    if (idx.functions.has(ctorKey) || idx.symbols.has(ctorKey)) {
                      rawEdges.push({
                        caller: callerKey,
                        callee: ctorKey,
                        confidence: "RESOLVED",
                        ambiguous: false,
                        call_count: 1,
                      });
                    } else if (idx.functions.has(initKey) || idx.symbols.has(initKey)) {
                      rawEdges.push({
                        caller: callerKey,
                        callee: initKey,
                        confidence: "RESOLVED",
                        ambiguous: false,
                        call_count: 1,
                      });
                    }
                  }
                } else {
                  rawEdges.push({
                    caller: callerKey,
                    callee: targetKey,
                    confidence: "RESOLVED",
                    ambiguous: false,
                    call_count: 1,
                  });
                }
              } else if (imported && imported.import_source) {
                external.push({
                  caller: callerKey,
                  line,
                  receiver_chain: [],
                  method: name,
                  import_source: imported.import_source,
                });
              }
            }
          } else if (fnNode.type === "member_expression" || fnNode.type === "attribute") {
            const { receiverChain, method } = parseMemberExpression(fnNode);
            const receiverText = receiverChain.join(".");

            // Hàm tìm method của một class type (ENG-31 (3))
            const resolveMethodOnType = (typeStr: string): string | null => {
              // 1. Kiểm tra qua import
              const imp = idx.imports.get(filePath)?.get(typeStr);
              if (imp && imp.source_file) {
                const symName = imp.symbol_name === "default" ? typeStr : imp.symbol_name;
                const k = `${imp.source_file}#${symName}.${method}`;
                if (idx.symbols.has(k) || idx.functions.has(k)) return k;
                const simpleK = `${imp.source_file}#${method}`;
                if (idx.symbols.has(simpleK) || idx.functions.has(simpleK)) return simpleK;
              }
              // 2. Cùng file
              const loc = `${filePath}#${typeStr}.${method}`;
              if (idx.symbols.has(loc) || idx.functions.has(loc)) return loc;
              // 3. Quét toàn bộ symbols
              for (const [sKey, sym] of idx.symbols) {
                if (
                  sym.kind === "METHOD" &&
                  (sKey.endsWith(`#${typeStr}.${method}`) || sKey.includes(`#${typeStr}.${method}~`))
                ) {
                  return sKey;
                }
              }
              return null;
            };

            if (receiverText === "this" || receiverText === "self") {
              // this.m() cùng file / class
              const callerSym = idx.symbols.get(callerKey);
              if (callerSym && callerKey.includes(".")) {
                const classPart = callerKey.split("#")[1]?.split(".")[0];
                if (classPart) {
                  const targetKey = `${filePath}#${classPart}.${method}`;
                  rawEdges.push({
                    caller: callerKey,
                    callee: targetKey,
                    confidence: "RESOLVED",
                    ambiguous: false,
                    call_count: 1,
                  });
                }
              }
            } else if (receiverText.startsWith("this.") || receiverText.startsWith("self.")) {
              // this.x.m() (ENG-31 (3))
              const fieldName = receiverText.split(".")[1] ?? "";
              const callerSym = idx.symbols.get(callerKey);
              let fieldType: string | undefined;

              if (callerSym && callerKey.includes(".")) {
                const classPart = callerKey.split("#")[1]?.split(".")[0];
                if (classPart) {
                  const classKey = `${filePath}#${classPart}`;
                  fieldType =
                    idx.field_types.get(`${classKey}.${fieldName}`) ??
                    idx.field_types.get(`${filePath}#${fieldName}`);
                }
              }

              if (fieldType) {
                const impls = idx.interface_impls.get(fieldType);
                if (impls && impls.length === 1) {
                  const implClassKey = impls[0]!;
                  const targetMethodKey = `${implClassKey}.${method}`;
                  rawEdges.push({
                    caller: callerKey,
                    callee: targetMethodKey,
                    confidence: "RESOLVED",
                    ambiguous: false,
                    call_count: 1,
                  });
                } else if (impls && impls.length > 1) {
                  for (const implClassKey of impls) {
                    const targetMethodKey = `${implClassKey}.${method}`;
                    rawEdges.push({
                      caller: callerKey,
                      callee: targetMethodKey,
                      confidence: "RESOLVED",
                      ambiguous: true,
                      call_count: 1,
                    });
                  }
                } else {
                  const resolvedKey = resolveMethodOnType(fieldType);
                  if (resolvedKey) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: resolvedKey,
                      confidence: "RESOLVED",
                      ambiguous: false,
                      call_count: 1,
                    });
                  } else {
                    external.push({
                      caller: callerKey,
                      line,
                      receiver_chain: receiverChain,
                      method,
                      import_source: null,
                    });
                  }
                }
              } else {
                external.push({
                  caller: callerKey,
                  line,
                  receiver_chain: receiverChain,
                  method,
                  import_source: null,
                });
              }
            } else {
              // x.m()
              const baseReceiver = receiverChain[0] ?? "";
              const imported = idx.imports.get(filePath)?.get(baseReceiver);

              if (imported && imported.source_file) {
                // Đích trong file nội bộ
                const targetMethodKey = `${imported.source_file}#${imported.symbol_name}.${method}`;
                const simpleMethodKey = `${imported.source_file}#${method}`;
                const chosenKey = idx.symbols.has(targetMethodKey)
                  ? targetMethodKey
                  : simpleMethodKey;

                rawEdges.push({
                  caller: callerKey,
                  callee: chosenKey,
                  confidence: "RESOLVED",
                  ambiguous: false,
                  call_count: 1,
                });
              } else if (imported && imported.import_source) {
                external.push({
                  caller: callerKey,
                  line,
                  receiver_chain: receiverChain,
                  method,
                  import_source: imported.import_source,
                });
              } else {
                // Kiểm tra field_types cho biến cục bộ / module (ENG-22, ENG-31 (3))
                const fieldType =
                  idx.field_types.get(`${filePath}#${baseReceiver}`) ??
                  idx.field_types.get(baseReceiver);

                if (fieldType) {
                  const impls = idx.interface_impls.get(fieldType);
                  if (impls && impls.length === 1) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: `${impls[0]}.${method}`,
                      confidence: "RESOLVED",
                      ambiguous: false,
                      call_count: 1,
                    });
                  } else if (impls && impls.length > 1) {
                    for (const implClassKey of impls) {
                      rawEdges.push({
                        caller: callerKey,
                        callee: `${implClassKey}.${method}`,
                        confidence: "RESOLVED",
                        ambiguous: true,
                        call_count: 1,
                      });
                    }
                  } else {
                    const resolvedKey = resolveMethodOnType(fieldType);
                    if (resolvedKey) {
                      rawEdges.push({
                        caller: callerKey,
                        callee: resolvedKey,
                        confidence: "RESOLVED",
                        ambiguous: false,
                        call_count: 1,
                      });
                    } else {
                      external.push({
                        caller: callerKey,
                        line,
                        receiver_chain: receiverChain,
                        method,
                        import_source: null,
                      });
                    }
                  }
                } else {
                  external.push({
                    caller: callerKey,
                    line,
                    receiver_chain: receiverChain,
                    method,
                    import_source: null,
                  });
                }
              }
            }
          }
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) visit(child);
      }
    }

    visit(root);
  }

  // ENG-33: Gộp cạnh theo (caller, callee), loại bỏ self-loop và cạnh tới CLASS (ENG-30, ENG-60)
  const edgeMap = new Map<string, FunctionCallEdge>();
  for (const e of rawEdges) {
    if (e.caller === e.callee) continue; // Bỏ self-loop
    const calleeSym = idx.symbols.get(e.callee);
    if (calleeSym && calleeSym.kind === "CLASS") continue; // ENG-30: Không tới CLASS

    const pairKey = `${e.caller}==>${e.callee}`;
    const existing = edgeMap.get(pairKey);
    if (!existing) {
      edgeMap.set(pairKey, { ...e });
    } else {
      existing.call_count += e.call_count;
      if (e.confidence === "RESOLVED") existing.confidence = "RESOLVED";
      if (e.ambiguous) existing.ambiguous = true;
    }
  }

  const edges = Array.from(edgeMap.values()).sort((a, b) => {
    if (a.caller < b.caller) return -1;
    if (a.caller > b.caller) return 1;
    if (a.callee < b.callee) return -1;
    if (a.callee > b.callee) return 1;
    return 0;
  });

  return { edges, external, bindings };
}

// ENG-35: Đồ thị file từ đồ thị cạnh hàm
export function fileGraph(
  edges: FunctionCallEdge[]
): Map<string, Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>> {
  const fg = new Map<
    string,
    Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>
  >();

  for (const edge of edges) {
    const fileA = edge.caller.split("#")[0] ?? "";
    const fileB = edge.callee.split("#")[0] ?? "";
    if (!fileA || !fileB || fileA === fileB) continue; // bỏ self-loop

    let adj = fg.get(fileA);
    if (!adj) {
      adj = new Map();
      fg.set(fileA, adj);
    }

    const cur = adj.get(fileB);
    if (!cur) {
      adj.set(fileB, { weight: edge.call_count, confidence: edge.confidence });
    } else {
      cur.weight += edge.call_count;
      if (edge.confidence === "RESOLVED") {
        cur.confidence = "RESOLVED";
      }
    }
  }

  return fg;
}

// Mục 4: Nhận diện EntryPoint (REGISTERED, GENERIC)
export function findEntries(
  files: ParsedFile[],
  idx: SymbolIndex,
  graph: CallGraphResult,
  scope: string,
  _report?: IngestionReport
): EntryPoint[] {
  void _report;
  const entries: EntryPoint[] = [];
  const seenKeys = new Set<string>();

  // 1. REGISTERED từ graph.bindings (ENG-40)
  for (const binding of graph.bindings) {
    // ENG-05: Entry chỉ lấy trong scope (root_dir_offset)
    if (scope && !binding.file_path.startsWith(scope)) continue;

    if (!seenKeys.has(binding.handler)) {
      seenKeys.add(binding.handler);
      entries.push({
        key: binding.handler,
        binding,
        source: "REGISTERED",
      });
    }
  }

  // 2. GENERIC: Nếu không có REGISTERED nào (ENG-40 ý 3, spec 12 Mục 2 ý 1)
  if (entries.length === 0) {
    const fg = fileGraph(graph.edges);

    // Tính in-degree của từng file
    const inDegree = new Map<string, number>();
    for (const file of files) {
      inDegree.set(file.path, 0);
    }
    for (const [, adj] of fg) {
      for (const [target] of adj) {
        inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
      }
    }

    for (const file of files) {
      if (scope && !file.path.startsWith(scope)) continue;
      if ((inDegree.get(file.path) ?? 0) > 0) continue; // Phải có in-degree = 0

      // Kiểm tra segment thư mục hoặc token cuối stem thuộc danh sách GENERIC
      const normPath = file.path.replace(/\\/g, "/");
      const segments = normPath.split("/");
      const fileName = segments[segments.length - 1] ?? "";
      const stem = fileName.replace(/\.[^.]+$/, "");
      const stemTokens = stem.toLowerCase().split(/[-_.]/);
      const lastStemToken = stemTokens[stemTokens.length - 1] ?? "";

      const hasMatchingSegment = segments.some((s) =>
        GENERIC_ENTRY_TOKENS.has(s.toLowerCase())
      );
      const hasMatchingStem = GENERIC_ENTRY_TOKENS.has(lastStemToken);

      if (hasMatchingSegment || hasMatchingStem) {
        // Mọi hàm/method export trong file là entry GENERIC
        for (const [key, sym] of idx.symbols.entries()) {
          if (
            sym.file_path === file.path &&
            sym.is_exported &&
            (sym.kind === "FUNCTION" || sym.kind === "METHOD")
          ) {
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              entries.push({
                key,
                binding: null,
                source: "GENERIC",
              });
            }
          }
        }
      }
    }
  }

  // Sắp xếp theo key (ENG-01 UTF-16)
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return entries;
}
