import { describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { runEngine } from "../../index";

const files: Record<string, string> = {
  "package.json": JSON.stringify({ name: "shop-api", dependencies: { express: "^4", typeorm: "^0.3", jsonwebtoken: "^9" } }),
  "src/app.ts": `import express from "express";
import productRouter from "./controllers/product.controller";
import userRouter from "./routes/user.routes";
import orderRouter from "./routes/order.routes";
const app = express();
app.use("/api", productRouter);
app.use("/api", userRouter);
app.use("/api/orders", orderRouter);
app.listen(3000);
`,
  "src/controllers/product.controller.ts": `import { Router } from "express";
import { ProductService } from "../services/product.service";
const router = Router();
const productService = new ProductService();

router.get('/products', async (req, res) => {
  const products = await productService.listProducts();
  res.json(products);
});
export default router;
`,
  "src/services/product.service.ts": `import { CategoryRepo } from "../repos/category.repo";
import { AppDataSource } from "../db";
const productRepo = AppDataSource.getRepository("Product");
const categoryRepo = new CategoryRepo();

export class ProductService {
  async listProducts() {
    const products = await productRepo.findAll();
    for (const p of products) {
      p.category = await categoryRepo.findById(p.categoryId);
    }
    return products;
  }
}
`,
  "src/repos/category.repo.ts": `import { AppDataSource } from "../db";
export class CategoryRepo {
  repo = AppDataSource.getRepository("Category");
  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }
}
`,
  "src/db.ts": `import { DataSource } from "typeorm";
export const AppDataSource = new DataSource({ type: "postgres" });
`,
  "src/middlewares/auth.middleware.ts": `import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET ?? "";
export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
}
`,
  "src/routes/user.routes.ts": `import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { UserService } from "../services/user.service";
const router = Router();
const userService = new UserService();

router.get('/profile', authMiddleware, async (req: any, res) => {
  const user = await userService.getProfile(req.user.id);
  res.json(user);
});
export default router;
`,
  "src/services/user.service.ts": `import { AppDataSource } from "../db";
const userRepo = AppDataSource.getRepository("User");
export class UserService {
  async getProfile(id: number) {
    return userRepo.findOne({ where: { id }, select: ['id', 'name', 'email'] });
  }
}
`,
  "src/routes/order.routes.ts": `import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { OrderService } from "../services/order.service";
const router = Router();
const orderService = new OrderService();

router.post('/checkout', authMiddleware, async (req: any, res) => {
  const order = await orderService.checkout(req.user.id, req.body.items);
  res.status(201).json(order);
});
export default router;
`,
  "src/services/order.service.ts": `import { AppDataSource } from "../db";
import { findShortestRoute } from "../algo/dijkstra";
const productRepo = AppDataSource.getRepository("Product");
const orderRepo = AppDataSource.getRepository("Order");
export class OrderService {
  async checkout(userId: number, items: any[]) {
    for (const item of items) {
      const product = await productRepo.findOne({ where: { id: item.productId } });
      if (product.stock < item.qty) throw new Error('Hết hàng');
      product.stock -= item.qty;
      await productRepo.save(product);
    }
    const eta = findShortestRoute({}, "A", "B");
    const order = orderRepo.create({ userId, items, eta });
    return orderRepo.save(order);
  }
}
`,
  "src/algo/dijkstra.ts": `export function findShortestRoute(graph: any, start: string, end: string) {
  if (!graph || !start) return -1;
  const dist: Record<string, number> = { [start]: 0 };
  const visited = new Set<string>();
  for (const a of Object.keys(graph)) {
    if (visited.has(a)) continue;
    for (const b of Object.keys(graph[a] ?? {})) {
      if (dist[b] === undefined || dist[a] + graph[a][b] < dist[b]) {
        if (a !== b && (graph[a][b] > 0 || graph[a][b] === 0)) {
          dist[b] = dist[a] + graph[a][b];
        }
      }
    }
    visited.add(a);
  }
  return dist[end] ?? -1;
}
`,
};

// Repo mẫu dựng từ code spec 50 Mục 1.2 (N2, N3, N5), chạy thật runEngine. Bắt các lỗi mà test từng hàm
// không thấy (lần tập: mất dòng gọi qua biến instance, bỏ `v.x -= …`, quên tiền tố `app.use(prefix, router)`).
describe("ENG-40, ENG-80…ENG-89, ENG-111: chạy thật trên repo mẫu shop-api", () => {
  const zip = fflate.zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, fflate.strToU8(v)])));
  const src = { kind: "ZIP_UPLOAD" as const, file_name: "shop-api.zip", bytes: zip, subdir_override: null };

  it("ENG-111: router mount ở /api/orders ⇒ node \"Order Checkout\", id đúng bảng T-ENG-18 (slice-order-checkout-a6ff3b)", async () => {
    const r = await runEngine(src);
    const checkout = r.nodes.find((n) => n.id === "slice-order-checkout-a6ff3b");
    expect(checkout?.title).toBe("Order Checkout");
    expect(r.fingerprint.detected_framework).toBe("Express");
  });

  it("ENG-80 hạt giống: dòng gọi bước kế qua biến instance (categoryRepo.findById) được giữ", async () => {
    const r = await runEngine(src);
    const list = r.nodes.find((n) => n.title === "List Products");
    const step2 = list?.trace_steps.find((s) => s.function_name === "ProductService.listProducts");
    expect(step2?.snippet).toContain("categoryRepo.findById(p.categoryId)");
    expect(list?.trace_steps.map((s) => s.layer)).toEqual(["ENTRY_POINT", "BUSINESS_LOGIC", "DATA_ACCESS"]);
  });

  it("ENG-80 def-use: `product.stock -= item.qty` là định nghĩa của product nên được giữ", async () => {
    const r = await runEngine(src);
    const checkout = r.nodes.find((n) => n.id === "slice-order-checkout-a6ff3b");
    const step3 = checkout?.trace_steps.find((s) => s.function_name === "OrderService.checkout");
    expect(step3?.snippet).toContain("product.stock -= item.qty;");
    expect(step3?.layer).toBe("DATA_ACCESS");
  });

  it("ENG-01: chạy 2 lần cùng zip ra nodes, edges, symbol_whitelist giống hệt", async () => {
    const a = await runEngine(src);
    const b = await runEngine(src);
    expect(JSON.stringify([a.nodes, a.edges, a.symbol_whitelist])).toBe(JSON.stringify([b.nodes, b.edges, b.symbol_whitelist]));
  });
});
