# B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4: tải và lọc repo demo trong RAM** |
| Nhánh | `b/B03-ingest-loc` |
| Cần có trước | B02, B01 (`LANGUAGE_REGISTRY`, `KNOWN_NO_GRAMMAR` để phân loại đuôi file) |
| Mở đường cho | B04 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu B03`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B03-ingest-loc
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B02, B01 (`LANGUAGE_REGISTRY`, `KNOWN_NO_GRAMMAR` để phân loại đuôi file). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/10_ENGINE_INGEST.md` Mục 0, 6, 7, 8, 9, Test bắt buộc
- `docs/spec/11_ENGINE_DO_THI.md` Mục 1 (bảng đuôi file của registry)
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3 (`IngestionReport`), Mục 4
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/types.ts`
- `src/server/engine/ingest/unzip.ts`
- `src/server/engine/ingest/prune.ts`
- `src/server/engine/ingest/priority.ts`
- `src/server/engine/ingest/fingerprint.ts`
- `src/server/engine/ingest/__tests__/loc.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B0: Thêm vào `src/server/engine/ingest/types.ts` (B02 đã tạo, giữ nguyên kiểu cũ) các kiểu nội bộ: `ZipEntryMeta` (Mục 6), `EntryClass` (Mục 7), `ClassifiedEntry` = `ZipEntryMeta` kèm kết quả `classifyEntry` (`cls`, `language`), `ScopeDecision` (Mục 8). Tham số `registry: LanguageRegistry` của `classifyEntry` là `LANGUAGE_REGISTRY` và `KNOWN_NO_GRAMMAR` import từ `src/server/engine/graph/registry.ts` (B01); không chép bảng đuôi file sang `ingest/`.
   - Chốt kiểu `LanguageRegistry` (spec dùng mà không định nghĩa), đặt trong `types.ts`: `{ adapters: readonly LanguageAdapter[]; known_no_grammar: Record<string, LanguageId> }`. `prune.ts` export hằng `DEFAULT_LANGUAGE_REGISTRY` dựng từ `LANGUAGE_REGISTRY` và `KNOWN_NO_GRAMMAR`; `extensionMap` (ING-76) và tập `manifest_files` (ING-74) suy ra từ `adapters` bên trong `prune.ts`.
3. B1: Viết `unzip.ts` đọc mục lục zip Central-Directory-First hoặc streaming và chuẩn hóa đường dẫn theo `docs/spec/10_ENGINE_INGEST.md` Mục 6 (ING-60, ING-61, ING-63).
   - Chốt ING-63: thêm hàm `listEntries(a: RawArchive, signal: AbortSignal, report?: IngestionReport): ZipEntryMeta[]` gọi `readCentralDirectory`, trả `null` thì gọi `listEntriesStreaming`; cả hai không ra entry hợp lệ ⇒ ném `IngestionError` mã `ERR_STREAM_CORRUPTED` (`source = "GITHUB"`) hoặc `ERR_UPLOAD_INVALID` (`source = "ZIP"`). Vòng thử lại của ING-44 KHÔNG làm ở đây (B04 `runIngest` làm).
   - Đọc EOCD dùng lại `readEocdComment`/logic của `snapshot.ts` nếu hợp, không sửa `snapshot.ts`.
4. B2: Viết `prune.ts` phân loại entry theo Mục 7 (ING-70, ING-71, ING-72, ING-73, ING-74, ING-75, ING-76, ING-77), viết `priority.ts` tính điểm ưu tiên file FPS và xếp ứng viên theo Mục 8 (ING-84, ING-87, ING-88), viết phần `detectScope` trong `fingerprint.ts` xác định monorepo scope theo Mục 8 (ING-80). `fingerprint.ts` lúc này chỉ có `detectScope`; phần vân tay dự án để B04.
   - Chốt cách hiểu ROLE theo segment thư mục (Mục 8 ý 7), vì câu chữ spec mâu thuẫn với bảng T-ING-16 (`server` ∈ ROLE_NAMES nhưng `server/tests/order.test.ts` kỳ vọng 1.3333): file **trong** scope chỉ xét các segment thư mục nằm **sau** offset scope (scope `server/` thì không tính segment `server`); file ngoài scope xét toàn path.
5. B3: Hoàn thiện giải nén có giới hạn, chống zip bomb và lọc nội dung trong `unzip.ts` theo Mục 9 (`inflateSelected`, `decodeAndFilter`). `inflateSelected` phải chạy được cả khi `local_offset = null` (chế độ streaming: lượt 2 chạy lại `fflate.Unzip`, chỉ giữ entry đã chọn). Lượt 2 chuẩn hóa path **giống hệt** lượt 1 (dùng chung hàm chuẩn hóa ING-60, biết lượt 1 có cắt segment chung hay không), không đoán bằng cách thử cắt segment đầu. Kiểm `signal.aborted` giữa các entry (ING-40).
6. Chốt cách đếm `skipped.*` và ghi warning: hàm nào trong spec không nhận `report` mà luật yêu cầu đếm `skipped.*` hoặc thêm warning (ING-60 đếm `binary`/`garbage`; ING-70, ING-71…ING-73 đếm `garbage`/`binary`; ING-77 đếm `unsupported_lang`; Mục 8 bước 4 warning nhiều backend) thì thêm tham số tùy chọn `report?: IngestionReport` ở CUỐI chữ ký (`readCentralDirectory`, `listEntriesStreaming`, `classifyEntry`, `detectScope`). Giữ nguyên thứ tự và kiểu các tham số spec đã ghi. Có `report` thì cộng/ghi, không có thì bỏ qua. Câu warning lấy nguyên văn từ spec; chỗ spec chỉ ghi "+ warning" mà không có câu (manifest quá `CONFIG.MAX_MANIFEST_BYTES`, Mục 9 ý 2) thì dùng câu tạm có số lấy từ `CONFIG` và ghi vào báo cáo để người giữ spec chốt. `report.truncated` ở B03 chỉ tính `inflated_cap_hit` và `skipped.quota`; phần `stream_cut` để B04.
7. Viết test trong `src/server/engine/ingest/__tests__/loc.test.ts` bao phủ các ca T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21. Tên mỗi test (kể cả `describe` bọc ngoài nếu có) bắt đầu bằng mã T-ING hoặc ING. T-ING-12 kiểm `receiveUpload` có sẵn của B02 (chỉ import, không sửa `download.ts`). Zip mẫu dựng trong RAM bằng `fflate` (`zipSync`), không đọc file trên đĩa. Số kỳ vọng (FPS 5.25, 2.3333…) lấy đúng bảng test spec, so sánh số thực bằng `toBeCloseTo`. Dữ liệu test cần file lớn (T-ING-20, T-ING-21) phải dùng nội dung giả ngẫu nhiên tất định (vd. LCG sinh hex, không `Math.random`), dòng ngắn dưới `CONFIG.MAX_LINE_LENGTH`: nội dung lặp lại nén vượt `CONFIG.MAX_COMPRESSION_RATIO` sẽ bị chống zip bomb loại hết.
8. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Dừng giải nén thật (lỗi B-18, Mục 9 ý 1):** không đẩy cả file vào `Inflate` một lần. Đẩy theo từng phần nhỏ, vượt trần thì dừng ngay, không chạy tiếp. Đo thật: bản cũ bị zip 0,5 MB bung 512 MB chiếm 2,8 giây dù vẫn loại đúng file. `listEntriesStreaming` đặt trần tổng byte và kiểm `signal`. Manifest qua cùng lớp kiểm với ING-88.
- **Zip macOS (lỗi B-19, ING-60, ING-71):** bỏ `__MACOSX/` và `._*` trước khi tìm segment chung.
- **Thư mục viết hoa (lỗi B-21, ING-80):** scope tường minh so không phân biệt hoa thường, dùng tên thư mục thật. Repo có `Backend/`, nhập `backend` vẫn chạy.
- **Cờ test (lỗi B-20, ING-87):** có đủ `integration`, `sample`, `samples`, `mocks`. Viết 1 hàm `isTestPath` export từ `priority.ts`, `filePriorityScore` dùng lại nó, không viết bản thứ hai.
- **Ứng viên scope (lỗi B-17):** `candidates` gồm cả client, thứ tự server rồi client, `bytes` giảm dần, để `runEngine` có đường lùi (B07).

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/ingest/__tests__/loc.test.ts`
- Có đủ các test T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21 và tất cả chạy xanh.
- Giải nén tuân thủ đúng trần `CONFIG.MAX_INFLATED_BYTES` và `CONFIG.MAX_CLEAN_FILES`.
- `npx vitest run src/server/engine` vẫn xanh (không làm hỏng test B01, B02).
- `npx eslint src/server/engine` 0 error, 0 warning (CI chạy lint).
- Test zip khai 10 KB bung 512 MB: dừng ngay sau trần, không giải nén hết. Đo số byte đã nhận, không đo giờ.
- Test zip có `__MACOSX/` vẫn cắt được segment chung.
- Test `isTestPath` cho `integration/a.ts`, `mocks/a.ts`, `src/a.spec.ts`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không ghi file ra đĩa ở bất kỳ đâu (ING-01), kể cả trong test.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/ingest/__tests__/loc.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ 10 test từ T-ING-12 đến T-ING-21: T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21.
- [ ] `npx vitest run src/server/engine` vẫn xanh (test B01, B02 không hỏng).
- [ ] Tên test đầy đủ (gồm cả `describe` bọc ngoài) bắt đầu bằng mã T-ING hoặc ING.
- [ ] Bạn tự chạy tay một script nhỏ tải repo demo trong RAM và in ra số file giữ lại phù hợp.
- [ ] `nestjs/nest` không còn file `integration/` trong nhóm ưu tiên đầu.

```text
Task "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/types.ts src/server/engine/ingest/prune.ts src/server/engine/ingest/priority.ts src/server/engine/ingest/fingerprint.ts
git commit -m "feat(engine): phân loại entry, chọn phạm vi"
git add src/server/engine/ingest/unzip.ts src/server/engine/ingest/__tests__/loc.test.ts
git commit -m "feat(engine): mục lục zip, chuẩn hóa đường dẫn, giải nén và lọc nội dung"
git pull --rebase origin main
git push -u origin b/B03-ingest-loc
gh pr create --base main --title "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B04](B04-ingest-van-tay.md)
