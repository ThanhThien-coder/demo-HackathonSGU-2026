# SimpliFey Design System & Global UI Context

> **Nguồn quy chuẩn thiết kế:** Figma File Key `UiVJEGIhbexFdMpnxbxG30`  
> **Phiên bản:** v1.0.0 (Global Foundation)  
> **Công nghệ áp dụng:** Next.js 15 (App Router), Tailwind CSS v4, TypeScript, Lucide Icons, Class Variance Authority (CVA).

---

## ⛔ NGUYÊN TẮC BẤT BIẾN (GOLDEN RULES)

1. 🔒 **Tuyệt đối không chạm vào thư mục `src/app/api/`:** Mọi logic backend route handler được cách ly hoàn toàn với giao diện UI.
2. 🔒 **Tái sử dụng Shared UI Primitives (`src/components/ui/`):** Không tự ý tạo nút bấm, ô nhập liệu, card hay badge mới bằng HTML thô. Luôn ưu tiên dùng các component nguyên tử đã chuẩn hóa.
3. 🔒 **Không hardcode mã màu tùy tiện:** Bắt buộc tuân thủ bảng mã màu và CSS variables trong `src/app/globals.css`.
4. 🔒 **Đảm bảo Accessibility & Micro-interactions:** Các modal, dropdown, drawer phải hỗ trợ phím `Escape`, đóng khi click ra ngoài (`outside click`), và có trạng thái hover/focus/active đồng nhất.

---

## 1. BẢNG MÀU & DESIGN TOKENS (COLOR PALETTE)

| Tên Token / Vai trò | Hex Figma | CSS Variable | Tailwind Utility | Mô tả mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Primary** | `#ff9640` | `--brand-primary` | `bg-[#ff9640]`, `text-[#ff9640]` | Màu cam thương hiệu chính, nút CTA, viền active, logo |
| **Brand Hover** | `#f2852e` | `--color-brand-hover` | `hover:bg-[#f2852e]` | Trạng thái hover của nút bấm chính |
| **Brand Active** | `#e6761c` | `--color-brand-active` | `active:bg-[#e6761c]` | Trạng thái nhấn giữ của nút bấm chính |
| **Brand Dark** | `#944b00` | `--brand-dark` | `text-[#944b00]`, `bg-[#944b00]` | Tiêu đề câu hỏi, badge BKT, nhãn nhấn mạnh |
| **Brand Darker** | `#8b4600` | `--color-brand-darker` | `bg-[#8b4600]` | Nút chức năng quan trọng (Báo cáo phiên học) |
| **Brand Darkest** | `#301400` | `--color-brand-darkest` | `text-[#301400]` | Chữ trên nền nút cam sáng |
| **Brand Brown** | `#554337` | `--brand-brown` | `text-[#554337]` | Nhãn trường, copyright, text phụ trợ |
| **Brand Light Tint** | `#fff0e4` | `--brand-light` | `bg-[#fff0e4]` | Nền footer, badge brand, hover menu |
| **Brand Light Tint 2** | `#ffedd4` | `--color-brand-light-2` | `bg-[#ffedd4]` | Nền badge `BKT-v2` |
| **Brand Light Tint 3** | `#ffdcc5` | `--color-brand-light-3` | `bg-[#ffdcc5]` | Hiệu ứng card decor nghiêng trang đăng nhập |
| **Accent Blue** | `#004cff` | `--accent-blue` | `text-[#004cff]`, `bg-[#004cff]` | Tiêu đề file code `order.service.ts`, badge info |
| **Accent Cyan** | `#006780` | `--accent-cyan` | `text-[#006780]` | Từ khóa code syntax (`async`, `await`, `const`) |
| **Surface Tint** | `#f2f3ff` | `--surface-tint` | `bg-[#f2f3ff]` | Nền ô input, nền tabs list, nền màn hình cockpit |
| **Surface Tint Alt** | `#faf8ff` | `--surface-tint-alt` | `bg-[#faf8ff]` | Nền textarea lời giải thích, nền trang preview |
| **Surface Border** | `#eaedff` | `--surface-tint-border`| `border-[#eaedff]` | Viền phân cách nhẹ của các khung chức năng |
| **Text Main** | `#131b2e` | `--foreground` | `text-[#131b2e]` | Tiêu đề chính H1-H6, thân bài viết đậm nét |
| **Text Secondary** | `#625e56` | `--text-secondary` | `text-[#625e56]` | Mô tả phụ đề, đoạn văn giải thích, helper text |
| **Text Muted** | `#99a1af` | `--text-muted` | `text-[#99a1af]` | Placeholder ô nhập, nhãn vô hiệu hóa |
| **Border Subtle** | `#f3f4f6` | `--border-subtle` | `border-[#f3f4f6]` | Viền card trắng mặc định |
| **Border Default** | `#e5e7eb` | `--border-default` | `border-[#e5e7eb]` | Viền header navbar, đường kẻ phân cách code |
| **Status Success** | `#00bc7d` | `--status-success` | `text-[#00bc7d]`, `bg-[#00bc7d]` | Trạng thái online, hoàn thành KC, nắm vững |
| **Status Warning** | `#f59e0b` | `--status-warning` | `text-[#f59e0b]`, `bg-[#f59e0b]` | Trạng thái kiến thức suy giảm (decaying) |
| **Status Danger** | `#e7000b` | `--status-danger` | `text-[#e7000b]`, `bg-[#e7000b]` | Đăng xuất, lỗi form, sai bản chất kiến thức |

---

## 2. TYPOGRAPHY & FONT HIERARCHY

- **Sans Font:** `Plus Jakarta Sans` / `Segoe UI` (`--font-sans`).
- **Mono Font:** `JetBrains Mono` / `Consolas` (`--font-mono`) cho khối code và token.

| Cấp bậc | Cỡ chữ / Line-height | Font Weight | Tailwind Classes | Áp dụng trên Figma |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Hero H1** | `60px` / `1.12` (`69.44px`) | 900 (Black) | `text-[60px] font-black tracking-tight` | Tiêu đề lớn Trang chủ |
| **Page Title H1** | `36px` / `54px` | 900 (Black) | `text-[36px] font-black tracking-[-0.9px]` | Trang Đăng nhập, Báo cáo |
| **Brand Logo** | `32px` / `48px` | 900 (Black) | `text-[32px] font-black text-shadow-brand-logo` | Chữ SIMPLIFEY trên Navbar |
| **Section Title H2** | `24px` / `32px` | 800 (ExtraBold)| `text-2xl font-extrabold text-[#131b2e]` | Các phân mục lớn |
| **Card Heading H3** | `18px` / `27px` | 700 (Bold) | `text-[18px] font-bold text-[#131b2e]` | Tiêu đề Card 3 cột tính năng |
| **Cockpit Question** | `17px` / `27.6px` | 600 (SemiBold)| `text-[17px] font-semibold text-[#131b2e]` | Đề bài phản biện Feynman |
| **Body Large** | `20px` - `22px` / `35px` | 400 (Regular) | `text-[20px] sm:text-[22px] text-[#625e56]`| Đoạn văn mô tả Hero |
| **Body Standard** | `15px` - `16px` / `26px` | 400 (Regular) | `text-[16px] text-[#625e56]` | Đoạn văn nội dung thông thường |
| **Interactive UI** | `14px` / `21px` | 600 (SemiBold)| `text-[14px] font-semibold` | Menu link, Button, Input text |
| **Badge / Caption** | `11px` - `12px` / `18px` | 700 (Bold) | `text-[11px] font-bold uppercase` | Nhãn BKT, đếm từ vựng, tag |

---

## 3. SHARED UI PRIMITIVES CATALOG (`src/components/ui/`)

Tất cả component đều được export qua `src/components/ui` (hoặc import trực tiếp từng file):

```typescript
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Dialog,
  Drawer,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  Progress,
  Tooltip
} from "@/components/ui";
```

### 1. `Button` (`src/components/ui/Button.tsx`)
- **Variants:** `primary` (cam thương hiệu), `secondary` (xanh nhạt), `outline` (viền mỏng), `ghost` (trong suốt hover cam), `danger` (đỏ), `brandDark` (nâu đậm báo cáo).
- **Sizes:** `sm` (h-8), `md` (h-10), `lg` (h-12), `icon` (size-10), `iconSm` (size-8).
- **Props:** `isLoading`, `leftIcon`, `rightIcon`, `disabled`.
- **Ví dụ:**
  ```tsx
  <Button variant="primary" rightIcon={<ArrowRight className="size-4" />}>
    Quét Dự Án
  </Button>
  ```

### 2. `Input` (`src/components/ui/Input.tsx`)
- **Props:** `label`, `helperText`, `error`, `leftIcon`, `rightIcon`, `wrapperClassName`.
- **Ví dụ:**
  ```tsx
  <Input
    label="Địa chỉ Repository Git"
    defaultValue="https://github.com/simplifey/nest-store-core"
    leftIcon={<GitBranch className="size-4 text-[#ff9640]" />}
  />
  ```

### 3. `Card` (`src/components/ui/Card.tsx`)
- **Variants:** `default` (viền xám bo 16px), `elevated` (đổ bóng sâu), `tinted` (nền tím nhạt), `interactive` (hover viền cam).
- **Sub-components:** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

### 4. `Badge` (`src/components/ui/Badge.tsx`)
- **Variants:** `brand` (cam nhạt), `bkt` (vàng đất BKT), `info` (xanh dương), `success` (xanh lá), `warning` (vàng hổ phách), `danger` (đỏ), `neutral` (xám).
- **Props:** `dot?: boolean`, `size?: "sm" | "md" | "lg"`.

### 5. `Dialog` (`src/components/ui/Dialog.tsx`)
- Modal chuẩn accessibility với `backdrop-blur-[4px] bg-black/40`, phím `Escape`, đóng khi click ra ngoài.
- **Props:** `isOpen`, `onClose`, `title`, `description`, `children`, `maxWidth`.

### 6. `Drawer` (`src/components/ui/Drawer.tsx`)
- Slide-over panel hỗ trợ trượt từ cạnh phải hoặc trái (dành riêng cho Panel Đồ thị bài học - node `5:1751`).
- **Props:** `isOpen`, `onClose`, `title`, `subtitle`, `side` ("left" | "right"), `size`.

### 7. `Tabs` (`src/components/ui/Tabs.tsx`)
- Điều khiển tab chuyển đổi ngữ cảnh nội dung.
- **Variants:** `pills` (Figma style), `underline`.
- **Sub-components:** `TabsList`, `TabsTrigger`, `TabsContent`.

### 8. `Avatar` (`src/components/ui/Avatar.tsx`)
- Hỗ trợ avatar hình ảnh kèm fallback chữ cái đầu, viền cam thương hiệu `#ff9640`.
- **Props:** `src`, `alt`, `fallback`, `size` ("sm" | "md" | "lg" | "xl"), `bordered`.

### 9. `Progress` (`src/components/ui/Progress.tsx`)
- Đo tiến độ học tập, điểm năng lực Bayesian Knowledge Tracing ($p\_know$).
- **Props:** `value` (0 - 100), `max`, `label`, `showValue`, `variant` ("brand" | "blue" | "success" | "warning"), `size`.

### 10. `Tooltip` (`src/components/ui/Tooltip.tsx`)
- Hiển thị ghi chú AI, giải thích khái niệm AST khi hover/focus.
- **Props:** `content`, `position` ("top" | "bottom" | "left" | "right").

---

## 4. GLOBAL LAYOUT COMPONENTS (`src/components/layout/`)

- `Navbar.tsx`: Header dính (`sticky`), thanh điều hướng desktop/mobile, nút đăng nhập/đăng ký, avatar khi đã đăng nhập, nút mở `SettingsDropdown`.
- `SettingsDropdown.tsx`: Dropdown nổi góc phải (node `5:1552`), hỗ trợ Lộ trình, Hồ sơ, Buồng lái Feynman (tag `BKT-v2`), Nền tối, Hướng dẫn, Đăng xuất.

---

## 5. ROUTING CHECKLIST (ĐÃ KHỞI TẠO STUB)

- `/` : Trang chủ SimpliFey (Landing Page)
- `/how-it-works` : Hướng dẫn phương pháp Feynman & BKT
- `/login` : Đăng nhập tài khoản
- `/register` : Đăng ký tài khoản
- `/roadmap` : Danh sách lộ trình mã nguồn
- `/roadmap/[courseId]` : Chi tiết đồ thị kiến thức lộ trình
- `/learn` : Buồng lái Feynman Cockpit
- `/report` : Báo cáo đánh giá phiên học
- `/ui-preview` : Trang kiểm thử trực quan toàn bộ Component Catalog
