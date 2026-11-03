import type { CourseDetail } from "./types";

export const ROADMAP_COURSE_DETAILS: Record<string, CourseDetail> = {
  "java-backend": {
    id: "java-backend",
    title: "Java Backend",
    description: "Hệ thống quản lý xuất nhập hàng và dịch vụ backend",
    lessons: [
      {
        id: "auth-flow",
        stepNumber: 1,
        title: "1. Đăng nhập hệ thống (Auth Flow)",
        description: "Luồng xác thực JWT, mã hóa bcrypt và phân quyền vai trò...",
        status: "completed",
        targetUrl: "/learn?course=java-backend&lesson=auth-flow",
        dataNodeId: "5:955",
      },
      {
        id: "order-checkout",
        stepNumber: 2,
        title: "2. Đặt hàng & Thanh toán (Order & Checkout)",
        description: "Xử lý đơn hàng, trừ kho, tích hợp cổng thanh toán...",
        status: "in-progress",
        progress: 75,
        targetUrl: "/learn?course=java-backend&lesson=order-checkout",
        dataNodeId: "5:965",
      },
      {
        id: "redis-cache",
        stepNumber: 3,
        title: "3. Tối ưu hiệu năng & Caching (Redis & Cache)",
        description: "Đang khóa - Hoàn thành bài 2 để mở khóa",
        status: "locked",
        targetUrl: "#",
        dataNodeId: "5:975",
      },
    ],
  },
  "react-frontend": {
    id: "react-frontend",
    title: "React Frontend",
    description: "Giao diện nhanh, đẹp cùng React và Next.js",
    lessons: [
      {
        id: "components-hooks",
        stepNumber: 1,
        title: "1. Cấu trúc Component & Hooks cơ bản",
        description: "Nắm vững useState, useEffect, custom hooks và component lifecycle...",
        status: "completed",
        targetUrl: "/learn?course=react-frontend&lesson=components-hooks",
      },
      {
        id: "global-state",
        stepNumber: 2,
        title: "2. Quản lý State toàn cục & Server Cache",
        description: "Tích hợp Zustand, React Query và cơ chế cache revalidation...",
        status: "in-progress",
        progress: 60,
        targetUrl: "/learn?course=react-frontend&lesson=global-state",
      },
      {
        id: "nextjs-rendering",
        stepNumber: 3,
        title: "3. Tối ưu Rendering & Next.js App Router",
        description: "Đang khóa - Hoàn thành bài 2 để mở khóa",
        status: "locked",
        targetUrl: "#",
      },
    ],
  },
  "sql-server": {
    id: "sql-server",
    title: "SQL Server",
    description: "Làm chủ cơ sở dữ liệu quan hệ doanh nghiệp",
    lessons: [
      {
        id: "schema-normalization",
        stepNumber: 1,
        title: "1. Thiết kế Schema & Chuẩn hóa dữ liệu",
        description: "Chuẩn 3NF, quan hệ 1-N, N-N và các ràng buộc toàn vẹn khóa ngoại...",
        status: "completed",
        targetUrl: "/learn?course=sql-server&lesson=schema-normalization",
      },
      {
        id: "advanced-indexing",
        stepNumber: 2,
        title: "2. Truy vấn nâng cao & Indexing Optimization",
        description: "Clustered/Non-clustered Index, Execution Plan và tối ưu I/O...",
        status: "completed",
        targetUrl: "/learn?course=sql-server&lesson=advanced-indexing",
      },
      {
        id: "stored-procedures",
        stepNumber: 3,
        title: "3. Stored Procedures & Transaction ACID",
        description: "Xử lý transaction cô lập, Deadlock handling và triggers nghiệp vụ...",
        status: "completed",
        targetUrl: "/learn?course=sql-server&lesson=stored-procedures",
      },
    ],
  },
  "postgresql": {
    id: "postgresql",
    title: "Postgresql",
    description: "Cơ sở về database mã nguồn mở thông dụng nhất",
    lessons: [
      {
        id: "pg-basics",
        stepNumber: 1,
        title: "1. Cài đặt & Quản lý Table, Constraints",
        description: "Thiết lập database, vai trò người dùng, tablespace và ràng buộc...",
        status: "completed",
        targetUrl: "/learn?course=postgresql&lesson=pg-basics",
      },
      {
        id: "pg-jsonb",
        stepNumber: 2,
        title: "2. JSONB & Full-Text Search chuyên sâu",
        description: "Lưu trữ tài liệu linh hoạt kết hợp GIN index và tìm kiếm ngữ nghĩa...",
        status: "completed",
        targetUrl: "/learn?course=postgresql&lesson=pg-jsonb",
      },
      {
        id: "pg-partitioning",
        stepNumber: 3,
        title: "3. Partitioning & High Availability Replication",
        description: "Phân vùng bảng lớn theo thời gian và cấu hình Streaming Replication...",
        status: "completed",
        targetUrl: "/learn?course=postgresql&lesson=pg-partitioning",
      },
    ],
  },
};

export function getCourseDetail(courseId: string): CourseDetail {
  if (ROADMAP_COURSE_DETAILS[courseId]) {
    return ROADMAP_COURSE_DETAILS[courseId];
  }

  // Fallback for custom or unknown courseId
  const formattedTitle = courseId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    id: courseId,
    title: formattedTitle || "Lộ trình chi tiết",
    description: "Cây tiến độ và các bài học trong lộ trình đào tạo",
    lessons: [
      {
        id: `${courseId}-1`,
        stepNumber: 1,
        title: `1. Tổng quan & Khởi tạo ${formattedTitle}`,
        description: "Nắm vững lý thuyết nền tảng và thiết lập môi trường phát triển...",
        status: "completed",
        targetUrl: `/learn?course=${courseId}&lesson=1`,
      },
      {
        id: `${courseId}-2`,
        stepNumber: 2,
        title: `2. Xây dựng Module cốt lõi`,
        description: "Thực hành triển khai tính năng chính theo tiêu chuẩn kỹ thuật...",
        status: "in-progress",
        progress: 50,
        targetUrl: `/learn?course=${courseId}&lesson=2`,
      },
      {
        id: `${courseId}-3`,
        stepNumber: 3,
        title: `3. Kiểm thử & Triển khai hoàn thiện`,
        description: "Đang khóa - Hoàn thành bài 2 để mở khóa",
        status: "locked",
        targetUrl: "#",
      },
    ],
  };
}
