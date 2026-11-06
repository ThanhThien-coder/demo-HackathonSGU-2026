# Sửa doc theo quy trình học mới

Cập nhật ngày 06/11/2026. Quyết định gốc: D-81, D-82, D-83, D-84 trong [`spec/00`](../spec/00_QUYET_DINH.md). Bản vẽ giao diện tham chiếu: [`prototype.html`](../../prototype.html). Lộ trình code sau khi xong doc: [`loi-can-sua.md` mục Lộ trình mới](loi-can-sua.md#lộ-trình-mới-ngày-06112026-chiều).

Mỗi người chỉ sửa doc của phần mình, chạy song song. Xong doc thì mở PR rồi chuyển sang code ngay, không chờ người khác.

## 0. Cách chạy

1. `git switch main && git pull`.
2. Tạo nhánh `docs/<tên>-quy-trinh-moi`, ví dụ `docs/thien-quy-trinh-moi`.
3. Mở Claude trong thư mục repo, dán prompt dưới, thay tên và vai:

```text
Tôi là <tên> (<vai>). Đọc docs/quy-trinh-code-21h/sua-doc-quy-trinh-moi.md:
Mục 1, Mục 2, Mục 3 và đúng mục của tôi ở Mục 4. Làm hết phần việc doc của tôi,
chỉ sửa các file trong cột "Giữ file" của tôi. Đọc spec liên quan trước khi sửa,
không đoán tên. Xong thì chạy lệnh kiểm ở Mục 5, báo kết quả, chưa commit.
```

4. Đọc lại phần Claude sửa, tự commit, mở PR vào `main`. Thiện duyệt và merge.

## 1. Đã chốt

| Mã | Nội dung chính |
| :-- | :-- |
| D-81 | Quy trình học theo tour. Vào bài: thẻ vai trò ⇒ tour từng bước ⇒ tóm tắt điểm hay, điểm dở ⇒ Feynman. Khung code mỗi file một tab. 16 thẻ khái niệm viết tay. Câu đầu của mỗi run có `focus` = `FLOW`. Gợi ý `CODE_POINTER` có nút mở đúng bước trong tour. Câu `DROPPED` không hiện. Giao diện không cho chọn bậc người học |
| D-82 | Giải thích đoạn chọn: bôi đen trong code, bấm nút mới gọi lời gọi AI thứ 5 `explain-selection`. Không agent, không tra mạng, không so với câu hỏi đang mở |
| D-83 | `analyze-overview` gọi ngay sau khi quét, đầu vào là gói ngữ cảnh không có code, đầu ra là bức tranh chung 2 câu, tên nhóm, tên tiếng Việt cho từng bài. Bỏ nhận định chờ mọi node |
| D-84 | Engine gom bài thành nhóm chức năng tất định. Mỗi bài có thực thể và thao tác. Thẻ vai trò đầu bài |

**Đã bỏ:** Màn 6 (câu hỏi nâng cao riêng), so trùng lời giải thích với câu hỏi, agent, graphDB, tra mạng, phần gom nhận định từ các bản phân tích ở Tổng quan.

**Giữ nguyên:** 1 node = 1 lát cắt, bản đồ tất định, `node.id` theo D-08, BKT, luật Đạt, gợi ý theo bậc và lượt (D-74), đáp án mẫu chỉ mở khi xong câu, mọi chữ AI viết đều qua cổng gác, INV-01 … INV-13, trừ INV-02 đổi "4 lời gọi" thành 5 lời gọi (thêm `explain-selection`, D-82).

## 2. Luật chung khi sửa doc

- Chỉ sửa file trong cột "Giữ file" của mình. Cần sửa file của người khác thì nhắn người đó.
- `spec/00` đợt này chỉ Huynh Nhan sửa. Riêng Minh được thêm đúng 1 dòng D-85 cho B-39.
- Kiểu dữ liệu chỉ nằm ở `spec/02`, số chỉ nằm ở bảng `CONFIG` của `spec/02`. File khác gọi theo tên. Dùng đúng các tên ở Mục 3 để mọi file khớp nhau.
- Spec viết dạng quy phạm: không giải thích lý do, không kể lịch sử, không viết "đề xuất". Tiếng Việt, câu ngắn, link tương đối.
- Trần dung lượng (D-75): mặc định ≤ 40 000 byte; `00` ≤ 50 000, `02` ≤ 52 000, `04` ≤ 42 000, `10` ≤ 44 000, `11` ≤ 46 000, `20` ≤ 62 000, `21` ≤ 48 000, `30` ≤ 50 000. Phần cũ bị thay thì xóa, không để song song.
- Test mới ghi vào mục "Test bắt buộc" của file spec mình giữ. Kịch bản chạy trọn luồng trong `spec/50` để Thiện gom sau.
- Không sửa code trong đợt này. Không commit `.kb/`, `.env*`.

## 3. Tên dùng chung

Thiện chốt cuối cùng trong `spec/02`. Đổi tên nào thì báo cả nhóm.

**Engine (D-84):**
- `EntityOp = "CREATE" | "READ" | "UPDATE" | "DELETE"`.
- `HybridArchitecturalNode` thêm `group_id: string` và `entities: Array<{ name: string; ops: EntityOp[] }>`.
- `GraphEdge` thêm `via_entities: string[]` (rỗng nếu cạnh không qua thực thể).
- `StaticEngineResult` thêm `groups: Array<{ group_id: string; key: string; key_kind: "ENTITY" | "ROUTE_PREFIX" | "STANDALONE"; node_ids: string[] }>`. `key` là nhãn dự phòng khi AI chưa đặt tên.

**Ingest (D-83):** `IngestOutput` thêm `readme_excerpt: string | null` (đoạn đầu README, đã che secret, tối đa `CONFIG.OVERVIEW_README_MAX_CHARS`) và `manifest_description: string | null`. `StaticEngineResult` mang 2 trường này sang, vì `analyze-overview` đọc kết quả engine của phiên.

**Tổng quan (D-83):**
- `RepoOverviewRaw = { summary: string; groups: Array<{ group_id: string; name: string }>; node_titles: Array<{ node_id: string; title: string }> }`. `summary` tối đa 2 câu.
- `RepoOverviewView = { facts: …(giữ như cũ); ai: RepoOverviewRaw | null }`.
- Bỏ `ERR_OVERVIEW_NOT_READY`, vì tổng quan không còn chờ node.

**Cổng gác (`21`):** `GuardCall` thêm `"explain"`. `GuardCode` thêm `O5` (thiếu hoặc trùng tên bài, nhóm), `O6` (tên quá dài hoặc quá ngắn), `E1` … `E4` (giải thích đoạn chọn).

**Giải thích đoạn chọn (D-82):**
- `POST /api/explain-selection`.
- `ExplainSelectionRequest = { session_id; node_id; step_number; range: { line_start; col_start; line_end; col_end }; selected_text }`. Số dòng là số dòng gốc.
- `ExplainSelectionRaw = { kind: "KEYWORD" | "NAME" | "CODE"; what: string; here: string; analogy: string; skill: SWESkill | null }`. `what` 2–3 câu, `here` 1–2 câu, `analogy` 0–1 câu (rỗng nếu không hợp).
- `ExplainSelectionResponse = { explanation: ExplainSelectionRaw | null; references: Array<{ node_id; step_number; name }>; tokens_used }`. `explanation` = `null` khi cổng gác chặn.
- Mã lỗi mới: `ERR_SELECTION_INVALID` (400, vùng chọn không khớp code hoặc quá dài), `ERR_EXPLAIN_LIMIT` (429, hết lượt của phiên). AI lỗi dùng `ERR_AI_UNAVAILABLE`.
- Khóa cache `SELECTION_EXPLAIN`: `se|{source}|{snapshot_id}|{subdir}|{engine_version}|{node_id}|{step_number}|{line_start}:{col_start}-{line_end}:{col_end}|{PROMPT_VERSION}|{LLM_MODEL}`.

**`CONFIG` mới** (giá trị đầu, chưa đo, đo xong thì sửa):
- `EXPLAIN_SELECTION_MAX_CHARS: 300`
- `EXPLAIN_MAX_PER_SESSION: 30`
- `LLM_MAX_OUTPUT_TOKENS.EXPLAIN: 400`
- `OVERVIEW_README_MAX_CHARS: 2000`
- `PROMPT_VERSION` lên `"1.2.0"`.

## 4. Việc từng người

### Huynh Nhan (vai C)

**Giữ file:** `spec/20`, `spec/21`, `spec/22`, `quy-trinh-code-21h/vai-C/*`. (`spec/00` và `loi-can-sua.md` đã sửa trong PR mở đợt này.)

- `20` Mục 4 (`analyze-node`): `summary` câu 1 nói phần này giúp người dùng làm gì, câu 2 nói các bước chia việc (C-07). `steps[].text` viết cho người mới: câu ngắn, gặp thuật ngữ thì giải thích luôn.
- `20` Mục 5 (`analyze-overview`): viết lại theo D-83: gọi khi nào, gói ngữ cảnh, prompt mới, `OVERVIEW_SCHEMA` = `RepoOverviewRaw` mới, câu dự phòng do code dựng.
- `20` mục mới `explain-selection`: luồng, các khối dữ liệu (`<selection>`, `<code_data>` của bước, `<step_info>`, `<flow>`, `<node_info>`, `<references>`, `<repo_info>`, `<forbidden_tech>`, `<skill_catalogue>`, `<dto_data>` nếu có), luật viết, schema, cache, giới hạn. Thêm vào `DATA_TAGS`. Ghi rõ không gửi câu hỏi, đáp án, dữ liệu người học, bậc người học.
- `21`: cổng gác cho `analyze-overview` mới (mỗi node đúng 1 tên, không trùng tên, `group_id` có thật, độ dài, không công nghệ cấm, không tên bịa) và cho `explain-selection` (tên có trong `<code_data>`, `<references>`, `<repo_info>`; `skill` thuộc 16 kỹ năng; trượt ⇒ `explanation` = `null`).
- `22` Mục 6: câu đầu của mỗi run có `focus` = `FLOW` (C-10), sửa mã giả và test T-PLAN.
- Phiếu `vai-C/`: C03 (câu `FLOW`), C06 (câu vai trò), C09 (tổng quan mới), thêm phiếu C11 cho `explain-selection`.
- Xong khi: `20` ≤ 62 000, `21` ≤ 48 000; mỗi lời gọi có test trong "Test bắt buộc".

### Thiện (vai A)

**Giữ file:** `spec/02`, `spec/03`, `spec/01`, `spec/04`. **Làm `02` trước**, vì mọi người cần kiểu dữ liệu để code.

- `02`: thêm và sửa kiểu ở Mục 3 của file này; thêm `CONFIG`; thêm mã lỗi và mã HTTP; bỏ `ERR_OVERVIEW_NOT_READY`.
- `03`: thêm endpoint `explain-selection` vào bảng endpoint và luồng ghi (kiểm vùng chọn từ snapshot ⇒ cache ⇒ gọi AI ⇒ cổng gác ⇒ ghi cache); thêm khóa cache `SELECTION_EXPLAIN` ở Mục 3.3; Mục 6.6: `analyze-overview` không còn chờ node; đếm lượt `explain` mỗi phiên.
- `01`: sơ đồ thành phần và luồng 5.1 (tổng quan gọi trước, tải trước node sau). **Sửa INV-02** thành 5 lời gọi, thêm `explain-selection` (D-82). Các INV khác giữ nguyên.
- `04`: sơ đồ và chỗ ghi "4 lời gọi" đổi thành 5 lời gọi; `03` Mục 8 (`GEMINI_API_KEY`) cũng vậy.
- Xong khi: `02` ≤ 52 000, `04` ≤ 42 000; tên trong `02` khớp Mục 3 hoặc đã báo nhóm tên mới; `grep "4 lời gọi" docs/spec` không còn kết quả.

### Phat107 (vai D, kiêm ingest)

**Giữ file:** `spec/30`, `spec/10`, `quy-trinh-code-21h/vai-D/*`, `prototype.html`.

- `30`: viết lại theo `prototype.html` và D-81 … D-84:
  - bản đồ chia nhóm, mỗi bài có tên AI kèm nhãn "AI đặt tên" và tên code ở dòng nhỏ;
  - Tổng quan 2 nhịp (D-71), nút bắt đầu ở bài gốc của đường chính;
  - thẻ vai trò; tab X-Ray là tour; khung code theo tab file; thẻ khái niệm và nút xem dòng;
  - tóm tắt điểm hay, điểm dở, bấm tô đúng dòng;
  - gợi ý trỏ code có nút "Mở Bước k trong tour" và "Quay lại câu hỏi";
  - ẩn câu `DROPPED`;
  - popover giải thích đoạn chọn (nút cạnh vùng bôi đen, trạng thái chờ, lỗi, hết lượt, cổng gác chặn);
  - không có ô chọn bậc.

  Sửa Mục 7.2, 7.3: gọi tổng quan trước, tải trước node sau.
- `10`: giữ `readme_excerpt` và `manifest_description` lúc nạp repo, che secret, cắt theo `CONFIG.OVERVIEW_README_MAX_CHARS`.
- `prototype.html`: thêm chú thích đầu file: bản vẽ tham chiếu của D-81; ô chọn bậc chỉ để thử; chưa có popover giải thích đoạn chọn.
- Phiếu `vai-D/`: chia theo màn. Thứ tự làm: tab file, tour, thẻ khái niệm, tô đúng dòng, gợi ý trỏ về tour, ẩn ⊘; sau đó thẻ vai trò, bản đồ nhóm, Tổng quan, popover.
- Xong khi: `30` ≤ 50 000, `10` ≤ 44 000.

### Minh (vai B, engine)

**Giữ file:** `spec/11` (và thêm 1 dòng D-85 vào `spec/00`).

- `11`: trong phần B-39, mỗi bài có `entities` (tên và thao tác lấy từ bước `DATA_ACCESS` hoặc từ route), cạnh có `via_entities`, cách gom `groups` (theo thực thể dùng chung; không đọc được ⇒ theo đoạn đầu route; bài thuật toán hoặc bài không có cạnh ⇒ `STANDALONE`), thứ tự tất định.
- `00`: thêm D-85 cho luật nối bài theo phụ thuộc dữ liệu (B-39, thay D-07, D-73, sửa D-55), giữ trần 50 000.
- Xong khi: `11` ≤ 46 000; có test cho gom nhóm trên `shop-api` và BrewLite.

### Lê Ngọc Quý (vai B, Java)

Không sửa doc đợt này. Tiếp tục Java theo lộ trình, giữ mốc 19:00.

### Người quay lại sau

**Giữ file:** `quy-trinh-code-21h/vai-D/the-khai-niem.md` (file mới).

Viết 16 thẻ theo `SWE_SKILLS`: tên tiếng Việt, "Là gì" (2 câu), "Ví dụ đời thường" (1 câu), "Vì sao quan trọng" (1 câu). Không nêu cách sửa, không nêu con số. Mẫu 3 thẻ có sẵn trong `prototype.html` (biến `SKILLS`).

## 5. Kiểm trước khi báo xong

Đo dung lượng file spec (đếm byte, không tính `\r`):

```bash
node -e "for(const f of process.argv.slice(1)){const b=require('fs').readFileSync(f,'utf8').replace(/\r/g,'');console.log(Buffer.byteLength(b),f)}" docs/spec/*.md
```

Tự kiểm:
- Chỉ đổi file của mình: `git diff --stat`.
- Tên kiểu, hằng số, mã lỗi dùng đúng Mục 3.
- Không còn chữ nói tổng quan chờ mọi node, không còn "4 lời gọi" trong file mình giữ.
- Bản vẽ trong `30` khớp `prototype.html`, trừ ô chọn bậc.

## 6. Sau khi xong doc: code

Mở PR doc xong là sang code, không chờ người khác. Việc cần kiểu dữ liệu mới ở Mục 3 thì chờ Thiện merge `02` (mốc 18:00), trong lúc đó làm việc không cần kiểu mới trước.

1. `git switch main && git pull`.
2. Mỗi nhóm mã một nhánh nhỏ, ví dụ `c/fix-c12-tong-quan`.
3. Dán prompt, thay tên, vai, mã:

```text
Tôi là <tên> (<vai>). Đọc docs/quy-trinh-code-21h/loi-can-sua.md và làm theo mục
"Quy trình cho agent". Làm <mã, ví dụ C-12>, theo cột Code của tôi ở mục
"Lộ trình mới ngày 06/11/2026 (chiều)". Chỉ sửa file luồng tôi giữ. Xong thì đổi
trạng thái lỗi thành "chờ kiểm", báo kết quả typecheck, lint, test, chưa commit.
```

4. Người kiểm đọc diff, chạy lại test, tự commit, mở PR. Thiện duyệt và merge.
