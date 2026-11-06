// Spring Boot callgraph, routes, layer và JPA — spec 12 Mục 1 & Mục 4 (ENT-40..44), spec 11.
import type { Node } from "web-tree-sitter";
import type { FunctionCallEdge } from "@/contracts";
import type {
  ExternalCall,
  FunctionInfo,
  ParsedFile,
  RouteBinding,
  SymbolIndex,
} from "./types";

export interface CallGraphResult {
  edges: FunctionCallEdge[];
  external: ExternalCall[];
  bindings: RouteBinding[];
}

const SPRING_DATA_REPOSITORIES = new Set([
  "JpaRepository",
  "CrudRepository",
  "PagingAndSortingRepository",
  "ListCrudRepository",
  "Repository",
]);

const ENTITY_MANAGER_DATA_SINK_METHODS = new Set([
  "persist",
  "merge",
  "remove",
  "find",
  "createQuery",
  "createNativeQuery",
]);

const MAPPING_VERBS: Record<string, string> = {
  GetMapping: "GET",
  PostMapping: "POST",
  PutMapping: "PUT",
  PatchMapping: "PATCH",
  DeleteMapping: "DELETE",
};

const springDataAccessCache = new WeakMap<ParsedFile, boolean>();

/**
 * ENT-44: File test Java theo spec 12 Mục 4.
 * Đường dẫn POSIX bắt đầu bằng src/test/ hoặc chứa /src/test/.
 */
export function isJavaTestSource(filePath: string): boolean {
  const posix = filePath.replace(/\\/g, "/");
  return posix.startsWith("src/test/") || posix.includes("/src/test/");
}

function stripGenerics(typeStr: string): string {
  const i = typeStr.indexOf("<");
  return (i !== -1 ? typeStr.slice(0, i) : typeStr).trim();
}

function getJavaStartLine(node: Node): number {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === "modifiers") {
      if (child.childCount > 0) {
        return child.startPosition.row + 1;
      }
    }
  }
  return node.startPosition.row + 1;
}

interface JavaAnnotation {
  node: Node;
  name: string;
  fullName: string;
}

function getAnnotations(node: Node): JavaAnnotation[] {
  const result: JavaAnnotation[] = [];
  const checkChild = (child: Node) => {
    if (child.type === "annotation" || child.type === "marker_annotation") {
      const nameNode = child.childForFieldName("name") ?? child.namedChild(0);
      if (nameNode) {
        const fullName = nameNode.text;
        const name = fullName.split(".").pop() ?? fullName;
        result.push({ node: child, name, fullName });
      }
    }
  };

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;
    if (child.type === "modifiers") {
      for (let j = 0; j < child.childCount; j++) {
        const modChild = child.child(j);
        if (modChild) checkChild(modChild);
      }
    } else {
      checkChild(child);
    }
  }
  return result;
}

function extractPathFromAnnotation(annotationNode: Node): string {
  const args = annotationNode.children.find((c) => c.type === "annotation_argument_list");
  if (!args) return "";

  let foundValueOrPath: Node | null = null;
  let firstUnnamedArg: Node | null = null;

  for (let i = 0; i < args.namedChildCount; i++) {
    const child = args.namedChild(i);
    if (!child) continue;
    if (child.type === "element_value_pair") {
      const key = child.childForFieldName("key")?.text ?? child.namedChild(0)?.text;
      if (key === "value" || key === "path") {
        foundValueOrPath = child.childForFieldName("value") ?? child.namedChild(1);
        break;
      }
    } else if (!firstUnnamedArg) {
      firstUnnamedArg = child;
    }
  }

  const targetNode = foundValueOrPath ?? firstUnnamedArg;
  if (!targetNode) return "";

  let effectiveNode = targetNode;
  if (effectiveNode.type === "array_initializer") {
    for (let i = 0; i < effectiveNode.namedChildCount; i++) {
      const c = effectiveNode.namedChild(i);
      if (c) {
        effectiveNode = c;
        break;
      }
    }
  }

  if (effectiveNode.type === "string_literal") {
    return effectiveNode.text.replace(/^["']|["']$/g, "");
  }

  // Path không phải chuỗi tĩnh (hằng số) => coi là ""
  return "";
}

function extractMethodFromRequestMapping(annotationNode: Node): string {
  const args = annotationNode.children.find((c) => c.type === "annotation_argument_list");
  if (!args) return "ALL";

  for (let i = 0; i < args.namedChildCount; i++) {
    const child = args.namedChild(i);
    if (!child || child.type !== "element_value_pair") continue;
    const key = child.childForFieldName("key")?.text ?? child.namedChild(0)?.text;
    if (key === "method") {
      let valNode = child.childForFieldName("value") ?? child.namedChild(1);
      if (!valNode) continue;
      if (valNode.type === "array_initializer") {
        for (let j = 0; j < valNode.namedChildCount; j++) {
          const c = valNode.namedChild(j);
          if (c) {
            valNode = c;
            break;
          }
        }
      }
      const parts = valNode.text.split(".");
      const verb = parts[parts.length - 1]?.toUpperCase() ?? "";
      if (["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE"].includes(verb)) {
        return verb;
      }
    }
  }
  return "ALL";
}

function combineRoutePaths(classPrefix: string, methodPath: string): string {
  let combined = `${classPrefix}/${methodPath}`;
  combined = combined.replace(/\/+/g, "/");
  if (!combined.startsWith("/")) {
    combined = "/" + combined;
  }
  if (combined.length > 1 && combined.endsWith("/")) {
    combined = combined.slice(0, -1);
  }
  return combined;
}

function extractReceiverChain(objectNode: Node | null): string[] {
  if (!objectNode) return [];
  const parts: string[] = [];
  let cur: Node | null = objectNode;
  while (cur && (cur.type === "field_access" || cur.type === "member_expression")) {
    const field = cur.childForFieldName("field") ?? cur.childForFieldName("property");
    if (field) parts.unshift(field.text);
    cur = cur.childForFieldName("object");
  }
  if (cur) parts.unshift(cur.text);
  return parts;
}

function checkSpringDataAccessFile(file: ParsedFile): boolean {
  if (!file.tree?.rootNode) return false;
  let isDataAccess = false;

  function scan(node: Node): void {
    if (isDataAccess) return;

    if (
      node.type === "class_declaration" ||
      node.type === "interface_declaration" ||
      node.type === "record_declaration"
    ) {
      const annotations = getAnnotations(node);
      if (annotations.some((a) => a.name === "Repository")) {
        isDataAccess = true;
        return;
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;

        if (child.type === "super_interfaces" || child.type === "extends_interfaces") {
          for (let j = 0; j < child.childCount; j++) {
            const typeList = child.child(j);
            if (typeList && typeList.type === "type_list") {
              for (let k = 0; k < typeList.childCount; k++) {
                const iface = typeList.child(k);
                if (iface && iface.type !== ",") {
                  const baseName = stripGenerics(iface.text);
                  if (SPRING_DATA_REPOSITORIES.has(baseName)) {
                    isDataAccess = true;
                    return;
                  }
                }
              }
            }
          }
        }

        if (child.type === "superclass") {
          for (let j = 0; j < child.childCount; j++) {
            const sc = child.child(j);
            if (sc && sc.type !== "extends") {
              const baseName = stripGenerics(sc.text);
              if (SPRING_DATA_REPOSITORIES.has(baseName)) {
                isDataAccess = true;
                return;
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) scan(child);
    }
  }

  scan(file.tree.rootNode);
  return isDataAccess;
}

/**
 * ENT-40: Kiểm tra file có thuộc tầng DATA_ACCESS theo Spring Boot không.
 * File JAVA có lớp @Repository hoặc kế thừa danh sách ENT-40.
 * Cache theo WeakMap.
 */
export function isSpringDataAccessFile(file: ParsedFile): boolean {
  if (file.language !== "JAVA") return false;
  const cached = springDataAccessCache.get(file);
  if (cached !== undefined) return cached;

  const result = checkSpringDataAccessFile(file);
  springDataAccessCache.set(file, result);
  return result;
}

interface JavaClassMeta {
  simpleName: string;
  qualifiedName: string;
  filePath: string;
  classKey: string;
  isInterface: boolean;
  hasRepositoryAnnotation: boolean;
  superClass: string | null;
  superInterfaces: string[];
  methodsWithBody: Map<string, FunctionInfo[]>;
  constructors: FunctionInfo[];
}

export function buildJavaCallGraph(
  files: ParsedFile[],
  idx: SymbolIndex
): CallGraphResult {
  const rawEdges: FunctionCallEdge[] = [];
  const external: ExternalCall[] = [];
  const bindings: RouteBinding[] = [];

  // ENT-44: chỉ xử lý file language === "JAVA", bỏ file test theo ENT-44
  const javaFiles = files.filter(
    (f) => f.language === "JAVA" && f.tree?.rootNode && !isJavaTestSource(f.path)
  );
  if (javaFiles.length === 0) {
    return { edges: [], external: [], bindings: [] };
  }

  // Thu thập metadata cho mọi class/interface Java trong repo
  const classMetaList: JavaClassMeta[] = [];
  const classMetaByName = new Map<string, JavaClassMeta[]>();
  const classMetaByKey = new Map<string, JavaClassMeta>();
  const springDataInterfaceSet = new Set<string>(SPRING_DATA_REPOSITORIES);

  function registerClassMeta(meta: JavaClassMeta) {
    classMetaList.push(meta);
    classMetaByKey.set(meta.classKey, meta);

    const listBySimple = classMetaByName.get(meta.simpleName) ?? [];
    listBySimple.push(meta);
    classMetaByName.set(meta.simpleName, listBySimple);

    if (meta.qualifiedName !== meta.simpleName) {
      const listByQual = classMetaByName.get(meta.qualifiedName) ?? [];
      listByQual.push(meta);
      classMetaByName.set(meta.qualifiedName, listByQual);
    }
  }

  for (const file of javaFiles) {
    const filePath = file.path;

    function scanClasses(node: Node, parentPrefix: string) {
      if (
        node.type === "class_declaration" ||
        node.type === "interface_declaration" ||
        node.type === "record_declaration" ||
        node.type === "enum_declaration"
      ) {
        const nameNode = node.childForFieldName("name");
        if (!nameNode) return;
        const simpleName = nameNode.text;
        const qualifiedName = parentPrefix ? `${parentPrefix}.${simpleName}` : simpleName;
        const classKey = `${filePath}#${qualifiedName}`;
        const isInterface = node.type === "interface_declaration";

        const annotations = getAnnotations(node);
        const hasRepositoryAnnotation = annotations.some((a) => a.name === "Repository");

        let superClass: string | null = null;
        const superInterfaces: string[] = [];

        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (!child) continue;

          if (child.type === "superclass") {
            for (let j = 0; j < child.childCount; j++) {
              const sc = child.child(j);
              if (sc && sc.type !== "extends") {
                superClass = stripGenerics(sc.text);
              }
            }
          }

          if (child.type === "super_interfaces" || child.type === "extends_interfaces") {
            for (let j = 0; j < child.childCount; j++) {
              const typeList = child.child(j);
              if (typeList && typeList.type === "type_list") {
                for (let k = 0; k < typeList.childCount; k++) {
                  const iface = typeList.child(k);
                  if (iface && iface.type !== ",") {
                    superInterfaces.push(stripGenerics(iface.text));
                  }
                }
              }
            }
          }
        }

        const methodsWithBody = new Map<string, FunctionInfo[]>();
        const constructors: FunctionInfo[] = [];

        // Duyệt body để lấy methods và constructors có thân
        const body =
          node.childForFieldName("body") ??
          node.children.find(
            (c) =>
              c.type === "class_body" ||
              c.type === "interface_body" ||
              c.type === "record_body" ||
              c.type === "enum_body"
          );

        if (body) {
          for (let i = 0; i < body.childCount; i++) {
            const member = body.child(i);
            if (!member) continue;

            if (member.type === "method_declaration") {
              const mNameNode = member.childForFieldName("name");
              const hasBody = member.childForFieldName("body") !== null;
              if (mNameNode && hasBody) {
                const mName = mNameNode.text;
                const mStart = getJavaStartLine(member);
                const expectedName = `${qualifiedName}.${mName}`;

                // Tìm FunctionInfo trong idx
                for (const [, func] of idx.functions) {
                  if (
                    func.file_path === filePath &&
                    func.name === expectedName &&
                    func.line_start === mStart
                  ) {
                    const list = methodsWithBody.get(mName) ?? [];
                    list.push(func);
                    methodsWithBody.set(mName, list);
                    break;
                  }
                }
              }
            } else if (
              member.type === "constructor_declaration" ||
              member.type === "compact_constructor_declaration"
            ) {
              const cNameNode = member.childForFieldName("name");
              const cName = cNameNode ? cNameNode.text : simpleName;
              const cStart = getJavaStartLine(member);
              const expectedName = `${qualifiedName}.${cName}`;

              for (const [, func] of idx.functions) {
                if (
                  func.file_path === filePath &&
                  func.name === expectedName &&
                  func.line_start === cStart
                ) {
                  constructors.push(func);
                  break;
                }
              }
            } else if (
              member.type === "class_declaration" ||
              member.type === "interface_declaration" ||
              member.type === "record_declaration" ||
              member.type === "enum_declaration"
            ) {
              scanClasses(member, qualifiedName);
            }
          }
        }

        registerClassMeta({
          simpleName,
          qualifiedName,
          filePath,
          classKey,
          isInterface,
          hasRepositoryAnnotation,
          superClass,
          superInterfaces,
          methodsWithBody,
          constructors,
        });
        return;
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) scanClasses(child, parentPrefix);
      }
    }

    scanClasses(file.tree.rootNode, "");
  }

  // Lan truyền quan hệ kế thừa vào springDataInterfaceSet (ENT-41, ENT-42)
  // Chỉ interface kế thừa danh sách ENT-40 (method không thân) mới là ExternalCall spring-data
  let changed = true;
  while (changed) {
    changed = false;
    for (const meta of classMetaList) {
      if (!meta.isInterface) continue;
      if (
        springDataInterfaceSet.has(meta.simpleName) ||
        springDataInterfaceSet.has(meta.qualifiedName)
      ) {
        continue;
      }
      const extendsEnt40 =
        (meta.superClass !== null && springDataInterfaceSet.has(meta.superClass)) ||
        meta.superInterfaces.some((iface) => springDataInterfaceSet.has(iface));
      if (extendsEnt40) {
        springDataInterfaceSet.add(meta.simpleName);
        springDataInterfaceSet.add(meta.qualifiedName);
        changed = true;
      }
    }
  }

  // 1. Tuyến đường (Route) theo dòng Spring Boot ở 12 Mục 1
  for (const file of javaFiles) {
    const filePath = file.path;

    function walkControllerClasses(
      node: Node,
      parentPrefix: string,
      inheritedController: boolean,
      inheritedClassPrefix: string
    ) {
      if (
        node.type === "class_declaration" ||
        node.type === "interface_declaration" ||
        node.type === "record_declaration"
      ) {
        const nameNode = node.childForFieldName("name");
        if (!nameNode) return;
        const simpleName = nameNode.text;
        const qualifiedName = parentPrefix ? `${parentPrefix}.${simpleName}` : simpleName;

        const annotations = getAnnotations(node);
        const isSelfController = annotations.some(
          (a) => a.name === "RestController" || a.name === "Controller"
        );
        const isController = isSelfController || inheritedController;

        const reqMapping = annotations.find((a) => a.name === "RequestMapping");
        const ownPrefix = reqMapping ? extractPathFromAnnotation(reqMapping.node) : "";
        const effectiveClassPrefix = ownPrefix
          ? combineRoutePaths(inheritedClassPrefix, ownPrefix)
          : inheritedClassPrefix;

        const body =
          node.childForFieldName("body") ??
          node.children.find(
            (c) =>
              c.type === "class_body" ||
              c.type === "interface_body" ||
              c.type === "record_body"
          );

        if (body) {
          for (let i = 0; i < body.childCount; i++) {
            const member = body.child(i);
            if (!member) continue;

            if (member.type === "method_declaration") {
              if (!isController) continue;

              const mNameNode = member.childForFieldName("name");
              if (!mNameNode) continue;
              const methodName = mNameNode.text;

              const mAnnotations = getAnnotations(member);
              const mappingAnn = mAnnotations.find(
                (a) =>
                  a.name in MAPPING_VERBS ||
                  a.name === "RequestMapping"
              );

              if (mappingAnn) {
                let httpMethod: string;
                if (mappingAnn.name in MAPPING_VERBS) {
                  httpMethod = MAPPING_VERBS[mappingAnn.name] ?? "GET";
                } else {
                  httpMethod = extractMethodFromRequestMapping(mappingAnn.node);
                }

                const methodPath = extractPathFromAnnotation(mappingAnn.node);
                const combinedPath = combineRoutePaths(effectiveClassPrefix, methodPath);
                const displayName = `@${mappingAnn.name}("${combinedPath}")`;

                const mStart = getJavaStartLine(member);
                const mEnd = member.endPosition.row + 1;
                const expectedName = `${qualifiedName}.${methodName}`;

                let handlerKey: string | null = null;
                for (const [k, f] of idx.functions) {
                  if (
                    f.file_path === filePath &&
                    f.name === expectedName &&
                    f.line_start === mStart
                  ) {
                    handlerKey = k;
                    break;
                  }
                }

                if (!handlerKey) {
                  for (const [k, s] of idx.symbols) {
                    if (
                      s.file_path === filePath &&
                      s.name === expectedName &&
                      s.line_start === mStart
                    ) {
                      handlerKey = k;
                      break;
                    }
                  }
                }

                if (handlerKey) {
                  bindings.push({
                    file_path: filePath,
                    line_start: mStart,
                    line_end: mEnd,
                    kind: "HTTP",
                    method: httpMethod,
                    path: combinedPath,
                    handler: handlerKey,
                    middlewares: [],
                    display_name: displayName,
                  });
                }
              }
            } else if (
              member.type === "class_declaration" ||
              member.type === "interface_declaration" ||
              member.type === "record_declaration"
            ) {
              walkControllerClasses(member, qualifiedName, isController, effectiveClassPrefix);
            }
          }
        }
        return;
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) walkControllerClasses(child, parentPrefix, inheritedController, inheritedClassPrefix);
      }
    }

    walkControllerClasses(file.tree.rootNode, "", false, "");
  }

  // 2. Lời gọi trong thân mọi method, constructor
  function findClassMetaForType(typeName: string, currentFile: string): JavaClassMeta | null {
    const list = classMetaByName.get(typeName);
    if (!list || list.length === 0) return null;

    // 1. Kiểm tra qua import
    const imp = idx.imports.get(currentFile)?.get(typeName);
    if (imp?.source_file) {
      const match = list.find((m) => m.filePath === imp.source_file);
      if (match) return match;
    }

    // 2. Cùng file
    const sameFile = list.find((m) => m.filePath === currentFile);
    if (sameFile) return sameFile;

    // 3. Khớp đơn
    return list[0] ?? null;
  }

  function findMethodsOnClass(meta: JavaClassMeta, methodName: string): FunctionInfo[] {
    const own = meta.methodsWithBody.get(methodName);
    if (own && own.length > 0) return own;

    if (meta.superClass) {
      const superMeta = findClassMetaForType(meta.superClass, meta.filePath);
      if (superMeta) {
        return findMethodsOnClass(superMeta, methodName);
      }
    }
    return [];
  }

  for (const file of javaFiles) {
    const filePath = file.path;

    function walkClassForCalls(classNode: Node, parentPrefix: string) {
      if (
        classNode.type === "class_declaration" ||
        classNode.type === "interface_declaration" ||
        classNode.type === "record_declaration" ||
        classNode.type === "enum_declaration"
      ) {
        const nameNode = classNode.childForFieldName("name");
        if (!nameNode) return;
        const simpleName = nameNode.text;
        const qualifiedName = parentPrefix ? `${parentPrefix}.${simpleName}` : simpleName;
        const classKey = `${filePath}#${qualifiedName}`;
        const currentMeta = classMetaByKey.get(classKey);

        const body =
          classNode.childForFieldName("body") ??
          classNode.children.find(
            (c) =>
              c.type === "class_body" ||
              c.type === "interface_body" ||
              c.type === "record_body" ||
              c.type === "enum_body"
          );

        if (body) {
          for (let i = 0; i < body.childCount; i++) {
            const member = body.child(i);
            if (!member) continue;

            const isMethod = member.type === "method_declaration";
            const isCtor =
              member.type === "constructor_declaration" ||
              member.type === "compact_constructor_declaration";

            if (isMethod || isCtor) {
              const mNameNode = member.childForFieldName("name");
              const mName = mNameNode ? mNameNode.text : simpleName;
              const mStart = getJavaStartLine(member);
              const expectedName = `${qualifiedName}.${mName}`;

              let callerKey: string | null = null;
              for (const [k, f] of idx.functions) {
                if (
                  f.file_path === filePath &&
                  f.name === expectedName &&
                  f.line_start === mStart
                ) {
                  callerKey = k;
                  break;
                }
              }

              if (!callerKey) continue;

              // Thu thập param types
              const paramMap = new Map<string, string>();
              const paramNode = member.childForFieldName("parameters");
              if (paramNode) {
                for (let p = 0; p < paramNode.namedChildCount; p++) {
                  const param = paramNode.namedChild(p);
                  if (!param) continue;
                  const pName = param.childForFieldName("name")?.text;
                  const pTypeNode = param.childForFieldName("type");
                  if (pName && pTypeNode) {
                    paramMap.set(pName, stripGenerics(pTypeNode.text));
                  }
                }
              }

              // Thu thập local variables
              const localMap = new Map<string, string>();
              const mBody = member.childForFieldName("body");

              if (mBody) {
                function collectLocals(n: Node) {
                  if (
                    n !== mBody &&
                    (n.type === "class_declaration" ||
                      n.type === "interface_declaration" ||
                      n.type === "record_declaration" ||
                      n.type === "lambda_expression")
                  ) {
                    return;
                  }

                  if (n.type === "local_variable_declaration") {
                    const typeNode = n.childForFieldName("type");
                    const rawType = typeNode?.text ?? "";
                    if (rawType && rawType !== "var") {
                      const cleanType = stripGenerics(rawType);
                      for (let j = 0; j < n.childCount; j++) {
                        const c = n.child(j);
                        if (c && c.type === "variable_declarator") {
                          const vName = c.childForFieldName("name")?.text;
                          if (vName) {
                            localMap.set(vName, cleanType);
                          }
                        }
                      }
                    }
                  }

                  for (let j = 0; j < n.childCount; j++) {
                    const c = n.child(j);
                    if (c) collectLocals(c);
                  }
                }

                collectLocals(mBody);
              }

              // Duyệt call sites
              function walkCallSites(n: Node) {
                // Không đi vào class lồng nhau (sẽ được xử lý riêng)
                if (
                  n !== member &&
                  (n.type === "class_declaration" ||
                    n.type === "interface_declaration" ||
                    n.type === "record_declaration" ||
                    n.type === "enum_declaration")
                ) {
                  return;
                }

                if (n.type === "object_creation_expression") {
                  const typeNode = n.childForFieldName("type");
                  const typeName = typeNode ? stripGenerics(typeNode.text) : "";
                  const line = n.startPosition.row + 1;
                  const targetMeta = typeName ? findClassMetaForType(typeName, filePath) : null;

                  if (targetMeta && targetMeta.constructors.length > 0) {
                    const argsNode = n.childForFieldName("arguments");
                    const nArgs = argsNode?.namedChildCount ?? 0;
                    const matching = targetMeta.constructors.filter((c) => c.params.length === nArgs);

                    if (matching.length === 1) {
                      rawEdges.push({
                        caller: callerKey!,
                        callee: matching[0]!.key,
                        confidence: "RESOLVED",
                        ambiguous: false,
                        call_count: 1,
                      });
                    } else if (matching.length > 1) {
                      matching.sort((a, b) => (a.key < b.key ? -1 : 1));
                      rawEdges.push({
                        caller: callerKey!,
                        callee: matching[0]!.key,
                        confidence: "RESOLVED",
                        ambiguous: true,
                        call_count: 1,
                      });
                    } else {
                      const allCtors = [...targetMeta.constructors].sort((a, b) =>
                        a.key < b.key ? -1 : 1
                      );
                      rawEdges.push({
                        caller: callerKey!,
                        callee: allCtors[0]!.key,
                        confidence: "RESOLVED",
                        ambiguous: true,
                        call_count: 1,
                      });
                    }
                  } else {
                    external.push({
                      caller: callerKey!,
                      line,
                      receiver_chain: [],
                      method: typeName || "<init>",
                      import_source: null,
                    });
                  }
                } else if (n.type === "method_invocation") {
                  const objNode = n.childForFieldName("object");
                  const nameNode = n.childForFieldName("name");
                  const methodName = nameNode?.text ?? "";
                  const line = n.startPosition.row + 1;
                  const receiverChain = extractReceiverChain(objNode);

                  // Xác định receiverType theo thứ tự spec
                  let receiverType: string | null = null;

                  if (!objNode || objNode.text === "this") {
                    receiverType = simpleName;
                  } else if (objNode.text === "super" && currentMeta?.superClass) {
                    receiverType = currentMeta.superClass;
                  } else {
                    let varName: string | null = null;
                    if (objNode.type === "identifier") {
                      varName = objNode.text;
                    } else if (
                      objNode.type === "field_access" &&
                      objNode.childForFieldName("object")?.text === "this"
                    ) {
                      varName = objNode.childForFieldName("field")?.text ?? null;
                    }

                    if (varName) {
                      const lType = localMap.get(varName);
                      const pType = paramMap.get(varName);
                      if (lType) {
                        receiverType = lType;
                      } else if (pType) {
                        receiverType = pType;
                      } else {
                        const fType =
                          idx.field_types.get(`${classKey}.${varName}`) ??
                          idx.field_types.get(`${filePath}#${varName}`) ??
                          idx.field_types.get(varName);
                        if (fType) {
                          receiverType = stripGenerics(fType);
                        }
                      }
                    }

                    if (!receiverType && objNode.type === "identifier") {
                      const text = objNode.text;
                      if (
                        text[0] &&
                        text[0] === text[0].toUpperCase() &&
                        text[0] !== text[0].toLowerCase()
                      ) {
                        if (classMetaByName.has(text)) {
                          receiverType = text;
                        }
                      }
                    }
                  }

                  // Xử lý kết quả lời gọi dựa trên receiverType
                  if (receiverType) {
                    const targetMeta =
                      receiverType === simpleName && currentMeta
                        ? currentMeta
                        : findClassMetaForType(receiverType, filePath);

                    const isSpringDataInterface =
                      springDataInterfaceSet.has(receiverType) ||
                      (targetMeta?.isInterface === true &&
                        (springDataInterfaceSet.has(targetMeta.simpleName) ||
                          springDataInterfaceSet.has(targetMeta.qualifiedName)));

                    // 1. Kiểu là interface kế thừa danh sách ENT-40 (ENT-41, ENT-42)
                    if (isSpringDataInterface) {
                      external.push({
                        caller: callerKey!,
                        line,
                        receiver_chain: receiverChain,
                        method: methodName,
                        import_source: "spring-data",
                      });
                    }
                    // 2. Kiểu là EntityManager, method thuộc ENT-41
                    else if (
                      receiverType === "EntityManager" &&
                      ENTITY_MANAGER_DATA_SINK_METHODS.has(methodName)
                    ) {
                      external.push({
                        caller: callerKey!,
                        line,
                        receiver_chain: receiverChain,
                        method: methodName,
                        import_source: "jakarta.persistence",
                      });
                    }
                    // 3. Lớp trong repo, có method tên đó và có thân
                    else if (targetMeta && !targetMeta.isInterface) {
                      const candidates = findMethodsOnClass(targetMeta, methodName);
                      if (candidates.length > 0) {
                        const argsNode = n.childForFieldName("arguments");
                        const nArgs = argsNode?.namedChildCount ?? 0;
                        const matching = candidates.filter((c) => c.params.length === nArgs);

                        if (matching.length === 1) {
                          rawEdges.push({
                            caller: callerKey!,
                            callee: matching[0]!.key,
                            confidence: "RESOLVED",
                            ambiguous: false,
                            call_count: 1,
                          });
                        } else if (matching.length > 1) {
                          matching.sort((a, b) => (a.key < b.key ? -1 : 1));
                          rawEdges.push({
                            caller: callerKey!,
                            callee: matching[0]!.key,
                            confidence: "RESOLVED",
                            ambiguous: true,
                            call_count: 1,
                          });
                        } else {
                          const sorted = [...candidates].sort((a, b) =>
                            a.key < b.key ? -1 : 1
                          );
                          rawEdges.push({
                            caller: callerKey!,
                            callee: sorted[0]!.key,
                            confidence: "RESOLVED",
                            ambiguous: true,
                            call_count: 1,
                          });
                        }
                      } else {
                        external.push({
                          caller: callerKey!,
                          line,
                          receiver_chain: receiverChain,
                          method: methodName,
                          import_source: null,
                        });
                      }
                    }
                    // 4. Interface trong repo, method không thân
                    else if (targetMeta && targetMeta.isInterface) {
                      const implKeysFromIdx =
                        idx.interface_impls.get(receiverType) ??
                        idx.interface_impls.get(targetMeta.simpleName) ??
                        [];
                      const implKeySet = new Set<string>(implKeysFromIdx);
                      for (const m of classMetaList) {
                        if (
                          m.superInterfaces.includes(receiverType) ||
                          m.superInterfaces.includes(targetMeta.simpleName)
                        ) {
                          implKeySet.add(m.classKey);
                        }
                      }
                      const implClassKeys = Array.from(implKeySet);
                      const matchedCallees: string[] = [];

                      for (const implKey of implClassKeys) {
                        const implMeta = classMetaByKey.get(implKey);
                        if (implMeta) {
                          const candidates = findMethodsOnClass(implMeta, methodName);
                          if (candidates.length > 0) {
                            const argsNode = n.childForFieldName("arguments");
                            const nArgs = argsNode?.namedChildCount ?? 0;
                            const matching = candidates.filter(
                              (c) => c.params.length === nArgs
                            );
                            if (matching.length > 0) {
                              matchedCallees.push(matching[0]!.key);
                            } else {
                              matchedCallees.push(candidates[0]!.key);
                            }
                          }
                        }
                      }

                      if (matchedCallees.length === 1) {
                        rawEdges.push({
                          caller: callerKey!,
                          callee: matchedCallees[0]!,
                          confidence: "RESOLVED",
                          ambiguous: false,
                          call_count: 1,
                        });
                      } else if (matchedCallees.length > 1) {
                        for (const callee of matchedCallees) {
                          rawEdges.push({
                            caller: callerKey!,
                            callee,
                            confidence: "INFERRED",
                            ambiguous: true,
                            call_count: 1,
                          });
                        }
                      } else {
                        external.push({
                          caller: callerKey!,
                          line,
                          receiver_chain: receiverChain,
                          method: methodName,
                          import_source: null,
                        });
                      }
                    } else {
                      external.push({
                        caller: callerKey!,
                        line,
                        receiver_chain: receiverChain,
                        method: methodName,
                        import_source: null,
                      });
                    }
                  } else {
                    // Receiver type không biết
                    external.push({
                      caller: callerKey!,
                      line,
                      receiver_chain: receiverChain,
                      method: methodName,
                      import_source: null,
                    });
                  }
                }

                // Duyệt đệ quy tất cả con, kể cả object của method_invocation
                for (let k = 0; k < n.childCount; k++) {
                  const child = n.child(k);
                  if (child) walkCallSites(child);
                }
              }

              if (mBody) {
                walkCallSites(mBody);
              }
            } else if (
              member.type === "class_declaration" ||
              member.type === "interface_declaration" ||
              member.type === "record_declaration" ||
              member.type === "enum_declaration"
            ) {
              walkClassForCalls(member, qualifiedName);
            }
          }
        }
        return;
      }

      for (let i = 0; i < classNode.childCount; i++) {
        const child = classNode.child(i);
        if (child) walkClassForCalls(child, parentPrefix);
      }
    }

    walkClassForCalls(file.tree.rootNode, "");
  }

  // 3. Gộp cạnh trùng (caller, callee), cộng call_count (ENG-33)
  const edgeMap = new Map<string, FunctionCallEdge>();
  for (const e of rawEdges) {
    if (e.caller === e.callee) continue;
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
