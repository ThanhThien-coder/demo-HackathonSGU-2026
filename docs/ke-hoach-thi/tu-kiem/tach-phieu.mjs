#!/usr/bin/env node
// Tách các phiếu trong 02_PHIEU_<TEN>.md thành từng file phieu/<ten>/<MA>.md,
// đầu mỗi file là prompt dán cho Claude (hoặc ghi rõ phiếu không dùng Claude),
// rồi đổi 02_PHIEU_<TEN>.md thành mục lục. Chạy 1 lần:
//   node docs/ke-hoach-thi/tu-kiem/tach-phieu.mjs
// Chỉ ghi file trong docs/ke-hoach-thi/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PEOPLE = [
  { prefix: "TH", file: "02_PHIEU_THIEN.md", name: "Thiện", dir: "thien" },
  { prefix: "MI", file: "02_PHIEU_MINH.md", name: "Minh", dir: "minh" },
  { prefix: "NH", file: "02_PHIEU_NHAN.md", name: "Nhân", dir: "nhan" },
  { prefix: "PH", file: "02_PHIEU_PHAT.md", name: "Phát", dir: "phat" },
  { prefix: "QU", file: "02_PHIEU_QUY.md", name: "Quý", dir: "quy" },
];

function field(body, label) {
  const idx = body.indexOf(`**${label}**`);
  if (idx < 0) return "";
  const rest = body.slice(idx + label.length + 4);
  const next = rest.search(/\n- \*\*|\s·\s\*\*/);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

const PROMPT_KHONG_CLAUDE = /không giao agent/i;
const PROMPT_THEO_LOI = /viết theo từng lỗi/i;

function agentPrompt(body) {
  const v = field(body, "Prompt giao agent:");
  return v.split("\n").map((l) => l.replace(/^\s*>\s?/, "")).join(" ").replace(/\s+/g, " ").trim();
}

function usesApiTable(code, body) {
  return code.startsWith("PH") || code === "TH-13" || /src\/lib\/api\.ts|src\/store\/workbench\.ts/.test(field(body, "File được sửa:"));
}

function touchesContracts(body) {
  return /src\/contracts\//.test(field(body, "File được sửa:"));
}

function claudePrompt(p, t, branch, tieuDe) {
  const doc = `docs/ke-hoach-thi/phieu/${p.dir}/${t.code}.md`;
  const extra = usesApiTable(t.code, t.body)
    ? ", và bảng \"Hợp đồng UI ⇄ API\" cùng danh sách action của store ở đầu `docs/ke-hoach-thi/02_PHIEU_PHAT.md`"
    : "";
  return [
    `Bạn đang làm phiếu ${t.code} (${tieuDe}) cho ${p.name} trong repo thi SimpliFey. Repo bắt đầu trống, mọi code được viết mới theo tài liệu trong thư mục docs/. Thư mục docs/ đã nằm trong .gitignore: không bao giờ add hay commit nó. Làm lần lượt 6 bước dưới đây, xong bước nào báo ngắn bước đó.`,
    ``,
    `BƯỚC 0 — Nhánh: chạy \`git checkout main\` rồi \`git pull\`, sau đó \`git checkout -b ${branch}\` (nếu nhánh đã có thì \`git checkout ${branch}\` rồi \`git merge main\`). Chạy \`git status\`: nếu thấy thư mục docs/ hiện là file chưa theo dõi thì DỪNG và báo tôi, vì .gitignore chưa có dòng docs/.`,
    ``,
    `BƯỚC 1 — Đọc: đọc hết file \`${doc}\` (nhất là mục Yêu cầu, Bẫy đã biết, Tiêu chí đạt), phần "Luật chung cho mọi phiếu" ở đầu \`docs/ke-hoach-thi/02_PHIEU_THIEN.md\`${extra}. Tên file, tên hàm, tên kiểu và chữ ký ghi trong phiếu là hợp đồng với các thành viên khác: dùng đúng, không tự đổi.`,
    ``,
    `BƯỚC 2 — Code: ${agentPrompt(t.body)}`,
    ``,
    `BƯỚC 3 — Kiểm: chạy \`npm run typecheck\`, \`npm run lint\`, \`npm test\` và sửa tới khi cả 3 xanh. Chỉ sửa các file trong mục "File được sửa" của phiếu; cần sửa file khác thì DỪNG và báo tôi.`,
    ``,
    `BƯỚC 4 — Commit: trước khi commit chạy \`git fetch origin\` rồi \`git merge origin/main\`, có xung đột thì gỡ và chạy lại 3 lệnh kiểm. Chia thành nhiều commit nhỏ (mỗi commit khoảng 200 dòng trở xuống), message theo mục "Commit dự kiến" của phiếu. Chỉ \`git add <đường-dẫn>\` từng file thuộc phiếu; không dùng \`git add -A\`, \`git add .\` hay \`git add -f\`. Không dùng \`--date\`, không đổi thời gian commit, không \`--amend\` hay rebase commit đã push.`,
    ``,
    `BƯỚC 5 — Push và PR: chạy \`git push -u origin ${branch}\`, rồi \`gh pr create --base main --head ${branch} --title "${t.code}: ${tieuDe}" --body "<nội dung>"\`. Nội dung PR gồm: mã phiếu ${t.code}, danh sách file đã sửa, kết quả 3 lệnh kiểm, cách thử tay theo mục "Tiêu chí đạt". KHÔNG tự merge PR. In link PR cho tôi.`,
    ``,
    `Nếu khoảng 30 phút vẫn chưa xong, hoặc gặp lỗi quyền, lỗi đăng nhập GitHub (\`gh auth status\`), xung đột không tự gỡ được, hãy dừng và báo tôi đang kẹt ở bước nào.`,
  ].join("\n");
}

function th01Prompt(t) {
  return [
    `Bạn đang làm phiếu TH-01 (Khung dự án và commit đầu) cho Thiện trong repo thi SimpliFey. Thiện đã tự chạy create-next-app trong thư mục trống, đã thêm dòng docs/ vào .gitignore rồi mới chép thư mục docs/ vào. Không bao giờ add hay commit thư mục docs/.`,
    ``,
    `BƯỚC 0 — Kiểm: đang ở nhánh main. Chạy \`git status\`: nếu thấy docs/ là file chưa theo dõi thì DỪNG và báo tôi.`,
    ``,
    `BƯỚC 1 — Đọc: đọc hết file \`docs/ke-hoach-thi/phieu/thien/TH-01.md\` và phần "Luật chung cho mọi phiếu" ở đầu \`docs/ke-hoach-thi/02_PHIEU_THIEN.md\`.`,
    ``,
    `BƯỚC 2 — Code: ${agentPrompt(t.body)}`,
    ``,
    `BƯỚC 3 — Kiểm: chạy \`npm run build\`, \`npm run typecheck\`, \`npm run lint\`, \`npm test\` tới khi đều xanh.`,
    ``,
    `BƯỚC 4 — Commit và push thẳng lên main (phiếu duy nhất không qua PR, vì repo còn trống): \`git add\` đúng các file của phiếu (không dùng \`-A\`, \`.\`, \`-f\`), commit với message "chore: khởi tạo Next.js 15, Node 22, cấu hình kiểm", rồi \`git push -u origin main\`. Không dùng \`--date\`. Báo tôi khi push xong để tôi nhắn cả đội pull.`,
    ``,
    `Gặp lỗi quyền hoặc lỗi đăng nhập GitHub thì dừng và báo tôi.`,
  ].join("\n");
}

function fixPrompt(p, t, tieuDe) {
  const ten = p.dir;
  return [
    `Bạn đang sửa 1 lỗi chặn demo cho ${p.name} (phiếu ${t.code}: ${tieuDe}) trong repo thi SimpliFey. Thư mục docs/ đã nằm trong .gitignore: không bao giờ add hay commit nó. Sau 04:00 chỉ được sửa lỗi, không thêm tính năng.`,
    ``,
    `LỖI: <mô tả lỗi, cách tái hiện, file nghi có lỗi>`,
    ``,
    `BƯỚC 0 — Nhánh: \`git checkout main\`, \`git pull\`, rồi \`git checkout -b ${ten}/fix-<mô-tả-ngắn>\`.`,
    ``,
    `BƯỚC 1 — Đọc: đọc file \`docs/ke-hoach-thi/phieu/${p.dir}/${t.code}.md\`, phần "Luật chung cho mọi phiếu" ở đầu \`docs/ke-hoach-thi/02_PHIEU_THIEN.md\`, mục spec liên quan tới lỗi trong \`docs/spec/\`, và phiếu gốc của file bị lỗi trong \`docs/ke-hoach-thi/phieu/\`.`,
    ``,
    `BƯỚC 2 — Sửa: Hãy đọc kỹ file \`docs/spec/<file>.md\` (mục …) cùng với file \`src/…\` bị lỗi trước khi viết code. Tạo mới và chỉ chỉnh sửa các file sau: <file bị lỗi>; giữ nguyên mọi tên hàm và chữ ký đang export. Triển khai luồng xử lý gồm: tái hiện lỗi bằng 1 test hồi quy, sửa cho test xanh; lưu ý không thêm tính năng, và tuyệt đối không khóa cứng người dùng ở bước <bước liên quan>. Tránh các lỗi sau: đổi chữ ký hàm, sửa lan sang file khác; sau khi viết xong, hãy tự chạy lệnh \`npm run typecheck\`, \`npm run lint\`, \`npm test\` để đảm bảo pass 100%.`,
    ``,
    `BƯỚC 3 — Commit, push, PR: \`git fetch origin\`, \`git merge origin/main\`, chạy lại 3 lệnh kiểm; commit nhỏ message \`fix(<phạm-vi>): <lỗi>\` (chỉ \`git add\` từng file đã sửa, không \`-A\`, \`.\`, \`-f\`, không \`--date\`); \`git push -u origin <nhánh>\`; \`gh pr create --base main --label fix-demo --title "fix: <lỗi>" --body "<lỗi, cách tái hiện, cách sửa, kết quả 3 lệnh kiểm>"\`. KHÔNG tự merge. In link PR cho tôi.`,
  ].join("\n");
}

function mergeSteps(p, t) {
  const contracts = touchesContracts(t.body) && p.prefix !== "TH";
  return [
    `## 2. Sau khi Claude mở PR (việc của ${p.name})`,
    ``,
    `1. Mở link PR Claude in ra. Chờ CI (\`ci\`) xanh. CI đỏ thì dán lỗi CI cho Claude sửa trên cùng nhánh rồi push lại.`,
    `2. Thử tay theo mục **Tiêu chí đạt** bên dưới.`,
    contracts
      ? `3. PR này sửa \`src/contracts/*\`: **nhắn Thiện bấm merge** (00:30–03:30 là Nhân).`
      : `3. Bấm **Merge pull request ⇒ Create a merge commit** (không Squash, không Rebase).`,
    `4. Nhắn nhóm: "đã merge ${t.code}". Người đang làm phiếu khác tự \`git pull\`.`,
    ``,
  ].join("\n");
}

const index = {};
let total = 0;
for (const p of PEOPLE) {
  const src = readFileSync(join(DIR, p.file), "utf8");
  const first = src.search(/^### [A-Z]{2}-\d{2} · /m);
  if (first < 0) throw new Error(`${p.file}: không thấy phiếu (đã tách rồi?)`);
  const header = src.slice(0, first).replace(/\n---\s*\n*$/, "\n");
  const heads = [...src.matchAll(/^### ([A-Z]{2}-\d{2}) · (.+)$/gm)];
  const tickets = heads.map((m, i) => ({
    code: m[1],
    title: m[2].trim(),
    body: src.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : src.length).replace(/\n---\s*$/, "").trimEnd(),
  }));
  mkdirSync(join(DIR, "phieu", p.dir), { recursive: true });
  const rows = [];
  for (const t of tickets) {
    const v = field(t.body, "Prompt giao agent:");
    const branchField = field(t.body, "Nhánh:");
    const branch = (branchField.match(/`([a-z]+\/[a-z0-9-]+)`/) || [])[1] || `${p.dir}/${t.code.toLowerCase()}`;
    const gio = field(t.body, "Giờ:");
    const tieuDe = t.title.replace(/`/g, "");
    let kind, top;
    if (t.code === "TH-01") {
      kind = "Claude (đẩy thẳng lên main)";
      top = [
        `## 1. Prompt dán cho Claude`,
        ``,
        `**Làm tay trước khi dán prompt** (Claude không làm được bước này vì cần thư mục trống):`,
        ``,
        `1. Clone repo thi trống, mở terminal trong thư mục đó.`,
        `2. Chạy \`npx create-next-app@15 . --ts --app --src-dir --tailwind --eslint --use-npm\` (xem \`--help\` nếu cờ khác).`,
        `3. Mở \`.gitignore\` vừa sinh, thêm các dòng \`docs/\`, \`.kb/\`, \`AGENTS.md\`, \`CLAUDE.md\`, \`.claude/\`.`,
        `4. Chép thư mục \`docs/\` vào. Chạy \`git status\`: **không** được thấy \`docs/\`.`,
        `5. Mở Claude trong thư mục repo thi, dán khối dưới đây.`,
        ``,
        "```text",
        th01Prompt(t),
        "```",
        ``,
        `## 2. Sau khi Claude push (việc của Thiện)`,
        ``,
        `1. Mở GitHub, thấy đúng 1 commit trên \`main\`, giờ commit sau 12:00.`,
        `2. Nhắn cả đội: "đã push TH-01, mọi người pull rồi mới chép docs/ vào".`,
        ``,
      ].join("\n");
    } else if (PROMPT_KHONG_CLAUDE.test(v)) {
      kind = "Không dùng Claude";
      top = [
        `## 1. Phiếu này KHÔNG dùng Claude để viết code`,
        ``,
        `Đây là việc làm tay. Ghi chú của phiếu: ${v.replace(/\.$/, "")}. Làm theo mục **Yêu cầu** bên dưới, kiểm theo **Tiêu chí đạt**.`,
        branchField.startsWith("không có nhánh") || /không sửa file trong repo/.test(field(t.body, "File được sửa:"))
          ? `Phiếu này không tạo nhánh, không commit.`
          : `Nếu phải sửa file (ví dụ chỉnh câu chữ prompt), dùng mẫu prompt sửa lỗi ở phiếu sửa lỗi gần nhất của mình hoặc luật chung 13 trong \`docs/ke-hoach-thi/02_PHIEU_THIEN.md\`.`,
        ``,
      ].join("\n");
    } else if (PROMPT_THEO_LOI.test(v)) {
      kind = "Claude (mẫu sửa lỗi, điền lỗi trước khi dán)";
      top = [
        `## 1. Prompt mẫu cho Claude (sửa lỗi chặn demo)`,
        ``,
        `Phiếu này không có code viết trước: chỉ dùng khi có lỗi chặn demo. Thay các chỗ \`<…>\` bằng lỗi thật rồi mới dán. Không có lỗi thì **không** dùng Claude, chỉ làm phần việc tay ở mục **Yêu cầu**.`,
        ``,
        "```text",
        fixPrompt(p, t, tieuDe),
        "```",
        ``,
        mergeSteps(p, t),
      ].join("\n");
    } else {
      kind = "Claude";
      top = [
        `## 1. Prompt dán cho Claude`,
        ``,
        `Mở Claude trong thư mục repo thi (đã có \`docs/\`), dán nguyên khối dưới đây. Claude tự tạo nhánh \`${branch}\`, đọc tài liệu, code, kiểm, commit, push và mở PR. Việc của bạn: trả lời khi Claude hỏi, cho phép chạy lệnh git/gh khi được hỏi, rồi làm Mục 2.`,
        ``,
        "```text",
        claudePrompt(p, t, branch, tieuDe),
        "```",
        ``,
        mergeSteps(p, t),
      ].join("\n");
    }
    const out = [
      `# ${t.code} · ${t.title}`,
      ``,
      `> **Người làm:** ${p.name} · **Giờ:** ${gio} · **Cách làm:** ${kind}`,
      `> Mục lục phiếu của ${p.name}: [\`02_PHIEU_${p.file.slice(9)}\`](../../${p.file}) · Luật chung: [\`02_PHIEU_THIEN.md\`](../../02_PHIEU_THIEN.md)`,
      ``,
      top,
      `## 3. Chi tiết phiếu`,
      ``,
      t.body.replace(/^### .+\n/, "").trim(),
      ``,
    ].join("\n");
    writeFileSync(join(DIR, "phieu", p.dir, `${t.code}.md`), out);
    rows.push(`| [${t.code}](phieu/${p.dir}/${t.code}.md) | ${t.title.replace(/\|/g, "\\|")} | ${gio.replace(/ \(.*$/, "")} | ${kind} |`);
    total++;
  }
  index[p.file] = { header, rows };
}

for (const p of PEOPLE) {
  const { header, rows } = index[p.file];
  const out = [
    header.trimEnd(),
    ``,
    `## Danh sách phiếu của ${p.name}`,
    ``,
    `Mỗi mã phiếu là 1 file trong thư mục [\`phieu/${p.dir}/\`](phieu/${p.dir}/). Đầu mỗi file là **prompt dán cho Claude** (hoặc ghi rõ phiếu không dùng Claude). Làm theo đúng thứ tự giờ.`,
    ``,
    `| Mã | Tên việc | Giờ | Cách làm |`,
    `| :-- | :-- | :-- | :-- |`,
    ...rows,
    ``,
  ].join("\n");
  writeFileSync(join(DIR, p.file), out);
}
console.log(`đã tách ${total} phiếu`);
