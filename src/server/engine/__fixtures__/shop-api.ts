// 50 Mục 1 — repo mẫu shop-api (Express + TypeORM), dựng thành zip trong RAM để test engine.
import { strToU8, zipSync } from "fflate";

export const SHOP_FILES: Record<string, string> = {
  "package.json": JSON.stringify({ name: "shop-api", dependencies: { express: "4", typeorm: "0.3", pg: "8", zod: "3", jsonwebtoken: "9" } }),
  "src/app.ts": `import express from 'express';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import productController from './controllers/product.controller';
const app = express();
app.use('/users', userRoutes);
app.use('/orders', orderRoutes);
app.use('/', productController);
export default app;
`,
  "src/middlewares/auth.middleware.ts": `import jwt from 'jsonwebtoken';
const JWT_SECRET = "super-secret-key-123";
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
}
`,
  "src/routes/user.routes.ts": `import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { userService } from '../services/user.service';
const router = Router();
router.get('/profile', authMiddleware, async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  res.json(user);
});
export default router;
`,
  "src/routes/order.routes.ts": `import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orderService } from '../services/order.service';
const router = Router();
router.post('/checkout', authMiddleware, async (req, res) => {
  const order = await orderService.checkout(req.user.id, req.body.items);
  res.status(201).json(order);
});
export default router;
`,
  "src/controllers/product.controller.ts": `import { Router } from 'express';
import { productService } from '../services/product.service';
const router = Router();
router.get('/products', async (req, res) => {
  const products = await productService.listProducts();
  res.json(products);
});
export default router;
`,
  "src/services/user.service.ts": `import { userRepo } from '../repos/user.repo';
class UserService {
  async getProfile(id) {
    return userRepo.findOne({ where: { id }, select: ['id', 'name', 'email'] });
  }
}
export const userService = new UserService();
`,
  "src/services/product.service.ts": `import { productRepo } from '../repos/product.repo';
import { categoryRepo } from '../repos/category.repo';
class ProductService {
  async listProducts() {
    const products = await productRepo.findAll();
    for (const p of products) {
      p.category = await categoryRepo.findById(p.categoryId);
    }
    return products;
  }
}
export const productService = new ProductService();
`,
  "src/services/order.service.ts": `import { AppDataSource } from '../data-source';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
const productRepo = AppDataSource.getRepository(Product);
const orderRepo = AppDataSource.getRepository(Order);
class OrderService {
  async checkout(userId, items) {
    for (const item of items) {
      const product = await productRepo.findOne({ where: { id: item.productId } });
      if (product.stock < item.qty) throw new Error('Hết hàng');
      product.stock -= item.qty;
      await productRepo.save(product);
    }
    const order = orderRepo.create({ userId, items });
    return orderRepo.save(order);
  }
}
export const orderService = new OrderService();
`,
  "src/data-source.ts": `export const AppDataSource = { getRepository(e) { return e; } };\n`,
  "src/entities/order.entity.ts": `export class Order { id: number; userId: number; }\n`,
  "src/entities/product.entity.ts": `export class Product { id: number; stock: number; categoryId: number; category: unknown; }\n`,
  "src/repos/user.repo.ts": `import { AppDataSource } from '../data-source';
import { Product } from '../entities/product.entity';
class UserRepo {
  private repo = AppDataSource.getRepository(Product);
  findOne(q) { return this.repo.findOne(q); }
}
export const userRepo = new UserRepo();
`,
  "src/repos/product.repo.ts": `import { AppDataSource } from '../data-source';
import { Product } from '../entities/product.entity';
class ProductRepo {
  private repo = AppDataSource.getRepository(Product);
  findAll() { return this.repo.find(); }
}
export const productRepo = new ProductRepo();
`,
  "src/repos/category.repo.ts": `import { AppDataSource } from '../data-source';
import { Product } from '../entities/product.entity';
class CategoryRepo {
  private repo = AppDataSource.getRepository(Product);
  findById(id) {
    return this.repo.findOne({ where: { id } });
  }
}
export const categoryRepo = new CategoryRepo();
`,
};

export function shopZip(prefix = "shop-api-main/"): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [p, c] of Object.entries(SHOP_FILES)) entries[`${prefix}${p}`] = strToU8(c);
  return zipSync(entries);
}
