/**
 * src/server/ai/guard/overview.ts
 *
 * Kiểm tổng quan repo (GUARD-11, D-83) theo spec 21 Mục 4.
 */

import type { GuardIssue, RepoOverviewRaw, StaticEngineResult } from "@/contracts";
import { packGroups } from "../prompts/overview";
import { findForbidden, forbiddenKeywords } from "./forbidden";
import { invalidLineRefs } from "./lines";
import { checkNames, repoScope } from "./names";
import { firstSentences, nodeCodeText, normText } from "./text";

const wordCount = (s: string): number => s.trim().split(/\s+/u).filter(Boolean).length;

/** Giữ mục có id trong `known`, trùng id ⇒ giữ mục đầu; id thiếu ⇒ O5 // nội bộ */
function keepKnown<T>(
  items: T[],
  idOf: (t: T) => string,
  known: string[],
  issues: GuardIssue[],
): T[] {
  const knownSet = new Set(known);
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of items) {
    const id = idOf(item);
    if (!knownSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    kept.push(item);
  }
  for (const id of known) {
    if (!seen.has(id)) issues.push({ code: "O5", name: id });
  }
  return kept;
}

/**
 * Kiểm và làm sạch bản tổng quan thô từ AI (GUARD-11).
 * 1. groups: chỉ giữ group_id có trong graph.groups, trùng id ⇒ mục đầu; thiếu nhóm ⇒ O5.
 * 2. node_titles: chỉ giữ node_id có thật, trùng id ⇒ mục đầu; thiếu node hoặc 2 node trùng title (normText) ⇒ O5.
 * 3. Độ dài: summary quá 2 câu ⇒ cắt còn 2; name quá 4 từ, title ngoài 2–6 từ ⇒ O6.
 * 4. Chữ (summary, name, title): O1 rỗng · O2 tên sai · O3 từ cấm · O4 có số dòng.
 * Có mã lỗi ⇒ thêm GuardIssue rồi null. Không mutate raw; trả bản mới.
 */
export function checkOverview(
  raw: RepoOverviewRaw,
  graph: StaticEngineResult,
  issues: GuardIssue[] = [],
): RepoOverviewRaw | null {
  const found: GuardIssue[] = [];

  // 1. groups
  const groups = keepKnown(
    raw.groups,
    (g) => g.group_id,
    packGroups(graph).map((g) => g.group_id),
    found,
  ).map((g) => ({ group_id: g.group_id, name: g.name.trim() }));

  // 2. node_titles
  const nodeTitles = keepKnown(
    raw.node_titles,
    (t) => t.node_id,
    graph.nodes.map((n) => n.id),
    found,
  ).map((t) => ({ node_id: t.node_id, title: t.title.trim() }));
  const titleOwner = new Map<string, string>();
  for (const t of nodeTitles) {
    const key = normText(t.title);
    if (key.length > 0 && titleOwner.has(key)) found.push({ code: "O5", name: t.node_id });
    else titleOwner.set(key, t.node_id);
  }

  // 3. Độ dài
  const summary = firstSentences(raw.summary.trim(), 2);
  for (const g of groups) {
    if (wordCount(g.name) > 4) found.push({ code: "O6", name: g.group_id });
  }
  for (const t of nodeTitles) {
    const n = wordCount(t.title);
    if (n < 2 || n > 6) found.push({ code: "O6", name: t.node_id });
  }

  // 4. Chữ
  const texts = [summary, ...groups.map((g) => g.name), ...nodeTitles.map((t) => t.title)];
  if (texts.some((t) => t.trim().length === 0)) found.push({ code: "O1" });
  for (const name of checkNames(texts, repoScope(graph))) found.push({ code: "O2", name });
  const forbidden = forbiddenKeywords(graph.fingerprint, graph.nodes.map(nodeCodeText).join("\n"));
  for (const name of findForbidden(texts, forbidden)) found.push({ code: "O3", name });
  if (texts.some((t) => invalidLineRefs(t, new Set<number>()).length > 0)) found.push({ code: "O4" });

  if (found.length > 0) {
    issues.push(...found);
    return null;
  }
  return { summary, groups, node_titles: nodeTitles };
}
