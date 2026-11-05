# Báo Cáo Lỗi Giao Diện & Trải Nghiệm 24H (SimpliFey)

Tài liệu ghi nhận các lỗi giao diện (UI), trải nghiệm (UX) và kỹ thuật phát hiện trong quá trình kiểm thử thực tế trên thiết bị di động (Mobile) với repository `https://github.com/tomminh25032006-source/CNPM_BREWLITE_ASSIGNMENT_01.git`.

---

## Danh mục lỗi phát hiện

| Mã lỗi | Màn hình / Module | Mức độ | Hiện trạng | Trạng thái |
| :-- | :-- | :-: | :-- | :-: |
| **BUG-MOB-01** | `Dialog.tsx` · `RepoOverviewModal.tsx` | 🔴 **Cao (Blocker)** | Modal Tổng quan tràn màn hình, mất Header/nút đóng (X) và không cuộn được trên Mobile | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-02** | `learn/page.tsx` · `CodeSnippetViewer.tsx` | 🟠 **Trung bình (UX)** | Đóng modal tổng quan rơi vào màn hình rỗng, không hiện đồ thị bài học để chọn node | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-03** | `LessonGraphDrawer.tsx` | 🔴 **Cao (Blocker UX)** | Đồ thị bài học tự động gán node đầu tiên (`Order`), chạm vào node không vào học được | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-04** | `SkillChips.tsx` · `workbench.ts` | 🟠 **Trung bình (UX)** | Nút đỏ "Thử lại" xuất hiện khó hiểu ở cuối phần chỉ số code X-Ray dù câu hỏi đã tải xong | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-05** | `learn/page.tsx` · `FeynmanQuestionSection.tsx` | 🔴 **Cao (Blocker UX)** | Bấm "Bỏ qua câu này" gây giật màn hình, mất bài học đang chọn, thiếu nút chuyển đổi xem Code/Feynman trên Mobile | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-06** | `CockpitHeader.tsx` · `learn/page.tsx` | 🔴 **Cao (Nguy hiểm)** | Nút "Repo khác" trên Header không có hộp thoại xác nhận — chạm nhầm lập tức xoá phiên học và văng về trang chủ | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-07** | `SubmitEvaluationDialog.tsx` | 🟠 **Trung bình (UX)** | Làm xong câu hỏi cuối chỉ có nút dẫn sang `/report`, làm đứt mạch học 20 bài của người dùng | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-08** | `CockpitHeader.tsx` | 🟠 **Trung bình (Layout UI)** | Tên repo dài trên thanh Header mobile làm vỡ thanh Breadcrumb, bị cuộn ngang mất tên repo và nút tính năng | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-09** | `CodeSnippetViewer.tsx` | 🟡 **Thấp (Edge case UX)** | Nút "Sao chép" và "Toàn bộ file" vẫn bấm được khi chưa chọn node, sao chép rỗng và mở modal trống | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-10** | `RepoOverviewModal.tsx` · `page.tsx` | 🟠 **Trung bình (Mất trạng thái)** | Bấm chọn node từ modal Tổng quan không đồng bộ URL query (`&node=...`), tải lại trang bị mất bài đang học | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-11** | `LessonGraphDrawer.tsx` | 🟡 **Thấp (UX Feedback)** | Bấm vào node bị khoá (`LOCKED`) trên đồ thị không có phản hồi trực quan, người dùng tưởng nút bị liệt | 🟡 **Đã sửa (chờ kiểm)** |
| **BUG-MOB-12** | `ReportWrongDialog.tsx` | 🟡 **Thấp (Form State)** | Ô nhập lý do khiếu nại không xóa trắng sau khi đóng hoặc hoàn tất, lưu lại văn bản cũ cho câu sau | 🟡 **Đã sửa (chờ kiểm)** |

---

## Chi tiết các lỗi

### BUG-MOB-01: Modal Tổng quan kiến trúc (`RepoOverviewModal`) bị tràn màn hình, mất Header và hoàn toàn không cuộn được trên Mobile

* **Vị trí phát sinh:** `src/components/ui/Dialog.tsx` và `src/app/learn/components/RepoOverviewModal.tsx`.
* **Mức độ:** 🔴 **Cao (Blocker)**
* **Hiện trạng:** Ngay sau khi quét xong repo, modal bung ra bị tràn màn hình, mất tiêu đề và nút 'X', không thể cuộn nội dung.
* **Nguyên nhân:** Khung chứa Dialog thiếu ràng buộc chiều cao tối đa theo khung nhìn (`max-h-[calc(100dvh-2rem)]`) và không có cơ chế `overflow-y-auto`.
* **Kết quả khắc phục:** Đã bổ sung cấu trúc Flex Column có giới hạn chiều cao và thanh cuộn nội dung chuẩn di động trong `Dialog.tsx`.

---

### BUG-MOB-02: Bấm ra ngoài đóng modal tổng quan rơi vào màn hình rỗng, không hiện đồ thị bài học để chọn node

* **Vị trí phát sinh:** `src/app/learn/page.tsx` và `src/app/learn/components/CodeSnippetViewer.tsx`.
* **Mức độ:** 🟠 **Trung bình (UX)**
* **Hiện trạng:** Khi người dùng đóng modal tổng quan kiến trúc, màn hình rơi vào trạng thái rỗng thụ động, không có chỉ dẫn hành động tiếp theo.
* **Kết quả khắc phục:**
  * Tự động kích hoạt mở `LessonGraphDrawer` khi đóng modal tổng quan mà chưa có node nào được chọn.
  * Bổ sung nút bấm nổi bật **"Mở đồ thị bài học"** với icon trực quan ngay tại vị trí trống của `CodeSnippetViewer`.

---

### BUG-MOB-03: Đồ thị bài học (`LessonGraphDrawer`) tự động chọn node đầu tiên (`Order`), chạm vào node trong đồ thị không vào học được

* **Vị trí phát sinh:** `src/app/learn/components/LessonGraphDrawer.tsx` và `src/app/learn/page.tsx`.
* **Mức độ nghiêm trọng:** 🔴 **Cao (Blocker UX)**
  * Người học không thể bắt đầu bài học mong muốn từ đồ thị trên mobile.
  * Buộc người dùng phải quay về trang Lộ trình (`/roadmap/[courseId]`) mới bấm vào học được.

#### 1. Hiện trạng thực tế
1. **Tự động gán node đầu tiên:** Khi vừa mở "Đồ thị bài học", thanh banner trên cùng luôn tự hiển thị `Order (algo-order-e48023) [Tiếp tục học ->]`, dù người dùng chưa hề chọn node này.
2. **Không vào học được khi bấm trên đồ thị:**
   * Các node trên bản đồ ReactFlow rất nhỏ trên màn hình điện thoại.
   * Khi người dùng chạm ngón tay vào một node khả dụng khác (màu cam), ngăn kéo drawer vẫn che kín toàn bộ màn hình, không đóng lại và không đưa người dùng vào bài học.

#### 2. Nguyên nhân kỹ thuật gốc (Root Cause)
1. **Logic gán cưỡng ép node đầu tiên:**
   ```typescript
   // LessonGraphDrawer.tsx cũ
   const currentActiveId = selectedNodeId || allNodes[0]?.id;
   const activeNode = allNodes.find((n) => n.id === currentActiveId) || allNodes[0];
   ```
2. **Không đóng Drawer khi chọn node:**
   * Trong `learn/page.tsx`, hàm `handleSelectNode` chỉ gọi `openNode(nodeId)` mà không gọi `setIsGraphDrawerOpen(false)`.
   * Trên Mobile, Drawer toàn màn hình che kín không gian làm việc.
3. **Thao tác chạm trên ReactFlow Mobile quá khó:**
   * Bản đồ DAG chứa 20 node bị thu nhỏ trên màn hình dọc 390px, ngón tay rất dễ chạm trượt hoặc bị nhận diện nhầm là thao tác vuốt cuộn (pan/zoom).

#### 3. Kết quả khắc phục
1. **Bỏ gán cưỡng ép node đầu tiên:** Banner hiển thị thông báo hướng dẫn chọn bài học màu cam nếu chưa có node nào được chọn.
2. **Đóng Drawer ngay khi chọn node khả dụng:** Tự động gọi `onClose()` để đưa người học vào buồng lái ngay lập tức.
3. **Bổ sung chế độ xem "Danh Sách Bài Học" (`viewMode: "list"`) ngay trong Drawer:**
   * Thêm bộ chuyển đổi **`[Đồ thị]`** | **`[Danh sách]`** ở đầu Drawer.
   * Chế độ **Danh sách** hiển thị 20 bài học dạng thẻ to rõ, có nút **"Bắt đầu học ->"** tối ưu 100% cho thao tác chạm ngón cái trên Mobile.

---

### BUG-MOB-04: Nút đỏ "Thử lại" xuất hiện khó hiểu ở cuối phần chỉ số code X-Ray dù câu hỏi đã tải xong

* **Vị trí phát sinh:** `src/app/learn/components/SkillChips.tsx` (`StartAnswerButton`) và `src/store/workbench.ts`.
* **Mức độ nghiêm trọng:** 🟠 **Trung bình (High UX Confusion)**
* **Hiện trạng:** Ngay dưới hộp "CHỈ SỐ: I: 1 · A: 0 · D: 0", xuất hiện một nút màu đỏ ghi `[ 🔄 Thử lại ]` không rõ mục đích, dù câu hỏi Feynman đã tải thành công ngay bên dưới.
* **Nguyên nhân gốc:** Cờ lỗi `ui.errors["enrich:" + nodeId]` không được xóa về `null` sau khi nạp câu hỏi thành công; nút `StartAnswerButton` nhảy vào nhánh lỗi và hiển thị nút đỏ cụt lủn.
* **Kết quả khắc phục:**
  1. Xóa sạch cờ lỗi khi API nạp câu hỏi thành công (`res.ok`).
  2. Chỉ hiển thị nút thử lại khi thực sự chưa có câu hỏi (`if (error && !run)`). Khi đã có câu hỏi, hiển thị nút màu cam kêu gọi hành động chuẩn: `Bắt đầu trả lời (3 câu) →`.

---

### BUG-MOB-05: Bấm "Bỏ qua câu này" gây giật màn hình, mất bài học đang chọn, thiếu nút chuyển đổi xem Code/Feynman trên Mobile

* **Vị trí phát sinh:** `src/app/learn/page.tsx`, `src/app/learn/components/FeynmanQuestionSection.tsx`, `src/app/learn/components/RunSummary.tsx`.
* **Mức độ nghiêm trọng:** 🔴 **Cao (Blocker UX)**
* **Hiện trạng:**
  * Khi người học bấm "Bỏ qua câu này", form câu hỏi hoàn tất nhưng màn hình trên Mobile bị giật ngược lên đỉnh trang xem Code, mất dấu câu hỏi.
  * Node đang học không được đồng bộ lên URL (`&node=...`), khi làm mới trang hoặc chuyển qua lại thì bị rơi về màn hình rỗng "Chưa chọn bài học".
  * Không có thanh điều hướng chuyển đổi giữa **Xem Code** và **Trả lời Feynman** trên màn hình nhỏ.
* **Nguyên nhân gốc:**
  1. Giao diện mobile hiển thị cả cột Code và cột Feynman theo thứ tự xếp chồng dọc (stack layout), làm trang bị quá dài và thanh cuộn bị giật khi trạng thái form thay đổi.
  2. Thiếu đồng bộ trạng thái bài học vào URL trình duyệt qua `window.history.replaceState`.
  3. Khi kết thúc câu hỏi cuối cùng của node qua nút "Bỏ qua", `RunSummary` không có nút bấm dẫn tiếp sang bài học mới.
* **Kết quả khắc phục:**
  1. Thêm bộ chuyển đổi trạng thái `mobileTab` (`"CODE"` | `"FEYNMAN"`) nổi bật với thanh Segmented Tab trên Mobile (`< lg`).
  2. Tự động đồng bộ `nodeId` lên URL query (`&node=...`) để giữ nguyên ngữ cảnh khi tải lại.
  3. Thêm thông báo Toast xác nhận khi bỏ qua câu hỏi thành công.
  4. Nâng cấp `RunSummary.tsx` với nút lớn **"Mở đồ thị bài học để học tiếp"** kết nối trực tiếp vào `onOpenGraphDrawer`.

---

### BUG-MOB-06: Nút "Repo khác" trên Header không có hộp thoại xác nhận — chạm nhầm lập tức xoá phiên học và văng về trang chủ

* **Vị trí phát sinh:** `src/app/learn/components/CockpitHeader.tsx` và `src/app/learn/page.tsx`.
* **Mức độ nghiêm trọng:** 🔴 **Cao (Nguy hiểm)**
* **Hiện trạng:** Trên thanh Header màu cam của phiên học, nút `[ Repo khác ]` nằm sát cạnh icon thư mục và tên repository. Người dùng cầm điện thoại bằng một tay rất dễ chạm nhầm ngón cái vào nút này. Khi bấm vào, hệ thống gọi ngay `resetSession()`, xoá sạch khoá lưu trữ `localStorage.sf.last_session` và chuyển hướng về trang chủ `/` mà **không hề có bất kỳ câu hỏi xác nhận nào**.
* **Nguyên nhân gốc:** Hàm `handleOtherRepo` thực thi việc huỷ phiên học và chuyển trang ngay lập tức mà không đi qua tầng kiểm tra xác nhận từ người dùng.
* **Kết quả khắc phục:**
  1. Thêm state quản lý `isConfirmOtherRepoOpen` và Modal xác nhận chuyên dụng (`Dialog`) trong `src/app/learn/page.tsx`.
  2. Khi bấm nút "Repo khác", hệ thống mở hộp thoại hỏi: *"Bạn có chắc chắn muốn rời phiên học của [Tên Repo] để đổi sang repository khác không? Dữ liệu phiên hiện tại sẽ được lưu trữ trong lịch sử."*
  3. Chỉ khi người học bấm nút **"Đồng ý đổi repo"** thì mới tiến hành chuyển hướng; nếu bấm nhầm có thể chọn **"Ở lại học tiếp"** an toàn 100%.

---

### BUG-MOB-07: Làm xong câu hỏi cuối chỉ có nút dẫn sang `/report`, làm đứt mạch học 20 bài của người dùng

* **Vị trí phát sinh:** `src/app/learn/components/SubmitEvaluationDialog.tsx` và `src/app/learn/page.tsx`.
* **Mức độ nghiêm trọng:** 🟠 **Trung bình (Đứt mạch trải nghiệm học)**
* **Hiện trạng:** Khi người học hoàn thành câu hỏi cuối cùng của một node (`!hasNextQuestion`), hộp thoại chấm điểm chỉ hiển thị duy nhất một nút bấm chính màu nâu đậm: `[ Xem Báo Cáo Phiên Học -> ]` dẫn thẳng sang trang `/report`.
* **Hậu quả:** Khóa học có tới 20 node bài học. Người dùng vừa học xong bài đầu tiên (Node 1) thì bị ép chuyển trang sang xem báo cáo tổng kết, tạo cảm giác như phiên học đã kết thúc hoàn toàn và không biết làm cách nào để tiếp tục học tiếp Node 2.
* **Kết quả khắc phục:**
  1. Bổ sung prop `onOpenGraph` truyền từ `page.tsx` vào `SubmitEvaluationDialog`.
  2. Khi hoàn thành toàn bộ câu hỏi của node (`!hasNextQuestion`), nút hành động chính (màu cam nổi bật) chuyển thành: **`[ Học bài tiếp theo → ]`** (kích hoạt mở đồ thị bài học để người dùng chọn node mới vừa mở khoá).
  3. Nút **`[ Báo Cáo Phiên Học ]`** được chuyển thành tuỳ chọn phụ bên cạnh để người học có thể xem báo cáo bất cứ khi nào có nhu cầu mà không bị gián đoạn tiến trình.

---

### BUG-MOB-08: Tên repo dài trên thanh Header mobile làm vỡ thanh Breadcrumb, bị cuộn ngang mất tên repo và nút tính năng

* **Vị trí phát sinh:** `src/app/learn/components/CockpitHeader.tsx`.
* **Mức độ nghiêm trọng:** 🟠 **Trung bình (Layout UI)**
* **Hiện trạng:** Đối với các repository có tên dài (ví dụ: `CNPM_BREWLITE_ASSIGNMENT_01` dài 28 ký tự), trên màn hình điện thoại chiều ngang 390px, tổng độ rộng của thanh Breadcrumb vượt quá 550px. Do thanh này dùng thuộc tính `overflow-x-auto no-scrollbar`, khi người dùng vuốt chạm màn hình, thanh Header bị cuộn ngang mất kiểm soát:
  * Khi cuộn sang phải: Chữ tên repository bị biến mất hẳn về bên trái mép màn hình, chỉ còn trơ trọi icon thư mục và nút "Repo khác" (như ghi nhận trong ảnh chụp màn hình kiểm thử).
  * Khi cuộn sang trái: Các nút tiện ích bên phải bị đẩy ra ngoài vùng hiển thị.
* **Nguyên nhân gốc:** Không thiết lập giới hạn co dãn chiều rộng tối đa (`max-w` kèm `truncate`) cho chuỗi tên repository trên các màn hình kích thước nhỏ.
* **Kết quả khắc phục:**
  1. Thêm giới hạn bề rộng linh hoạt cho thẻ tên repository: `max-w-[130px] sm:max-w-[220px] md:max-w-none truncate shrink-0`.
  2. Bổ sung thuộc tính `title` chứa đầy đủ tên repo và thông tin snapshot/commit để người học có thể chạm/hover xem toàn bộ thông tin chi tiết mà không làm vỡ bố cục giao diện.

---

### BUG-MOB-09: Nút "Sao chép" và "Toàn bộ file" vẫn bấm được khi chưa chọn node, sao chép rỗng và mở modal trống

* **Vị trí phát sinh:** `src/app/learn/components/CodeSnippetViewer.tsx`.
* **Mức độ nghiêm trọng:** 🟡 **Thấp (Edge case UX)**
* **Hiện trạng:** Khi người học đang ở trạng thái "Chưa chọn bài học", 2 nút dưới chân khung code là `[ Sao chép ]` và `[ Toàn bộ file ]` vẫn sáng rõ và bấm được. Nếu bấm "Sao chép" thì sao chép văn bản rỗng, bấm "Toàn bộ file" thì bật modal trống không có nội dung hay tên file.
* **Nguyên nhân gốc:** Không kiểm tra sự tồn tại của `node` trước khi cho phép tương tác.
* **Kết quả khắc phục:** Thiết lập trạng thái vô hiệu hoá `disabled={!node}` kèm làm mờ `disabled:opacity-40 disabled:pointer-events-none` và bổ sung tooltip nhắc nhở: *"Vui lòng chọn bài học trước"*.

---

### BUG-MOB-10: Bấm chọn node từ modal Tổng quan kiến trúc không đồng bộ URL query (`&node=...`), tải lại trang bị mất bài đang học

* **Vị trí phát sinh:** `src/app/learn/components/RepoOverviewModal.tsx` và `src/app/learn/page.tsx`.
* **Mức độ nghiêm trọng:** 🟠 **Trung bình (Mất trạng thái phiên)**
* **Hiện trạng:** Khi bấm vào các chip bài học trong modal Tổng quan kiến trúc (mục "Bắt đầu từ", "Luồng chính", "Bản đồ tầng"), hệ thống chỉ gọi trực tiếp `openNode(id)` trong store mà không thông qua hàm điều phối `handleSelectNode`. Do đó URL trình duyệt không được cập nhật tham số `&node=...`. Nếu người dùng tải lại trang trên mobile, giao diện lập tức quay về trạng thái rỗng "Chưa chọn bài học".
* **Nguyên nhân gốc:** `RepoOverviewModal` thiếu callback `onSelectNode` kết nối với `page.tsx`.
* **Kết quả khắc phục:**
  1. Bổ sung prop `onSelectNode?: (nodeId: string) => void` vào `RepoOverviewModalProps`.
  2. Khi người học chạm vào chip bài học, hệ thống gọi `onSelectNode(id)` để đồng thời: nạp bài học, chuyển sang tab Feynman trên mobile và cập nhật URL query `&node=...`.

---

### BUG-MOB-11: Bấm vào node bị khoá (`LOCKED`) trên đồ thị không có phản hồi trực quan, người dùng tưởng nút bị liệt

* **Vị trí phát sinh:** `src/app/learn/components/LessonGraphDrawer.tsx`.
* **Mức độ nghiêm trọng:** 🟡 **Thấp (UX Feedback)**
* **Hiện trạng:** Trên bản đồ bài học, khi người học bấm vào một node đang bị khoá (`LOCKED`), thanh thông tin nhanh trên đầu Drawer không render nút hành động nào cả (khung bên phải bị bỏ trống hoàn toàn). Người học trên điện thoại không rõ lý do tại sao không bấm tiếp tục học được.
* **Nguyên nhân gốc:** Thiếu component fallback khi `activeStatus === "LOCKED"`.
* **Kết quả khắc phục:** Hiển thị huy hiệu trực quan màu xám: **`[ 🔒 Cần học bài trước ]`** giúp người học hiểu rõ điều kiện mở khoá theo luồng tiên quyết của đồ thị.

---

### BUG-MOB-12: Ô nhập lý do khiếu nại báo sai AI không tự động xóa trắng sau khi đóng hoặc hoàn tất

* **Vị trí phát sinh:** `src/app/learn/components/ReportWrongDialog.tsx`.
* **Mức độ nghiêm trọng:** 🟡 **Thấp (Form State)**
* **Hiện trạng:** Khi mở hộp thoại báo sai kết quả chấm, nếu người dùng nhập nội dung rồi đóng đi hoặc gửi thành công, khi mở lại cho một câu hỏi khác thì nội dung khiếu nại cũ vẫn còn lưu nguyên trong `textarea`.
* **Nguyên nhân gốc:** State `note` của form không có effect dọn dẹp khi prop `isOpen` chuyển về `false`.
* **Kết quả khắc phục:** Thêm `useEffect` tự động reset `setNote("")` mỗi khi đóng hộp thoại khiếu nại.
