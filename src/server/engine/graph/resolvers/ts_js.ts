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
  // Lấy tên gói (ví dụ "express", "@types/node", "lodash/fp")
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

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  }

  visit(root);
}
