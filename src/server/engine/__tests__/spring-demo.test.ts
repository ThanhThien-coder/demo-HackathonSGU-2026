// Test cho repo demo Spring Boot trong RAM theo B-38 bước 6, B-31 — spec 12 Mục 1, Mục 4, D-55, D-56.
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import { runEngine } from "../index";
import { initParsers } from "../graph/parser";

vi.setConfig({ testTimeout: 30_000 });

/**
 * Tạo zip buffer trong RAM cho repo spring-demo (Spring Boot Maven, controller, service, repository, entity, JPA).
 */
function createSpringDemoZip(): Uint8Array {
  return fflate.zipSync({
    "pom.xml": fflate.strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.shop</groupId>
  <artifactId>spring-demo</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
  </dependencies>
</project>
`),
    "src/main/java/com/shop/order/Order.java": fflate.strToU8(`package com.shop.order;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    private Long id;

    @ManyToOne
    private User user;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
`),
    "src/main/java/com/shop/order/User.java": fflate.strToU8(`package com.shop.order;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
    @Id
    private Long id;
    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
`),
    "src/main/java/com/shop/order/OrderRepository.java": fflate.strToU8(`package com.shop.order;

import org.springframework.stereotype.Repository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class OrderRepository {
    @PersistenceContext
    private EntityManager em;

    public Order save(Order order) {
        this.em.persist(order);
        return order;
    }

    public Order findById(Long id) {
        return this.em.find(Order.class, id);
    }

    public void deleteById(Long id) {
        Order order = this.em.find(Order.class, id);
        if (order != null) {
            this.em.remove(order);
        }
    }
}
`),
    "src/main/java/com/shop/order/OrderService.java": fflate.strToU8(`package com.shop.order;

import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final OrderRepository orders;

    public OrderService(OrderRepository orders) {
        this.orders = orders;
    }

    public Order createOrder(Order order) {
        if (order == null) {
            throw new IllegalArgumentException("Order cannot be null");
        }
        return this.orders.save(order);
    }

    public Order getOrder(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        return this.orders.findById(id);
    }

    public void deleteOrder(Long id) {
        if (id != null) {
            this.orders.deleteById(id);
        }
    }
}
`),
    "src/main/java/com/shop/order/OrderController.java": fflate.strToU8(`package com.shop.order;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        return this.orderService.createOrder(order);
    }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return this.orderService.getOrder(id);
    }

    @DeleteMapping("/{id}")
    public void deleteOrder(@PathVariable Long id) {
        this.orderService.deleteOrder(id);
    }
}
`),
    "src/main/java/com/shop/product/Product.java": fflate.strToU8(`package com.shop.product;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
public class Product {
    @Id
    private Long id;
    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
`),
    "src/main/java/com/shop/product/ProductRepository.java": fflate.strToU8(`package com.shop.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
}
`),
    "src/main/java/com/shop/product/ProductService.java": fflate.strToU8(`package com.shop.product;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProductService {
    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    public List<Product> listProducts() {
        return this.products.findAll();
    }

    public Product getProduct(Long id) {
        return this.products.findById(id).orElse(null);
    }

    public Product createProduct(Product product) {
        return this.products.save(product);
    }

    public void deleteProduct(Long id) {
        this.products.deleteById(id);
    }
}
`),
    "src/main/java/com/shop/product/ProductController.java": fflate.strToU8(`package com.shop.product;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<Product> listProducts() {
        return this.productService.listProducts();
    }

    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return this.productService.getProduct(id);
    }

    @PostMapping
    public Product createProduct(@RequestBody Product product) {
        return this.productService.createProduct(product);
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        this.productService.deleteProduct(id);
    }
}
`),
    "src/main/java/com/example/demo/HelloController.java": fflate.strToU8(`package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "hello";
    }
}
`),
    "src/test/java/com/shop/order/OrderControllerTest.java": fflate.strToU8(`package com.shop.order;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderControllerTest {
    @GetMapping("/fake")
    public String fake() {
        return "fake";
    }
}
`),
  });
}

describe("B-38 / B-31: Repo mẫu Spring Boot trong RAM", () => {
  let res: Awaited<ReturnType<typeof runEngine>>;

  beforeAll(async () => {
    await initParsers();
    res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "spring-demo.zip",
      bytes: createSpringDemoZip(),
      subdir_override: null,
    });
  });

  // 1. primary_language là JAVA, tier RESOLVED
  it("B-38 1: primary_language là JAVA, tier RESOLVED", () => {
    expect(res.fingerprint.primary_language).toBe("JAVA");
    expect(res.fingerprint.language_breakdown[0]?.tier).toBe("RESOLVED");
  });

  // 2. title_evidence có POST /orders, GET /orders/{id}, DELETE /orders/{id}, GET /products; không có /fake
  it("B-38 2: title_evidence có POST /orders, GET /orders/{id}, DELETE /orders/{id}, GET /products; không có /fake", () => {
    const titleEvidences = res.nodes
      .map((n) => n.title_evidence)
      .filter((te): te is string => typeof te === "string" && te.length > 0);

    expect(titleEvidences).toContain("POST /orders");
    expect(titleEvidences).toContain("GET /orders/{id}");
    expect(titleEvidences).toContain("DELETE /orders/{id}");
    expect(titleEvidences).toContain("GET /products");

    // Không có /fake từ test file
    expect(titleEvidences.some((te) => te.includes("/fake"))).toBe(false);
    expect(res.nodes.some((n) => n.title.includes("/fake") || n.id.includes("fake"))).toBe(false);
  });

  // 3. Có bài POST /orders đủ layer ENTRY_POINT, BUSINESS_LOGIC, DATA_ACCESS
  it("B-38 3: Có bài POST /orders đủ layer ENTRY_POINT, BUSINESS_LOGIC, DATA_ACCESS", () => {
    const postOrderNode = res.nodes.find(
      (n) => n.title_evidence === "POST /orders" || n.title.includes("POST /orders")
    );
    expect(postOrderNode).toBeDefined();

    const postOrderLayers = new Set(postOrderNode!.trace_steps.map((st) => st.layer));
    expect(postOrderLayers.has("ENTRY_POINT")).toBe(true);
    expect(postOrderLayers.has("BUSINESS_LOGIC")).toBe(true);
    expect(postOrderLayers.has("DATA_ACCESS")).toBe(true);
  });

  // 4. Bài GET /products có bước DATA_ACCESS
  it("B-38 4: Bài GET /products có bước DATA_ACCESS", () => {
    const getProductsNode = res.nodes.find(
      (n) => n.title_evidence === "GET /products" || n.title.includes("GET /products")
    );
    expect(getProductsNode).toBeDefined();

    const productLayers = getProductsNode!.trace_steps.map((st) => st.layer);
    expect(productLayers).toContain("DATA_ACCESS");
  });

  // 5. Không node nào có ALGORITHMIC_CORE từ constructor, không trace_steps rỗng
  it("B-38 5: Không node nào có ALGORITHMIC_CORE từ constructor, không trace_steps rỗng", () => {
    expect(res.nodes.length).toBeGreaterThan(0);
    for (const n of res.nodes) {
      expect(n.trace_steps.length).toBeGreaterThan(0);
      if (n.node_type === "ALGORITHMIC_CORE") {
        for (const step of n.trace_steps) {
          const fnLower = step.function_name.toLowerCase();
          expect(fnLower).not.toContain("constructor");
          expect(fnLower).not.toContain("<init>");
          expect(step.function_name).not.toBe("OrderController");
          expect(step.function_name).not.toBe("OrderService");
          expect(step.function_name).not.toBe("OrderRepository");
          expect(step.function_name).not.toBe("ProductController");
          expect(step.function_name).not.toBe("ProductService");
        }
      }
    }
  });

  // 6. Chạy 2 lần ra cùng id node, cùng edges
  it("B-38 6: Chạy 2 lần ra cùng id node, cùng edges", async () => {
    const zipBytes = createSpringDemoZip();
    const res1 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "spring-demo.zip",
      bytes: zipBytes,
      subdir_override: null,
    });
    const res2 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "spring-demo.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    expect(res1.nodes.map((n) => n.id)).toEqual(res2.nodes.map((n) => n.id));
    expect(JSON.stringify(res1.edges)).toBe(JSON.stringify(res2.edges));
  });

  // 7. Ngưỡng repo demo: nodes.length >= CONFIG.DISPLAY_MIN_NODES
  it("B-38 7: Ngưỡng repo demo: nodes.length >= CONFIG.DISPLAY_MIN_NODES", () => {
    expect(res.nodes.length).toBeGreaterThanOrEqual(CONFIG.DISPLAY_MIN_NODES);
  });

  // it.todo cho ca /hello theo cờ test B-42
  it("B-42: /hello trong com/example/demo ra bài", () => {
    expect(res.nodes.some((n) => n.title_evidence === "GET /hello")).toBe(true);
  });
});
