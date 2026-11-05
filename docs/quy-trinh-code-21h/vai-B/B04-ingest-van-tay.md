# B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–17:30 (H+4 → H+5.5) |
| Nhánh | `b/B04-ingest-van-tay` |
| Cần có trước | B03, E03 (`maskSensitive` đã merge) |
| Mở đường cho | A06, B05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu B04`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B04-ingest-van-tay
```

Kiểm tra PR E03 (`maskSensitive`) đã merge vào `main` trước khi thực hiện.

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B03, E03 (`maskSensitive` đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/10_ENGINE_INGEST.md` Mục 0, 10, 11, 12, 13, Test bắt buộc
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 dòng D25
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/types.ts`
- `src/server/engine/ingest/special.ts`
- `src/server/engine/ingest/secrets.ts`
- `src/server/engine/ingest/fingerprint.ts`
- `src/server/engine/ingest/index.ts`
- `src/server/engine/ingest/__tests__/van-tay.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `special.ts` trích xuất file ảo từ `.ipynb`, `.vue`, `.svelte` theo `docs/spec/10_ENGINE_INGEST.md` Mục 10 (ING-100, ING-101, ING-102).
3. B2: Viết `secrets.ts`: hàm `redactSecrets`, kiểm tra cờ injection `hasInjectionText`, gọi hàm `maskSensitive` từ `src/lib/moderation.ts` do Vai E viết, cộng dồn `redacted_secret_count` theo `docs/spec/10_ENGINE_INGEST.md` Mục 11 (ING-110, ING-113) và `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5.
   - **Đếm số lần `maskSensitive` che:** hàm của Vai E chỉ trả chuỗi (đúng chữ ký spec 04), không trả số lần. Không sửa `src/lib/moderation.ts`; số lần che = (số chuỗi `***` sau khi che) − (số `***` có sẵn trước khi che), cộng vào `redacted_secret_count` (Mục 11 ý 3). Thứ tự: `redactSecrets` ⇒ kiểm bảo toàn dòng ⇒ `maskSensitive`.
4. B3: Viết phần còn lại của `fingerprint.ts` (vân tay dự án, archetype, framework, tech_stack), kiểm tra kết quả rỗng `assertNotEmpty`, và hoàn thiện hàm điều phối `runIngest` trong `src/server/engine/ingest/index.ts` theo Mục 0, 12, 13 (ING-02 tất định, ING-03 `ingest_ms`, ING-131). `runIngest` gọi lại các hàm B02, B03 đã viết (không viết lại), dùng kiểu trong `ingest/types.ts`, lỗi ném `IngestionError` của `ingest/types.ts`. Cache (ING-04) là việc của Vai A (A05), không làm ở đây. Ba việc B02, B03 để lại cho `runIngest`:
   - **Hẹn giờ và thử lại (ING-40, ING-44):** mỗi lần thử tạo 1 `AbortController` hết hạn sau `CONFIG.STREAM_TIMEOUT_MS`, truyền `signal` đó cho cả `downloadArchive` (B02) lẫn `listEntries`, `inflateSelected` (B03). Nguồn GitHub gặp lỗi tải hoặc zip hỏng (`ERR_STREAM_CORRUPTED` từ `listEntries`, ING-63) ⇒ chờ `CONFIG.STREAM_RETRY_DELAY_MS`, làm lại cả lượt 1 lần với timer mới. Upload không thử lại. Giải nén (`inflateSelected`) nằm **trong** lượt thử và dùng `signal` của lượt đó, không dùng `signal` của người gọi. Không thử lại lồng nhau: `downloadArchive` (B02) đã tự thử lại 1 lần, nên `runIngest` chỉ thử lại khi lỗi đến từ `listEntries` (zip hỏng) hoặc hết giờ cả lượt; lỗi từ `downloadArchive` ném thẳng.
   - **`truncated`:** cộng thêm `stream_cut` (Mục 9 ý 5: `truncated = stream_cut ∨ inflated_cap_hit ∨ skipped.quota > 0`), vì `inflateSelected` của B03 không biết `stream_cut`.
   - **Minified cho file `SPECIAL`** (Mục 9 ý 4.6): B03 giải nén `.ipynb`/`.vue`/`.svelte` không kiểm minified ⇒ `runIngest` kiểm trên code ảo sau `extractNotebook`/`extractSfcScript` (dùng lại `decodeAndFilter` với `check_minified: true`). Ứng viên code không có `language` thì bỏ, không gán bừa ngôn ngữ.
   - **`has_submodules`:** có `.gitmodules` ở gốc (`10` Mục 7) ⇒ cờ nội bộ, dùng ở ING-131.
   - **Warning khi GitHub rơi vào `ARCHIVE_HASH`** (T-ING-33 ghi "+ warning"): `computeSnapshot` không nhận `report` nên `runIngest` ghi. Spec chưa có câu chữ warning ⇒ câu tạm theo luật chung README (comment `// Câu tạm…` + ghi báo cáo). Cùng luật cho warning "lệch dòng sau khi che ⇒ bỏ file" (Mục 11 ý 2).
   - Hàm nào trong spec không nhận `report` mà luật cần đếm `skipped.*` hoặc ghi warning: thêm `report?: IngestionReport` ở cuối chữ ký (luật chung, xem README vai B).
   - **Tier của ngôn ngữ trong `buildFingerprint`** (Mục 12 ý 6, 7) lấy từ registry. Registry thật (B01) chỉ có TS, TSX, JS, Python nên ca 2 của T-ING-31 (C# `STRUCTURAL`) không dựng được bằng file thật: thêm tham số tùy chọn `registry?: LanguageRegistry` ở CUỐI chữ ký `buildFingerprint` (mặc định `DEFAULT_LANGUAGE_REGISTRY` của B03); test T-ING-31 ca 2 truyền registry có adapter `CSHARP` không `import_resolver` (tier `STRUCTURAL`).
   - **Luồng `runIngest` theo `IngestSource.kind`:** `GITHUB_URL` ⇒ `parseGithubUrl` ⇒ `probeRepo` ⇒ `resolveRef` ⇒ `downloadArchive`; `GITHUB_COMMIT` ⇒ `downloadArchive` URL `https://codeload.github.com/{owner}/{repo}/zip/{sha}`; `ZIP_UPLOAD` ⇒ `bytes` có sẵn (route A06 đã gọi `receiveUpload`), `repo_name` = tên file bỏ `.zip`. Sau đó cùng một đường: `computeSnapshot` ⇒ `listEntries` ⇒ `classifyEntry` ⇒ `detectScope` ⇒ `selectFiles` ⇒ `inflateSelected` ⇒ `special.ts` ⇒ `secrets.ts` ⇒ `buildFingerprint` ⇒ `assertNotEmpty`.
5. Viết test trong `src/server/engine/ingest/__tests__/van-tay.test.ts` bao phủ các ca T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và ca D25 của `docs/spec/50_TEST_VA_FIXTURE.md`, thêm ca `runIngest` thử lại 1 lần khi zip hỏng. Tên test bắt đầu bằng mã T-ING hoặc ING. Khóa và token giả trong test T-ING-26, T-ING-27 dựng bằng ghép chuỗi (luật README) để hook quét khóa không chặn commit. Test D25: kiểm **dòng comment** không còn email và SĐT; không kiểm cả đoạn `not.toContain("0912345678")` vì `10912345678` (phải giữ) chứa chuỗi đó. Zip mẫu dựng trong RAM bằng `fflate`, mạng giả bằng mock `fetch`.
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Che secret (lỗi B-22, ING-110):** dùng đúng mẫu mới. Bản cũ lọt 10/14 mẫu: `SECRET_KEY`, `app.secret_key`, `JWT_SECRET_KEY`, `{"password": "..."}`, `{'apiKey': '...'}`, `DB_PASSWORD_PROD`, Stripe, Slack, `https://user:pass@host`, private key trong 1 dòng.
- Khóa trong nháy phải có cặp nháy quanh cả tên khóa. Nếu chỉ cho 1 dấu nháy tùy chọn sau tên khóa thì sẽ che nhầm `isLogin ? 'current-password' : 'new-password'`.
- **Regex JavaScript không có `\z` (lỗi B-23):** dùng `$(?![\s\S])` cho cuối file ở Pipfile, `Cargo.toml`, `pubspec.yaml`. `\z` chỉ khớp chữ `z`, làm Pipfile có `pytz` mất hết gói.
- **Ngôn ngữ `.vue`, `.svelte` (lỗi B-24):** tính `language_breakdown` theo ngôn ngữ ING-101 đã tìm trong `file_language`, không cộng cứng vào `TYPESCRIPT`. File không được giữ mới dùng giá trị mặc định.
- **`cleanJson` (lỗi B-25):** bỏ comment có xét chuỗi, nếu không `"src/**/*"`, `"https://..."`, `"@/*"` bị coi là comment. Export 1 hàm dùng chung cho `resolvers/ts_js.ts`. `tsconfig.json`, `jsconfig.json` lỗi thì không hiện warning cho người học.
- **ING-131 mới (lỗi B-07):** kiểm `unsupported_ratio` kể cả khi còn file code. Lớn hơn `CONFIG.UNSUPPORTED_LANGUAGE_RATIO` ⇒ `ERR_UNSUPPORTED_LANGUAGE`; lớn hơn 0 ⇒ warning.
- **`tech_stack` (lỗi B-09):** giữ đủ gói, kể cả `devDependencies`, vì cổng gác dùng danh sách này. Việc lọc là của Vai D lúc hiển thị.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/ingest`
- Có đủ các test T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và test D25 của spec 50 (số dòng `\n` không đổi), tất cả chạy xanh.
- Toàn bộ secret và PII được che đúng định dạng `<REDACTED_SECRET>` và `***`.
- `npx vitest run src/server/engine` vẫn xanh (không làm hỏng B01–B03) và `npx eslint src/server/engine` 0 error, 0 warning.
- `pyproject.toml`: đọc `[project].dependencies` bằng hàm quét có đếm ngoặc và bỏ qua ký tự trong chuỗi, không dùng regex, vì tên gói có thể có extras như `fastapi[standard]`. Regex JavaScript không có `\z`, cuối chuỗi viết `$(?![\s\S])`.
- T-ING-27, T-ING-32 theo bản mới của spec, gồm các ca không được che nhầm.
- Test Pipfile có `pytz` đứng trước `fastapi` đọc đủ gói; Pipfile chỉ có `[packages]` đọc đủ gói.
- Test repo `.vue` JavaScript có `primary_language = JAVASCRIPT`.
- Test tsconfig có dấu phẩy thừa và `"src/**/*"` không bị báo hỏng.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không ghi file ra đĩa ở bất kỳ đâu (ING-01), kể cả trong test. Không `Math.random`, không dùng đồng hồ trừ `performance.now()` cho `ingest_ms` (ING-02, ING-03).
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không tự viết `maskSensitive`; dùng hàm `maskSensitive` từ `src/lib/moderation.ts` của Vai E; E03 chưa merge thì ghi `kẹt`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/ingest` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] `npx vitest run src/server/engine` và `npx eslint src/server/engine` đều sạch.
- [ ] Có đầy đủ các test T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và ca D25 của spec 50.
- [ ] Số dòng `\n` của file mã nguồn được bảo toàn trước và sau khi che secret (D25).
- [ ] Repo có `"fastapi[standard]>=0.1"` trong `pyproject.toml` ra đúng `WEB_BACKEND`, `FastAPI`.
- [ ] Chạy thật `gothinkster/django-realworld-example-app`: không còn `SECRET_KEY` thật trong code. Chạy `gin-gonic/examples`: báo chưa hỗ trợ Go, không gọi là `JAVASCRIPT`.
- [ ] `nestjs/nest` không có warning tsconfig hỏng.

```text
Task "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/special.ts
git commit -m "feat(engine): notebook, vue, định dạng đặc biệt"
git add src/server/engine/ingest/secrets.ts
git commit -m "feat(engine): che secret và PII"
git add src/server/engine/ingest/types.ts src/server/engine/ingest/fingerprint.ts src/server/engine/ingest/index.ts src/server/engine/ingest/__tests__/van-tay.test.ts
git commit -m "feat(engine): vân tay dự án, runIngest"
git pull --rebase origin main
git push -u origin b/B04-ingest-van-tay
gh pr create --base main --title "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" --body "Closes #<số Issue>"
```

Báo cho Vai A (A06) rằng `runIngest` đã hoàn thành và sẵn sàng tích hợp. Vai A merge khi CI xanh.

## Tiếp theo

→ [B05](B05-tang1.md)
