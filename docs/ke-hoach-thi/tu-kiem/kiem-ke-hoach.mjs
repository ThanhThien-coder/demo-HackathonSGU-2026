#!/usr/bin/env node
// Script tự kiểm bộ kế hoạch thi trong docs/ke-hoach-thi/.
// Chạy: node docs/ke-hoach-thi/tu-kiem/kiem-ke-hoach.mjs
// Chỉ đọc file, không sửa gì. Thoát mã 1 nếu có tiêu chí không đạt.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "00_DOC_DAU_TIEN.md",
  "01_KIEM_KE_VA_CAT_GIAM.md",
  "02_PHIEU_THIEN.md",
  "02_PHIEU_MINH.md",
  "02_PHIEU_NHAN.md",
  "02_PHIEU_PHAT.md",
  "02_PHIEU_QUY.md",
  "03_GIT_PUSH_PULL.md",
  "04_TIMELINE_VA_PHU_THUOC.md",
  "05_DEPLOY_CLOUD_RUN.md",
  "06_THUYET_TRINH_VA_TRUOC_GIO_THI.md",
  "07_KHAO_SAT_6_GHI_CHU.md",
  "08_CAU_HOI_CHO_CHOT.md",
  "BAO_CAO_CHAY_DEM.md",
];

const PEOPLE = {
  TH: { file: "02_PHIEU_THIEN.md", name: "Thiện", dir: "thien" },
  MI: { file: "02_PHIEU_MINH.md", name: "Minh", dir: "minh" },
  NH: { file: "02_PHIEU_NHAN.md", name: "Nhân", dir: "nhan" },
  PH: { file: "02_PHIEU_PHAT.md", name: "Phát", dir: "phat" },
  QU: { file: "02_PHIEU_QUY.md", name: "Quý", dir: "quy" },
};

const FIELDS = [
  "Người:",
  "Giờ:",
  "Ước tính:",
  "Phụ thuộc:",
  "Giao cho:",
  "Nhánh:",
  "File được sửa:",
  "Spec phải đọc:",
  "Phần râu ria đã lược bỏ:",
  "Yêu cầu:",
  "Bẫy đã biết & Lưu ý tránh Lock:",
  "Tiêu chí đạt:",
  "Kiểm:",
  "Commit dự kiến:",
  "Prompt giao agent:",
  "Nếu trễ:",
];

const QUY_ALLOWED = [
  "src/app/how-it-works/",
  "src/components/how-it-works/",
  "src/app/history/",
  "src/components/history/",
];

const results = [];
function check(id, name, problems) {
  results.push({ id, name, ok: problems.length === 0, problems });
}

const text = {};
const missing = [];
for (const f of FILES) {
  const p = join(DIR, f);
  if (existsSync(p)) text[f] = readFileSync(p, "utf8");
  else missing.push(f);
}

// Nạp file phiếu tách riêng: phieu/<ten>/<MÃ>.md
const ticketFiles = [];
for (const [prefix, info] of Object.entries(PEOPLE)) {
  const d = join(DIR, "phieu", info.dir);
  if (!existsSync(d)) { missing.push(`phieu/${info.dir}/`); continue; }
  for (const f of readdirSync(d).filter((x) => /^[A-Z]{2}-\d{2}\.md$/.test(x)).sort()) {
    const key = `phieu/${info.dir}/${f}`;
    text[key] = readFileSync(join(d, f), "utf8");
    ticketFiles.push({ key, prefix, info, code: f.replace(/\.md$/, "") });
  }
}

// C01: đủ 14 file + thư mục phiếu
check("C01", "Đủ 14 file trong docs/ke-hoach-thi/ và thư mục phieu/<ten>/", missing.map((f) => `thiếu ${f}`));
if (!existsSync(join(DIR, "tu-kiem", "kiem-ke-hoach.mjs"))) {
  results[results.length - 1].problems.push("thiếu script tự kiểm");
}

// Tách phiếu
function parseTickets(prefix, body) {
  const out = [];
  const re = new RegExp(`^### (${prefix}-\\d{2}) · (.+)$`, "gm");
  const heads = [...body.matchAll(re)];
  heads.forEach((m, i) => {
    const start = m.index;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    out.push({ code: m[1], title: m[2], body: body.slice(start, end) });
  });
  return out;
}

function field(ticket, label) {
  const idx = ticket.body.indexOf(`**${label}**`);
  if (idx < 0) return null;
  const rest = ticket.body.slice(idx + label.length + 4);
  const next = rest.search(/\n- \*\*|\s·\s\*\*/);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

const tickets = [];
for (const tf of ticketFiles) {
  const all = text[tf.key];
  const h = all.match(/^# ([A-Z]{2}-\d{2}) · (.+)$/m);
  const i = all.indexOf("## 3. Chi tiết phiếu");
  tickets.push({
    code: tf.code, title: h ? h[2] : "", prefix: tf.prefix, person: tf.info.name, key: tf.key, dir: tf.info.dir,
    headCode: h ? h[1] : null, top: i < 0 ? all : all.slice(0, i), body: i < 0 ? "" : all.slice(i),
  });
}
const codes = new Set(tickets.map((t) => t.code));

// C02: đủ trường của mẫu phiếu
{
  const probs = [];
  for (const t of tickets) {
    for (const f of FIELDS) {
      const v = field(t, f);
      if (v === null || v.length === 0) probs.push(`${t.code} thiếu trường "${f}"`);
    }
  }
  if (tickets.length === 0) probs.push("không đọc được phiếu nào");
  check("C02", "Mỗi phiếu đủ 16 trường của mẫu Mục 10", probs);
}

// C03: mã liên tục, không trùng, đúng người
{
  const probs = [];
  for (const [prefix, info] of Object.entries(PEOPLE)) {
    const list = tickets.filter((t) => t.prefix === prefix).map((t) => Number(t.code.slice(3)));
    if (list.length === 0) probs.push(`${prefix}: không có phiếu`);
    list.forEach((n, i) => {
      if (n !== i + 1) probs.push(`${prefix}: mã thứ ${i + 1} là ${prefix}-${String(n).padStart(2, "0")}`);
    });
    for (const t of tickets.filter((x) => x.prefix === prefix)) {
      const nguoi = field(t, "Người:") ?? "";
      if (!nguoi.includes(info.name)) probs.push(`${t.code}: trường Người không phải ${info.name}`);
    }
  }
  check("C03", "Mã phiếu liên tục, không trùng, đúng người", probs);
}

// C04: mọi mã phiếu được nhắc tới đều tồn tại
{
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    for (const m of body.matchAll(/\b(TH|MI|NH|PH|QU)-(\d{2})\b/g)) {
      const c = `${m[1]}-${m[2]}`;
      if (!codes.has(c)) probs.push(`${f}: nhắc ${c} nhưng không có phiếu này`);
    }
  }
  check("C04", "Mọi mã phiếu được nhắc tới đều có thật", [...new Set(probs)]);
}

// C05: phiếu không chứa khối code viết sẵn
{
  const probs = [];
  for (const info of Object.values(PEOPLE)) {
    if ((text[info.file] ?? "").includes("```")) probs.push(`${info.file} có khối code`);
  }
  for (const t of tickets) {
    const fences = [...text[t.key].matchAll(/^```(\S*)/gm)];
    if (fences.length > 2) probs.push(`${t.key}: nhiều hơn 1 khối`);
    for (const f of fences) if (f[1] && f[1] !== "text") probs.push(`${t.key}: khối ${f[1]} (chỉ được dùng khối text cho prompt)`);
    if (t.body.includes("```")) probs.push(`${t.key}: phần chi tiết phiếu có khối code`);
  }
  check("C05", "Phiếu việc không có khối code viết sẵn (chỉ 1 khối text chứa prompt)", probs);
}

// C06: không file nào bị 2 người sửa, trừ chỗ ghi bàn giao
{
  const owners = new Map();
  for (const t of tickets) {
    const v = field(t, "File được sửa:") ?? "";
    const parts = [...v.matchAll(/`([^`]+)`/g)];
    parts.forEach((m, i) => {
      const path = m[1];
      if (!/[/.]/.test(path) || /\s/.test(path)) return;
      const after = v.slice(m.index + m[0].length, i + 1 < parts.length ? parts[i + 1].index : v.length);
      const handoff = /bàn giao/i.test(after);
      if (!owners.has(path)) owners.set(path, []);
      owners.get(path).push({ person: t.prefix, code: t.code, handoff });
    });
  }
  const probs = [];
  for (const [path, list] of owners) {
    const people = new Set(list.map((x) => x.person));
    if (people.size > 1 && !list.every((x) => x.handoff)) {
      probs.push(`${path}: ${list.map((x) => x.code + (x.handoff ? "(bàn giao)" : "")).join(", ")}`);
    }
  }
  check("C06", "Không file nào bị 2 người sửa (trừ bàn giao có ghi)", probs);
}

// C07: mảng độc lập của Quý
{
  const probs = [];
  for (const t of tickets.filter((x) => x.prefix === "QU")) {
    const v = field(t, "File được sửa:") ?? "";
    for (const m of v.matchAll(/`([^`]+)`/g)) {
      const p = m[1];
      if (!/[/.]/.test(p) || /\s/.test(p)) continue;
      if (!QUY_ALLOWED.some((a) => p.startsWith(a))) probs.push(`${t.code} sửa file ngoài mảng: ${p}`);
    }
  }
  for (const t of tickets.filter((x) => x.prefix !== "QU")) {
    const dep = field(t, "Phụ thuộc:") ?? "";
    if (/\bQU-\d{2}\b/.test(dep)) probs.push(`${t.code} phụ thuộc phiếu của Quý`);
  }
  check("C07", "Mảng độc lập: Quý chỉ sửa thư mục riêng, không ai phụ thuộc Quý", probs);
}

// C08: prompt giao agent đủ 4 câu bắt buộc (trừ phiếu không giao agent hoặc phiếu sửa lỗi theo mẫu luật chung 13)
const isAgentPrompt = (v) => !/không giao agent|viết theo từng lỗi/i.test(v);
{
  const parts = [
    ["câu 1", /Hãy đọc kỹ file `docs\//],
    ["câu 1 (trước khi viết code)", /trước khi viết code/],
    ["câu 2", /Tạo mới và chỉ chỉnh sửa các file sau:/],
    ["câu 2 (export/chữ ký)", /đảm bảo|giữ nguyên/i],
    ["câu 3", /Triển khai luồng xử lý gồm:/],
    ["câu 3 (bỏ râu ria)", /lưu ý không/i],
    ["câu 3 (chống lock)", /tuyệt đối không khóa cứng người dùng/],
    ["câu 4", /Tránh các lỗi sau:/],
    ["câu 4 (tự chạy lệnh)", /hãy tự chạy lệnh/],
  ];
  const probs = [];
  for (const t of tickets) {
    const v = field(t, "Prompt giao agent:") ?? "";
    if (!isAgentPrompt(v)) continue;
    for (const [name, re] of parts) if (!re.test(v)) probs.push(`${t.code}: prompt thiếu ${name}`);
    const order = ["Hãy đọc kỹ file", "Tạo mới và chỉ chỉnh sửa", "Triển khai luồng xử lý gồm", "Tránh các lỗi sau"].map((s) => v.indexOf(s));
    if (order.some((x, i) => i > 0 && x < order[i - 1])) probs.push(`${t.code}: 4 câu của prompt sai thứ tự`);
  }
  check("C08", "Prompt giao agent đủ 4 câu đúng thứ tự (đọc spec, file + chữ ký, luồng + chống lock, bẫy + tự kiểm)", probs);
}

// C21: phiếu việc không còn dấu vết của bản code khảo sát trước giờ thi
{
  const banned = /demo-HackathonSGU-2026|repo tập|code cũ|bản demo cũ|bản tập|buổi tập|repo hiện tại|trong repo hiện có/i;
  const probs = [];
  const keys = [...Object.values(PEOPLE).map((i) => i.file), ...tickets.map((t) => t.key)];
  for (const k of keys) {
    (text[k] ?? "").split("\n").forEach((line, i) => {
      if (banned.test(line)) probs.push(`${k}:${i + 1}: ${line.match(banned)[0]}`);
    });
  }
  check("C21", "Phiếu việc không nhắc repo tập dượt, code cũ, bản demo cũ", probs);
}

// C24: đầu mỗi file phiếu có prompt cho Claude (tạo nhánh, push, PR, không tự merge) hoặc ghi rõ không dùng Claude
{
  const probs = [];
  const counts = { claude: 0, tay: 0, mau: 0 };
  for (const t of tickets) {
    if (t.headCode !== t.code) probs.push(`${t.key}: tiêu đề không khớp tên file`);
    const top = t.top;
    const m = top.match(/```text\n([\s\S]*?)```/);
    const p = m ? m[1] : "";
    if (/## 1\. Phiếu này KHÔNG dùng Claude/.test(top)) {
      counts.tay++;
      if (m) probs.push(`${t.key}: ghi không dùng Claude nhưng vẫn có prompt`);
      continue;
    }
    if (!m) { probs.push(`${t.key}: thiếu khối prompt cho Claude`); continue; }
    if (/## 1\. Prompt mẫu cho Claude/.test(top)) {
      counts.mau++;
      for (const need of ["git checkout -b", "gh pr create", "--label fix-demo", "KHÔNG tự merge", "<"]) if (!p.includes(need)) probs.push(`${t.key}: prompt mẫu thiếu "${need}"`);
      continue;
    }
    counts.claude++;
    if (t.code === "TH-01") {
      for (const need of ["git push -u origin main", "docs/"]) if (!p.includes(need)) probs.push(`TH-01: prompt thiếu "${need}"`);
      continue;
    }
    const branch = (field(t, "Nhánh:") ?? "").match(/`([a-z]+\/[a-z0-9-]+)`/)?.[1] ?? `${t.dir}/${t.code.toLowerCase()}`;
    const needs = [
      `git checkout -b ${branch}`, `git push -u origin ${branch}`, "gh pr create --base main", "KHÔNG tự merge",
      `docs/ke-hoach-thi/phieu/${t.dir}/${t.code}.md`, "npm run typecheck", "git add -A", "--date", "docs/ đã nằm trong .gitignore",
    ];
    for (const need of needs) if (!p.includes(need)) probs.push(`${t.key}: prompt thiếu "${need}"`);
    if (!/## 2\. Sau khi Claude mở PR/.test(top)) probs.push(`${t.key}: thiếu hướng dẫn merge sau khi có PR`);
    if (/src\/contracts\//.test(field(t, "File được sửa:") ?? "") && t.prefix !== "TH" && !/nhắn Thiện bấm merge/.test(top)) probs.push(`${t.key}: PR sửa contracts phải để Thiện merge`);
  }
  if (tickets.length !== 67) probs.push(`có ${tickets.length} file phiếu, cần 67`);
  check("C24", `Đầu mỗi file phiếu có prompt Claude tự tạo nhánh, push, mở PR (${counts.claude} phiếu Claude, ${counts.mau} mẫu sửa lỗi, ${counts.tay} làm tay)`, probs);
}

// C22: mọi liên kết tới docs/ trỏ đúng file, đúng mục
{
  const REPO = resolve(DIR, "..", "..");
  const exists = (p) => existsSync(join(REPO, p)) || (p === "docs/prototype.html" && existsSync(join(REPO, "prototype.html")));
  const headings = new Map();
  const headOf = (p) => {
    if (!headings.has(p)) headings.set(p, existsSync(join(REPO, p)) ? readFileSync(join(REPO, p), "utf8") : "");
    return headings.get(p);
  };
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    for (const m of body.matchAll(/`(docs\/[A-Za-z0-9_.\-/]+)`/g)) {
      const p = m[1];
      if (/[<*]/.test(p) || p.endsWith("/") || p.includes("...")) continue;
      if (!exists(p)) { probs.push(`${f}: không có file ${p}`); continue; }
      if (!p.startsWith("docs/spec/")) continue;
      // Mục ngay sau đường dẫn: "(Mục 2, 3.1)" hoặc " Mục 4 (…), Mục 6"
      const tail = body.slice(m.index + m[0].length, m.index + m[0].length + 260).split(/`docs\/|;|\n/)[0];
      const src = headOf(p);
      for (const mm of tail.matchAll(/Mục ([0-9]+[A-Z]?(?:\.[0-9]+)?)((?:,\s*[0-9]+[A-Z]?(?:\.[0-9]+)?)*)/g)) {
        const nums = [mm[1], ...mm[2].split(",").map((s) => s.trim()).filter(Boolean)];
        for (const n of nums) {
          const re = new RegExp(`^#{2,3} ${n.replace(".", "\\.")}\\.`, "m");
          if (!re.test(src)) probs.push(`${f}: ${p} không có Mục ${n}`);
        }
      }
    }
  }
  check("C22", "Mọi liên kết tới docs/ đúng file và đúng số mục", [...new Set(probs)]);
}

// C23: phiếu nào có prototype.html trong "Spec phải đọc" thì prompt cũng phải nhắc prototype.html
{
  const probs = [];
  for (const t of tickets) {
    const s = field(t, "Spec phải đọc:") ?? "";
    const v = field(t, "Prompt giao agent:") ?? "";
    if (!isAgentPrompt(v)) continue;
    if (s.includes("prototype.html") && /^UI/.test(s) && !v.includes("prototype.html") && !/không có trong `docs\/prototype\.html`|prototype\.html` không có phần này/.test(s)) {
      probs.push(`${t.code}: prompt UI thiếu prototype.html`);
    }
  }
  check("C23", "Prompt UI nhắc prototype.html khi phiếu dựa vào prototype", probs);
}

// C09: ước tính ghi rõ là ước tính
{
  const probs = tickets
    .filter((t) => !/ước tính/i.test(field(t, "Ước tính:") ?? ""))
    .map((t) => `${t.code}: thời lượng không ghi "ước tính"`);
  check("C09", "Thời lượng đều ghi là ước tính", probs);
}

// C10: ai cũng có phiếu đầu bắt đầu trước 13:00
{
  const probs = [];
  for (const [prefix, info] of Object.entries(PEOPLE)) {
    const first = tickets.find((t) => t.prefix === prefix);
    const gio = first ? field(first, "Giờ:") ?? "" : "";
    if (!/^12:\d{2} → (12:\d{2}|13:00)/.test(gio)) probs.push(`${info.name}: phiếu đầu không nằm trong 12:00–13:00 (${gio})`);
  }
  check("C10", "Cả 5 người có commit đầu trước 13:00", probs);
}

// C11: không hướng dẫn sửa thời gian commit
{
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    body.split("\n").forEach((line, i) => {
      if (/GIT_COMMITTER_DATE|GIT_AUTHOR_DATE|--date/.test(line) && !/cấm|không|git log/i.test(line)) {
        probs.push(`${f}:${i + 1}`);
      }
    });
  }
  check("C11", "Không có hướng dẫn sửa thời gian commit", probs);
}

// C12: Mermaid parse được
{
  const probs = [];
  // Đường dẫn tool đặt được qua biến MMCHECK (bản sao đã cài gói), mặc định là tool của ai-kit
  const tool = process.env.MMCHECK || "D:/Claude/ai-kit/tools/mmcheck/check.mjs";
  const withMermaid = FILES.filter((f) => (text[f] ?? "").includes("```mermaid")).map((f) => join(DIR, f));
  if (withMermaid.length === 0) probs.push("không có sơ đồ Mermaid nào");
  if (existsSync(tool)) {
    const r = spawnSync(process.execPath, [tool, ...withMermaid], { encoding: "utf8" });
    if (r.status !== 0) probs.push(`mmcheck báo lỗi: ${(r.stdout + r.stderr).trim().slice(0, 800)}`);
  } else {
    probs.push("không tìm thấy tool mmcheck để kiểm Mermaid");
  }
  if (!(text["04_TIMELINE_VA_PHU_THUOC.md"] ?? "").includes("```mermaid\ngantt")) probs.push("03 thiếu Gantt");
  check("C12", "Sơ đồ Mermaid parse được, có Gantt", probs);
}

// C13: link tương đối trỏ tới file có thật
{
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    for (const m of body.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^https?:/.test(target)) continue;
      if (!existsSync(resolve(DIR, dirname(f), target))) probs.push(`${f}: link hỏng ${target}`);
    }
  }
  check("C13", "Link tương đối không hỏng", probs);
}

// C14: không có chuỗi giống khóa bí mật
{
  const pats = [/sk-[A-Za-z0-9]{20,}/, /AIza[0-9A-Za-z_-]{30,}/, /eyJ[A-Za-z0-9_-]{20,}/, /sb_secret_[A-Za-z0-9]{8,}/, /ghp_[A-Za-z0-9]{20,}/, /postgres(ql)?:\/\/[^<\s`]+:[^<\s`]+@/];
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    for (const p of pats) if (p.test(body)) probs.push(`${f}: có chuỗi giống khóa (${p})`);
  }
  check("C14", "Không có khóa, token, mật khẩu", probs);
}

// C15: timeline đủ mốc bắt buộc
{
  const t = text["04_TIMELINE_VA_PHU_THUOC.md"] ?? "";
  const need = ["10:00–11:00", "12:00", "13:00", "Lát dọc 1", "Lát dọc 2", "H+14", "04:00", "đóng băng", "09:00", "09:30", "10:00–11:30", "Đường găng", "Lịch ngủ xoay", "Cổng quyết định", "Đệm cho agent", "crit"];
  check("C15", "Timeline đủ mốc, đường găng, lịch ngủ, cổng, đệm", need.filter((k) => !t.includes(k)).map((k) => `thiếu "${k}"`));
}

// C16: đủ 6 ghi chú, có mức chắc chắn và phiếu phụ trách
{
  const t = text["07_KHAO_SAT_6_GHI_CHU.md"] ?? "";
  const probs = [];
  const parts = t.split(/^## Ghi chú /m).slice(1);
  if (parts.length !== 6) probs.push(`có ${parts.length} ghi chú, cần 6`);
  parts.forEach((p, i) => {
    if (!/Đã xác minh|Mới nghi|Phân việc/iu.test(p)) probs.push(`ghi chú ${i + 1} thiếu mức chắc chắn`);
    if (!/\b(TH|MI|NH|PH|QU)-\d{2}\b/.test(p)) probs.push(`ghi chú ${i + 1} không chỉ phiếu phụ trách`);
    if (!/Tiêu chí|tiêu chí/.test(p) && i !== 1) probs.push(`ghi chú ${i + 1} thiếu tiêu chí đạt`);
  });
  check("C16", "Đủ 6 ghi chú test, có mức chắc chắn, phiếu và tiêu chí", probs);
}

// C17: không nhận xét năng lực, thái độ của người
{
  const bad = ["lười", "kém cỏi", "yếu kém", "vô dụng", "thiếu trách nhiệm", "không đáng tin", "chậm chạp", "ỷ lại"];
  const probs = [];
  for (const [f, body] of Object.entries(text)) for (const w of bad) if (body.toLowerCase().includes(w)) probs.push(`${f}: có từ "${w}"`);
  check("C17", "Trình bày trung tính, không nhận xét năng lực, thái độ", probs);
}

// C18: số mục tiêu luôn kèm "chưa đo"
{
  const probs = [];
  for (const [f, body] of Object.entries(text)) {
    body.split("\n").forEach((line, i) => {
      if (/mục tiêu/i.test(line) && /\d\s?(ms|giây)\b/.test(line) && !/chưa đo/i.test(line)) probs.push(`${f}:${i + 1}`);
    });
  }
  check("C18", "Số mục tiêu luôn ghi chưa đo", probs);
}

// C19: tham chiếu ghi rõ UI hay Backend; giờ đúng dạng
{
  const probs = [];
  for (const t of tickets) {
    const r = field(t, "Spec phải đọc:") ?? "";
    if (!/^(UI|Backend)/.test(r)) probs.push(`${t.code}: tham chiếu không mở đầu bằng UI hoặc Backend`);
    const g = field(t, "Giờ:") ?? "";
    if (!/^\d{2}:\d{2} → \d{2}:\d{2} \(H\+/.test(g)) probs.push(`${t.code}: giờ sai dạng "${g}"`);
  }
  check("C19", "Tham chiếu ghi rõ UI/Backend; giờ đúng dạng", probs);
}

// C20: phiếu UI có nhắc spec/30 hoặc prototype; phiếu backend nhắc bám repo tập
{
  const probs = [];
  for (const t of tickets) {
    const r = field(t, "Spec phải đọc:") ?? "";
    if (r.startsWith("UI") && !/spec\/30|prototype|D-8\d|thele|spec\/02/.test(r)) probs.push(`${t.code}: tham chiếu UI thiếu spec/30 hoặc prototype`);
  }
  check("C20", "Phiếu UI tham chiếu spec/30 hoặc prototype.html", probs);
}

// In kết quả
let fail = 0;
for (const r of results) {
  console.log(`${r.ok ? "ĐẠT " : "LỖI "} ${r.id} ${r.name}`);
  if (!r.ok) {
    fail++;
    for (const p of r.problems.slice(0, 30)) console.log(`      - ${p}`);
  }
}
console.log(`\nSố phiếu: ${tickets.length} · Đạt ${results.length - fail}/${results.length} tiêu chí`);
process.exit(fail === 0 ? 0 : 1);
