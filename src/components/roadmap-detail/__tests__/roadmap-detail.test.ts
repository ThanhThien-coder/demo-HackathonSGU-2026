import { describe, it, expect } from "vitest";
import { getCourseDetail } from "../data";

describe("Roadmap Detail Data & Logic", () => {
  it("returns course detail for java-backend with exact Figma lessons", () => {
    const course = getCourseDetail("java-backend");
    expect(course.id).toBe("java-backend");
    expect(course.title).toBe("Java Backend");
    expect(course.lessons).toHaveLength(3);

    const [lesson1, lesson2, lesson3] = course.lessons;

    // Completed lesson
    expect(lesson1.status).toBe("completed");
    expect(lesson1.title).toContain("Đăng nhập hệ thống");

    // In-progress lesson
    expect(lesson2.status).toBe("in-progress");
    expect(lesson2.progress).toBe(75);
    expect(lesson2.title).toContain("Đặt hàng & Thanh toán");

    // Locked lesson
    expect(lesson3.status).toBe("locked");
    expect(lesson3.title).toContain("Tối ưu hiệu năng & Caching");
  });

  it("returns course detail for react-frontend", () => {
    const course = getCourseDetail("react-frontend");
    expect(course.id).toBe("react-frontend");
    expect(course.title).toBe("React Frontend");
    expect(course.lessons).toHaveLength(3);
  });

  it("provides fallback for unknown course IDs", () => {
    const course = getCourseDetail("golang-microservice");
    expect(course.id).toBe("golang-microservice");
    expect(course.title).toBe("Golang Microservice");
    expect(course.lessons).toHaveLength(3);
    expect(course.lessons[0].status).toBe("completed");
    expect(course.lessons[1].status).toBe("in-progress");
    expect(course.lessons[2].status).toBe("locked");
  });
});
