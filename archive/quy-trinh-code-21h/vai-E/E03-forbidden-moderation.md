# E03 — Từ cấm, bộ lọc an toàn

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4** |
| Nhánh | `e/E03-forbidden-moderation` |
| Cần có trước | A02 |
| Mở đường cho | B04, C05, A10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E03-forbidden-moderation
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E03 — Từ cấm, bộ lọc an toàn". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 2, Test bắt buộc
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4
- `.kb/spec/00_QUYET_DINH.md` D-65
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/guard/forbidden.ts`
- `src/lib/moderation.ts`
- `src/server/ai/guard/__tests__/forbidden.test.ts`
- `src/lib/__tests__/moderation.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/server/ai/guard/forbidden.ts`: bảng công nghệ cấm, hàm `forbiddenKeywords`, regex `wordRe`, hàm `findForbidden` luôn cộng `BAD_WORDS` theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 2 (GUARD-06, GUARD-07).
3. Viết `src/lib/moderation.ts`: hàm `maskSensitive` (che email, SĐT VN, CCCD 12 số thành `***`, bảo toàn số lượng dòng `\n`), danh sách hằng `BAD_WORDS` (NFC chữ thường, chỉ từ có dấu rõ nghĩa, không từ kỹ thuật), hàm `hasInappropriateWords` dùng `wordRe` theo `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5 và `.kb/spec/00_QUYET_DINH.md` D-65. (Ghi chú: 2 file này nhận từ C; C dùng `findForbidden`, B dùng `maskSensitive`, A dùng `hasInappropriateWords`).
4. Viết test `src/server/ai/guard/__tests__/forbidden.test.ts` cho GUARD-06, GUARD-07 theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Test bắt buộc.
5. Viết test `src/lib/__tests__/moderation.test.ts` mức hàm cho các ca `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4: D22 (kill/attack/hack không bị chặn), D25 (`const ts = 10912345678;` không bị che), D26, D27 (NFD vẫn chặn, từ xấu trong từ dài hơn không chặn).
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai/guard/__tests__/forbidden.test.ts src/lib/__tests__/moderation.test.ts`
- Có test (mock AI hoặc mock DB) cho ca D28 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 (chữ AI chứa từ trong `BAD_WORDS` bị bắt như từ cấm), tên test ghi mã ca.
- Test GUARD-06, GUARD-07 chạy xanh.
- Test mức hàm cho ca D22 (kill/attack/hack không bị chặn), D25 (`const ts = 10912345678;` không bị che), D26, D27 (NFD vẫn chặn, từ xấu trong từ dài hơn không chặn) chạy xanh.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "E03 — Từ cấm, bộ lọc an toàn" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai/guard/__tests__/forbidden.test.ts src/lib/__tests__/moderation.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ test GUARD-06, GUARD-07 cho bảng công nghệ cấm và quét từ cấm.
- [ ] Có test mức hàm cho các ca D22, D25, D26, D27 theo `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4.
- [ ] `maskSensitive` bảo toàn số lượng dòng `\n`.
- [ ] `BAD_WORDS` chỉ chứa từ ngữ có dấu và cụm từ rõ nghĩa, không chứa các từ kỹ thuật (`kill`, `attack`, `hack`).

- [ ] Có test cho ca D28 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "E03 — Từ cấm, bộ lọc an toàn" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/guard/forbidden.ts src/server/ai/guard/__tests__/forbidden.test.ts
git commit -m "feat(guard): bảng công nghệ cấm, quét từ cấm"
git add src/lib/moderation.ts src/lib/__tests__/moderation.test.ts
git commit -m "feat(guard): bộ lọc an toàn"
git pull --rebase origin main
git push -u origin e/E03-forbidden-moderation
gh pr create --base main --title "E03 — Từ cấm, bộ lọc an toàn" --body "Closes #<số Issue>"
```

Nhờ Vai C review PR (bắt buộc) vì Vai C gọi `findForbidden` trong cổng gác. Báo Vai B (B04) và Vai A (A10) đã có PR. Vai A merge khi CI xanh.

## Tiếp theo

→ [E04](E04-injection-similarity.md)
