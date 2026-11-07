// Test cho repo demo shop-api trong RAM và kiểm thử xuyên module X-01, X-07 — spec 50 Mục 4, Mục 5 dòng 1–3, D-55, D-56.
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as fflate from "fflate";
import { CONFIG } from "@/contracts";
import { runEngine } from "../index";
import { initParsers } from "../graph/parser";

vi.setConfig({ testTimeout: 30_000 });

/**
 * Tạo zip buffer trong RAM cho repo shop-api (17 file code theo file_index của shop-api.json và package.json).
 */
function createShopApiZip(): Uint8Array {
  return fflate.zipSync({
    "package.json": fflate.strToU8(
      JSON.stringify({
        name: "shop-api",
        version: "1.0.0",
        dependencies: {
          express: "^4.18.2",
          typeorm: "^0.3.20",
          pg: "^8.11.3",
          zod: "^3.22.4",
          jsonwebtoken: "^9.0.2",
        },
      })
    ),
    "src/clients/mailer.client.ts": fflate.strToU8(`
export class MailerClient {
  private transporter: { send: (payload: unknown) => Promise<unknown> } = {
    send: async (p) => p,
  };

  async sendMail(payload: { to: string; subject: string; body: string }): Promise<unknown> {
    return this.transporter.send(payload);
  }
}
export const mailerClient = new MailerClient();
`),
    "src/controllers/product.controller.ts": fflate.strToU8(`
import express from "express";
import { productService } from "../services/product.service";

export const router = express.Router();

// Bước 1 · ENTRY_POINT · src/controllers/product.controller.ts dòng 8–11
router.get("/products", async (req, res) => {
  const products = await productService.listProducts();
  res.json(products);
});
export default router;
`),
    "src/controllers/report.controller.ts": fflate.strToU8(`
import express from "express";
import { reportService } from "../services/report.service";

export const router = express.Router();

router.get("/reports/revenue", async (req, res) => {
  const summary = await reportService.calcTotalRevenue();
  res.json(summary);
});
export default router;
`),
    "src/middlewares/auth.middleware.ts": fflate.strToU8(`
import jwt from "jsonwebtoken";

// Bước 2 · MIDDLEWARE · src/middlewares/auth.middleware.ts dòng 3–12
const JWT_SECRET = "<REDACTED_SECRET>";
export function authMiddleware(req: { headers: { authorization?: string }; user?: unknown }, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    req.user = jwt.verify(token || "", JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}
`),
    "src/repos/category.repo.ts": fflate.strToU8(`
export class CategoryRepo {
  private repo = {
    findOne: async (options: { where: { id: string } }) => ({ id: options.where.id, name: "Sample Category" }),
  };

  // Bước 3 · DATA_ACCESS · src/repos/category.repo.ts dòng 5–7
  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
export const categoryRepo = new CategoryRepo();
`),
    "src/repos/user.repo.ts": fflate.strToU8(`
export interface UserRecord {
  id: string;
  name: string;
  email: string;
}

export class UserRepo {
  private repo = {
    findOne: async (options: { where: { id?: string; email?: string }; select?: string[] }) => {
      return { id: options.where.id ?? "user-1", name: "Alice", email: options.where.email ?? "alice@example.com" } as UserRecord;
    },
    save: async (entity: unknown) => entity,
  };

  // Dùng chung cho N1 (Đăng ký) và N2 (Xem hồ sơ) theo spec 50 Mục 1 dòng 47
  async findById(id: string) {
    return this.repo.findOne({ where: { id }, select: ["id", "name", "email"] });
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async createAndSave(dto: { email: string; name: string }) {
    return this.repo.save({ id: "user-new", ...dto });
  }
}
export const userRepo = new UserRepo();
`),
    "src/routes/auth.routes.ts": fflate.strToU8(`
import express from "express";
import { authService, type RegisterDto } from "../services/auth.service";

export const router = express.Router();

export function validateRegisterDto(req: unknown, res: unknown, next: () => void) {
  next();
}

router.post("/register", validateRegisterDto, async (req, res) => {
  const user = await authService.register(req.body as RegisterDto);
  res.status(201).json(user);
});
export default router;
`),
    "src/routes/cart.routes.ts": fflate.strToU8(`
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { cartService, type AddCartItemDto } from "../services/cart.service";

export const router = express.Router();

router.post("/cart/items", authMiddleware, async (req, res) => {
  const userId = (req as unknown as { user?: { id?: string } }).user?.id ?? "user-1";
  const cart = await cartService.addItem(userId, req.body as AddCartItemDto);
  res.json(cart);
});
export default router;
`),
    "src/routes/order.routes.ts": fflate.strToU8(`
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { orderService } from "../services/order.service";

const app = express();
export const router = express.Router();
app.use("/api/orders", router);

// Bước 1 · ENTRY_POINT · src/routes/order.routes.ts dòng 12–15
router.post("/checkout", authMiddleware, async (req, res) => {
  const userId = (req as unknown as { user?: { id?: string } }).user?.id ?? "user-1";
  const order = await orderService.checkout(userId, (req.body as { items: { productId: string; qty: number }[] }).items);
  res.status(201).json(order);
});
export default router;
`),
    "src/routes/user.routes.ts": fflate.strToU8(`
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { userService } from "../services/user.service";

export const router = express.Router();

// Bước 1 · ENTRY_POINT · src/routes/user.routes.ts dòng 5–9
// Liên hệ hỗ trợ: *** (email giả để test maskSensitive)
router.get("/profile", authMiddleware, async (req, res) => {
  const userId = (req as unknown as { user?: { id?: string } }).user?.id ?? "user-1";
  const user = await userService.getProfile(userId);
  res.json(user);
});
export default router;
`),
    "src/services/auth.service.ts": fflate.strToU8(`
import { userRepo } from "../repos/user.repo";

export interface RegisterDto {
  email: string;
  name: string;
  password?: string;
}

export class AuthService {
  async register(dto: RegisterDto) {
    if (!dto.email) {
      throw new Error("Email is required");
    }
    const created = await userRepo.createAndSave(dto);
    // Dùng chung userRepo.findById với N2 (Xem hồ sơ) theo D-07
    return userRepo.findById((created as { id: string }).id);
  }
}
export const authService = new AuthService();
`),
    "src/services/cart.service.ts": fflate.strToU8(`
export interface AddCartItemDto {
  productId: string;
  qty: number;
}

export class CartService {
  async getCart(userId: string) {
    if (!userId) {
      throw new Error("User id is required");
    }
    return { userId, items: [] as AddCartItemDto[] };
  }

  async addItem(userId: string, item: AddCartItemDto) {
    const cart = await this.getCart(userId);
    if (!item.productId || item.qty <= 0) {
      for (let i = 0; i < 1; i++) {
        // Tăng độ phức tạp để N4 có complexity = 3 (N2 < N4)
      }
      throw new Error("Invalid cart item payload");
    }
    cart.items.push(item);
    return cart;
  }
}
export const cartService = new CartService();
`),
    "src/services/email.service.ts": fflate.strToU8(`
import express from "express";
import { mailerClient } from "../clients/mailer.client";

export const router = express.Router();

export class EmailService {
  async sendOrderConfirmation(order: { id: string; userId: string }) {
    if (!order || !order.id) {
      throw new Error("Order payload is required");
    }
    try {
      await mailerClient.sendMail({
        to: order.userId,
        subject: "Order confirmation",
        body: "Order " + order.id + " confirmed",
      });
    } catch {
      // Bỏ qua lỗi gửi mail
    }
  }
}
export const emailService = new EmailService();

router.post("/orders/email", async (req, res) => {
  await emailService.sendOrderConfirmation({ id: (req.body as { id: string }).id, userId: "user-1" });
  res.json({ sent: true });
});
export default router;
`),
    "src/services/order.service.ts": fflate.strToU8(`
import { categoryRepo } from "../repos/category.repo";
import { cartService } from "./cart.service";
import { emailService } from "./email.service";
import { reportService } from "./report.service";

export class OrderService {
  private orderRepo = {
    create: (data: unknown) => data,
    save: async (entity: unknown) => entity,
  };

  // Bước 3 · DATA_ACCESS · src/services/order.service.ts dòng 20–29
  async checkout(userId: string, items: { productId: string; qty: number }[]) {
    // Dùng chung cartService.getCart với N4 (Giỏ hàng) theo D-07
    await cartService.getCart(userId);

    if (!userId || !items || items.length === 0) {
      throw new Error("Invalid checkout payload");
    }

    for (const item of items) {
      if (item.qty <= 0) {
        throw new Error("Quantity must be greater than zero");
      }
      // Dùng chung categoryRepo.findById với N3 (Danh sách sản phẩm) theo D-07
      const product = await categoryRepo.findById(item.productId);
      if (!product) {
        throw new Error("Product not found");
      }
      if ((product as { stock?: number }).stock !== undefined && (product as { stock: number }).stock < item.qty) {
        throw new Error("Hết hàng");
      }
    }

    const order = this.orderRepo.create({ userId, items });
    const saved = await this.orderRepo.save(order);

    // N5 gọi hàm của N6 (Gửi email) và N7 (Báo cáo doanh thu) theo spec 50 Mục 1 dòng 53
    await emailService.sendOrderConfirmation(saved as { id: string; userId: string });
    await reportService.calcTotalRevenue();

    return saved;
  }
}
export const orderService = new OrderService();
`),
    "src/services/product.service.ts": fflate.strToU8(`
import { productRepo } from "../repos/product.repo";
import { categoryRepo } from "../repos/category.repo";

export class ProductService {
  // Bước 2 · BUSINESS_LOGIC · src/services/product.service.ts dòng 14–20
  async listProducts() {
    const products = await productRepo.findAll();
    for (const p of products) {
      p.category = await categoryRepo.findById(p.categoryId);
    }
    return products;
  }
}
export const productService = new ProductService();
`),
    "src/services/report.service.ts": fflate.strToU8(`
export class ReportService {
  private orderRepo = {
    findAll: async () => [{ id: "order-1", items: [{ qty: 2 }] }],
  };

  async calcTotalRevenue() {
    const orders = await this.orderRepo.findAll();
    if (!orders) {
      throw new Error("Orders not found");
    }
    let totalRevenue = 0;
    for (const order of orders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          totalRevenue += (item.qty || 1) * 100;
        }
      }
    }
    return { totalRevenue, orderCount: orders ? orders.length : 0 };
  }
}
export const reportService = new ReportService();
`),
    "src/services/user.service.ts": fflate.strToU8(`
import { userRepo } from "../repos/user.repo";

export class UserService {
  // Bước 3 · DATA_ACCESS · src/services/user.service.ts dòng 10–12
  async getProfile(id: string) {
    if (!id || id.trim() === "") {
      throw new Error("Invalid user id");
    }
    // Dùng chung userRepo.findById với N1 (Đăng ký) theo D-07
    return userRepo.findById(id);
  }
}
export const userService = new UserService();
`),
  });
}

describe("ENG / X-01 / X-07: Repo demo shop-api trong RAM và kiểm thử xuyên module", () => {
  beforeAll(async () => {
    await initParsers();
  });

  // ---------------------------------------------------------------------------
  // X-01: Tính tất định (INV-10)
  // ---------------------------------------------------------------------------
  it("X-01: Chạy runEngine 2 lần trên cùng zip shop-api cho kết quả tất định giống hệt nhau (INV-10)", async () => {
    const zipBytes = createShopApiZip();

    const res1 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "shop-api.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    const res2 = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "shop-api.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    // So sánh cấu trúc đồ thị JSON.stringify theo chuẩn X-01
    expect(JSON.stringify(res1.nodes)).toBe(JSON.stringify(res2.nodes));
    expect(JSON.stringify(res1.edges)).toBe(JSON.stringify(res2.edges));
    expect(JSON.stringify(res1.symbol_whitelist)).toBe(JSON.stringify(res2.symbol_whitelist));
    expect(JSON.stringify(res1.file_index)).toBe(JSON.stringify(res2.file_index));

    // Kiểm tra 2 lần cùng id và cùng position từng node
    for (let i = 0; i < res1.nodes.length; i++) {
      const n1 = res1.nodes[i]!;
      const n2 = res2.nodes[i]!;
      expect(n1.id).toBe(n2.id);
      expect(n1.position.x).toBe(n2.position.x);
      expect(n1.position.y).toBe(n2.position.y);
    }
  });

  // ---------------------------------------------------------------------------
  // X-01: Nghiệm thu tập 6 cạnh, Capstone và điểm bắt đầu shop-api.
  // Hướng cạnh theo D-07 (dễ → khó) và D-12 (Capstone phức tạp nhất), nên N6, N7 đứng trước N5.
  // ---------------------------------------------------------------------------
  it("X-01, T-ENG-48: Tập 6 cạnh shop-api gồm đúng N1->N2, N2->N4, N4->N5, N3->N5, N5->N6, N5->N7, N5 là Capstone, N1, N3 là điểm bắt đầu", async () => {
    const zipBytes = createShopApiZip();

    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "shop-api.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    const getNodeLabel = (id: string): string => {
      const node = res.nodes.find((n) => n.id === id);
      if (!node) return id;
      const file = node.files[0] ?? "";
      if (file.includes("auth.routes")) return "N1";
      if (file.includes("user.routes")) return "N2";
      if (file.includes("product.controller")) return "N3";
      if (file.includes("cart.routes")) return "N4";
      if (file.includes("order.routes")) return "N5";
      if (file.includes("email.service")) return "N6";
      if (file.includes("report.controller")) return "N7";
      return id;
    };

    const edgePairs = res.edges
      .map((e) => `${getNodeLabel(e.source)}->${getNodeLabel(e.target)}`)
      .sort();

    // 1. Kiểm tra đúng 6 cạnh N1->N2, N2->N4, N4->N5, N3->N5, N5->N6, N5->N7 (D-85)
    expect(edgePairs).toEqual([
      "N1->N2",
      "N2->N4",
      "N3->N5",
      "N4->N5",
      "N5->N6",
      "N5->N7",
    ]);

    // 2. N5 là Capstone (D-12)
    const capstone = res.nodes.find((n) => n.is_capstone);
    expect(capstone).toBeDefined();
    expect(getNodeLabel(capstone!.id)).toBe("N5");

    // 3. N1, N3 là điểm bắt đầu (prerequisites = [])
    const startNodes = res.nodes
      .filter((n) => n.prerequisites.length === 0)
      .map((n) => getNodeLabel(n.id))
      .sort();
    expect(startNodes).toEqual(["N1", "N3"]);
  });

  // ---------------------------------------------------------------------------
  // DoD dòng 1–3: Kiểm tra các tiêu chí Definition of Done spec 50 Mục 5
  // ---------------------------------------------------------------------------
  it("ENG: DoD dòng 1–3: repo shop-api trong RAM có từ 6 đến 20 node, các luồng có lát cắt và tầng bước hợp lý", async () => {
    const zipBytes = createShopApiZip();

    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "shop-api.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    // 1. Số node trong khoảng [CONFIG.DISPLAY_MIN_NODES, CONFIG.DISPLAY_MAX_NODES] (6..20)
    // DoD dòng 1: đồng hồ đo hiện ingest_ms + engine_ms thật
    expect(res.ingestion_report.ingest_ms).toBeGreaterThan(0);
    expect(res.ingestion_report.engine_ms).toBeGreaterThan(0);
    expect(res.nodes.length).toBeGreaterThanOrEqual(CONFIG.DISPLAY_MIN_NODES);
    expect(res.nodes.length).toBeLessThanOrEqual(CONFIG.DISPLAY_MAX_NODES);

    // 2. Đúng 1 Capstone duy nhất (D-12)
    const capstones = res.nodes.filter((n) => n.is_capstone);
    expect(capstones.length).toBe(1);

    // 3. Đúng 17 file trong file_index theo spec 50 Mục 1 và shop-api.json
    expect(res.file_index.length).toBe(17);
    expect(res.file_index).toEqual([
      "src/clients/mailer.client.ts",
      "src/controllers/product.controller.ts",
      "src/controllers/report.controller.ts",
      "src/middlewares/auth.middleware.ts",
      "src/repos/category.repo.ts",
      "src/repos/user.repo.ts",
      "src/routes/auth.routes.ts",
      "src/routes/cart.routes.ts",
      "src/routes/order.routes.ts",
      "src/routes/user.routes.ts",
      "src/services/auth.service.ts",
      "src/services/cart.service.ts",
      "src/services/email.service.ts",
      "src/services/order.service.ts",
      "src/services/product.service.ts",
      "src/services/report.service.ts",
      "src/services/user.service.ts",
    ]);

    // 4. Các node có trace_steps hợp lý với các tầng kiến trúc
    for (const node of res.nodes) {
      expect(node.trace_steps.length).toBeGreaterThan(0);
      const layers = node.trace_steps.map((st) => st.layer);
      expect(layers.length).toBeGreaterThanOrEqual(1);
    }
  });

  // ---------------------------------------------------------------------------
  // X-07: Bố cục bản đồ D-55 (Hàng điểm bắt đầu) trên repo shop-api
  // ---------------------------------------------------------------------------
  // ENG-22, ENG-31: service/repo viết kiểu `export const svc = new Svc()` rồi import sang file khác (mẫu phổ biến
  // nhất của Express). Lần tập: thiếu luật này thì lát cắt cụt ở bước ENTRY/MIDDLEWARE mà vẫn đủ số node.
  it("ENG-31: lát cắt đi qua service/repo import dạng instance (đủ bước tới DATA_ACCESS)", async () => {
    const res = await runEngine({ kind: "ZIP_UPLOAD", file_name: "shop-api.zip", bytes: createShopApiZip(), subdir_override: null });
    const fns = (title: string) => res.nodes.find((n) => n.title === title)?.trace_steps.map((s) => s.function_name) ?? [];
    expect(fns("List Products")).toEqual(["router.get('/products')", "ProductService.listProducts", "CategoryRepo.findById"]);
    expect(fns("Order Checkout")).toContain("OrderService.checkout");
    expect(fns("Register")).toContain("AuthService.register");
    expect(res.nodes.find((n) => n.is_capstone)?.title).toBe("Order Checkout");
  });

  it("X-07: Mọi node có prerequisites = [] đều có cùng position.y nhỏ nhất trên repo shop-api (D-55)", async () => {
    const zipBytes = createShopApiZip();

    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "shop-api.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    // Node có prerequisites = [] là các điểm bắt đầu (D-55)
    const startNodes = res.nodes.filter((n) => n.prerequisites.length === 0);
    expect(startNodes.length).toBeGreaterThan(0);

    const minY = Math.min(...res.nodes.map((n) => n.position.y));

    // Mọi điểm bắt đầu phải có cùng position.y = minY
    for (const sn of startNodes) {
      expect(sn.position.y).toBe(minY);
    }

    // Các node không phải điểm bắt đầu (prerequisites > 0) phải có position.y lớn hơn minY
    const nonStartNodes = res.nodes.filter((n) => n.prerequisites.length > 0);
    for (const nsn of nonStartNodes) {
      expect(nsn.position.y).toBeGreaterThan(minY);
    }
  });

  // ---------------------------------------------------------------------------
  // X-07: Cạnh thuật toán D-56 khi lát cắt gọi VIP ALGO
  // ---------------------------------------------------------------------------
  it("X-07: Cạnh thuật toán D-56: node algo-* được lát cắt gọi tới có cạnh nối và tuân thủ hàng điểm bắt đầu D-55", async () => {
    // Dựng repo có 1 lát cắt gọi tới hàm VIP thuật toán (complexity >= VIP_COMPLEXITY_MIN = 15) ở hop > SLICE_MAX_HOPS
    // Và 1 hàm VIP thuật toán standalone không ai gọi
    const algoZip = fflate.zipSync({
      "package.json": fflate.strToU8(
        JSON.stringify({
          name: "algo-demo",
          version: "1.0.0",
          dependencies: { express: "^4.18.2" },
        })
      ),
      "src/algo/dijkstra.ts": fflate.strToU8(`
export function findShortestRoute(graph: any, src: string, dest: string): string[] {
  let best = "";
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i === 1) {
        if (j === 2) {
          best = src + dest;
        } else if (j === 3) {
          best = dest + src;
        }
      } else if (i === 2) {
        for (let k = 0; k < 3; k++) {
          if (k === 1) {
            best = "path";
          }
        }
      }
    }
  }
  return [best];
}

export function standaloneVip(x: number): number {
  let sum = x;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i > 0 && j > 0) {
        for (let k = 0; k < 3; k++) {
          if (k === 2) sum += i * j;
        }
      }
    }
  }
  return sum;
}
`),
      "src/services/shipping.service.ts": fflate.strToU8(`
import { findShortestRoute } from "../algo/dijkstra";

export function hop1(g: any, s: string, d: string): string[] {
  return hop2(g, s, d);
}
export function hop2(g: any, s: string, d: string): string[] {
  return hop3(g, s, d);
}
export function hop3(g: any, s: string, d: string): string[] {
  return hop4(g, s, d);
}
export function hop4(g: any, s: string, d: string): string[] {
  return findShortestRoute(g, s, d);
}
`),
      "src/routes/shipping.routes.ts": fflate.strToU8(`
import express from "express";
import { hop1 } from "../services/shipping.service";

export const router = express.Router();

router.post("/shipping/route", (req, res) => {
  const path = hop1(req.body.graph, req.body.src, req.body.dest);
  res.json({ path });
});
export default router;
`),
    });

    const res = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "algo-demo.zip",
      bytes: algoZip,
      subdir_override: null,
    });

    // 1. Phải có cả node lát cắt (slice-*) và node thuật toán (algo-*)
    const sliceNodes = res.nodes.filter((n) => n.id.startsWith("slice-"));
    const algoNodes = res.nodes.filter((n) => n.id.startsWith("algo-"));

    expect(sliceNodes.length).toBeGreaterThan(0);
    expect(algoNodes.length).toBeGreaterThan(0);

    // 2. D-56: Node algo-* được lát cắt gọi tới (findShortestRoute) phải có cạnh nối với lát cắt đó
    // Tìm theo hàm của bước, không đoán id: Mục 13 bỏ token "route" (TECH_TOKENS) nên slug là
    // "find-shortest" (README vai B, việc cần chốt số 3).
    const connectedAlgo = algoNodes.find((an) =>
      an.trace_steps.some((s) => s.function_name === "findShortestRoute")
    );
    expect(connectedAlgo).toBeDefined();

    const sliceNode = sliceNodes[0]!;
    const hasConnectingEdge = res.edges.some(
      (e) =>
        (e.source === sliceNode.id && e.target === connectedAlgo!.id) ||
        (e.source === connectedAlgo!.id && e.target === sliceNode.id)
    );
    expect(hasConnectingEdge).toBe(true);

    // 3. Node VIP standalone không ai gọi phải đứng riêng, không có cạnh vào
    const standaloneAlgo = algoNodes.find((an) => an.trace_steps.some((s) => s.function_name === "standaloneVip"));
    if (standaloneAlgo) {
      expect(standaloneAlgo.prerequisites).toEqual([]);
    }

    // 4. D-55: Mọi node có prerequisites = [] đều có cùng position.y nhỏ nhất
    const startNodes = res.nodes.filter((n) => n.prerequisites.length === 0);
    expect(startNodes.length).toBeGreaterThan(0);
    const minY = Math.min(...res.nodes.map((n) => n.position.y));
    for (const sn of startNodes) {
      expect(sn.position.y).toBe(minY);
    }
  });
});
