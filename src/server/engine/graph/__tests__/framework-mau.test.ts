import { describe, expect, it, vi } from "vitest";

// Chạy thật runEngine (parse + đồ thị) có thể > 5 s khi CI/máy tải nặng ⇒ nới thời gian, tránh đỏ chập chờn.
vi.setConfig({ testTimeout: 30_000 });
import * as fflate from "fflate";
import { runEngine } from "../../index";
async function run(name: string, files: Record<string, string>) {
  const zip = fflate.zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, fflate.strToU8(v)])));
  return runEngine({ kind: "ZIP_UPLOAD", file_name: name + ".zip", bytes: zip, subdir_override: null });
}
const steps = (n: { trace_steps: { layer: string; function_name: string }[] }) => n.trace_steps.map((s) => `${s.layer}:${s.function_name}`);
// Chạy thật 3 framework có dấu ✅ dùng decorator/router (12 Mục 1). Lần tập bắt được: method có ≥ 2 decorator mất
// cạnh gọi hàm (NestJS, Flask), bỏ qua APIRouter(prefix)/include_router/register_blueprint, methods=[…] luôn ra GET,
// Depends(fn) không thành middleware, warning "cụm vòng lớn" sai với SCC 1 file.
describe("ENG-40, ENG-31, ENG-60: chạy thật FastAPI, Flask, NestJS", () => {
it("ENG-40: cả 3 repo ra đúng tên, middleware và bước DATA_ACCESS", async () => {
  const fa = await run("fastapi", {
    "requirements.txt": "fastapi==0.110\n",
    "app/main.py": "from fastapi import FastAPI\nfrom app.routers import items\napp = FastAPI()\napp.include_router(items.router, prefix=\"/api\")\n",
    "app/routers/items.py": "from fastapi import APIRouter, Depends\nfrom app.services.item_service import create_item, get_db\nrouter = APIRouter(prefix=\"/items\")\n\n@router.post(\"/\")\ndef create(payload: dict, db=Depends(get_db)):\n    item = create_item(db, payload)\n    return item\n",
    "app/services/item_service.py": "def get_db():\n    return None\n\ndef create_item(db, payload):\n    if not payload.get(\"name\"):\n        raise ValueError(\"name required\")\n    obj = {\"name\": payload[\"name\"]}\n    db.add(obj)\n    db.commit()\n    return obj\n",
  });
  const fl = await run("flask", {
    "requirements.txt": "flask==3.0\n",
    "app/__init__.py": "from flask import Flask\nfrom app.users import bp\napp = Flask(__name__)\napp.register_blueprint(bp, url_prefix=\"/api\")\n",
    "app/users.py": "from flask import Blueprint\nfrom app.auth import login_required\nfrom app.repo import save_user\nbp = Blueprint(\"users\", __name__, url_prefix=\"/users\")\n\n@bp.route(\"/register\", methods=[\"POST\"])\n@login_required\ndef register():\n    user = save_user({\"name\": \"x\"})\n    return user\n",
    "app/auth.py": "def login_required(f):\n    return f\n",
    "app/repo.py": "def save_user(u):\n    session.add(u)\n    session.commit()\n    return u\n",
  });
  const ne = await run("nest", {
    "package.json": JSON.stringify({ dependencies: { "@nestjs/core": "^10", "@nestjs/common": "^10", typeorm: "^0.3" } }),
    "src/orders/orders.controller.ts": "import { Controller, Post, Body, UseGuards } from '@nestjs/common';\nimport { OrdersService } from './orders.service';\nimport { AuthGuard } from '../auth/auth.guard';\n\n@Controller('orders')\nexport class OrdersController {\n  constructor(private readonly ordersService: OrdersService) {}\n\n  @Post('checkout')\n  @UseGuards(AuthGuard)\n  checkout(@Body() dto: any) {\n    return this.ordersService.checkout(dto);\n  }\n}\n",
    "src/orders/orders.service.ts": "import { Repository } from 'typeorm';\nexport class OrdersService {\n  constructor(private readonly orderRepo: Repository<any>) {}\n  async checkout(dto: any) {\n    if (!dto.items.length) throw new Error('empty');\n    const order = this.orderRepo.create({ items: dto.items });\n    return this.orderRepo.save(order);\n  }\n}\n",
    "src/auth/auth.guard.ts": "export class AuthGuard {\n  canActivate(ctx: any) {\n    return !!ctx;\n  }\n}\n",
  });
  expect(fa.nodes.map((n) => n.title)).toEqual(["Create Item"]);
  expect(steps(fa.nodes[0]!)).toEqual(["ENTRY_POINT:@router.post('/')", "MIDDLEWARE:get_db", "DATA_ACCESS:create_item"]);
  // Không so rỗng: warning vượt CONFIG.ENGINE_BUDGET_MS (ENG-02) có thể xuất hiện khi máy/CI tải nặng.
  expect(fa.ingestion_report.warnings.filter((w) => w.includes("cụm phụ thuộc vòng"))).toEqual([]);
  expect(fl.nodes.map((n) => n.title)).toEqual(["User Register"]);
  expect(steps(fl.nodes[0]!)).toEqual(["ENTRY_POINT:@bp.route('/register')", "MIDDLEWARE:login_required", "DATA_ACCESS:save_user"]);
  expect(ne.nodes.map((n) => n.title)).toEqual(["Order Checkout"]);
  expect(steps(ne.nodes[0]!)).toEqual(["ENTRY_POINT:@Post('/orders/checkout')", "MIDDLEWARE:AuthGuard.canActivate", "DATA_ACCESS:OrdersService.checkout"]);
});
});

// ENG-22, ENG-31: 6 cách viết service hay gặp ở Express. Lần tập (B08) chỉ cách "export const svc = new Svc()" được
// sửa, còn `export default new Svc()` và CommonJS `module.exports = new Svc()` vẫn làm lát cắt cụt.
describe("ENG-31: lát cắt đi qua service viết theo 6 kiểu export khác nhau", () => {
  const route = (imp: string, call: string) =>
    `import express from "express";\n${imp}\nconst router = express.Router();\nrouter.post("/orders/checkout", async (req, res) => {\n  const o = await ${call}(req.body);\n  res.json(o);\n});\nexport default router;\n`;
  const svcBody = `  async checkout(dto) {\n    const order = await orderRepo.save(dto);\n    return order;\n  }\n`;
  const cases: Record<string, Record<string, string>> = {
    "export const": {
      "src/routes/order.routes.ts": route(`import { orderService } from "../services/order.service";`, "orderService.checkout"),
      "src/services/order.service.ts": `export class OrderService {\n${svcBody}}\nexport const orderService = new OrderService();\n`,
    },
    "export default new": {
      "src/routes/order.routes.ts": route(`import orderService from "../services/order.service";`, "orderService.checkout"),
      "src/services/order.service.ts": `class OrderService {\n${svcBody}}\nexport default new OrderService();\n`,
    },
    "module.exports = new": {
      "src/routes/order.routes.js": route(`const orderService = require("../services/order.service");`, "orderService.checkout")
        .replace(`import express from "express";`, `const express = require("express");`)
        .replace("export default router;", "module.exports = router;"),
      "src/services/order.service.js": `class OrderService {\n${svcBody}}\nmodule.exports = new OrderService();\n`,
    },
    static: {
      "src/routes/order.routes.ts": route(`import { OrderService } from "../services/order.service";`, "OrderService.checkout"),
      "src/services/order.service.ts": `export class OrderService {\n  static${svcBody.slice(1)}}\n`,
    },
    "import * as": {
      "src/routes/order.routes.ts": route(`import * as orderService from "../services/order.service";`, "orderService.checkout"),
      "src/services/order.service.ts": `export async function checkout(dto) {\n  const order = await orderRepo.save(dto);\n  return order;\n}\n`,
    },
    container: {
      "src/routes/order.routes.ts": route(`import { orderService } from "../container";`, "orderService.checkout"),
      "src/container.ts": `import { OrderService } from "./services/order.service";\nexport const orderService = new OrderService();\n`,
      "src/services/order.service.ts": `export class OrderService {\n${svcBody}}\n`,
    },
  };
  for (const [name, files] of Object.entries(cases)) {
    it(`ENG-31: ${name} ⇒ Order Checkout có bước DATA_ACCESS`, async () => {
      const r = await run(name.replace(/\W+/g, "-"), files);
      const node = r.nodes.find((n) => n.title === "Order Checkout");
      expect(node?.trace_steps.map((s) => s.layer)).toEqual(["ENTRY_POINT", "DATA_ACCESS"]);
    });
  }
});
