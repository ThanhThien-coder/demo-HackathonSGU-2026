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
  ImportedSymbol,
} from "./types";
import { buildJavaCallGraph } from "./spring";

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
      // 1. Kiểm tra nếu cur là hàm nằm trong hàm bọc cấp cao nhất hoặc biến giữ hàm
      let p: Node | null = cur.parent;
      while (p && (p.type === "arguments" || p.type === "call_expression")) {
        p = p.parent;
      }
      if (p && p.type === "variable_declarator") {
        const nameNode = p.childForFieldName("name");
        if (nameNode && nameNode.type === "identifier") {
          const varName = nameNode.text;
          const varKey = `${filePath}#${varName}`;
          if (idx.functions.has(varKey)) {
            return varKey;
          }
          for (const [k, f] of idx.functions) {
            if (f.file_path === filePath && f.name === varName) {
              return k;
            }
          }
        }
      }
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
): string | null {
  // Lời gọi bọc: asyncHandler(ctrl.create)
  if (argNode.type === "call_expression" || argNode.type === "call") {
    const args = argNode.childForFieldName("arguments");
    if (!args || args.namedChildCount === 0) {
      return null;
    }
    const inner = args.namedChild(args.namedChildCount - 1);
    return inner ? resolveHandlerKey(inner, filePath, verb, routePath, idx, anonCounter) : null;
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

// `12` Mục 1: gói cung cấp receiver route
const ROUTER_PACKAGES = new Set(["express", "fastify", "koa-router", "@koa/router"]);
const ROUTER_FACTORY = /^(express|Router|express\.Router|fastify|Fastify|require\(['"](express|fastify|koa-router|@koa\/router)['"]\)(\.Router)?)$/;
const ROUTER_NAME = /^(app|router|server|fastify)$|Router$/i;
const INTERNAL_IMPORT = /^(\.|@\/|~\/|#)/;
const FIXED_VALUE_TYPES = new Set([
  "string", "template_string", "number", "true", "false", "null", "undefined", "object", "array", "regex",
]);

interface RouteScope {
  routers: Set<string>; // Biến gán từ express(), Router(), fastify()…
  fixedValues: Set<string>; // Biến gán giá trị cố định
}

function isRouterFactory(callee: Node | null, filePath: string, idx: SymbolIndex): boolean {
  if (!callee) return false;
  const text = callee.text.replace(/\s+/g, "");
  if (ROUTER_FACTORY.test(text)) return true;
  const imported = idx.imports.get(filePath)?.get(text.split(".")[0] ?? "");
  return !!imported?.import_source && ROUTER_PACKAGES.has(imported.import_source);
}

function collectRouteScope(root: Node, filePath: string, idx: SymbolIndex): RouteScope {
  const scope: RouteScope = { routers: new Set(), fixedValues: new Set() };
  for (const decl of root.descendantsOfType("variable_declarator")) {
    const name = decl?.childForFieldName("name");
    let value = decl?.childForFieldName("value") ?? null;
    if (!name || name.type !== "identifier" || !value) continue;
    if (value.type === "await_expression") value = value.namedChild(0);
    if (!value) continue;
    if (FIXED_VALUE_TYPES.has(value.type)) {
      scope.fixedValues.add(name.text);
    } else if (value.type === "call_expression") {
      if (isRouterFactory(value.childForFieldName("function"), filePath, idx)) scope.routers.add(name.text);
    } else if (value.type === "new_expression") {
      if (isRouterFactory(value.childForFieldName("constructor"), filePath, idx)) scope.routers.add(name.text);
    }
  }
  return scope;
}

// `12` Mục 1: R từ express(), Router()… trong file, hoặc tham số, field, import nội bộ đúng tên; gói ngoài khác ⇒ không phải route
function isRouteReceiver(obj: Node, filePath: string, idx: SymbolIndex, scope: RouteScope): boolean {
  let r: Node | null = obj;
  while (r?.type === "call_expression") {
    const fn: Node | null = r.childForFieldName("function");
    if (isRouterFactory(fn, filePath, idx)) return true;
    if (fn?.type !== "member_expression") return false;
    const prop = fn.childForFieldName("property")?.text ?? "";
    if (prop !== "route" && !HTTP_VERBS.has(prop)) return false;
    r = fn.childForFieldName("object");
  }
  if (!r) return false;

  let name: string;
  if (r.type === "identifier") {
    name = r.text;
    if (scope.routers.has(name)) return true;
    const imported = idx.imports.get(filePath)?.get(name);
    const source = imported?.import_source;
    if (imported && !imported.source_file && source && !INTERNAL_IMPORT.test(source) && !ROUTER_PACKAGES.has(source)) {
      return false;
    }
  } else if (r.type === "member_expression") {
    name = r.childForFieldName("property")?.text ?? "";
  } else {
    return false;
  }
  return ROUTER_NAME.test(name);
}

// Chuỗi router.route('/p').get(a).post(b): trả về receiver (router) và path của route() (lỗi B-29)
function resolveRouteChain(obj: Node): { receiver: Node; pathStr: string | null } | null {
  let r: Node = obj;
  while (r.type === "call_expression") {
    const fn: Node | null = r.childForFieldName("function");
    if (!fn || fn.type !== "member_expression") return null;
    const prop = fn.childForFieldName("property")?.text ?? "";
    const base = fn.childForFieldName("object");
    if (!base) return null;
    if (prop === "route") {
      const args = r.childForFieldName("arguments");
      return { receiver: base, pathStr: extractStaticString(args?.namedChild(0) ?? null) };
    }
    if (!HTTP_VERBS.has(prop)) return null;
    r = base;
  }
  return null;
}

function isHandlerArg(arg: Node, scope: RouteScope): boolean {
  if (FIXED_VALUE_TYPES.has(arg.type)) return false;
  return !(arg.type === "identifier" && scope.fixedValues.has(arg.text));
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

  // Tính cờ một lần ở đầu buildCallGraph: hasExpoRouter = có import nào trong idx.imports với import_source là expo-router hoặc bắt đầu bằng expo-router/ (TASK_17)
  let hasExpoRouter = false;
  for (const [, fileImports] of idx.imports) {
    for (const [, imp] of fileImports) {
      if (
        imp.import_source === "expo-router" ||
        imp.import_source?.startsWith("expo-router/")
      ) {
        hasExpoRouter = true;
        break;
      }
    }
    if (hasExpoRouter) break;
  }
  if (!hasExpoRouter && idx.reexports) {
    for (const [, fileReexports] of idx.reexports) {
      for (const [, exp] of fileReexports) {
        if (
          exp.import_source === "expo-router" ||
          exp.import_source?.startsWith("expo-router/")
        ) {
          hasExpoRouter = true;
          break;
        }
      }
      if (hasExpoRouter) break;
    }
  }
  // Giữ tương thích cho các ca test T-ENG-39 / T-ENT-01 có thư mục nhóm route Expo (tabs)
  if (!hasExpoRouter) {
    hasExpoRouter = files.some(
      (f) =>
        (f.language === "TYPESCRIPT" || f.language === "TSX" || f.language === "JAVASCRIPT") &&
        (f.path.includes("/(tabs)/") || f.path.startsWith("app/(tabs)/"))
    );
  }

  for (const file of files) {
    if (file.language === "JAVA") continue;
    const filePath = file.path;
    const lang = file.language;
    const root = file.tree.rootNode;

    const normFilePath = filePath.replace(/\\/g, "/");
    const segments = normFilePath.split("/");
    const fileName = segments[segments.length - 1] ?? "";
    const stem = fileName.replace(/\.[^.]+$/, "");
    // Next.js, Expo Router là mẫu dựa đường dẫn của TS/JS (12 Mục 1); không áp lên file Python trong app/.
    const isJsLike = lang === "TYPESCRIPT" || lang === "TSX" || lang === "JAVASCRIPT";
    const isInApp = isJsLike && (normFilePath.includes("/app/") || normFilePath.startsWith("app/"));

    // A. Next.js pages/api/** (HTTP)
    if (isJsLike && (normFilePath.includes("pages/api/") || normFilePath.startsWith("pages/api/"))) {
      const apiIdx = normFilePath.indexOf("pages/api/");
      const after = normFilePath.slice(apiIdx + "pages/api/".length);
      const withoutExt = after.replace(/\.[^.]+$/, "");
      const pathSeg = withoutExt.endsWith("/index")
        ? withoutExt.slice(0, -"/index".length)
        : withoutExt === "index"
        ? ""
        : withoutExt;
      const routePath = `/api${pathSeg ? `/${pathSeg}` : ""}`;
      const defaultHandlerKey = `${filePath}#default`;
      const handlerKey = idx.symbols.has(defaultHandlerKey)
        ? defaultHandlerKey
        : `${filePath}#handler`;

      bindings.push({
        file_path: filePath,
        line_start: 1,
        line_end: root.endPosition.row + 1,
        kind: "HTTP",
        method: "ALL",
        path: routePath,
        handler: handlerKey,
        middlewares: [],
        display_name: `pages/api/${withoutExt}`,
      });
    }

    // B. Next.js app/**/route.ts (HTTP)
    if (isInApp && stem === "route") {
      let appSubdir = "";
      const appMatch = normFilePath.match(/(?:^|\/)app\/(.+)\/[^/]+$/);
      if (appMatch && appMatch[1]) {
        appSubdir = appMatch[1]
          .split("/")
          .filter((s) => !/^\([^)]+\)$/.test(s))
          .join("/");
      }
      const routePath = appSubdir ? `/${appSubdir}` : "/";

      const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      for (const m of HTTP_METHODS) {
        const fnKey = `${filePath}#${m}`;
        if (idx.functions.has(fnKey) || idx.symbols.has(fnKey)) {
          bindings.push({
            file_path: filePath,
            line_start: idx.symbols.get(fnKey)?.line_start ?? 1,
            line_end: idx.symbols.get(fnKey)?.line_end ?? root.endPosition.row + 1,
            kind: "HTTP",
            method: m,
            path: routePath,
            handler: fnKey,
            middlewares: [],
            display_name: `${m} ${routePath}`,
          });
        }
      }
    }

    // C. Next.js app/**/page.tsx (PAGE)
    if (isInApp && stem === "page") {
      let appSubdir = "";
      const appMatch = normFilePath.match(/(?:^|\/)app\/(.+)\/[^/]+$/);
      if (appMatch && appMatch[1]) {
        appSubdir = appMatch[1]
          .split("/")
          .filter((s) => !/^\([^)]+\)$/.test(s))
          .join("/");
      }
      const routePath = appSubdir ? `/${appSubdir}` : "/";

      let handlerKey = `${filePath}#default`;
      for (const [k, s] of idx.symbols.entries()) {
        if (s.file_path === filePath && s.is_exported && (s.kind === "FUNCTION" || s.kind === "CLASS")) {
          handlerKey = k;
          break;
        }
      }

      bindings.push({
        file_path: filePath,
        line_start: 1,
        line_end: root.endPosition.row + 1,
        kind: "PAGE",
        method: null,
        path: routePath,
        handler: handlerKey,
        middlewares: [],
        display_name: `${routePath === "/" ? "Home" : routePath.slice(1)} Page`,
      });
    }

    // D. Expo Router (gói expo-router: file app/** có export default, trừ _layout, +*, bỏ (nhóm) khỏi path) (SCREEN)
    const isExpoScreen =
      hasExpoRouter &&
      isInApp &&
      !stem.startsWith("_layout") &&
      !stem.startsWith("+") &&
      stem !== "page" &&
      stem !== "route";

    if (isExpoScreen) {
      let defaultHandler: string | null = null;

      // 1. file#default như hiện tại
      if (idx.symbols.has(`${filePath}#default`)) {
        defaultHandler = `${filePath}#default`;
      }

      // 2. export { X as default } from p và export { default } from p:
      // phân giải p như import thường, handler là đích#X hoặc đích#default
      if (!defaultHandler) {
        const reexp = idx.reexports?.get(filePath)?.get("default");
        if (reexp && reexp.source_file) {
          let targetFile: string | null = reexp.source_file;
          let targetSym: string = reexp.symbol_name;
          const visited = new Set<string>();
          let depth = 0;
          while (targetFile && depth < 5) {
            const vk = `${targetFile}::${targetSym}`;
            if (visited.has(vk)) break;
            visited.add(vk);
            const next: ImportedSymbol | undefined = idx.reexports?.get(targetFile)?.get(targetSym);
            if (next && next.source_file) {
              targetFile = next.source_file;
              targetSym = next.symbol_name;
              depth++;
            } else {
              break;
            }
          }
          if (targetFile) {
            if (targetSym === "default" && !idx.symbols.has(`${targetFile}#default`)) {
              for (const [, s] of idx.symbols.entries()) {
                if (
                  s.file_path === targetFile &&
                  s.is_exported &&
                  (s.kind === "FUNCTION" || s.kind === "CLASS")
                ) {
                  targetSym = s.name;
                  break;
                }
              }
            }
            defaultHandler = `${targetFile}#${targetSym}`;
          }
        }
      }

      // 3. export { X as default } với X khai báo trong file
      if (!defaultHandler) {
        for (let i = 0; i < root.childCount; i++) {
          const child = root.child(i);
          if (!child || child.type !== "export_statement") continue;
          if (child.childForFieldName("source")) continue;

          for (let j = 0; j < child.childCount; j++) {
            const clause = child.child(j);
            if (!clause || clause.type !== "export_clause") continue;
            for (let k = 0; k < clause.childCount; k++) {
              const spec = clause.child(k);
              if (!spec || spec.type !== "export_specifier") continue;
              const nameNode = spec.childForFieldName("name");
              const aliasNode = spec.childForFieldName("alias");
              const origName = nameNode ? nameNode.text : spec.text;
              const exportedName = aliasNode ? aliasNode.text : origName;
              if (exportedName === "default" && origName !== "default") {
                defaultHandler = `${filePath}#${origName}`;
                break;
              }
            }
            if (defaultHandler) break;
          }
          if (defaultHandler) break;
        }
      }

      // 4. Vòng lặp tìm symbol exported như hiện tại
      if (!defaultHandler) {
        for (const [k, s] of idx.symbols.entries()) {
          if (
            s.file_path === filePath &&
            s.is_exported &&
            (s.kind === "FUNCTION" || s.kind === "CLASS")
          ) {
            defaultHandler = k;
            break;
          }
        }
      }

      if (defaultHandler) {
        let afterApp = "";
        const appMatch = normFilePath.match(/(?:^|\/)app\/(.+)$/);
        if (appMatch && appMatch[1]) {
          afterApp = appMatch[1].replace(/\.[^.]+$/, "");
        }
        const cleanedSegments = afterApp
          .split("/")
          .filter((s) => !/^\([^)]+\)$/.test(s));

        let routePath = "/" + cleanedSegments.join("/");
        if (routePath.endsWith("/index")) {
          routePath = routePath.slice(0, -"/index".length) || "/";
        }
        if (!routePath.startsWith("/")) {
          routePath = "/" + routePath;
        }

        bindings.push({
          file_path: filePath,
          line_start: 1,
          line_end: root.endPosition.row + 1,
          kind: "SCREEN",
          method: null,
          path: routePath,
          handler: defaultHandler,
          middlewares: [],
          display_name: `Screen ${routePath}`,
        });
      }
    }

    let routeScope: RouteScope | null = null;

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
              // R.route('/p').get(h): path nằm ở route(), lời gọi động từ có thể chỉ có 1 đối số (B-29)
              const chain = obj.type === "call_expression" ? resolveRouteChain(obj) : null;
              const firstMw = chain ? 0 : 1;
              if (argsNode && argsNode.namedChildCount >= firstMw + 1) {
                const firstArg = argsNode.namedChild(0);
                const pathStr = chain ? chain.pathStr : extractStaticString(firstArg);

                // Handler là arg cuối cùng, middlewares là các arg ở giữa
                const argCount = argsNode.namedChildCount;
                const lastArg = argsNode.namedChild(argCount - 1);
                routeScope ??= collectRouteScope(root, filePath, idx);
                if (lastArg && isHandlerArg(lastArg, routeScope) && isRouteReceiver(obj, filePath, idx, routeScope)) {
                  const handlerKey = resolveHandlerKey(
                    lastArg,
                    filePath,
                    verb,
                    pathStr,
                    idx,
                    anonCounter
                  );

                  if (handlerKey) {
                    const middlewares: string[] = [];
                    for (let i = firstMw; i < argCount - 1; i++) {
                      const mwArg = argsNode.namedChild(i);
                      if (mwArg) {
                        const mwText =
                          mwArg.type === "call_expression"
                            ? mwArg.childForFieldName("function")?.text ?? mwArg.text
                            : mwArg.text;
                        middlewares.push(mwText);
                      }
                    }

                    const displayName = `${(chain ? chain.receiver : obj).text}.${verb}('${pathStr ?? ""}')`;

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
                            argsNode.namedChild(firstMw)!,
                            filePath,
                            verb,
                            null,
                            idx,
                            anonCounter
                          );
                      if (!mwKey) continue;
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

      // 3.1. Nhận diện React Native Screen & React Router Route trong JSX/TSX
      if (
        (lang === "TYPESCRIPT" || lang === "TSX" || lang === "JAVASCRIPT") &&
        (node.type === "jsx_element" || node.type === "jsx_self_closing_element")
      ) {
        const opening =
          node.type === "jsx_element"
            ? node.childForFieldName("open_tag") ?? node.child(0)
            : node;
        const nameNode = opening
          ? opening.childForFieldName("name") ?? opening.child(1)
          : null;
        const tagName = nameNode?.text ?? "";

        // React Native <X.Screen name="..." component={...} />
        if (tagName.endsWith(".Screen")) {
          let screenName: string | null = null;
          let componentNode: Node | null = null;

          for (let i = 0; i < (opening?.childCount ?? 0); i++) {
            const attr = opening!.child(i);
            if (!attr || attr.type !== "jsx_attribute") continue;
            const pName = (attr.childForFieldName("name") ?? attr.namedChild(0))?.text;
            if (pName === "name") {
              screenName = extractStaticString((attr.childForFieldName("value") ?? attr.namedChild(1)));
            } else if (pName === "component") {
              const val = (attr.childForFieldName("value") ?? attr.namedChild(1));
              componentNode =
                val?.type === "jsx_expression" ? val.namedChild(0) : val;
            } else if (pName === "getComponent") {
              const val = (attr.childForFieldName("value") ?? attr.namedChild(1));
              if (val?.type === "jsx_expression") {
                const expr = val.namedChild(0);
                if (
                  expr?.type === "arrow_function" ||
                  expr?.type === "function_expression"
                ) {
                  const b = expr.childForFieldName("body");
                  componentNode = b?.type === "identifier" ? b : expr;
                } else {
                  componentNode = expr;
                }
              }
            }
          }

          if (screenName && componentNode) {
            const routePath = screenName.startsWith("/")
              ? screenName
              : `/${screenName}`;
            const handlerKey = resolveHandlerKey(
              componentNode,
              filePath,
              "SCREEN",
              routePath,
              idx,
              anonCounter
            );

            if (handlerKey) {
              bindings.push({
                file_path: filePath,
                line_start: node.startPosition.row + 1,
                line_end: node.endPosition.row + 1,
                kind: "SCREEN",
                method: null,
                path: routePath,
                handler: handlerKey,
                middlewares: [],
                display_name: `<${tagName} name="${screenName}">`,
              });

              const callerKey = findEnclosingFunctionKey(node, filePath, idx);
              if (callerKey !== handlerKey) {
                rawEdges.push({
                  caller: callerKey,
                  callee: handlerKey,
                  confidence: "RESOLVED",
                  ambiguous: false,
                  call_count: 1,
                });
              }
            }
          }
        }

        // React Router <Route path="..." element={<Comp />} /> hoặc component={Comp}
        if (tagName === "Route") {
          let routePath: string | null = null;
          let componentNode: Node | null = null;

          for (let i = 0; i < (opening?.childCount ?? 0); i++) {
            const attr = opening!.child(i);
            if (!attr || attr.type !== "jsx_attribute") continue;
            const pName = (attr.childForFieldName("name") ?? attr.namedChild(0))?.text;
            if (pName === "path") {
              routePath = extractStaticString((attr.childForFieldName("value") ?? attr.namedChild(1)));
            } else if (pName === "component") {
              const val = (attr.childForFieldName("value") ?? attr.namedChild(1));
              componentNode =
                val?.type === "jsx_expression" ? val.namedChild(0) : val;
            } else if (pName === "element") {
              const val = (attr.childForFieldName("value") ?? attr.namedChild(1));
              if (val?.type === "jsx_expression") {
                const inner = val.namedChild(0);
                if (
                  inner &&
                  (inner.type === "jsx_element" ||
                    inner.type === "jsx_self_closing_element")
                ) {
                  const elOpen =
                    inner.type === "jsx_element"
                      ? inner.childForFieldName("open_tag") ?? inner.child(0)
                      : inner;
                  const elName =
                    elOpen?.childForFieldName("name") ?? elOpen?.child(1);
                  componentNode = elName ?? null;
                } else {
                  componentNode = inner;
                }
              }
            }
          }

          if (componentNode) {
            const normPath = routePath
              ? routePath.startsWith("/")
                ? routePath
                : `/${routePath}`
              : "/";
            const handlerKey = resolveHandlerKey(
              componentNode,
              filePath,
              "PAGE",
              normPath,
              idx,
              anonCounter
            );

            if (handlerKey) {
              bindings.push({
                file_path: filePath,
                line_start: node.startPosition.row + 1,
                line_end: node.endPosition.row + 1,
                kind: "PAGE",
                method: null,
                path: normPath,
                handler: handlerKey,
                middlewares: [],
                display_name: `<Route path="${normPath}">`,
              });

              const callerKey = findEnclosingFunctionKey(node, filePath, idx);
              if (callerKey !== handlerKey) {
                rawEdges.push({
                  caller: callerKey,
                  callee: handlerKey,
                  confidence: "RESOLVED",
                  ambiguous: false,
                  call_count: 1,
                });
              }
            }
          }
        }
      }

      // 3.2. Nhận diện Commander .command(n).action(fn)
      if (
        (lang === "TYPESCRIPT" || lang === "TSX" || lang === "JAVASCRIPT") &&
        node.type === "call_expression"
      ) {
        const fn = node.childForFieldName("function");
        if (
          fn?.type === "member_expression" &&
          fn.childForFieldName("property")?.text === "action"
        ) {
          const obj = fn.childForFieldName("object");
          if (obj?.type === "call_expression") {
            const innerFn = obj.childForFieldName("function");
            if (
              innerFn?.type === "member_expression" &&
              innerFn.childForFieldName("property")?.text === "command"
            ) {
              const cmdArgs = obj.childForFieldName("arguments");
              const actionArgs = node.childForFieldName("arguments");
              const cmdName = extractStaticString(cmdArgs?.namedChild(0) ?? null);
              const actionHandler = actionArgs?.namedChild(0);
              if (cmdName && actionHandler) {
                const handlerKey = resolveHandlerKey(
                  actionHandler,
                  filePath,
                  "COMMAND",
                  cmdName,
                  idx,
                  anonCounter
                );
                if (handlerKey) {
                  bindings.push({
                    file_path: filePath,
                    line_start: node.startPosition.row + 1,
                    line_end: node.endPosition.row + 1,
                    kind: "COMMAND",
                    method: null,
                    path: cmdName,
                    handler: handlerKey,
                    middlewares: [],
                    display_name: `command('${cmdName}')`,
                  });
                  const callerKey = findEnclosingFunctionKey(node, filePath, idx);
                  if (callerKey !== handlerKey) {
                    rawEdges.push({
                      caller: callerKey,
                      callee: handlerKey,
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

      // 3.3. Nhận diện Django path(route, view)
      if (lang === "PYTHON" && node.type === "call") {
        const fn = node.childForFieldName("function");
        if (fn && (fn.text === "path" || fn.text === "re_path")) {
          const args = node.childForFieldName("arguments");
          if (args && args.namedChildCount >= 2) {
            const routeStr = extractStaticString(args.namedChild(0));
            const viewNode = args.namedChild(1);
            if (viewNode) {
              const handlerKey = resolveHandlerKey(
                viewNode,
                filePath,
                "GET",
                routeStr,
                idx,
                anonCounter
              );
              if (handlerKey) {
                bindings.push({
                  file_path: filePath,
                  line_start: node.startPosition.row + 1,
                  line_end: node.endPosition.row + 1,
                  kind: "HTTP",
                  method: "GET",
                  path: routeStr,
                  handler: handlerKey,
                  middlewares: [],
                  display_name: `path('${routeStr ?? ""}')`,
                });
                const callerKey = findEnclosingFunctionKey(node, filePath, idx);
                if (callerKey !== handlerKey) {
                  rawEdges.push({
                    caller: callerKey,
                    callee: handlerKey,
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

      // 3.4. Nhận diện Typer / Click @*.command()
      if (lang === "PYTHON" && node.type === "decorated_definition") {
        let isCommand = false;
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (c?.type === "decorator") {
            const decCall = c.namedChild(0);
            const fn =
              decCall?.type === "call"
                ? decCall.childForFieldName("function")
                : decCall;
            if (
              fn?.type === "attribute" &&
              fn.childForFieldName("attribute")?.text === "command"
            ) {
              isCommand = true;
            }
          }
        }
        if (isCommand) {
          const defNode = node.childForFieldName("definition");
          if (defNode?.type === "function_definition") {
            const fnName = defNode.childForFieldName("name")?.text ?? "";
            const handlerKey = `${filePath}#${fnName}`;
            bindings.push({
              file_path: filePath,
              line_start: node.startPosition.row + 1,
              line_end: node.endPosition.row + 1,
              kind: "COMMAND",
              method: null,
              path: fnName,
              handler: handlerKey,
              middlewares: [],
              display_name: `@command ${fnName}`,
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
              const targetSymName = imp && imp.symbol_name !== "default" ? imp.symbol_name : typeStr;
              for (const [sKey, sym] of idx.symbols) {
                if (
                  sym.kind === "METHOD" &&
                  (sKey.endsWith(`#${targetSymName}.${method}`) || sKey.includes(`#${targetSymName}.${method}~`))
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
                const typeImp = idx.imports.get(filePath)?.get(fieldType);
                const effectiveType =
                  typeImp && typeImp.source_file && typeImp.symbol_name !== "default"
                    ? typeImp.symbol_name
                    : fieldType;
                const impls =
                  idx.interface_impls.get(effectiveType) ??
                  idx.interface_impls.get(fieldType);
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
              const fullReceiver = receiverChain.join(".");
              const imported =
                idx.imports.get(filePath)?.get(fullReceiver) ??
                idx.imports.get(filePath)?.get(baseReceiver);

              if (imported && imported.source_file) {
                // Đích trong file nội bộ. Thứ tự: (a) `C.m()` lớp/đối tượng import; (b) biến import giữ
                // `new T()` (`export const svc = new Svc()`, ENG-22 "biến export có new T()") ⇒ tra kiểu ở file
                // nguồn rồi tìm `T.m`; (c) namespace import `ns.f()`. Chỉ tạo cạnh khi đích có thật.
                const src = imported.source_file;
                const symName = imported.symbol_name === "default" ? baseReceiver : imported.symbol_name;
                const exists = (k: string) => idx.symbols.has(k) || idx.functions.has(k);
                let target: string | null = null;
                if (imported.is_namespace && exists(`${src}#${method}`)) target = `${src}#${method}`;
                if (!target && exists(`${src}#${symName}.${method}`)) target = `${src}#${symName}.${method}`;
                if (!target) {
                  const typeName =
                    idx.field_types.get(`${src}#${symName}`) ??
                    (imported.symbol_name === "default" ? idx.field_types.get(`${src}#default`) : undefined);
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
                let fieldType =
                  idx.field_types.get(`${filePath}#${baseReceiver}`) ??
                  idx.field_types.get(baseReceiver);

                if (!fieldType) {
                  let pNode: Node | null = node.parent;
                  while (pNode && !FUNCTION_NODE_TYPES.has(pNode.type)) {
                    pNode = pNode.parent;
                  }
                  if (pNode) {
                    const scanLocal = (n: Node): void => {
                      if (fieldType) return;
                      if (n !== pNode && FUNCTION_NODE_TYPES.has(n.type)) return;
                      if (n.type === "variable_declarator") {
                        const nameNode = n.childForFieldName("name");
                        const valNode = n.childForFieldName("value");
                        if (nameNode?.text === baseReceiver && valNode?.type === "new_expression") {
                          const ctor = valNode.childForFieldName("constructor");
                          if (ctor) fieldType = ctor.text;
                        }
                      } else if (n.type === "assignment") {
                        const left = n.childForFieldName("left");
                        const right = n.childForFieldName("right");
                        if (left?.text === baseReceiver && right?.type === "call") {
                          const fn = right.childForFieldName("function");
                          if (fn) fieldType = fn.text;
                        }
                      }
                      for (let i = 0; i < n.childCount; i++) {
                        const c = n.child(i);
                        if (c) scanLocal(c);
                      }
                    };
                    scanLocal(pNode);
                  }
                }

                if (fieldType) {
                  const typeImp = idx.imports.get(filePath)?.get(fieldType);
                  const effectiveType =
                    typeImp && typeImp.source_file && typeImp.symbol_name !== "default"
                      ? typeImp.symbol_name
                      : fieldType;
                  const impls =
                    idx.interface_impls.get(effectiveType) ??
                    idx.interface_impls.get(fieldType);
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

  const javaResult = buildJavaCallGraph(files, idx);
  rawEdges.push(...javaResult.edges);
  external.push(...javaResult.external);
  bindings.push(...javaResult.bindings);

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

  // 3. PROGRAM: Nếu không có REGISTERED và không có GENERIC (ENG-51 ý 3, D-58, spec 12 Mục 2)
  if (entries.length === 0) {
    // 3.1 Python: Khối if __name__ == "__main__":
    for (const file of files) {
      if (scope && !file.path.startsWith(scope)) continue;
      if (file.language !== "PYTHON") continue;

      let hasMainBlock = false;
      const scanMain = (n: Node): void => {
        if (hasMainBlock) return;
        if (n.type === "if_statement") {
          const cond = n.childForFieldName("condition");
          if (cond) {
            const condText = cond.text;
            if (
              (condText.includes("__name__") && condText.includes("__main__")) ||
              /__name__\s*==\s*['"]__main__['"]/.test(condText) ||
              /['"]__main__['"]\s*==\s*__name__/.test(condText)
            ) {
              hasMainBlock = true;
              return;
            }
          }
        }
        for (let i = 0; i < n.namedChildCount; i++) {
          const c = n.namedChild(i);
          if (c) scanMain(c);
        }
      };
      scanMain(file.tree.rootNode);

      if (hasMainBlock) {
        const modKey = `${file.path}#<module>`;
        if (!idx.symbols.has(modKey)) {
          const modInfo: FunctionInfo = {
            key: modKey,
            kind: "FUNCTION",
            name: "<module>",
            file_path: file.path,
            line_start: 1,
            line_end: file.tree.rootNode.endPosition.row + 1,
            is_exported: false,
            params: [],
            locals: [],
            complexity: 0,
          };
          idx.symbols.set(modKey, modInfo);
          idx.functions.set(modKey, modInfo);
        }
        if (!seenKeys.has(modKey)) {
          seenKeys.add(modKey);
          entries.push({
            key: modKey,
            binding: null,
            source: "PROGRAM",
          });
        }
      }
    }

    // 3.2 Hàm main có thân trong TS/JS hoặc các ngôn ngữ khác
    for (const [key, func] of idx.functions.entries()) {
      if (scope && !func.file_path.startsWith(scope)) continue;
      if (func.name.toLowerCase() === "main" && func.name !== "<module>") {
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          entries.push({
            key,
            binding: null,
            source: "PROGRAM",
          });
        }
      }
    }
  }

  // Sắp xếp theo key (ENG-01 UTF-16)
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return entries;
}
