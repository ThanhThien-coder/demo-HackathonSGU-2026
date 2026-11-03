// Resolver import cho Python — spec 11 Mục 2 (ENG-25, ENG-27).
import path from "node:path";
import type { Node } from "web-tree-sitter";
import type { ImportedSymbol, ParsedFile, SymbolIndex } from "../types";

function normalizePosix(p: string): string {
  return p.replace(/\\/g, "/");
}

function resolvePythonModulePath(
  modulePath: string,
  allFiles: Set<string>,
  rootDirOffset: string
): string | null {
  const norm = normalizePosix(modulePath);
  const prefixes = ["", "src/", rootDirOffset, rootDirOffset ? `${rootDirOffset}src/` : ""];

  for (const prefix of prefixes) {
    const candidateFile = normalizePosix(path.join(prefix, `${norm}.py`));
    if (allFiles.has(candidateFile)) return candidateFile;

    const candidateInit = normalizePosix(path.join(prefix, norm, "__init__.py"));
    if (allFiles.has(candidateInit)) return candidateInit;
  }

  return null;
}

export function resolvePythonImport(
  sourceFilePath: string,
  moduleName: string,
  allFiles: Set<string>,
  rootDirOffset: string,
  level = 0
): { filePath: string | null; importSource: string | null } {
  // Relative import (level > 0 hoặc bắt đầu bằng .)
  if (level > 0 || moduleName.startsWith(".")) {
    let currentDir = path.dirname(sourceFilePath);
    const dots = level > 0 ? level : moduleName.match(/^\.+/)?.[0].length ?? 0;
    const cleanMod = moduleName.replace(/^\.+/, "");

    for (let i = 1; i < dots; i++) {
      currentDir = path.dirname(currentDir);
    }

    const relPath = cleanMod ? path.join(currentDir, cleanMod.replace(/\./g, "/")) : currentDir;
    const candidateFile = normalizePosix(`${relPath}.py`);
    if (allFiles.has(candidateFile)) return { filePath: candidateFile, importSource: null };

    const candidateInit = normalizePosix(path.join(relPath, "__init__.py"));
    if (allFiles.has(candidateInit)) return { filePath: candidateInit, importSource: null };

    return { filePath: null, importSource: null };
  }

  // Absolute import: a.b.c
  const asPath = moduleName.replace(/\./g, "/");
  const resolved = resolvePythonModulePath(asPath, allFiles, rootDirOffset);
  if (resolved) return { filePath: resolved, importSource: null };

  // Có thể là a.b là file và c là symbol
  const lastDot = asPath.lastIndexOf("/");
  if (lastDot > 0) {
    const parentPath = asPath.slice(0, lastDot);
    const parentResolved = resolvePythonModulePath(parentPath, allFiles, rootDirOffset);
    if (parentResolved) return { filePath: parentResolved, importSource: null };
  }

  // Không tìm thấy file nội bộ ⇒ coi là gói ngoài (ENG-27)
  const topPackage = moduleName.split(".")[0] ?? moduleName;
  return { filePath: null, importSource: topPackage };
}

export function collectPythonImports(
  file: ParsedFile,
  allFiles: Set<string>,
  rootDirOffset: string,
  idx: SymbolIndex
): void {
  const fileImportMap = idx.imports.get(file.path) ?? new Map<string, ImportedSymbol>();
  idx.imports.set(file.path, fileImportMap);

  const root = file.tree.rootNode;

  function visit(node: Node): void {
    // 1. import a, b as c
    if (node.type === "import_statement") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;

        if (child.type === "dotted_name") {
          const modName = child.text;
          const res = resolvePythonImport(file.path, modName, allFiles, rootDirOffset);
          fileImportMap.set(modName, {
            source_file: res.filePath,
            symbol_name: "*",
            import_source: res.importSource,
            is_namespace: true,
          });
        } else if (child.type === "aliased_import") {
          const orig = child.childForFieldName("name");
          const alias = child.childForFieldName("alias");
          if (orig && alias) {
            const modName = orig.text;
            const res = resolvePythonImport(file.path, modName, allFiles, rootDirOffset);
            fileImportMap.set(alias.text, {
              source_file: res.filePath,
              symbol_name: "*",
              import_source: res.importSource,
              is_namespace: true,
            });
          }
        }
      }
    }

    // 2. from a.b import c as d, e
    if (node.type === "import_from_statement") {
      const moduleNameNode = node.childForFieldName("module_name");
      const modName = moduleNameNode ? moduleNameNode.text : "";

      // Đếm số dấu chấm ở đầu cho relative import
      let dotCount = 0;
      for (let i = 0; i < node.childCount; i++) {
        const c = node.child(i);
        if (c && c.type === "import") break;
        if (c && c.text === ".") dotCount++;
      }

      const res = resolvePythonImport(file.path, modName, allFiles, rootDirOffset, dotCount);

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;

        if (child.type === "dotted_name" && child !== moduleNameNode) {
          const symName = child.text;
          fileImportMap.set(symName, {
            source_file: res.filePath,
            symbol_name: symName,
            import_source: res.importSource,
          });
        } else if (child.type === "aliased_import") {
          const orig = child.childForFieldName("name");
          const alias = child.childForFieldName("alias");
          if (orig && alias) {
            fileImportMap.set(alias.text, {
              source_file: res.filePath,
              symbol_name: orig.text,
              import_source: res.importSource,
            });
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
