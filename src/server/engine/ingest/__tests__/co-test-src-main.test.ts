import { describe, expect, it } from "vitest";
import { isTestPath } from "../priority";

describe("B-42 (ING-87): từ src/main/ trở xuống chỉ xét tên file", () => {
  it.each([
    "src/main/java/com/example/demo/DemoApplication.java",
    "src/main/java/com/example/demo/controller/UserController.java",
    "backend/src/main/java/com/example/demo/service/OrderService.java",
    "app/src/main/kotlin/com/example/demo/Main.kt",
    "src/main/resources/application.properties",
  ])("%s không có cờ test", (p) => {
    expect(isTestPath(p)).toBe(false);
  });

  it.each([
    "src/main/js/order.test.ts",
    "src/main/python/order_test.py",
    "src/main/java/com/acme/test_helper.py",
    "src/test/java/com/example/demo/DemoApplicationTests.java",
    "src/test/java/com/acme/OrderTest.java",
  ])("%s vẫn có cờ test (quy tắc tên file, hoặc src/test)", (p) => {
    expect(isTestPath(p)).toBe(true);
  });

  it("thư mục example, demo ngoài src/main vẫn có cờ test như cũ", () => {
    expect(isTestPath("examples/basic/src/index.ts")).toBe(true);
    expect(isTestPath("demo/app.py")).toBe(true);
    expect(isTestPath("src/demo/app.ts")).toBe(true);
  });

  it("segment cờ test nằm TRƯỚC src/main vẫn tính", () => {
    expect(isTestPath("examples/shop/src/main/java/com/acme/App.java")).toBe(true);
    expect(isTestPath("docs/src/main/java/App.java")).toBe(true);
  });

  it("repo JS không đổi: src/integration/ không có cờ, integration/ ở gốc có cờ", () => {
    expect(isTestPath("src/integration/orders.ts")).toBe(false);
    expect(isTestPath("integration/orders.ts")).toBe(true);
  });
});
