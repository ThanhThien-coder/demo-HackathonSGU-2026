// Thực thể, cạnh dữ liệu, nhóm, cột Học riêng — spec 11 Mục 11.1, Mục 14 (ENG-116 … ENG-119), D-84, D-85.
import { beforeAll, describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { runEngine, toClientResult } from "../../index";
import { initParsers } from "../parser";

const scan = async (files: Record<string, string>) => {
  const zippable: fflate.Zippable = {};
  for (const [path, code] of Object.entries(files)) zippable[path] = fflate.strToU8(code);
  return runEngine({ kind: "ZIP_UPLOAD", file_name: "du-lieu.zip", bytes: fflate.zipSync(zippable), subdir_override: null });
};
type Result = Awaited<ReturnType<typeof scan>>;

const server = (route: string) => `
import express from "express";
const app = express();
const router = express.Router();
${route}
app.use(router);
`;
const nodeOf = (res: Result, evidence: string) => {
  const node = res.nodes.find((n) => n.title_evidence === evidence);
  if (!node) throw new Error(`Không có bài ${evidence}: ${res.nodes.map((n) => n.title_evidence).join(", ")}`);
  return node;
};
const entitiesOf = (res: Result, evidence: string) => nodeOf(res, evidence).entities;
const edgeOf = (res: Result, from: string, to: string) =>
  res.edges.find((e) => e.source === nodeOf(res, from).id && e.target === nodeOf(res, to).id);

describe("ENG-116 … ENG-119: thực thể, cạnh dữ liệu, nhóm", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENG-45: đọc tên và thao tác từ lời gọi dữ liệu", async () => {
    const res = await scan({
      "package.json": JSON.stringify({ dependencies: { express: "4", mongoose: "8", typeorm: "0.3" } }),
      "src/app.ts": server(`
import { Svc } from "./svc";
const s = new Svc();
router.get("/a", (req, res) => { res.json(s.a()); });
router.get("/b", (req, res) => { res.json(s.b()); });
router.get("/c", (req, res) => { res.json(s.c()); });
router.get("/d", (req, res) => { res.json(s.d()); });
router.get("/e", (req, res) => { res.json(s.e()); });
`),
      "src/svc.ts": `
import { Order } from "./order.schema";
import { Repository } from "typeorm";
import { UserRepo } from "./user.repo";
export class Svc {
  private prisma: any;
  private db: any;
  private users = new UserRepo();
  constructor(private repo: Repository<Order>) {}
  a() { return this.prisma.orderItem.create({ data: {} }); }
  b() { return this.prisma.$transaction(async (tx: any) => tx.user.findMany({})); }
  c() { return Order.create({}); }
  async d() {
    const o = await this.repo.findOne({});
    return this.repo.save(o);
  }
  e() { return this.db.query("select 1"); }
}
`,
      "src/order.schema.ts": `export class Order { static create(x: unknown) { return x; } }\n`,
      "src/user.repo.ts": `export class UserRepo {}\n`,
    });

    expect(entitiesOf(res, "GET /a")).toEqual([{ name: "OrderItem", ops: ["CREATE"] }]);
    expect(entitiesOf(res, "GET /b")).toEqual([{ name: "User", ops: ["READ"] }]);
    expect(entitiesOf(res, "GET /d")).toEqual([{ name: "Order", ops: ["READ", "UPDATE"] }]);
    expect(entitiesOf(res, "GET /e").some((e) => e.name === "Db")).toBe(false);
  });

  it("T-ENG-46: bài không có DATA_SINK lấy thực thể từ route", async () => {
    const res = await scan({
      "src/app.ts": server(`
router.post("/orders", (req, res) => { res.json(1); });
router.post("/auth/login", (req, res) => { res.json(2); });
router.post("/auth/register", (req, res) => { res.json(3); });
`),
    });

    expect(entitiesOf(res, "POST /orders")).toEqual([{ name: "Order", ops: ["CREATE"] }]);
    expect(entitiesOf(res, "POST /auth/login")).toEqual([{ name: "Auth", ops: ["READ"] }]);
    expect(entitiesOf(res, "POST /auth/register")).toEqual([{ name: "Auth", ops: ["CREATE"] }]);
  });

  const shop = {
    "src/app.ts": server(`
import { reg, profile, checkout, report } from "./svc";
router.post("/register", (req, res) => { res.json(reg()); });
router.get("/profile", (req, res) => { res.json(profile()); });
router.post("/checkout", (req, res) => { res.json(checkout()); });
router.get("/report", (req, res) => { res.json(report()); });
`),
    "src/svc.ts": `
const userRepo = { create: (v: number) => v, findOne: (v: number) => v };
const orderRepo = { create: (v: number) => v, find: (v: number) => v };
export function reg() { return userRepo.create(1); }
export function profile() { return userRepo.findOne(1); }
export function checkout() { if (1 > 0) { return orderRepo.create(1); } return 0; }
export function report() { return orderRepo.find(1); }
`,
    "src/order.entity.ts": `
import { ManyToOne } from "typeorm";
import { User } from "./user.entity";
export class Order {
  @ManyToOne(() => User)
  user: User;
}
`,
    "src/user.entity.ts": `export class User {}\n`,
  };

  it("T-ENG-41: nguồn nối tới bài dùng thực thể, bài tạo nhận cạnh qua khóa ngoại", async () => {
    const res = await scan(shop);

    expect(edgeOf(res, "POST /register", "GET /profile")?.via_entities).toEqual(["User"]);
    expect(edgeOf(res, "POST /register", "POST /checkout")?.via_entities).toEqual(["User"]);
    expect(edgeOf(res, "POST /checkout", "GET /report")?.via_entities).toEqual(["Order"]);
    expect(nodeOf(res, "GET /report").prerequisites).toEqual([nodeOf(res, "POST /checkout").id]);
  });

  it("T-ENG-41: schema.prisma cho khóa ngoại khi nằm trong manifest", async () => {
    const res = await scan({
      "prisma/schema.prisma": `model User {\n  id Int @id\n  orders Order[]\n}\nmodel Order {\n  id Int @id\n  user User @relation(fields: [userId], references: [id])\n  userId Int\n}\n`,
      "src/app.ts": server(`
import { reg, checkout } from "./svc";
router.post("/register", (req, res) => { res.json(reg()); });
router.post("/checkout", (req, res) => { res.json(checkout()); });
`),
      "src/svc.ts": `
const prisma: any = {};
export function reg() { return prisma.user.create({}); }
export function checkout() { if (1 > 0) { return prisma.order.create({}); } return 0; }
`,
    });

    expect(edgeOf(res, "POST /register", "POST /checkout")?.via_entities).toEqual(["User"]);
  });

  it("T-ENG-47: không có bài tạo thì nguồn là bài dễ hơn", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { easy, hard } from "./svc";
router.get("/easy", (req, res) => { res.json(easy()); });
router.get("/hard", (req, res) => { res.json(hard()); });
`),
      "src/svc.ts": `
const tagRepo = { find: (v: number) => v };
export function easy() { return tagRepo.find(1); }
export function hard() { if (1 > 0) { if (2 > 1) { return tagRepo.find(2); } } return 0; }
`,
    });

    expect(edgeOf(res, "GET /easy", "GET /hard")?.via_entities).toEqual(["Tag"]);
  });

  it("ENG-119: nhóm theo thực thể chính, thứ tự theo depth rồi group_id, bài lẻ vào Học riêng", async () => {
    const res = await scan({
      ...shop,
      "src/app.ts": shop["src/app.ts"].replace(`app.use(router);`, `router.get("/ping", (req, res) => { res.json(1); });\napp.use(router);`),
    });

    expect(res.groups.map((g) => g.group_id)).toEqual(["group-entity-user", "group-entity-order", "group-standalone"]);
    expect(res.groups[0]?.key_kind).toBe("ENTITY");
    const lone = res.groups[res.groups.length - 1];
    expect(lone?.key).toBe("Học riêng");
    expect(lone?.node_ids).toEqual([nodeOf(res, "GET /ping").id]);
    expect(nodeOf(res, "GET /ping").group_id).toBe("group-standalone");
    expect(res.groups.flatMap((g) => g.node_ids).sort()).toEqual(res.nodes.map((n) => n.id).sort());
  });

  it("ENG-112: bài không có thực thể từ code, chưa có cạnh thì nhận cặp D-07", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { help, work } from "./svc";
router.post("/cart/items", (req, res) => { res.json(help()); });
router.post("/checkout", (req, res) => { res.json(work()); });
`),
      "src/svc.ts": `
const orderRepo = { create: (v: number) => v };
function help2() { return 1; }
export function help() { return help2(); }
export function work() { if (help2() > 0) { return orderRepo.create(1); } return 0; }
`,
    });

    expect(edgeOf(res, "POST /cart/items", "POST /checkout")?.via_entities).toEqual([]);
  });

  it("Mục 14: bài không có cạnh xếp cột riêng bên phải", async () => {
    const res = await scan({
      ...shop,
      "src/app.ts": shop["src/app.ts"].replace(`app.use(router);`, `router.get("/ping", (req, res) => { res.json(1); });\napp.use(router);`),
    });
    const lone = nodeOf(res, "GET /ping");
    const others = res.nodes.filter((n) => n.id !== lone.id);

    expect(lone.position.x).toBeGreaterThan(Math.max(...others.map((n) => n.position.x)));
    expect(lone.prerequisites).toEqual([]);
  });

  it("D-83: readme_excerpt, manifest_description đi tới kết quả engine, không gửi trình duyệt", async () => {
    const res = await scan({
      ...shop,
      "README.md": "# Shop\nBán đồ uống online.\n",
      "package.json": JSON.stringify({ name: "shop", description: "Cửa hàng đồ uống" }),
    });

    expect(res.readme_excerpt).toContain("Bán đồ uống online.");
    expect(res.manifest_description).toBe("Cửa hàng đồ uống");
    expect(toClientResult(res)).not.toHaveProperty("readme_excerpt");
    expect(toClientResult(res)).not.toHaveProperty("manifest_description");
  });

  it("toClientResult giữ entities, via_entities, groups", async () => {
    const client = toClientResult(await scan(shop));

    expect(client.groups.length).toBeGreaterThan(0);
    expect(client.nodes[0]).toHaveProperty("entities");
    expect(client.nodes[0]).toHaveProperty("group_id");
    expect(client.edges[0]).toHaveProperty("via_entities");
  });
});
