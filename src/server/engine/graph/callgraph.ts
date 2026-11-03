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
      // ENG-20: line_start của symbol tính từ decorator đầu tiên (NestJS @Post + @UseGuards, Flask @route +
      // @login_required…) nên có thể nằm trên node hàm nhiều dòng. Khớp theo dòng kết thúc trùng khít,
      // line_start ≤ dòng đầu node, ưu tiên trùng tên; nhiều ứng viên ⇒ line_start lớn nhất, rồi khóa nhỏ.
      const rowStart = cur.startPosition.row + 1;
      const rowEnd = cur.endPosition.row + 1;
      const nodeName = cur.childForFieldName("name")?.text ?? null;
      let best: { key: string; start: number; named: boolean } | null = null;
      for (const [key, func] of idx.functions.entries()) {
        if (func.file_path !== filePath || func.line_end !== rowEnd || func.line_start > rowStart) continue;
        const named = nodeName !== null && func.name === nodeName;
        const better =
          !best ||
          (named && !best.named) ||
          (named === best.named && (func.line_start > best.start || (func.line_start === best.start && key < best.key)));
        if (better) best = { key, start: func.line_start, named };
      }
      if (best) return best.key;
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
        // `12` Mục 1 Flask/FastAPI: `@X.route(path, methods=…)`, `@X.get/post/…(path)`; decorator khác
        // (`@login_required`) = middleware; FastAPI `Depends(fn)` ⇒ middleware theo thứ tự tham số.
        let routeVerb: string | null = null;
        let routePath: string | null = null;
        let routeReceiver = "app";
        let routeDecorator = "";
        const middlewares: string[] = [];

        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (!c || c.type !== "decorator") continue;
          const expr = c.namedChild(0);
          const fn = expr?.type === "call" ? expr.childForFieldName("function") : expr;
          const attr = fn?.type === "attribute" ? fn.childForFieldName("attribute")?.text?.toLowerCase() : undefined;
          if (expr?.type === "call" && fn?.type === "attribute" && attr && (HTTP_VERBS.has(attr) || attr === "route")) {
            routeReceiver = fn.childForFieldName("object")?.text ?? "app";
            routeDecorator = attr;
            routeVerb = attr === "route" ? "GET" : attr.toUpperCase();
            const args = expr.childForFieldName("arguments");
            for (let k = 0; k < (args?.namedChildCount ?? 0); k++) {
              const a = args!.namedChild(k);
              if (!a) continue;
              if (a.type === "keyword_argument") {
                // Flask methods=["POST", …] ⇒ verb đầu tiên
                if (a.childForFieldName("name")?.text === "methods") {
                  const list = a.childForFieldName("value");
                  const first = list?.namedChild(0) ?? null;
                  const m = extractStaticString(first);
                  if (m) routeVerb = m.toUpperCase();
                }
              } else if (routePath === null) {
                routePath = extractStaticString(a);
              }
            }
          } else if (fn) {
            // Decorator khác ⇒ middleware (tên hàm decorator, bỏ đối số)
            middlewares.push(fn.text);
          }
        }

        if (routeVerb) {
          const defNode = node.childForFieldName("definition");
          if (defNode && defNode.type === "function_definition") {
            const fnName = defNode.childForFieldName("name")?.text ?? "";
            const handlerKey = `${filePath}#${fnName}`;

            // FastAPI: tham số `x = Depends(fn)` ⇒ middleware `fn`, theo thứ tự tham số
            const params = defNode.childForFieldName("parameters");
            for (let k = 0; k < (params?.namedChildCount ?? 0); k++) {
              const p = params!.namedChild(k);
              const value = p?.childForFieldName("value");
              if (value?.type === "call" && value.childForFieldName("function")?.text === "Depends") {
                const dep = value.childForFieldName("arguments")?.namedChild(0);
                if (dep && (dep.type === "identifier" || dep.type === "attribute")) middlewares.push(dep.text);
              }
            }

            bindings.push({
              file_path: filePath,
              line_start: node.startPosition.row + 1,
              line_end: node.endPosition.row + 1,
              kind: "HTTP",
              method: routeVerb,
              path: routePath,
              handler: handlerKey,
              middlewares,
              display_name: `@${routeReceiver}.${routeDecorator}('${routePath ?? ""}')`,
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
                // Đích trong file nội bộ. Thứ tự: (a) `C.m()` lớp/đối tượng import; (b) biến import giữ
                // `new T()` (`export const svc = new Svc()`, ENG-22 "biến export có new T()") ⇒ tra kiểu ở file
                // nguồn rồi tìm `T.m`; (c) namespace import `ns.f()`. Chỉ tạo cạnh khi đích có thật.
                const src = imported.source_file;
                const symName = imported.symbol_name === "default" ? baseReceiver : imported.symbol_name;
                const exists = (k: string) => idx.symbols.has(k) || idx.functions.has(k);
                let target: string | null = null;
                if (exists(`${src}#${symName}.${method}`)) target = `${src}#${symName}.${method}`;
                if (!target) {
                  const typeName = idx.field_types.get(`${src}#${symName}`);
                  if (typeName) {
                    if (exists(`${src}#${typeName}.${method}`)) target = `${src}#${typeName}.${method}`;
                    const typeImp = idx.imports.get(src)?.get(typeName);
                    if (!target && typeImp?.source_file) {
                      const tName = typeImp.symbol_name === "default" ? typeName : typeImp.symbol_name;
                      if (exists(`${typeImp.source_file}#${tName}.${method}`)) target = `${typeImp.source_file}#${tName}.${method}`;
                    }
                  }
                }
                if (!target && exists(`${src}#${method}`)) target = `${src}#${method}`;

                if (target) {
                  rawEdges.push({
                    caller: callerKey,
                    callee: target,
                    confidence: "RESOLVED",
                    ambiguous: false,
                    call_count: 1,
                  });
                } else {
                  external.push({ caller: callerKey, line, receiver_chain: receiverChain, method, import_source: null });
                }
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

  applyMountPrefixes(files, idx, bindings);
  return { edges, external, bindings };
}

function joinRoutePath(prefix: string, p: string): string {
  const joined = `${prefix.replace(/\/+$/, "")}/${p.replace(/^\/+/, "")}`;
  return joined.length > 1 ? joined.replace(/\/+$/, "") : "/";
}

/**
 * `12` Mục 1 (Express/Koa): `R.use(prefix, R2)` = tiền tố của `R2`; `11` ENG-40 ý 2: `path` = tiền tố mount
 * (`visited`), mount nhiều nơi ⇒ path nhỏ nhất. `R2` là router cùng file (so theo tên receiver) hoặc router
 * import mặc định từ file khác (mọi binding trong file đó). Chỉ đổi `binding.path` (dùng cho đặt tên);
 * `display_name` và khóa handler giữ path viết trong code nên id node không đổi.
 */
function applyMountPrefixes(files: ParsedFile[], idx: SymbolIndex, bindings: RouteBinding[]): void {
  type Mount = { prefix: string; fromFile: string; fromReceiver: string };
  const fileMounts = new Map<string, Mount[]>(); // router import từ file khác: file đích ⇒ các chỗ mount
  const localMounts = new Map<string, Mount[]>(); // router cùng file: `${file}::${receiver}` ⇒ các chỗ mount

  // Python: tiền tố riêng của router (`X = APIRouter(prefix=…)`, `X = Blueprint(…, url_prefix=…)`) ⇒ ownPrefix;
  // `R.include_router(T, prefix=…)` / `R.register_blueprint(T, url_prefix=…)` ⇒ mount của T (T = tên import,
  // hoặc `mod.router` với `mod` là module import) ⇒ ghép: tiền tố ngoài + tiền tố riêng + path.
  const ownPrefix = new Map<string, string>(); // `${file}::${receiver}` ⇒ tiền tố riêng
  const kwString = (args: Node | null, names: string[]): string | null => {
    for (let k = 0; k < (args?.namedChildCount ?? 0); k++) {
      const a = args!.namedChild(k);
      if (a?.type === "keyword_argument" && names.includes(a.childForFieldName("name")?.text ?? "")) {
        return extractStaticString(a.childForFieldName("value"));
      }
    }
    return null;
  };
  const addMount = (map: Map<string, Mount[]>, key: string, m: Mount) => {
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  };
  for (const file of files) {
    if (file.language !== "PYTHON") continue;
    const visit = (node: Node): void => {
      if (node.type === "assignment") {
        const left = node.childForFieldName("left");
        const right = node.childForFieldName("right");
        const ctor = right?.type === "call" ? right.childForFieldName("function")?.text : undefined;
        if (left?.type === "identifier" && (ctor === "APIRouter" || ctor === "Blueprint")) {
          const p = kwString(right!.childForFieldName("arguments"), ["prefix", "url_prefix"]);
          if (p) ownPrefix.set(`${file.path}::${left.text}`, p);
        }
      } else if (node.type === "call") {
        const fn = node.childForFieldName("function");
        const method = fn?.type === "attribute" ? fn.childForFieldName("attribute")?.text : undefined;
        if (method === "include_router" || method === "register_blueprint") {
          const args = node.childForFieldName("arguments");
          const target = args?.namedChild(0) ?? null;
          const prefix = kwString(args, ["prefix", "url_prefix"]) ?? "";
          const mount: Mount = { prefix, fromFile: file.path, fromReceiver: fn!.childForFieldName("object")?.text ?? "" };
          if (target?.type === "identifier") {
            const imp = idx.imports.get(file.path)?.get(target.text);
            if (imp?.source_file) addMount(localMounts, `${imp.source_file}::${imp.symbol_name || target.text}`, mount);
            else addMount(localMounts, `${file.path}::${target.text}`, mount);
          } else if (target?.type === "attribute") {
            const mod = target.childForFieldName("object")?.text ?? "";
            const recv = target.childForFieldName("attribute")?.text ?? "";
            const imp = idx.imports.get(file.path)?.get(mod);
            if (imp?.source_file) addMount(localMounts, `${imp.source_file}::${recv}`, mount);
          }
        }
      }
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c) visit(c);
      }
    };
    visit(file.tree.rootNode);
  }

  for (const file of files) {
    if (file.language !== "TYPESCRIPT" && file.language !== "TSX" && file.language !== "JAVASCRIPT") continue;
    const visit = (node: Node): void => {
      if (node.type === "call_expression") {
        const fn = node.childForFieldName("function");
        const args = node.childForFieldName("arguments");
        if (fn?.type === "member_expression" && fn.childForFieldName("property")?.text === "use" && args && args.namedChildCount >= 2) {
          const prefix = extractStaticString(args.namedChild(0));
          const target = args.namedChild(args.namedChildCount - 1);
          const receiver = fn.childForFieldName("object")?.text ?? "";
          if (prefix !== null && target?.type === "identifier") {
            const mount: Mount = { prefix, fromFile: file.path, fromReceiver: receiver };
            const imported = idx.imports.get(file.path)?.get(target.text);
            if (imported?.source_file) {
              const list = fileMounts.get(imported.source_file) ?? [];
              list.push(mount);
              fileMounts.set(imported.source_file, list);
            } else {
              const key = `${file.path}::${target.text}`;
              const list = localMounts.get(key) ?? [];
              list.push(mount);
              localMounts.set(key, list);
            }
          }
        }
      }
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c) visit(c);
      }
    };
    visit(file.tree.rootNode);
  }
  if (fileMounts.size === 0 && localMounts.size === 0 && ownPrefix.size === 0) return;

  // Tiền tố đầy đủ của router `receiver` trong `file`: tiền tố ngoài (đệ quy qua chỗ mount, visited chống vòng,
  // mount nhiều nơi ⇒ path nhỏ nhất) + tiền tố riêng của router.
  const resolvePrefix = (file: string, receiver: string, visited: Set<string>): string => {
    const key = `${file}::${receiver}`;
    if (visited.has(key)) return "";
    visited.add(key);
    const own = ownPrefix.get(key) ?? "";
    const mounts = [...(localMounts.get(key) ?? []), ...(fileMounts.get(file) ?? [])];
    if (mounts.length === 0) return own;
    const outer = mounts
      .map((m) => joinRoutePath(resolvePrefix(m.fromFile, m.fromReceiver, new Set(visited)), m.prefix))
      .sort((a, b) => (a.length !== b.length ? a.length - b.length : a < b ? -1 : a > b ? 1 : 0))[0] ?? "";
    return own ? joinRoutePath(outer || "/", own) : outer;
  };

  for (const b of bindings) {
    if (b.path === null || b.kind !== "HTTP") continue;
    // display_name: `router.post('/x')` (Express) hoặc `@router.post('/x')` (Python) ⇒ receiver `router`
    const receiver = b.display_name.slice(0, b.display_name.lastIndexOf(".")).replace(/^@/, "");
    const prefix = resolvePrefix(b.file_path, receiver, new Set());
    if (prefix && prefix !== "/") b.path = joinRoutePath(prefix, b.path);
  }
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
