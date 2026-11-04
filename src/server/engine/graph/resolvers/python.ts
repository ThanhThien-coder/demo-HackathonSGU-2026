// Resolver import cho Python — spec 11 Mục 2 (ENG-25, ENG-27).
import path from "node:path";
import type { Node } from "web-tree-sitter";
import type { ImportedSymbol, ParsedFile, SymbolIndex } from "../types";

function normalizePosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export function resolvePythonModulePath(
  modulePath: string,
  allFiles: Set<string>,
  rootDirOffset: string
): string | null {
  const norm = normalizePosix(modulePath);
  const prefixes = [
    "",
    "src/",
    rootDirOffset,
    rootDirOffset ? `${rootDirOffset}src/` : "",
  ];

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

    if (cleanMod) {
      const relPath = path.join(currentDir, cleanMod.replace(/\./g, "/"));
      const candidateFile = normalizePosix(`${relPath}.py`);
      if (allFiles.has(candidateFile)) return { filePath: candidateFile, importSource: null };

      const candidateInit = normalizePosix(path.join(relPath, "__init__.py"));
      if (allFiles.has(candidateInit)) return { filePath: candidateInit, importSource: null };
    } else {
      const candidateInit = normalizePosix(path.join(currentDir, "__init__.py"));
      if (allFiles.has(candidateInit)) return { filePath: candidateInit, importSource: null };
    }

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

interface ImportTarget {
  name: string;
  alias: string;
  isWildcard: boolean;
}

function extractImportTargets(fromNode: Node): ImportTarget[] {
  const targets: ImportTarget[] = [];
  const moduleNameNode = fromNode.childForFieldName("module_name");

  function scan(n: Node): void {
    if (n === moduleNameNode) return;
    if (n.type === "wildcard_import" || n.text === "*") {
      targets.push({ name: "*", alias: "*", isWildcard: true });
      return;
    }
    if (n.type === "dotted_name" && n.parent?.type !== "aliased_import") {
      targets.push({ name: n.text, alias: n.text, isWildcard: false });
      return;
    }
    if (n.type === "aliased_import") {
      const orig = n.childForFieldName("name")?.text ?? "";
      const alias = n.childForFieldName("alias")?.text ?? orig;
      if (orig) {
        targets.push({ name: orig, alias, isWildcard: false });
      }
      return;
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c && c.type !== "from" && c.type !== "import") {
        scan(c);
      }
    }
  }

  let foundImport = false;
  for (let i = 0; i < fromNode.childCount; i++) {
    const c = fromNode.child(i);
    if (!c) continue;
    if (c.type === "import") {
      foundImport = true;
      continue;
    }
    if (foundImport) {
      scan(c);
    }
  }

  return targets;
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
    // 1. import a, b as c, a.b.c
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

          // Nếu modName là a.b.c, đăng ký tiền tố top identifier nếu chưa có
          const topIdent = modName.split(".")[0];
          if (topIdent && !fileImportMap.has(topIdent)) {
            const topRes = resolvePythonImport(file.path, topIdent, allFiles, rootDirOffset);
            fileImportMap.set(topIdent, {
              source_file: topRes.filePath ?? res.filePath,
              symbol_name: "*",
              import_source: topRes.importSource ?? res.importSource,
              is_namespace: true,
            });
          }
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

    // 2. from a.b import c as d, e, (x, y)
    if (node.type === "import_from_statement") {
      const moduleNameNode = node.childForFieldName("module_name");
      const modName = moduleNameNode ? moduleNameNode.text : "";

      // Đếm số dấu chấm ở đầu cho relative import
      let dotCount = 0;
      if (moduleNameNode) {
        const match = moduleNameNode.text.match(/^\.+/);
        if (match) {
          dotCount = match[0].length;
        }
      }
      if (dotCount === 0) {
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (c && c.type === "import") break;
          if (c && c.text === ".") dotCount++;
        }
      }

      const targets = extractImportTargets(node);

      for (const target of targets) {
        if (target.isWildcard) {
          const res = resolvePythonImport(file.path, modName, allFiles, rootDirOffset, dotCount);
          fileImportMap.set("*", {
            source_file: res.filePath,
            symbol_name: "*",
            import_source: res.importSource,
            is_namespace: true,
          });
          continue;
        }

        // Kiểm tra xem target có phải là một file module con trong package modName không
        let subModuleFile: string | null = null;
        if (dotCount > 0 || modName.startsWith(".")) {
          let currentDir = path.dirname(file.path);
          const dots = dotCount > 0 ? dotCount : modName.match(/^\.+/)?.[0].length ?? 0;
          const cleanMod = modName.replace(/^\.+/, "");
          for (let i = 1; i < dots; i++) {
            currentDir = path.dirname(currentDir);
          }
          const subRel = cleanMod
            ? path.join(currentDir, cleanMod.replace(/\./g, "/"), target.name)
            : path.join(currentDir, target.name);

          const candidateFile = normalizePosix(`${subRel}.py`);
          const candidateInit = normalizePosix(path.join(subRel, "__init__.py"));
          if (allFiles.has(candidateFile)) subModuleFile = candidateFile;
          else if (allFiles.has(candidateInit)) subModuleFile = candidateInit;
        } else {
          const subAsPath = modName
            ? `${modName.replace(/\./g, "/")}/${target.name}`
            : target.name;
          subModuleFile = resolvePythonModulePath(subAsPath, allFiles, rootDirOffset);
        }

        if (subModuleFile) {
          // target là module
          fileImportMap.set(target.alias, {
            source_file: subModuleFile,
            symbol_name: "*",
            import_source: null,
            is_namespace: true,
          });
        } else {
          // target là symbol trong modName
          const res = resolvePythonImport(file.path, modName, allFiles, rootDirOffset, dotCount);
          fileImportMap.set(target.alias, {
            source_file: res.filePath,
            symbol_name: target.name,
            import_source: res.importSource,
            is_namespace: false,
          });
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
