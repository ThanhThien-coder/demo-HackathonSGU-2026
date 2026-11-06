// Resolver symbol và import cho Java — spec 11 Mục 2 (ENG-20..25, ENG-27).
import type { Node } from "web-tree-sitter";
import { uniqueKey } from "../symbols";
import type {
  FieldTypeMap,
  FunctionInfo,
  ImportedSymbol,
  InterfaceImplMap,
  LocalSymbolIndex,
  ParsedFile,
  SymbolIndex,
  SymbolTable,
} from "../types";

export interface JavaSymbolCollectorState {
  symbols: SymbolTable;
  functions: Map<string, FunctionInfo>;
  field_types: FieldTypeMap;
  interface_impls: InterfaceImplMap;
  locals: LocalSymbolIndex;
}

// Trích xuất package từ file Java
export function extractJavaPackage(root: Node): string {
  for (let i = 0; i < root.childCount; i++) {
    const child = root.child(i);
    if (child && child.type === "package_declaration") {
      for (let j = 0; j < child.childCount; j++) {
        const c = child.child(j);
        if (c && (c.type === "scoped_identifier" || c.type === "identifier")) {
          return c.text;
        }
      }
    }
  }
  return "";
}

// line_start tính cả annotation của chính method hoặc class, không lấy annotation của phần tử khác (ENG-20)
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

// Kiểm tra is_exported: public hoặc thành phần của interface (ENG-21b, 12 Mục 3)
function isJavaExported(node: Node, isInsideInterface: boolean): boolean {
  if (isInsideInterface) return true;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === "modifiers") {
      for (let j = 0; j < child.childCount; j++) {
        const mod = child.child(j);
        if (mod && mod.text === "public") return true;
      }
    }
  }
  return false;
}

// Trích xuất tên tham số từ formal_parameters
function extractJavaParameters(paramNode: Node | null): string[] {
  if (!paramNode) return [];
  const params: string[] = [];
  for (let i = 0; i < paramNode.namedChildCount; i++) {
    const child = paramNode.namedChild(i);
    if (!child) continue;
    if (child.type === "formal_parameter" || child.type === "spread_parameter") {
      const nameNode = child.childForFieldName("name");
      if (nameNode) {
        params.push(nameNode.text);
      }
    }
  }
  return params;
}

// Trích xuất biến cục bộ trong thân method / constructor (ENG-24)
function extractJavaLocals(
  bodyNode: Node | null,
  filePath: string,
  field_types: FieldTypeMap
): Set<string> {
  const locals = new Set<string>();
  if (!bodyNode) return locals;

  function walk(n: Node): void {
    if (
      n !== bodyNode &&
      (n.type === "class_declaration" ||
        n.type === "interface_declaration" ||
        n.type === "enum_declaration" ||
        n.type === "record_declaration" ||
        n.type === "lambda_expression")
    ) {
      return;
    }

    if (n.type === "local_variable_declaration") {
      const typeNode = n.childForFieldName("type");
      const typeText = typeNode ? typeNode.text : "";
      for (let i = 0; i < n.childCount; i++) {
        const c = n.child(i);
        if (c && c.type === "variable_declarator") {
          const nameNode = c.childForFieldName("name");
          const valNode = c.childForFieldName("value");
          if (nameNode) {
            const varName = nameNode.text;
            locals.add(varName);
            if (valNode && valNode.type === "object_creation_expression") {
              const ctorType = valNode.childForFieldName("type");
              const effectiveType = ctorType ? ctorType.text : typeText;
              if (effectiveType) {
                field_types.set(`${filePath}#${varName}`, effectiveType);
                field_types.set(varName, effectiveType);
              }
            } else if (typeText && typeText !== "var") {
              field_types.set(`${filePath}#${varName}`, typeText);
              field_types.set(varName, typeText);
            }
          }
        }
      }
    } else if (n.type === "enhanced_for_statement") {
      const nameNode = n.childForFieldName("name");
      if (nameNode) locals.add(nameNode.text);
    } else if (n.type === "catch_clause") {
      const param = n.childForFieldName("parameter");
      if (param) {
        const nameNode = param.childForFieldName("name");
        if (nameNode) locals.add(nameNode.text);
      }
    }

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) walk(child);
    }
  }

  walk(bodyNode);
  return locals;
}

// Tính Cognitive Complexity sơ bộ (ENG-71)
function computeJavaComplexity(node: Node): number {
  let score = 0;

  function walk(n: Node, nesting: number): void {
    const type = n.type;
    let nextNesting = nesting;

    if (
      type === "if_statement" ||
      type === "ternary_expression" ||
      type === "switch_expression" ||
      type === "switch_statement" ||
      type === "for_statement" ||
      type === "enhanced_for_statement" ||
      type === "while_statement" ||
      type === "do_statement" ||
      type === "catch_clause"
    ) {
      score += 1 + nesting;
      nextNesting = nesting + 1;
    } else if (type === "else") {
      score += 1;
      nextNesting = nesting + 1;
    } else if (type === "binary_expression") {
      for (let i = 0; i < n.childCount; i++) {
        const c = n.child(i);
        if (c && (c.text === "&&" || c.text === "||")) {
          score += 1;
          break;
        }
      }
    }

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) walk(child, nextNesting);
    }
  }

  walk(node, 0);
  return score;
}

// Trích xuất base type name từ generic_type hoặc type_identifier
function getBaseTypeName(node: Node): string {
  if (node.type === "generic_type") {
    const base = node.childForFieldName("type") ?? node.namedChild(0);
    return base ? base.text : node.text;
  }
  return node.text;
}

function recordInterfaceImpl(map: InterfaceImplMap, ifaceName: string, classKey: string): void {
  if (!ifaceName) return;
  let arr = map.get(ifaceName);
  if (!arr) {
    arr = [];
    map.set(ifaceName, arr);
  }
  if (!arr.includes(classKey)) {
    arr.push(classKey);
  }
}

// Thu thập symbol cho một file Java
export function collectJavaSymbols(
  file: ParsedFile,
  state: JavaSymbolCollectorState,
  keyCounts: Map<string, number>
): void {
  const filePath = file.path;

  function processTypeDeclaration(
    node: Node,
    parentPrefix: string,
    isParentInterface: boolean
  ): void {
    const type = node.type;
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return;

    const rawName = nameNode.text;
    const qualifiedName = parentPrefix ? `${parentPrefix}.${rawName}` : rawName;
    const baseKey = `${filePath}#${qualifiedName}`;
    const classKey = uniqueKey(baseKey, keyCounts);

    const isCurrentInterface = type === "interface_declaration";
    const kind = isCurrentInterface ? "INTERFACE" : "CLASS";
    const isExported = isJavaExported(node, isParentInterface);

    state.symbols.set(classKey, {
      key: classKey,
      kind,
      name: qualifiedName,
      file_path: filePath,
      line_start: getJavaStartLine(node),
      line_end: node.endPosition.row + 1,
      is_exported: isExported,
    });

    // ENG-23 InterfaceImplMap: super_interfaces (implements) và superclass (extends)
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      // super_interfaces: implements I1, I2...
      if (child.type === "super_interfaces") {
        for (let j = 0; j < child.childCount; j++) {
          const typeList = child.child(j);
          if (typeList && typeList.type === "type_list") {
            for (let k = 0; k < typeList.childCount; k++) {
              const iface = typeList.child(k);
              if (iface && iface.type !== ",") {
                const ifaceName = getBaseTypeName(iface);
                recordInterfaceImpl(state.interface_impls, ifaceName, classKey);
              }
            }
          }
        }
      }

      // superclass: extends BaseClass
      if (child.type === "superclass") {
        for (let j = 0; j < child.childCount; j++) {
          const superClass = child.child(j);
          if (superClass && superClass.type !== "extends") {
            const superName = getBaseTypeName(superClass);
            recordInterfaceImpl(state.interface_impls, superName, classKey);
          }
        }
      }

      // extends_interfaces: interface I extends IBase1, IBase2
      if (child.type === "extends_interfaces") {
        for (let j = 0; j < child.childCount; j++) {
          const typeList = child.child(j);
          if (typeList && typeList.type === "type_list") {
            for (let k = 0; k < typeList.childCount; k++) {
              const iface = typeList.child(k);
              if (iface && iface.type !== ",") {
                const ifaceName = getBaseTypeName(iface);
                recordInterfaceImpl(state.interface_impls, ifaceName, classKey);
              }
            }
          }
        }
      }
    }

    // Duyệt body: methods, constructors, fields, và class/interface lồng nhau
    const body =
      node.childForFieldName("body") ??
      node.children.find((c) =>
        c.type === "class_body" ||
        c.type === "interface_body" ||
        c.type === "enum_body" ||
        c.type === "record_body"
      );

    if (body) {
      for (let i = 0; i < body.childCount; i++) {
        const member = body.child(i);
        if (!member) continue;

        // 1. Class / interface / enum / record lồng nhau
        if (
          member.type === "class_declaration" ||
          member.type === "interface_declaration" ||
          member.type === "enum_declaration" ||
          member.type === "record_declaration"
        ) {
          processTypeDeclaration(member, qualifiedName, isCurrentInterface);
          continue;
        }

        // 2. Field declaration (ENG-22 FieldTypeMap)
        if (member.type === "field_declaration") {
          const typeNode = member.childForFieldName("type");
          if (typeNode) {
            const pType = typeNode.text;
            for (let j = 0; j < member.childCount; j++) {
              const declarator = member.child(j);
              if (declarator && declarator.type === "variable_declarator") {
                const pName = declarator.childForFieldName("name")?.text;
                if (pName) {
                  state.field_types.set(`${classKey}.${pName}`, pType);
                  state.field_types.set(`${filePath}#${pName}`, pType);
                  state.field_types.set(pName, pType);
                }
              }
            }
          }
          continue;
        }

        // 3. Method declaration
        if (member.type === "method_declaration") {
          const mNameNode = member.childForFieldName("name");
          if (!mNameNode) continue;
          const methodName = mNameNode.text;

          const methodBaseKey = `${filePath}#${qualifiedName}.${methodName}`;
          const methodKey = uniqueKey(methodBaseKey, keyCounts);
          const mExported = isJavaExported(member, isCurrentInterface);

          const params = extractJavaParameters(member.childForFieldName("parameters"));
          const mBody = member.childForFieldName("body");
          const locs = extractJavaLocals(mBody, filePath, state.field_types);
          const complexity = computeJavaComplexity(member);

          state.locals.set(methodKey, locs);

          const funcInfo: FunctionInfo = {
            key: methodKey,
            kind: "METHOD",
            name: `${qualifiedName}.${methodName}`,
            file_path: filePath,
            line_start: getJavaStartLine(member),
            line_end: member.endPosition.row + 1,
            is_exported: mExported,
            params,
            locals: Array.from(locs).sort(),
            complexity,
          };

          state.symbols.set(methodKey, funcInfo);
          state.functions.set(methodKey, funcInfo);
          continue;
        }

        // 4. Constructor declaration
        if (
          member.type === "constructor_declaration" ||
          member.type === "compact_constructor_declaration"
        ) {
          const ctorNameNode = member.childForFieldName("name");
          const ctorName = ctorNameNode ? ctorNameNode.text : rawName;

          const ctorBaseKey = `${filePath}#${qualifiedName}.${ctorName}`;
          const ctorKey = uniqueKey(ctorBaseKey, keyCounts);
          const cExported = isJavaExported(member, isCurrentInterface);

          const paramNode = member.childForFieldName("parameters");
          const params = extractJavaParameters(paramNode);
          const cBody = member.childForFieldName("body");
          const locs = extractJavaLocals(cBody, filePath, state.field_types);
          const complexity = computeJavaComplexity(member);

          state.locals.set(ctorKey, locs);

          const funcInfo: FunctionInfo = {
            key: ctorKey,
            kind: "METHOD",
            name: `${qualifiedName}.${ctorName}`,
            file_path: filePath,
            line_start: getJavaStartLine(member),
            line_end: member.endPosition.row + 1,
            is_exported: cExported,
            params,
            locals: Array.from(locs).sort(),
            complexity,
          };

          state.symbols.set(ctorKey, funcInfo);
          state.functions.set(ctorKey, funcInfo);

          // ENG-22: Tham số constructor đưa vào FieldTypeMap
          if (paramNode) {
            for (let p = 0; p < paramNode.namedChildCount; p++) {
              const param = paramNode.namedChild(p);
              if (!param) continue;
              const pName = param.childForFieldName("name")?.text;
              const pType = param.childForFieldName("type")?.text;
              if (pName && pType) {
                state.field_types.set(`${classKey}.${pName}`, pType);
                state.field_types.set(`${filePath}#${pName}`, pType);
                state.field_types.set(pName, pType);
              }
            }
          }
          continue;
        }
      }
    }

    // ENG-22: Record components trong record_declaration (formal_parameters) là field của record
    if (type === "record_declaration") {
      const recParams = node.childForFieldName("parameters");
      if (recParams) {
        for (let p = 0; p < recParams.namedChildCount; p++) {
          const param = recParams.namedChild(p);
          if (!param) continue;
          const pName = param.childForFieldName("name")?.text;
          const pType = param.childForFieldName("type")?.text;
          if (pName && pType) {
            state.field_types.set(`${classKey}.${pName}`, pType);
            state.field_types.set(`${filePath}#${pName}`, pType);
            state.field_types.set(pName, pType);
          }
        }
      }
    }
  }

  const root = file.tree.rootNode;
  for (let i = 0; i < root.childCount; i++) {
    const child = root.child(i);
    if (!child) continue;

    if (
      child.type === "class_declaration" ||
      child.type === "interface_declaration" ||
      child.type === "enum_declaration" ||
      child.type === "record_declaration"
    ) {
      processTypeDeclaration(child, "", false);
    }
  }
}

export interface JavaClassMapping {
  className: string;
  fqcn: string;
  filePath: string;
}

export interface JavaPackageIndex {
  fqcnToFile: Map<string, string>;
  packageToClasses: Map<string, JavaClassMapping[]>;
  fileToPackage: Map<string, string>;
}

// Lập chỉ mục FQCN cho mọi file Java (ENG-25)
export function buildJavaPackageMap(allFiles: ParsedFile[]): JavaPackageIndex {
  const fqcnToFile = new Map<string, string>();
  const packageToClasses = new Map<string, JavaClassMapping[]>();
  const fileToPackage = new Map<string, string>();

  for (const f of allFiles) {
    if (f.language !== "JAVA") continue;
    const pkg = extractJavaPackage(f.tree.rootNode);
    fileToPackage.set(f.path, pkg);

    function scanClasses(n: Node, parentPrefix: string): void {
      if (
        n.type === "class_declaration" ||
        n.type === "interface_declaration" ||
        n.type === "enum_declaration" ||
        n.type === "record_declaration"
      ) {
        const nameNode = n.childForFieldName("name");
        if (nameNode) {
          const rawName = nameNode.text;
          const qName = parentPrefix ? `${parentPrefix}.${rawName}` : rawName;
          const fqcn = pkg ? `${pkg}.${qName}` : qName;
          fqcnToFile.set(fqcn, f.path);

          let arr = packageToClasses.get(pkg);
          if (!arr) {
            arr = [];
            packageToClasses.set(pkg, arr);
          }
          arr.push({ className: qName, fqcn, filePath: f.path });

          const body =
            n.childForFieldName("body") ??
            n.children.find((c) =>
              c.type === "class_body" ||
              c.type === "interface_body" ||
              c.type === "enum_body" ||
              c.type === "record_body"
            );

          if (body) {
            for (let i = 0; i < body.childCount; i++) {
              const child = body.child(i);
              if (child) scanClasses(child, qName);
            }
          }
        }
        return;
      }

      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (child) scanClasses(child, parentPrefix);
      }
    }

    scanClasses(f.tree.rootNode, "");
  }

  return { fqcnToFile, packageToClasses, fileToPackage };
}

// Phân giải import cho file Java — spec 11 Mục 2 (ENG-25: fqcn ⇒ file từ package + tên lớp, cùng package không cần import, a.b.* ⇒ mọi lớp; thư viện ngoài bỏ qua không lỗi)
export function collectJavaImports(
  file: ParsedFile,
  allFiles: ParsedFile[],
  idx: SymbolIndex,
  prebuiltMap?: JavaPackageIndex
): void {
  const map = prebuiltMap ?? buildJavaPackageMap(allFiles);
  const fileImportMap = idx.imports.get(file.path) ?? new Map<string, ImportedSymbol>();
  idx.imports.set(file.path, fileImportMap);

  const currentPkg = map.fileToPackage.get(file.path) ?? "";

  // 1. Cùng package không cần import
  const samePkgClasses = map.packageToClasses.get(currentPkg) ?? [];
  for (const c of samePkgClasses) {
    if (c.filePath !== file.path) {
      fileImportMap.set(c.className, {
        source_file: c.filePath,
        symbol_name: c.className,
        import_source: null,
        is_namespace: false,
      });
    }
  }

  // 2. Duyệt các import_declaration trong file
  const root = file.tree.rootNode;
  for (let i = 0; i < root.childCount; i++) {
    const child = root.child(i);
    if (!child || child.type !== "import_declaration") continue;

    let isWildcard = false;
    let importPath = "";

    for (let j = 0; j < child.childCount; j++) {
      const c = child.child(j);
      if (!c) continue;
      if (c.type === "asterisk" || c.text === "*") {
        isWildcard = true;
      } else if (c.type === "scoped_identifier" || c.type === "identifier") {
        importPath = c.text;
      }
    }

    if (isWildcard) {
      // import a.b.*;
      const targetPkg = importPath;
      const targetClasses = map.packageToClasses.get(targetPkg) ?? [];
      for (const c of targetClasses) {
        fileImportMap.set(c.className, {
          source_file: c.filePath,
          symbol_name: c.className,
          import_source: null,
          is_namespace: false,
        });
      }
      if (targetClasses.length === 0) {
        // Thư viện ngoài repo: bỏ qua không lỗi, ghi import_source theo ENG-27
        fileImportMap.set("*", {
          source_file: null,
          symbol_name: "*",
          import_source: targetPkg,
          is_namespace: true,
        });
      }
    } else if (importPath) {
      // import a.b.C;
      const fqcn = importPath;
      const targetFile = map.fqcnToFile.get(fqcn);
      const parts = fqcn.split(".");
      const simpleName = parts[parts.length - 1] ?? fqcn;

      if (targetFile) {
        fileImportMap.set(simpleName, {
          source_file: targetFile,
          symbol_name: simpleName,
          import_source: null,
          is_namespace: false,
        });
      } else {
        // Thư viện ngoài repo: bỏ qua không lỗi (ENG-27 ghi import_source)
        const topPkg = parts.slice(0, 2).join(".");
        fileImportMap.set(simpleName, {
          source_file: null,
          symbol_name: simpleName,
          import_source: topPkg || fqcn,
          is_namespace: false,
        });
      }
    }
  }
}
