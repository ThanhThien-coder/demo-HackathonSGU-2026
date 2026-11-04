// Resolver import cho TypeScript / JavaScript — spec 11 Mục 2 (ENG-25, ENG-27).
import path from "node:path";
import type { Node } from "web-tree-sitter";
import { CONFIG } from "@/contracts";
import type { ImportedSymbol, ParsedFile, SymbolIndex } from "../types";

const TS_JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function normalizePosix(p: string): string {
  return p.replace(/\\/g, "/");
}

interface TsConfigPaths {
  baseUrl: string;
  paths: Record<string, string[]>;
}

// Trích xuất baseUrl và paths từ tsconfig/jsconfig gần nhất
function parseTsConfig(manifests: Map<string, string>): TsConfigPaths | null {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const raw = manifests.get(name);
    if (!raw) continue;
    try {
      // Bỏ comment dòng đơn và đa dòng đơn giản để parse JSON
      const cleanJson = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const parsed = JSON.parse(cleanJson) as {
        compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
      };
      if (parsed.compilerOptions) {
        return {
          baseUrl: parsed.compilerOptions.baseUrl ?? ".",
          paths: parsed.compilerOptions.paths ?? {},
        };
      }
    } catch {
      // bỏ qua nếu parse lỗi
    }
  }
  return null;
}

// Thử phân giải một đường dẫn tương đối hoặc alias thành file code có thật trong allFiles
function resolveFilePath(targetPath: string, allFiles: Set<string>): string | null {
  const norm = normalizePosix(path.normalize(targetPath));

  // 1. Thử nguyên văn
  if (allFiles.has(norm)) return norm;

  // 2. Thử các đuôi .ts, .tsx, .js, .jsx, .mjs
  for (const ext of TS_JS_EXTENSIONS) {
    const candidate = norm + ext;
    if (allFiles.has(candidate)) return candidate;
  }

  // 3. Thử /index.ts, /index.tsx, /index.js...
  for (const ext of TS_JS_EXTENSIONS) {
    const candidate = `${norm}/index${ext}`;
    if (allFiles.has(candidate)) return candidate;
  }

  // 4. Nếu ./x.js thiếu ⇒ thử ./x.ts | ./x.tsx
  if (norm.endsWith(".js") || norm.endsWith(".jsx")) {
    const stem = norm.replace(/\.jsx?$/, "");
    if (allFiles.has(stem + ".ts")) return stem + ".ts";
    if (allFiles.has(stem + ".tsx")) return stem + ".tsx";
  }

  return null;
}

// Phân giải specifier của import
export function resolveTsJsImport(
  sourceFilePath: string,
  specifier: string,
  allFiles: Set<string>,
  tsConfig: TsConfigPaths | null,
  rootDirOffset: string
): { filePath: string | null; importSource: string | null } {
  // 1. Tương đối: ./ hoặc ../
  if (specifier.startsWith(".")) {
    const dir = path.dirname(sourceFilePath);
    const resolved = resolveFilePath(path.join(dir, specifier), allFiles);
    if (resolved) return { filePath: resolved, importSource: null };
    return { filePath: null, importSource: null };
  }

  // 2. Alias mặc định: @/ hoặc ~/ ⇒ src/
  if (specifier.startsWith("@/") || specifier.startsWith("~/")) {
    const sub = specifier.slice(2);
    const prefix = rootDirOffset ? `${rootDirOffset}src/` : "src/";
    const resolved = resolveFilePath(prefix + sub, allFiles);
    if (resolved) return { filePath: resolved, importSource: null };
  }

  // 3. Alias từ tsconfig paths
  if (tsConfig && tsConfig.paths) {
    for (const [pattern, targetList] of Object.entries(tsConfig.paths)) {
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        if (specifier.startsWith(prefix)) {
          const suffix = specifier.slice(prefix.length);
          for (const target of targetList) {
            const cleanTarget = target.endsWith("/*") ? target.slice(0, -2) : target;
            const fullTarget = path.join(tsConfig.baseUrl, cleanTarget, suffix);
            const resolved = resolveFilePath(fullTarget, allFiles);
            if (resolved) return { filePath: resolved, importSource: null };
          }
        }
      } else if (specifier === pattern) {
        for (const target of targetList) {
          const fullTarget = path.join(tsConfig.baseUrl, target);
          const resolved = resolveFilePath(fullTarget, allFiles);
          if (resolved) return { filePath: resolved, importSource: null };
        }
      }
    }
  }

  // 4. Nếu không phân giải về file nội bộ nào ⇒ coi là gói ngoài (ENG-27)
  let packageName = specifier;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    packageName = parts.slice(0, 2).join("/");
  } else {
    packageName = specifier.split("/")[0] ?? specifier;
  }

  return { filePath: null, importSource: packageName };
}

// Lần theo barrel re-export tối đa CONFIG.BARREL_MAX_DEPTH bước
export function followBarrelReExport(
  filePath: string,
  symbolName: string,
  fileImports: Map<string, Map<string, ImportedSymbol>>,
  depth = 0,
  visited = new Set<string>()
): { source_file: string; symbol_name: string } | null {
  if (depth >= CONFIG.BARREL_MAX_DEPTH || visited.has(filePath)) return null;
  visited.add(filePath);

  const imports = fileImports.get(filePath);
  if (!imports) return null;

  const imported = imports.get(symbolName) ?? imports.get("*");
  if (imported && imported.source_file) {
    const next = followBarrelReExport(
      imported.source_file,
      imported.symbol_name,
      fileImports,
      depth + 1,
      visited
    );
    return next ?? { source_file: imported.source_file, symbol_name: imported.symbol_name };
  }

  return null;
}

function getFileReexports(idx: SymbolIndex, filePath: string): Map<string, ImportedSymbol> {
  if (!idx.reexports) {
    idx.reexports = new Map();
  }
  let m = idx.reexports.get(filePath);
  if (!m) {
    m = new Map();
    idx.reexports.set(filePath, m);
  }
  return m;
}

// Thu thập các import từ cây cú pháp TS/JS
export function collectTsJsImports(
  file: ParsedFile,
  allFiles: Set<string>,
  manifests: Map<string, string>,
  rootDirOffset: string,
  idx: SymbolIndex
): void {
  const tsConfig = parseTsConfig(manifests);
  const fileImportMap = idx.imports.get(file.path) ?? new Map<string, ImportedSymbol>();
  idx.imports.set(file.path, fileImportMap);

  const root = file.tree.rootNode;

  function visit(node: Node): void {
    // 1. import_statement
    if (node.type === "import_statement") {
      const sourceNode = node.childForFieldName("source");
      if (sourceNode) {
        const specifier = sourceNode.text.replace(/^['"]|['"]$/g, "");
        const res = resolveTsJsImport(file.path, specifier, allFiles, tsConfig, rootDirOffset);

        // Duyệt các clause trong import
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (!child) continue;

          // import defaultExport from '...'
          if (child.type === "import_clause") {
            for (let j = 0; j < child.childCount; j++) {
              const item = child.child(j);
              if (!item) continue;
              if (item.type === "identifier") {
                const localName = item.text;
                fileImportMap.set(localName, {
                  source_file: res.filePath,
                  symbol_name: "default",
                  import_source: res.importSource,
                });
              } else if (item.type === "named_imports") {
                for (let k = 0; k < item.childCount; k++) {
                  const spec = item.child(k);
                  if (spec && spec.type === "import_specifier") {
                    const nameNode = spec.childForFieldName("name");
                    const aliasNode = spec.childForFieldName("alias");
                    const origName = nameNode ? nameNode.text : spec.text;
                    const localName = aliasNode ? aliasNode.text : origName;
                    fileImportMap.set(localName, {
                      source_file: res.filePath,
                      symbol_name: origName,
                      import_source: res.importSource,
                    });
                  }
                }
              } else if (item.type === "namespace_import") {
                const idNode = item.children.find((c: Node) => c.type === "identifier");
                if (idNode) {
                  fileImportMap.set(idNode.text, {
                    source_file: res.filePath,
                    symbol_name: "*",
                    import_source: res.importSource,
                    is_namespace: true,
                  });
                }
              }
            }
          }
        }
      }
    }

    // 2. const x = require('...')
    if (node.type === "variable_declarator") {
      const init = node.childForFieldName("value");
      if (init && init.type === "call_expression") {
        const fn = init.childForFieldName("function");
        const args = init.childForFieldName("arguments");
        if (fn && fn.text === "require" && args && args.namedChildCount > 0) {
          const firstArg = args.namedChild(0);
          if (firstArg && (firstArg.type === "string" || firstArg.type === "string_fragment")) {
            const specifier = firstArg.text.replace(/^['"]|['"]$/g, "");
            const res = resolveTsJsImport(file.path, specifier, allFiles, tsConfig, rootDirOffset);

            const nameNode = node.childForFieldName("name");
            if (nameNode) {
              if (nameNode.type === "identifier") {
                fileImportMap.set(nameNode.text, {
                  source_file: res.filePath,
                  symbol_name: "default",
                  import_source: res.importSource,
                });
              } else if (nameNode.type === "object_pattern") {
                for (let k = 0; k < nameNode.childCount; k++) {
                  const prop = nameNode.child(k);
                  if (prop && prop.type === "shorthand_property_identifier_pattern") {
                    fileImportMap.set(prop.text, {
                      source_file: res.filePath,
                      symbol_name: prop.text,
                      import_source: res.importSource,
                    });
                  } else if (prop && prop.type === "pair_pattern") {
                    const keyNode = prop.childForFieldName("key");
                    const valNode = prop.childForFieldName("value");
                    if (keyNode && valNode) {
                      fileImportMap.set(valNode.text, {
                        source_file: res.filePath,
                        symbol_name: keyNode.text,
                        import_source: res.importSource,
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

    // 3. export { X as Y } from p, export { default as Y } from p, export * from p
    if (node.type === "export_statement") {
      const sourceNode = node.childForFieldName("source");
      if (sourceNode) {
        const specifier = sourceNode.text.replace(/^['"]|['"]$/g, "");
        const res = resolveTsJsImport(file.path, specifier, allFiles, tsConfig, rootDirOffset);
        const fileReexports = getFileReexports(idx, file.path);

        let hasExportClause = false;
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (!child) continue;
          if (child.type === "export_clause") {
            hasExportClause = true;
            for (let j = 0; j < child.childCount; j++) {
              const spec = child.child(j);
              if (spec && spec.type === "export_specifier") {
                const nameNode = spec.childForFieldName("name");
                const aliasNode = spec.childForFieldName("alias");
                const origName = nameNode ? nameNode.text : spec.text;
                const exportedName = aliasNode ? aliasNode.text : origName;
                fileReexports.set(exportedName, {
                  source_file: res.filePath,
                  symbol_name: origName,
                  import_source: res.importSource,
                });
              }
            }
          }
        }

        if (!hasExportClause) {
          const isWildcard = node.children.some((c: Node) => c.text === "*");
          if (isWildcard) {
            fileReexports.set("*", {
              source_file: res.filePath,
              symbol_name: "*",
              import_source: res.importSource,
              is_namespace: true,
            });
          }
        }
      }
    }

    // 4. CommonJS: module.exports.X = require(p), exports.X = require(p), module.exports = { X: require(p) }
    if (node.type === "expression_statement") {
      const expr = node.namedChild(0);
      if (expr && expr.type === "assignment_expression") {
        const left = expr.childForFieldName("left");
        const right = expr.childForFieldName("right");
        if (left && right) {
          const leftText = left.text;
          const fileReexports = getFileReexports(idx, file.path);

          let exportedName: string | null = null;
          if (leftText.startsWith("module.exports.")) {
            exportedName = leftText.slice("module.exports.".length);
          } else if (leftText.startsWith("exports.")) {
            exportedName = leftText.slice("exports.".length);
          }

          if (exportedName && right.type === "call_expression") {
            const fn = right.childForFieldName("function");
            const args = right.childForFieldName("arguments");
            if (fn && fn.text === "require" && args && args.namedChildCount > 0) {
              const firstArg = args.namedChild(0);
              if (firstArg && (firstArg.type === "string" || firstArg.type === "string_fragment")) {
                const specifier = firstArg.text.replace(/^['"]|['"]$/g, "");
                const res = resolveTsJsImport(file.path, specifier, allFiles, tsConfig, rootDirOffset);
                fileReexports.set(exportedName, {
                  source_file: res.filePath,
                  symbol_name: "default",
                  import_source: res.importSource,
                });
              }
            }
          }

          if ((leftText === "module.exports" || leftText === "exports") && right.type === "object") {
            for (let i = 0; i < right.namedChildCount; i++) {
              const prop = right.namedChild(i);
              if (prop && prop.type === "pair") {
                const keyNode = prop.childForFieldName("key");
                const valNode = prop.childForFieldName("value");
                if (keyNode && valNode && valNode.type === "call_expression") {
                  const fn = valNode.childForFieldName("function");
                  const args = valNode.childForFieldName("arguments");
                  if (fn && fn.text === "require" && args && args.namedChildCount > 0) {
                    const firstArg = args.namedChild(0);
                    if (firstArg && (firstArg.type === "string" || firstArg.type === "string_fragment")) {
                      const specifier = firstArg.text.replace(/^['"]|['"]$/g, "");
                      const res = resolveTsJsImport(file.path, specifier, allFiles, tsConfig, rootDirOffset);
                      const propKey = keyNode.text.replace(/^['"]|['"]$/g, "");
                      fileReexports.set(propKey, {
                        source_file: res.filePath,
                        symbol_name: "default",
                        import_source: res.importSource,
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

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  }

  visit(root);
}

// Lượt 2: Phân giải lại các import trỏ tới re-export
export function resolveReExports(idx: SymbolIndex): void {
  if (!idx.reexports || idx.reexports.size === 0) return;

  for (const [, fileImportMap] of idx.imports) {
    for (const [, imported] of fileImportMap) {
      if (!imported.source_file) continue;

      let currentFile: string | null = imported.source_file;
      let currentSymbol: string = imported.symbol_name;
      let currentImportSource: string | null = imported.import_source;
      let currentIsNamespace: boolean = imported.is_namespace ?? false;

      const visited = new Set<string>();
      let steps = 0;

      while (currentFile && steps < 5) {
        const visitKey = `${currentFile}::${currentSymbol}`;
        if (visited.has(visitKey)) {
          break;
        }
        visited.add(visitKey);

        const fileReexports = idx.reexports.get(currentFile);
        if (!fileReexports) {
          break;
        }

        // 1. Khớp trực tiếp theo tên symbol
        const exact = fileReexports.get(currentSymbol);
        if (exact) {
          steps++;
          currentFile = exact.source_file;
          currentSymbol = exact.symbol_name;
          currentImportSource = exact.import_source;
          currentIsNamespace = exact.is_namespace ?? false;
          continue;
        }

        // 2. Wildcard re-export: export * from p
        const wildcard = fileReexports.get("*");
        if (wildcard && wildcard.source_file) {
          const targetFile = wildcard.source_file;
          const targetKey = `${targetFile}#${currentSymbol}`;
          const targetHasSymbol = idx.symbols.has(targetKey) || idx.functions.has(targetKey);
          const targetHasReexport =
            idx.reexports.get(targetFile)?.has(currentSymbol) ||
            idx.reexports.get(targetFile)?.has("*");

          if (targetHasSymbol || targetHasReexport) {
            steps++;
            currentFile = targetFile;
            currentImportSource = wildcard.import_source;
            continue;
          }
        }

        break;
      }

      if (currentFile !== imported.source_file || currentSymbol !== imported.symbol_name) {
        imported.source_file = currentFile;
        imported.symbol_name = currentSymbol;
        imported.import_source = currentImportSource;
        if (currentIsNamespace) {
          imported.is_namespace = true;
        }
      }
    }
  }
}
