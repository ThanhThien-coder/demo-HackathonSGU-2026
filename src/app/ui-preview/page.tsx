"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Dialog,
  Drawer,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  Progress,
  Tooltip,
} from "@/components/ui";
import {
  GitBranch,
  Sparkles,
  Search,
  Code,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  PanelLeftClose,
} from "lucide-react";

export default function UIPreviewPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [progressVal, setProgressVal] = useState(68);

  const mockUser = isUserLoggedIn
    ? {
        name: "Quý",
        avatarUrl: undefined,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      {/* 1. Global Navbar */}
      <Navbar user={mockUser} />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-12">
        {/* Header Showcase Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#eaedff] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <Badge variant="bkt" size="md">
                FIGMA SOURCE: UiVJEGIhbexFdMpnxbxG30
              </Badge>
              <Badge variant="brand" size="md">
                DESIGN SYSTEM v1.0
              </Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#131b2e]">
              SimpliFey UI Component Showcase
            </h1>
            <p className="text-[#625e56] mt-1 text-sm">
              Kiểm thử trực quan toàn bộ 10 Shared UI Primitives và Global Layout theo chuẩn Figma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUserLoggedIn(!isUserLoggedIn)}
            >
              Chuyển trạng thái: {isUserLoggedIn ? "Đã đăng nhập" : "Khách"}
            </Button>
          </div>
        </div>

        {/* 2. Color Palette & Tokens */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e] flex items-center gap-2">
            <Sparkles className="size-5 text-[#ff9640]" />
            1. Bảng màu & Design Tokens
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#ff9640] mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Brand Primary</div>
              <div className="text-[11px] text-[#625e56]">#ff9640</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#944b00] mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Brand Dark</div>
              <div className="text-[11px] text-[#625e56]">#944b00</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#fff0e4] border border-[#ff9640]/30 mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Brand Light</div>
              <div className="text-[11px] text-[#625e56]">#fff0e4</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#004cff] mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Accent Blue</div>
              <div className="text-[11px] text-[#625e56]">#004cff</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#f2f3ff] border border-[#eaedff] mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Surface Tint</div>
              <div className="text-[11px] text-[#625e56]">#f2f3ff</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#f3f4f6] shadow-sm">
              <div className="h-12 w-full rounded-lg bg-[#131b2e] mb-2" />
              <div className="text-xs font-bold text-[#131b2e]">Text Main</div>
              <div className="text-[11px] text-[#625e56]">#131b2e</div>
            </div>
          </div>
        </section>

        {/* 3. Button Primitives */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            2. Button Primitives
          </h2>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Quét Dự Án</Button>
              <Button variant="secondary">Hồ sơ cá nhân</Button>
              <Button variant="outline">Xem toàn bộ file</Button>
              <Button variant="ghost">Bỏ qua</Button>
              <Button variant="danger">Đăng xuất</Button>
              <Button variant="brandDark">Báo cáo phiên học</Button>
              <Button variant="primary" isLoading>
                Đang nộp bài...
              </Button>
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="size-4" />}
              >
                Tiếp tục bài tập
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#f3f4f6] flex items-center gap-3">
              <span className="text-xs text-[#625e56] font-semibold">Sizes:</span>
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large (lg)</Button>
            </div>
          </Card>
        </section>

        {/* 4. Input & Search Primitives */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            3. Input Fields
          </h2>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Địa chỉ Repository Git (Figma node 5:265)"
                defaultValue="https://github.com/simplifey/nest-store-core"
                leftIcon={<GitBranch className="size-4 text-[#ff9640]" />}
                helperText="Hỗ trợ cả repository công khai và mã nguồn sinh viên tải lên."
              />
              <Input
                label="Tìm kiếm repo hoặc khái niệm"
                placeholder="Nhập tên repo, service hoặc cấu trúc..."
                leftIcon={<Search className="size-4" />}
              />
              <Input
                label="Email học tập"
                placeholder="ban@sinhvien.edu.vn"
                defaultValue="sinhvien@example.com"
              />
              <Input
                label="Trường có lỗi xác thực"
                defaultValue="invalid_repo_url"
                error="URL không hợp lệ hoặc repository không khả dụng."
              />
            </div>
          </Card>
        </section>

        {/* 5. Cards & Surfaces */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            4. Card & Surfaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <CardHeader>
                <div className="size-10 rounded-lg bg-white border border-[#ff9640] flex items-center justify-center text-[#ff9640] mb-2">
                  <Code className="size-5" />
                </div>
                <CardTitle>Xây dựng nền móng</CardTitle>
                <CardDescription>
                  Phù hợp để bắt đầu và xây dựng nền tảng vững chắc với kiến thức cốt lõi.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive">
              <CardHeader>
                <div className="size-10 rounded-lg bg-white border border-[#ff9640] flex items-center justify-center text-[#ff9640] mb-2">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle>Phong cách học mới lạ</CardTitle>
                <CardDescription>
                  Trải nghiệm học tập cùng AI bằng cách đảo ngược vai trò sư phạm theo Feynman.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="tinted">
              <CardHeader>
                <div className="size-10 rounded-lg bg-[#eaedff] flex items-center justify-center text-[#004cff] mb-2">
                  <CheckCircle className="size-5" />
                </div>
                <CardTitle>Theo dõi & Cải thiện</CardTitle>
                <CardDescription>
                  Thuật toán Bayesian Knowledge Tracing theo dõi tiến độ chính xác.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* 6. Badges & Status */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            5. Badges & Tags
          </h2>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="bkt">BKT-v2</Badge>
              <Badge variant="brand" dot>
                Feynman Mode
              </Badge>
              <Badge variant="success" dot>
                Thành thạo (Mastered)
              </Badge>
              <Badge variant="warning" dot>
                Đang suy giảm (Decaying)
              </Badge>
              <Badge variant="danger" dot>
                Cần ôn tập
              </Badge>
              <Badge variant="info">Java Backend</Badge>
              <Badge variant="neutral">order.service.ts</Badge>
            </div>
          </Card>
        </section>

        {/* 7. Tabs, Progress & Avatar */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            6. Tabs, Progress & Avatar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardTitle className="mb-4">Tabs Component</CardTitle>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="architecture">Kiến trúc</TabsTrigger>
                  <TabsTrigger value="dependencies">Phụ thuộc</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <p className="text-sm text-[#625e56]">
                    Nội dung tổng quan về module và các service trọng yếu được trích xuất từ AST.
                  </p>
                </TabsContent>
                <TabsContent value="architecture">
                  <p className="text-sm text-[#625e56]">
                    Sơ đồ luồng dữ liệu giữa Controller, Service và Repository.
                  </p>
                </TabsContent>
                <TabsContent value="dependencies">
                  <p className="text-sm text-[#625e56]">
                    Danh sách các package và module ngoại vi được sử dụng.
                  </p>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="space-y-6">
              <CardTitle>Progress & Avatar</CardTitle>
              <div className="space-y-3">
                <Progress
                  value={progressVal}
                  label="Xác suất làm chủ BKT (p_know)"
                  showValue
                  variant="brand"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgressVal(Math.max(0, progressVal - 10))}
                  >
                    -10%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgressVal(Math.min(100, progressVal + 10))}
                  >
                    +10%
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Avatar size="sm" fallback="Q" />
                <Avatar size="md" fallback="Q" />
                <Avatar size="lg" fallback="Q" />
                <Avatar size="xl" fallback="Q" />
                <Tooltip content="Tooltip giải thích AST Node">
                  <div className="flex items-center gap-1 text-xs text-[#554337] cursor-help bg-[#fff0e4] px-2 py-1 rounded-[6px]">
                    <HelpCircle className="size-3.5 text-[#ff9640]" />
                    Di chuột vào đây xem Tooltip
                  </div>
                </Tooltip>
              </div>
            </Card>
          </div>
        </section>

        {/* 8. Dialog & Drawer Triggers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[#131b2e]">
            7. Modals & Slide-over Drawer
          </h2>
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                Mở Dialog mẫu
              </Button>
              <Button
                variant="outline"
                leftIcon={<PanelLeftClose className="size-4 text-[#ff9640]" />}
                onClick={() => setIsDrawerOpen(true)}
              >
                Mở Panel Đồ thị bài học (Slideover Drawer)
              </Button>
            </div>
          </Card>
        </section>

        {/* Dialog Instance */}
        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Xác nhận nộp bài phản biện Feynman"
          description="AI sẽ đánh giá câu trả lời của bạn theo thang đo 4 tiêu chí và cập nhật mô hình BKT."
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-[#625e56]">
              Bạn đã nhập <strong>70 từ</strong>. Bạn có chắc chắn muốn nộp câu trả lời này cho buồng lái không?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  alert("Đã gửi lời giải thích thành công!");
                  setIsDialogOpen(false);
                }}
              >
                Nộp ngay
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Drawer Instance */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Đồ thị bài học (Lesson Graph)"
          subtitle="Cây kiến thức phụ thuộc trích xuất từ repository"
          size="lg"
        >
          <div className="space-y-6">
            <div className="rounded-xl border border-[#eaedff] bg-[#faf8ff] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#004cff] uppercase tracking-wider">
                  TIẾN ĐỘ LỘ TRÌNH
                </span>
                <Badge variant="bkt">4/7 Khái niệm</Badge>
              </div>
              <Progress value={57} showValue variant="blue" />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#131b2e]">
                Các đơn vị kiến thức (Knowledge Components):
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-[#f3f4f6] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#131b2e]">
                      1. Dependency Injection trong NestJS
                    </div>
                    <div className="text-xs text-[#625e56]">Scope: service constructor</div>
                  </div>
                  <Badge variant="success">Hoàn thành</Badge>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#ff9640]/50 bg-[#fff0e4]/30 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#131b2e]">
                      2. Database Transaction & N+1 Loop
                    </div>
                    <div className="text-xs text-[#625e56]">Scope: processCheckout</div>
                  </div>
                  <Badge variant="brand">Đang học</Badge>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#f3f4f6] flex items-center justify-between opacity-60">
                  <div>
                    <div className="text-sm font-semibold text-[#131b2e]">
                      3. Idempotency & Payment Safety
                    </div>
                    <div className="text-xs text-[#625e56]">Scope: paymentGateway</div>
                  </div>
                  <Badge variant="neutral">Chưa mở</Badge>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      </main>
    </div>
  );
}
