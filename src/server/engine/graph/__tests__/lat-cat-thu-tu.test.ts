// Thứ tự thu hàm, trần node, mẫu Prisma — spec 11 Mục 8 (ENG-80, ENG-82, ENG-88), lỗi B-06, B-37.
import { beforeAll, describe, expect, it } from "vitest";
import * as fflate from "fflate";
import { runEngine } from "../../index";
import { initParsers } from "../parser";

const scan = async (files: Record<string, string>) => {
  const zippable: fflate.Zippable = {};
  for (const [path, code] of Object.entries(files)) zippable[path] = fflate.strToU8(code);
  return runEngine({
    kind: "ZIP_UPLOAD",
    file_name: "lat-cat.zip",
    bytes: fflate.zipSync(zippable),
    subdir_override: null,
  });
};

const stepsOf = (res: Awaited<ReturnType<typeof scan>>, evidence: string) => {
  const node = res.nodes.find((n) => n.title_evidence === evidence);
  if (!node) throw new Error(`Không có bài ${evidence}: ${res.nodes.map((n) => n.title_evidence).join(", ")}`);
  return node.trace_steps;
};

const server = (route: string) => `
import express from "express";
const app = express();
const router = express.Router();
${route}
app.use(router);
`;

// Thân có đủ dòng giữ để mỗi bước gần chạm CONFIG.STEP_MAX_LINES.
const guards = (name: string, call = "") => {
  let body = "";
  for (let i = 0; i < 26; i++) body += `  if (x === ${i}) { throw new Error("${name} ${i}"); }\n`;
  return `export function ${name}(x: number) {\n${body}  return ${call || "x"};\n}\n`;
};

describe("ENG-80, ENG-82, ENG-88: thứ tự bước, trần node, Prisma", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("ENG-80: callee theo vị trí gọi, không theo tên", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { zeta } from "./zeta";
import { alpha } from "./alpha";
router.get("/items", (req, res) => {
  const first = zeta(1);
  const second = alpha(first);
  res.json(second);
});
`),
      "src/zeta.ts": `export function zeta(x: number) { return x + 1; }\n`,
      "src/alpha.ts": `export function alpha(x: number) { return x + 2; }\n`,
    });

    expect(stepsOf(res, "GET /items").map((s) => s.function_name).slice(1)).toEqual(["zeta", "alpha"]);
  });

  it("ENG-88: vượt trần thì bỏ bước sâu nhất trước, giữ hàm chính entry gọi", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { auth } from "./auth";
import { mainWork } from "./main-work";
router.post("/grade", (req, res) => {
  const user = auth(1);
  const result = mainWork(user);
  res.json(result);
});
`),
      "src/auth.ts": `import { verify } from "./verify";\n` + guards("auth", "verify(x)"),
      "src/verify.ts": `import { client } from "./client";\n` + guards("verify", "client(x)"),
      "src/client.ts": `import { leaf } from "./leaf";\n` + guards("client", "leaf(x)"),
      "src/leaf.ts": guards("leaf"),
      "src/main-work.ts": guards("mainWork"),
    });

    const names = stepsOf(res, "POST /grade").map((s) => s.function_name);
    expect(names).toContain("mainWork");
    expect(names).toContain("auth");
    expect(names).not.toContain("leaf");
    expect(names).not.toContain("client");
  });

  it("ENG-88: giữ đường tới criterion dù nằm sâu", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { outer } from "./outer";
import { side } from "./side";
router.post("/save", (req, res) => {
  const a = side(1);
  const b = outer(a);
  res.json(b);
});
`),
      "src/outer.ts": `import { inner } from "./inner";\n` + guards("outer", "inner(x)"),
      "src/inner.ts": `import { store } from "./store";\n` + guards("inner", "store(x)"),
      "src/store.ts": `const orderRepo = { save: (v: number) => v };\n` + guards("store", "orderRepo.save(x)"),
      "src/side.ts": `import { sideDeep } from "./side-deep";\n` + guards("side", "sideDeep(x)"),
      "src/side-deep.ts": guards("sideDeep"),
    });

    const names = stepsOf(res, "POST /save").map((s) => s.function_name);
    expect(names).toEqual(expect.arrayContaining(["outer", "inner", "store"]));
    expect(names).not.toContain("sideDeep");
  });

  it("ENG-82: this.prisma.x và tx.x là DATA_SINK, httpClient.get thì không (B-06)", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { OrderService } from "./order.service";
const svc = new OrderService();
router.post("/orders", async (req, res) => {
  res.json(await svc.create(1));
});
router.post("/pay", async (req, res) => {
  res.json(await svc.pay(1));
});
router.get("/remote", async (req, res) => {
  res.json(await svc.remote());
});
`),
      "src/prisma.service.ts": `export class PrismaService {}\n`,
      "src/order.service.ts": `
import { PrismaService } from "./prisma.service";
export class OrderService {
  private prisma: PrismaService = new PrismaService();
  private httpClient = { get: async (u: string) => u };

  async create(id: number) {
    return this.prisma.order.create({ data: { id } });
  }
  async pay(id: number) {
    return this.prisma.$transaction(async (tx) => {
      return tx.order.update({ where: { id }, data: { paid: true } });
    });
  }
  async remote() {
    return this.httpClient.get("https://example.com");
  }
}
`,
    });

    const layers = (ev: string) => stepsOf(res, ev).map((s) => s.layer);
    expect(layers("POST /orders")).toContain("DATA_ACCESS");
    expect(layers("POST /pay")).toContain("DATA_ACCESS");
  });

  // 6 route cùng gọi shared, mỗi route có hàm nghiệp vụ riêng.
  const sixRoutes = (extra = "") => {
    let routes = "";
    for (let i = 0; i < 6; i++) {
      routes += `router.get("/r${i}", (req, res) => {
  const who = shared(1);
  const dataRow = load(who);
  res.json(work${i}(dataRow));
});
`;
    }
    let works = "";
    for (let i = 0; i < 6; i++) works += `export function work${i}(x: number) { return x + ${i}; }\n`;
    return {
      "src/app.ts": server(`
import { shared } from "./shared";
import { load } from "./load";
import { work0, work1, work2, work3, work4, work5 } from "./works";
${extra}
${routes}`),
      "src/shared.ts": `import { deep } from "./deep";\nexport function shared(x: number) { return deep(x); }\n`,
      "src/deep.ts": `export function deep(x: number) { return x + 1; }\n`,
      "src/load.ts": `const userRepo = { findOne: (v: number) => v };\nexport function load(x: number) { return userRepo.findOne(x); }\n`,
      "src/works.ts": works,
    };
  };

  it("T-ENG-52: hàm dùng ở ≥ 50% bài, không đụng dữ liệu bị bỏ cùng hàm chỉ đến qua nó (D-87)", async () => {
    const res = await scan(sixRoutes());
    const names = stepsOf(res, "GET /r3").map((s) => s.function_name);

    expect(names).not.toContain("shared");
    expect(names).not.toContain("deep");
    expect(names).toContain("work3");
  });

  it("T-ENG-52: hàm dùng nhiều nhưng đụng dữ liệu vẫn giữ (D-87)", async () => {
    const res = await scan(sixRoutes());

    expect(stepsOf(res, "GET /r3").map((s) => s.function_name)).toContain("load");
  });

  it("T-ENG-52: hàm gọi tới hàm đụng dữ liệu đã duyệt trước trong bài vẫn giữ (D-87)", async () => {
    let routes = "";
    for (let i = 0; i < 6; i++) {
      routes += `router.get("/w${i}", (req, res) => {
  const row = load(${i});
  res.json(wrap(row));
});
`;
    }
    const res = await scan({
      "src/app.ts": server(`
import { load } from "./load";
import { wrap } from "./wrap";
${routes}`),
      "src/load.ts": `const userRepo = { findOne: (v: number) => v };\nexport function load(x: number) { return userRepo.findOne(x); }\n`,
      "src/wrap.ts": `import { load } from "./load";\nexport function wrap(x: number) { return load(x); }\n`,
    });

    expect(stepsOf(res, "GET /w2").map((s) => s.function_name)).toContain("wrap");
  });

  it("T-ENG-52: dưới 3 bài thì không bỏ, dù chiếm hết số bài (D-87)", async () => {
    const res = await scan({
      "src/app.ts": server(`
import { shared } from "./shared";
router.get("/a", (req, res) => { res.json(shared(1)); });
router.get("/b", (req, res) => { res.json(shared(2)); });
`),
      "src/shared.ts": `export function shared(x: number) { return x + 1; }\n`,
    });

    expect(stepsOf(res, "GET /a").map((s) => s.function_name)).toContain("shared");
  });

  it("T-ENG-52: middleware dùng chung vẫn giữ (D-87, ENG-80)", async () => {
    let routes = "";
    for (let i = 0; i < 4; i++) routes += `router.get("/m${i}", guard, (req, res) => { res.json(${i}); });\n`;
    const res = await scan({
      "src/app.ts": server(`
import { guard } from "./guard";
${routes}`),
      "src/guard.ts": `export function guard(req: unknown, res: unknown, next: () => void) { next(); }\n`,
    });

    expect(stepsOf(res, "GET /m1").map((s) => s.function_name)).toContain("guard");
  });

  // Hàm đủ điểm VIP, vòng lặp chính dài hơn CONFIG.STEP_MAX_LINES.
  const longAlgo = (after: string) => {
    let lines = "";
    for (let i = 0; i < 40; i++) lines += `        total += a * ${i};\n`;
    return `export function longAlgo(items: number[]) {
  let total = 0;
  for (const a of items) {
    if (a > 0) {
      for (const b of items) {
        if (b > a) {
          for (const c of items) {
            if (c > b) { total += c; }
          }
        }
      }
${lines}    }
  }
${after}}
`;
  };
  const algoSteps = async (after: string) => {
    const res = await scan({
      "src/app.ts": server(`router.get("/items", (req, res) => { res.json(1); });`),
      "src/algo.ts": longAlgo(after),
    });
    const node = res.nodes.find((n) => n.node_type === "ALGORITHMIC_CORE");
    if (!node) throw new Error("Không có bài thuật toán");
    return node.trace_steps;
  };

  it("ENG-86: dòng marker của bài thuật toán có map = 0, line_end theo map (B-28)", async () => {
    const step = (await algoSteps("  return total;\n")).find((s) => s.layer === "ALGO_EXECUTION");
    if (!step) throw new Error("Không có bước ALGO_EXECUTION");
    const lines = step.snippet.split("\n");
    const markerIdx = lines.findIndex((l) => /… \(\d+ dòng\)/.test(l));

    expect(markerIdx).toBeGreaterThan(0);
    expect(step.snippet_line_map[markerIdx]).toBe(0);
    expect(step.snippet_line_map).toHaveLength(lines.length);
    expect(step.line_end).toBe(Math.max(...step.snippet_line_map));
  });

  it("ENG-86: marker lấy thụt lề của dòng bị bỏ đầu tiên (B-28)", async () => {
    const step = (await algoSteps("  return total;\n")).find((s) => s.layer === "ALGO_EXECUTION");
    const marker = step?.snippet.split("\n").find((l) => /… \(\d+ dòng\)/.test(l));

    expect(marker).toMatch(/^ {8}\/\/ … /);
  });

  it("ENG-91: bước chỉ có ngoặc đóng bị bỏ, đánh số lại (B-11)", async () => {
    const steps = await algoSteps("");

    expect(steps.map((s) => s.layer)).toEqual(["ALGO_SETUP", "ALGO_EXECUTION"]);
    expect(steps.map((s) => s.step_number)).toEqual([1, 2]);
  });

  it("ENG-91: có câu sau vòng lặp thì giữ ALGO_TERMINATION (B-11)", async () => {
    const steps = await algoSteps("  return total;\n");

    expect(steps.map((s) => s.layer)).toEqual(["ALGO_SETUP", "ALGO_EXECUTION", "ALGO_TERMINATION"]);
  });
});
