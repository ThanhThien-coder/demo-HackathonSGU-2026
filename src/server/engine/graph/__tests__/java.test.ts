// Test cho Java parser, symbols, field types, interface impls, imports — spec 11 (ENG-11, ENG-20, ENG-22, ENG-23, ENG-25)
import { beforeAll, describe, expect, it } from "vitest";
import { createParser, getQuery, initParsers } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";
import type { ParsedFile } from "../types";

describe("Java Language Support", () => {
  beforeAll(async () => {
    await initParsers();
  });

  function parseJavaSource(filePath: string, source: string): ParsedFile {
    const parser = createParser("JAVA");
    const tree = parser.parse(source);
    if (!tree) {
      throw new Error(`Parse Java thất bại: ${filePath}`);
    }
    return {
      path: filePath,
      language: "JAVA",
      tier: "RESOLVED",
      tree,
      source,
    };
  }

  it("ENG-11 getQuery(\"JAVA\") khác null và parse file Spring không lỗi cú pháp", () => {
    const query = getQuery("JAVA");
    expect(query).not.toBeNull();

    const springCode = `
package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.service.OrderService;
import com.example.demo.model.Order;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.findAll();
    }

    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        return orderService.save(order);
    }
}
`;

    const parser = createParser("JAVA");
    const tree = parser.parse(springCode);
    if (!tree) {
      throw new Error("Parse Spring Java code thất bại");
    }
    expect(tree).not.toBeNull();
    expect(tree.rootNode.hasError).toBe(false);
  });

  it("ENG-20 class, interface, enum, record, class lồng nhau, 2 method overload ra 2 khóa khác nhau", () => {
    const code = `
package com.example.demo;

public class OuterClass {
    public interface InnerInterface {
        void run();
    }

    public enum Status {
        ACTIVE, INACTIVE
    }

    public record UserRecord(String id, String name) {}

    public static class InnerClass {
        public void process() {}
    }

    public int calculate(int a) {
        return a * 2;
    }

    public double calculate(double a, double b) {
        return a + b;
    }
}
`;

    const file = parseJavaSource("src/main/java/com/example/demo/OuterClass.java", code);
    const idx = collectSymbols([file]);

    // OuterClass
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass")).toBe(true);
    expect(idx.symbols.get("src/main/java/com/example/demo/OuterClass.java#OuterClass")?.kind).toBe("CLASS");

    // InnerInterface
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.InnerInterface")).toBe(true);
    expect(idx.symbols.get("src/main/java/com/example/demo/OuterClass.java#OuterClass.InnerInterface")?.kind).toBe("INTERFACE");

    // Status enum
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.Status")).toBe(true);
    expect(idx.symbols.get("src/main/java/com/example/demo/OuterClass.java#OuterClass.Status")?.kind).toBe("CLASS");

    // UserRecord
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.UserRecord")).toBe(true);
    expect(idx.symbols.get("src/main/java/com/example/demo/OuterClass.java#OuterClass.UserRecord")?.kind).toBe("CLASS");

    // InnerClass
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.InnerClass")).toBe(true);
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.InnerClass.process")).toBe(true);

    // 2 method overload calculate
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.calculate")).toBe(true);
    expect(idx.symbols.has("src/main/java/com/example/demo/OuterClass.java#OuterClass.calculate~2")).toBe(true);

    const calc1 = idx.functions.get("src/main/java/com/example/demo/OuterClass.java#OuterClass.calculate");
    const calc2 = idx.functions.get("src/main/java/com/example/demo/OuterClass.java#OuterClass.calculate~2");
    expect(calc1).toBeDefined();
    expect(calc2).toBeDefined();
    expect(calc1?.params).toEqual(["a"]);
    expect(calc2?.params).toEqual(["a", "b"]);
  });

  it("ENG-20 line_start của method có annotation tính cả annotation của chính nó, không lấy annotation method trước", () => {
    const code = `package com.example.demo;

public class SampleService {
    @GetMapping("/first")
    public String firstMethod() {
        return "first";
    }

    @PostMapping("/second")
    @Transactional
    public String secondMethod() {
        return "second";
    }
}
`;

    const file = parseJavaSource("src/main/java/com/example/demo/SampleService.java", code);
    const idx = collectSymbols([file]);

    const first = idx.symbols.get("src/main/java/com/example/demo/SampleService.java#SampleService.firstMethod");
    const second = idx.symbols.get("src/main/java/com/example/demo/SampleService.java#SampleService.secondMethod");

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    // firstMethod có @GetMapping("/first") ở dòng 4
    expect(first?.line_start).toBe(4);

    // secondMethod có @PostMapping("/second") ở dòng 9
    expect(second?.line_start).toBe(9);
  });

  it("ENG-22 field @Autowired và tham số constructor ra đúng kiểu", () => {
    const code = `package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;

public class OrderService {
    @Autowired
    private OrderRepository orderRepository;

    private PaymentService paymentService;

    public OrderService(PaymentService paymentService, NotificationService notificationService) {
        this.paymentService = paymentService;
    }
}
`;

    const file = parseJavaSource("src/main/java/com/example/demo/OrderService.java", code);
    const idx = collectSymbols([file]);

    const classKey = "src/main/java/com/example/demo/OrderService.java#OrderService";

    // Field @Autowired
    expect(idx.field_types.get(`${classKey}.orderRepository`)).toBe("OrderRepository");

    // Constructor params
    expect(idx.field_types.get(`${classKey}.paymentService`)).toBe("PaymentService");
    expect(idx.field_types.get(`${classKey}.notificationService`)).toBe("NotificationService");
  });

  it("ENG-23 implements, extends", () => {
    const code = `package com.example.demo;

import java.io.Serializable;

public class OrderServiceImpl extends BaseService implements OrderService, Serializable {
}

interface OrderRepository extends JpaRepository<Order, Long> {
}
`;

    const file = parseJavaSource("src/main/java/com/example/demo/OrderServiceImpl.java", code);
    const idx = collectSymbols([file]);

    const classKey = "src/main/java/com/example/demo/OrderServiceImpl.java#OrderServiceImpl";
    const repoKey = "src/main/java/com/example/demo/OrderServiceImpl.java#OrderRepository";

    // implements OrderService
    expect(idx.interface_impls.get("OrderService")).toContain(classKey);
    // implements Serializable
    expect(idx.interface_impls.get("Serializable")).toContain(classKey);
    // extends BaseService
    expect(idx.interface_impls.get("BaseService")).toContain(classKey);

    // interface extends JpaRepository
    expect(idx.interface_impls.get("JpaRepository")).toContain(repoKey);
  });

  it("ENG-25 import đúng fqcn, cùng package, a.b.*, import thư viện ngoài không lỗi", () => {
    const orderModelCode = `package com.example.demo.model;

public class Order {}
`;
    const userModelCode = `package com.example.demo.model;

public class User {}
`;
    const helperCode = `package com.example.demo.service;

public class OrderHelper {}
`;
    const serviceCode = `package com.example.demo.service;

import com.example.demo.model.Order;
import com.example.demo.model.*;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private OrderHelper helper;
    private Order order;
    private User user;
}
`;

    const f1 = parseJavaSource("src/main/java/com/example/demo/model/Order.java", orderModelCode);
    const f2 = parseJavaSource("src/main/java/com/example/demo/model/User.java", userModelCode);
    const f3 = parseJavaSource("src/main/java/com/example/demo/service/OrderHelper.java", helperCode);
    const f4 = parseJavaSource("src/main/java/com/example/demo/service/OrderService.java", serviceCode);

    const files = [f1, f2, f3, f4];
    const idx = collectSymbols(files);

    expect(() => {
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });
    }).not.toThrow();

    const serviceImports = idx.imports.get(f4.path);
    expect(serviceImports).toBeDefined();

    // 1. import đúng fqcn: com.example.demo.model.Order
    const orderImp = serviceImports?.get("Order");
    expect(orderImp).toBeDefined();
    expect(orderImp?.source_file).toBe(f1.path);
    expect(orderImp?.symbol_name).toBe("Order");

    // 2. cùng package: OrderHelper trong cùng package com.example.demo.service không cần import
    const helperImp = serviceImports?.get("OrderHelper");
    expect(helperImp).toBeDefined();
    expect(helperImp?.source_file).toBe(f3.path);
    expect(helperImp?.symbol_name).toBe("OrderHelper");

    // 3. a.b.*: com.example.demo.model.* nhập cả User
    const userImp = serviceImports?.get("User");
    expect(userImp).toBeDefined();
    expect(userImp?.source_file).toBe(f2.path);
    expect(userImp?.symbol_name).toBe("User");

    // 4. import thư viện ngoài không lỗi: org.springframework.stereotype.Service
    const springServiceImp = serviceImports?.get("Service");
    expect(springServiceImp).toBeDefined();
    expect(springServiceImp?.source_file).toBeNull();
  });
});
