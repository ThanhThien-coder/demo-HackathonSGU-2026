// Bảng symbol — spec 11 Mục 2 (ENG-20, ENG-21, ENG-21b, ENG-22, ENG-23, ENG-24, ENG-25, ENG-27).
import type { Node } from "web-tree-sitter";
import {
  buildJavaPackageMap,
  collectJavaImports,
  collectJavaSymbols,
} from "./resolvers/java";
import { collectPythonImports } from "./resolvers/python";
import { collectTsJsImports, resolveReExports } from "./resolvers/ts_js";
import type {
  FieldTypeMap,
  FunctionInfo,
  ImportedSymbol,
  ImportMap,
  InterfaceImplMap,
  LocalSymbolIndex,
  ParsedFile,
  SymbolIndex,
  SymbolTable,
} from "./types";

export function uniqueKey(baseKey: string, keyCounts: Map<string, number>): string {
  const count = keyCounts.get(baseKey) ?? 0;
  keyCounts.set(baseKey, count + 1);
  if (count === 0) return baseKey;
  return `${baseKey}~${count + 1}`;
}

// Tìm decorator đầu tiên liên kết với node để xác định line_start (ENG-20)
function getStartLineWithDecorators(node: Node): number {
  let minRow = node.startPosition.row;

  // Kiểm tra các node decorator ngay trước node hoặc là con của parent
  const parent = node.parent;
  if (parent) {
    if (parent.type === "export_statement") {
      minRow = Math.min(minRow, parent.startPosition.row);
      let prev = parent.previousNamedSibling;
      while (prev && prev.type === "decorator") {
        minRow = Math.min(minRow, prev.startPosition.row);
        prev = prev.previousNamedSibling;
      }
      for (let i = 0; i < parent.childCount; i++) {
        const sibling = parent.child(i);
        if (!sibling) continue;
        if (sibling.type === "decorator") {
          if (sibling.endPosition.row <= node.startPosition.row) {
            minRow = Math.min(minRow, sibling.startPosition.row);
          }
        }
      }
    }
  }

  // Sibling đứng trước node (nếu decorator không nằm trong parent); comment xen giữa không cắt chuỗi decorator
  let prev = node.previousNamedSibling;
  while (prev && (prev.type === "decorator" || prev.type === "comment")) {
    if (prev.type === "decorator") minRow = Math.min(minRow, prev.startPosition.row);
    prev = prev.previousNamedSibling;
  }

  // Trong Python: decorated_definition chứa decorator và definition
  if (parent && parent.type === "decorated_definition") {
    minRow = Math.min(minRow, parent.startPosition.row);
  }

  // Trong class method: method_definition có thể có decorator con
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === "decorator") {
      minRow = Math.min(minRow, child.startPosition.row);
    }
  }

  return minRow + 1; // 1-based line number
}

// Kiểm tra is_exported theo ENG-21b & spec 12 Mục 3
function isNodeExported(node: Node, lang: string, name: string): boolean {
  if (lang === "PYTHON") {
    return !name.startsWith("_");
  }
  // TS/JS
  let cur: Node | null = node;
  while (cur) {
    if (cur.type === "export_statement") return true;
    cur = cur.parent;
  }
  return false;
}

// Trích xuất tên tham số từ node parameters
function extractParameters(paramNode: Node | null): string[] {
  if (!paramNode) return [];
  const params: string[] = [];

  function walkParam(n: Node): void {
    if (n.type === "identifier") {
      params.push(n.text);
    } else if (n.type === "required_parameter" || n.type === "optional_parameter") {
      const id = n.childForFieldName("pattern") ?? n.childForFieldName("name") ?? n.namedChild(0);
      if (id) walkParam(id);
    } else if (n.type === "typed_parameter" || n.type === "default_parameter") {
      const id = n.childForFieldName("name") ?? n.namedChild(0);
      if (id) walkParam(id);
    } else if (n.type === "rest_pattern" || n.type === "list_splat_pattern" || n.type === "dictionary_splat_pattern") {
      const id = n.namedChild(0);
      if (id) walkParam(id);
    }
  }

  for (let i = 0; i < paramNode.namedChildCount; i++) {
    const child = paramNode.namedChild(i);
    if (child) walkParam(child);
  }

  return params;
}

// Trích xuất biến cục bộ trong thân hàm (ENG-24)
function extractLocals(
  bodyNode: Node | null,
  filePath?: string,
  field_types?: FieldTypeMap
): Set<string> {
  const locals = new Set<string>();
  if (!bodyNode) return locals;

  function walk(n: Node): void {
    // Không đi sâu vào hàm lồng
    if (
      n !== bodyNode &&
      (n.type === "function_declaration" ||
        n.type === "function_expression" ||
        n.type === "arrow_function" ||
        n.type === "function_definition")
    ) {
      return;
    }

    if (n.type === "variable_declarator") {
      const nameNode = n.childForFieldName("name");
      const valNode = n.childForFieldName("value");
      if (nameNode && nameNode.type === "identifier") {
        locals.add(nameNode.text);
        if (filePath && field_types && valNode && valNode.type === "new_expression") {
          const ctor = valNode.childForFieldName("constructor");
          if (ctor) {
            field_types.set(`${filePath}#${nameNode.text}`, ctor.text);
          }
        }
      } else if (nameNode && (nameNode.type === "object_pattern" || nameNode.type === "array_pattern")) {
        extractPatternIdentifiers(nameNode, locals);
      }
    } else if (n.type === "catch_clause") {
      const param = n.childForFieldName("parameter");
      if (param && param.type === "identifier") {
        locals.add(param.text);
      }
    } else if (n.type === "for_in_statement" || n.type === "for_of_statement") {
      const left = n.childForFieldName("left");
      if (left) {
        if (left.type === "identifier") locals.add(left.text);
        else extractPatternIdentifiers(left, locals);
      }
    } else if (n.type === "assignment") {
      // Python assignment
      const left = n.childForFieldName("left");
      const right = n.childForFieldName("right");
      if (left && left.type === "identifier") {
        locals.add(left.text);
        if (filePath && field_types && right && right.type === "call") {
          const fn = right.childForFieldName("function");
          if (fn) {
            field_types.set(`${filePath}#${left.text}`, fn.text);
          }
        }
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

function extractPatternIdentifiers(n: Node, out: Set<string>): void {
  if (n.type === "identifier" || n.type === "shorthand_property_identifier_pattern") {
    out.add(n.text);
    return;
  }
  for (let i = 0; i < n.childCount; i++) {
    const child = n.child(i);
    if (child) extractPatternIdentifiers(child, out);
  }
}

// Tính Cognitive Complexity sơ bộ (ENG-71)
function computeComplexity(node: Node): number {
  let score = 0;

  function walk(n: Node, nesting: number): void {
    const type = n.type;
    let nextNesting = nesting;

    if (
      type === "if_statement" ||
      type === "conditional_expression" ||
      type === "switch_statement" ||
      type === "match_statement" ||
      type === "for_statement" ||
      type === "for_in_statement" ||
      type === "for_of_statement" ||
      type === "while_statement" ||
      type === "do_statement" ||
      type === "catch_clause" ||
      type === "except_clause"
    ) {
      score += 1 + nesting;
      nextNesting = nesting + 1;
    } else if (type === "else_clause") {
      score += 1;
      nextNesting = nesting + 1;
    } else if (type === "binary_expression" || type === "boolean_operator") {
      const op = n.children.find((c: Node) => ["&&", "||", "and", "or"].includes(c.text));
      if (op) score += 1;
    }

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) walk(child, nextNesting);
    }
  }

  walk(node, 0);
  return score;
}

// Tìm hàm đầu tiên trong đối số của call expression (hàm bọc catchAsync, etc.)
function findFirstFunctionArg(callNode: Node): Node | null {
  const argsNode = callNode.childForFieldName("arguments");
  if (!argsNode) return null;
  for (let i = 0; i < argsNode.namedChildCount; i++) {
    const arg = argsNode.namedChild(i);
    if (!arg) continue;
    if (arg.type === "arrow_function" || arg.type === "function_expression") {
      return arg;
    }
    if (arg.type === "call_expression") {
      const nested = findFirstFunctionArg(arg);
      if (nested) return nested;
    }
  }
  return null;
}

// Thu thập symbol cho toàn bộ file
export function collectSymbols(files: ParsedFile[]): SymbolIndex {
  const symbols: SymbolTable = new Map();
  const functions: Map<string, FunctionInfo> = new Map();
  const imports: ImportMap = new Map();
  const field_types: FieldTypeMap = new Map();
  const interface_impls: InterfaceImplMap = new Map();
  const locals: LocalSymbolIndex = new Map();
  const reexports = new Map<string, Map<string, ImportedSymbol>>();

  const keyCounts = new Map<string, number>();

  for (const file of files) {
    const filePath = file.path;
    const lang = file.language;
    if (lang === "JAVA") {
      collectJavaSymbols(
        file,
        {
          symbols,
          functions,
          field_types,
          interface_impls,
          locals,
        },
        keyCounts
      );
      continue;
    }
    let hasTopLevelCode = false;

    function processClass(classNode: Node, className: string, isExported: boolean): void {
      const classBaseKey = `${filePath}#${className}`;
      const classKey = uniqueKey(classBaseKey, keyCounts);

      symbols.set(classKey, {
        key: classKey,
        kind: "CLASS",
        name: className,
        file_path: filePath,
        line_start: getStartLineWithDecorators(classNode),
        line_end: classNode.endPosition.row + 1,
        is_exported: isExported,
      });

      // Kiểm tra implements / extends
      for (let i = 0; i < classNode.childCount; i++) {
        const child = classNode.child(i);
        if (!child) continue;

        // TS implements_clause
        if (child.type === "class_heritage") {
          for (let j = 0; j < child.childCount; j++) {
            const h = child.child(j);
            if (!h) continue;
            if (h.type === "implements_clause" || h.type === "extends_clause") {
              for (let k = 0; k < h.childCount; k++) {
                const iface = h.child(k);
                if (iface && (iface.type === "type_identifier" || iface.type === "identifier")) {
                  const ifaceName = iface.text;
                  let arr = interface_impls.get(ifaceName);
                  if (!arr) {
                    arr = [];
                    interface_impls.set(ifaceName, arr);
                  }
                  arr.push(classKey);
                }
              }
            }
          }
        }

        // Python argument_list (kế thừa)
        if (child.type === "argument_list") {
          for (let j = 0; j < child.namedChildCount; j++) {
            const base = child.namedChild(j);
            if (base && base.type === "identifier") {
              const baseName = base.text;
              let arr = interface_impls.get(baseName);
              if (!arr) {
                arr = [];
                interface_impls.set(baseName, arr);
              }
              arr.push(classKey);
            }
          }
        }

        // Class body: methods và fields
        if (child.type === "class_body" || child.type === "block") {
          for (let j = 0; j < child.childCount; j++) {
            const member = child.child(j);
            if (!member) continue;

            // TS Property definition có kiểu
            if (member.type === "property_definition" || member.type === "public_field_definition") {
              const pName = member.childForFieldName("name")?.text;
              const pType = member.childForFieldName("type")?.text?.replace(/^:\s*/, "");
              if (pName && pType) {
                field_types.set(`${classKey}.${pName}`, pType);
              }
            }

            // Methods
            if (
              member.type === "method_definition" ||
              member.type === "function_definition"
            ) {
              const nameNode = member.childForFieldName("name");
              const methodName = nameNode ? nameNode.text : "";
              if (!methodName) continue;

              const methodBaseKey = `${filePath}#${className}.${methodName}`;
              const methodKey = uniqueKey(methodBaseKey, keyCounts);
              const mExported = isNodeExported(member, lang, methodName);

              const params = extractParameters(member.childForFieldName("parameters"));
              const body = member.childForFieldName("body");
              const locs = extractLocals(body, filePath, field_types);
              const complexity = computeComplexity(member);

              locals.set(methodKey, locs);

              const funcInfo: FunctionInfo = {
                key: methodKey,
                kind: "METHOD",
                name: methodName,
                file_path: filePath,
                line_start: getStartLineWithDecorators(member),
                line_end: member.endPosition.row + 1,
                is_exported: mExported,
                params,
                locals: Array.from(locs).sort(),
                complexity,
              };

              symbols.set(methodKey, funcInfo);
              functions.set(methodKey, funcInfo);

              // ENG-22: Constructor params có modifier
              if (methodName === "constructor" && lang !== "PYTHON") {
                const paramNode = member.childForFieldName("parameters");
                if (paramNode) {
                  for (let p = 0; p < paramNode.namedChildCount; p++) {
                    const paramChild = paramNode.namedChild(p);
                    if (!paramChild) continue;
                    const mod = paramChild.children.find((c: Node) =>
                      ["public", "private", "protected", "readonly"].includes(c.text)
                    );
                    if (mod) {
                      const pName = paramChild.childForFieldName("pattern")?.text ??
                        paramChild.childForFieldName("name")?.text;
                      const pType = paramChild.childForFieldName("type")?.text?.replace(/^:\s*/, "");
                      if (pName && pType) {
                        field_types.set(`${classKey}.${pName}`, pType);
                      }
                    }
                  }
                }
              }

              // Python __init__: self.x = T(...)
              if (methodName === "__init__" && lang === "PYTHON" && body) {
                for (let b = 0; b < body.childCount; b++) {
                  const stmt = body.child(b);
                  if (stmt && stmt.type === "expression_statement") {
                    const assign = stmt.namedChild(0);
                    if (assign && assign.type === "assignment") {
                      const left = assign.childForFieldName("left");
                      const right = assign.childForFieldName("right");
                      if (left && left.text.startsWith("self.") && right) {
                        const fieldName = left.text.slice(5);
                        if (right.type === "call") {
                          const fn = right.childForFieldName("function");
                          if (fn) field_types.set(`${classKey}.${fieldName}`, fn.text);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    function processInterface(ifaceNode: Node, ifaceName: string, isExported: boolean): void {
      const ifaceBaseKey = `${filePath}#${ifaceName}`;
      const ifaceKey = uniqueKey(ifaceBaseKey, keyCounts);

      symbols.set(ifaceKey, {
        key: ifaceKey,
        kind: "INTERFACE",
        name: ifaceName,
        file_path: filePath,
        line_start: getStartLineWithDecorators(ifaceNode),
        line_end: ifaceNode.endPosition.row + 1,
        is_exported: isExported,
      });

      const body = ifaceNode.childForFieldName("body");
      if (body) {
        for (let i = 0; i < body.childCount; i++) {
          const m = body.child(i);
          if (m && (m.type === "method_signature" || m.type === "property_signature")) {
            const mName = m.childForFieldName("name")?.text;
            if (mName && m.type === "method_signature") {
              const mKey = uniqueKey(`${filePath}#${ifaceName}.${mName}`, keyCounts);
              symbols.set(mKey, {
                key: mKey,
                kind: "METHOD",
                name: mName,
                file_path: filePath,
                line_start: m.startPosition.row + 1,
                line_end: m.endPosition.row + 1,
                is_exported: true,
              });
            }
          }
        }
      }
    }

    function walkTopLevel(node: Node): void {
      const type = node.type;

      // 1. Function declaration
      if (type === "function_declaration" || (lang === "PYTHON" && type === "function_definition")) {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const fnName = nameNode.text;
          const isExported = isNodeExported(node, lang, fnName);
          const baseKey = `${filePath}#${fnName}`;
          const key = uniqueKey(baseKey, keyCounts);

          const params = extractParameters(node.childForFieldName("parameters"));
          const body = node.childForFieldName("body");
          const locs = extractLocals(body, filePath, field_types);
          const complexity = computeComplexity(node);

          locals.set(key, locs);

          const info: FunctionInfo = {
            key,
            kind: "FUNCTION",
            name: fnName,
            file_path: filePath,
            line_start: getStartLineWithDecorators(node),
            line_end: node.endPosition.row + 1,
            is_exported: isExported,
            params,
            locals: Array.from(locs).sort(),
            complexity,
          };
          symbols.set(key, info);
          functions.set(key, info);
        }
        return;
      }

      // 2. Class declaration
      if (type === "class_declaration" || type === "class_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const clsName = nameNode.text;
          const isExported = isNodeExported(node, lang, clsName);
          processClass(node, clsName, isExported);
        }
        return;
      }

      // 3. Interface declaration
      if (type === "interface_declaration") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const ifaceName = nameNode.text;
          const isExported = isNodeExported(node, lang, ifaceName);
          processInterface(node, ifaceName, isExported);
        }
        return;
      }

      // 4. Type alias declaration
      if (type === "type_alias_declaration") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          const typeName = nameNode.text;
          const isExported = isNodeExported(node, lang, typeName);
          const baseKey = `${filePath}#${typeName}`;
          const key = uniqueKey(baseKey, keyCounts);

          symbols.set(key, {
            key,
            kind: "TYPE",
            name: typeName,
            file_path: filePath,
            line_start: node.startPosition.row + 1,
            line_end: node.endPosition.row + 1,
            is_exported: isExported,
          });
        }
        return;
      }

      // 5. Variable declaration
      if (type === "variable_declaration" || type === "lexical_declaration") {
        const isExported = isNodeExported(node, lang, "");
        for (let i = 0; i < node.namedChildCount; i++) {
          const decl = node.namedChild(i);
          if (decl && decl.type === "variable_declarator") {
            const nameNode = decl.childForFieldName("name");
            const valNode = decl.childForFieldName("value");
            if (nameNode && nameNode.type === "identifier") {
              const varName = nameNode.text;
              const isFn =
                valNode &&
                (valNode.type === "arrow_function" || valNode.type === "function_expression");

              if (isFn) {
                const baseKey = `${filePath}#${varName}`;
                const key = uniqueKey(baseKey, keyCounts);
                const params = extractParameters(valNode.childForFieldName("parameters"));
                const body = valNode.childForFieldName("body");
                const locs = extractLocals(body, filePath, field_types);
                const complexity = computeComplexity(valNode);

                locals.set(key, locs);

                const info: FunctionInfo = {
                  key,
                  kind: "FUNCTION",
                  name: varName,
                  file_path: filePath,
                  line_start: getStartLineWithDecorators(node),
                  line_end: node.endPosition.row + 1,
                  is_exported: isExported,
                  params,
                  locals: Array.from(locs).sort(),
                  complexity,
                };
                symbols.set(key, info);
                functions.set(key, info);
              } else {
                // Kiểm tra hàm bọc (catchAsync, wrapper...) trong JS/TS cấp cao nhất
                const fnArg =
                  lang !== "PYTHON" &&
                  valNode &&
                  valNode.type === "call_expression" &&
                  valNode.childForFieldName("function")?.text !== "require"
                    ? findFirstFunctionArg(valNode)
                    : null;

                if (fnArg) {
                  const baseKey = `${filePath}#${varName}`;
                  const key = uniqueKey(baseKey, keyCounts);
                  const params = extractParameters(fnArg.childForFieldName("parameters"));
                  const body = fnArg.childForFieldName("body");
                  const locs = extractLocals(body, filePath, field_types);
                  const complexity = computeComplexity(fnArg);

                  locals.set(key, locs);

                  const info: FunctionInfo = {
                    key,
                    kind: "FUNCTION",
                    name: varName,
                    file_path: filePath,
                    line_start: getStartLineWithDecorators(node),
                    line_end: node.endPosition.row + 1,
                    is_exported: isExported,
                    params,
                    locals: Array.from(locs).sort(),
                    complexity,
                  };
                  symbols.set(key, info);
                  functions.set(key, info);
                } else {
                  // Biến thường
                  const baseKey = `${filePath}#${varName}`;
                  const key = uniqueKey(baseKey, keyCounts);
                  symbols.set(key, {
                    key,
                    kind: "VARIABLE",
                    name: varName,
                    file_path: filePath,
                    line_start: node.startPosition.row + 1,
                    line_end: node.endPosition.row + 1,
                    is_exported: isExported,
                  });

                  // ENG-22: x = new T()
                  if (valNode && valNode.type === "new_expression") {
                    const ctor = valNode.childForFieldName("constructor");
                    if (ctor) {
                      field_types.set(`${filePath}#${varName}`, ctor.text);
                      field_types.set(varName, ctor.text);
                    }
                  }
                }
              }
            }
          }
        }
        return;
      }

      // 6. Python assignment top-level
      if (lang === "PYTHON" && type === "expression_statement") {
        const assign = node.namedChild(0);
        if (assign && assign.type === "assignment") {
          const left = assign.childForFieldName("left");
          const right = assign.childForFieldName("right");
          if (left && left.type === "identifier") {
            const varName = left.text;
            const isExported = !varName.startsWith("_");
            const key = uniqueKey(`${filePath}#${varName}`, keyCounts);
            symbols.set(key, {
              key,
              kind: "VARIABLE",
              name: varName,
              file_path: filePath,
              line_start: node.startPosition.row + 1,
              line_end: node.endPosition.row + 1,
              is_exported: isExported,
            });
            if (right && right.type === "call") {
              const fn = right.childForFieldName("function");
              if (fn) {
                field_types.set(`${filePath}#${varName}`, fn.text);
                field_types.set(varName, fn.text);
              }
            }
          }
        }
        return;
      }

      // ENG-22 "biến export có new T()" cho export mặc định: `export default new T()` và CommonJS
      // `module.exports = new T()` ⇒ field_types[`${file}#default`] = T, để `import x from` / `require()`
      // rồi `x.m()` ở file khác phân giải được tới `T.m` (cùng khóa "default" mà ImportMap ghi).
      const recordDefaultInstance = (valueNode: Node | null) => {
        if (!valueNode) return;
        if (valueNode.type === "identifier") {
          const known =
            field_types.get(`${filePath}#${valueNode.text}`) ??
            field_types.get(valueNode.text);
          if (known) field_types.set(`${filePath}#default`, known);
          return;
        }
        if (valueNode.type !== "new_expression") return;
        const ctor = valueNode.childForFieldName("constructor");
        if (ctor) field_types.set(`${filePath}#default`, ctor.text);
      };
      if (type === "export_statement" && node.children.some((ch) => ch?.type === "default")) {
        recordDefaultInstance(node.childForFieldName("value"));
      }
      if (type === "expression_statement") {
        const asg = node.namedChild(0);
        if (asg?.type === "assignment_expression") {
          const left = asg.childForFieldName("left")?.text;
          if (left === "module.exports" || left === "exports.default") {
            recordDefaultInstance(asg.childForFieldName("right"));
          }
        }
      }

      // Export statement bao ngoài
      if (type === "export_statement") {
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (c && c.type !== "export" && c.type !== "default") {
            walkTopLevel(c);
          }
        }
        return;
      }

      // Decorator definition bao ngoài
      if (type === "decorated_definition") {
        const def = node.childForFieldName("definition");
        if (def) walkTopLevel(def);
        return;
      }

      // Bỏ qua import
      if (type === "import_statement" || type === "import_from_statement") {
        return;
      }

      // Nếu là câu lệnh thực thi khác (call, if, expression statement...)
      if (
        type.endsWith("_statement") ||
        type.endsWith("_expression") ||
        type === "call"
      ) {
        hasTopLevelCode = true;
      }
    }

    const root = file.tree.rootNode;
    for (let i = 0; i < root.childCount; i++) {
      const child = root.child(i);
      if (child) walkTopLevel(child);
    }

    // ENG-20: file#<module> nếu có câu lệnh cấp cao ngoài định nghĩa/import
    if (hasTopLevelCode) {
      const moduleKey = `${filePath}#<module>`;
      const modInfo: FunctionInfo = {
        key: moduleKey,
        kind: "FUNCTION",
        name: "<module>",
        file_path: filePath,
        line_start: 1,
        line_end: root.endPosition.row + 1,
        is_exported: false,
        params: [],
        locals: [],
        complexity: 0,
      };
      symbols.set(moduleKey, modInfo);
      functions.set(moduleKey, modInfo);
    }
  }

  return {
    symbols,
    functions,
    imports,
    field_types,
    interface_impls,
    locals,
    reexports,
  };
}

// Giải quyết import (ENG-25)
export function resolveImports(
  files: ParsedFile[],
  idx: SymbolIndex,
  manifests: Map<string, string>,
  module_info: {
    go_module_path: string | null;
    dart_package_name: string | null;
    package_entry_files: string[];
    root_dir_offset?: string;
  },
  rootDirOffset: string = ""
): void {
  void module_info;
  const allFiles = new Set<string>(files.map((f) => f.path));

  // Xác định root_dir_offset nếu có (TASK_14: nếu đang rỗng thì truyền đúng fingerprint.root_dir_offset)
  let effectiveRootDirOffset =
    rootDirOffset ||
    (module_info as { root_dir_offset?: string })?.root_dir_offset ||
    "";

  if (!effectiveRootDirOffset) {
    for (const seg of ["backend/", "server/", "api/"]) {
      if (files.some((f) => f.path.startsWith(seg))) {
        effectiveRootDirOffset = seg;
        break;
      }
    }
  }

  let javaPackageMap: ReturnType<typeof buildJavaPackageMap> | undefined;
  if (files.some((f) => f.language === "JAVA")) {
    javaPackageMap = buildJavaPackageMap(files);
  }

  for (const file of files) {
    if (file.language === "PYTHON") {
      collectPythonImports(file, allFiles, effectiveRootDirOffset, idx);
    } else if (file.language === "JAVA") {
      collectJavaImports(file, files, idx, javaPackageMap);
    } else {
      collectTsJsImports(file, allFiles, manifests, effectiveRootDirOffset, idx);
    }
  }

  // Lượt 2: Phân giải lại các import trỏ tới re-export
  resolveReExports(idx);
}
