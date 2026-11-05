// 10 Mục 1 — chuẩn hóa link GitHub (D-38: chỉ link gốc repo).
import type { GithubRepoInfo } from "@/contracts";
import { fail } from "../../errors";

const URL_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/(tree|blob)(?:\/.*)?|\/[^/]+(?:\/.*)?)?$/;

export function parseGithubUrl(raw: string): GithubRepoInfo {
  let s = raw.trim();
  const cut = s.search(/[?#]/); // ING-10
  if (cut >= 0) s = s.slice(0, cut);
  // ING-11
  if (/^git@github\.com:/i.test(s)) s = s.replace(/^git@github\.com:/i, "https://github.com/");
  s = s.replace(/^http:\/\//i, "https://");
  if (/^(www\.)?github\.com\//i.test(s)) s = `https://${s}`;
  const m0 = /^(https:\/\/)([^/]+)(\/.*)?$/i.exec(s);
  if (!m0) return fail("ERR_INVALID_GITHUB_URL");
  let host = m0[2].toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  if (host !== "github.com") return fail("ERR_INVALID_GITHUB_URL"); // ING-12
  s = `https://${host}${(m0[3] ?? "").replace(/\/+$/, "")}`;
  const m = URL_RE.exec(s);
  if (!m) return fail("ERR_INVALID_GITHUB_URL"); // ING-13
  const [, owner, repo, kind] = m;
  return { owner, repo, path_trimmed: kind === "tree" || kind === "blob", clean_url: `https://github.com/${owner}/${repo}` };
}
