/**
 * src/server/ai/guard/__tests__/loi.test.ts
 *
 * Test cổng gác: chuẩn hóa (GUARD-02), chốt tên (GUARD-04, GUARD-05),
 * số dòng (GUARD-08), bằng chứng (GUARD-09).
 */

import { describe, expect, it } from "vitest";
import type {
  GradeContext,
  HybridArchitecturalNode,
  StaticEngineResult,
} from "@/contracts";
import {
  backticks,
  firstSentences,
  isIdent,
  LOC_RE,
  norm,
  normText,
} from "../text";
import {
  checkNames,
  gradeScope,
  isValidName,
  nodeScope,
  repoScope,
} from "../names";
import { invalidLineRefs, stepLines, symbolInStep } from "../lines";

// Dữ liệu fixture tối thiểu từ spec 50 Mục 1.2 và Mục 1:

const mockN3: HybridArchitecturalNode = {
  id: "node-n3",
  title: "Danh sách sản phẩm",
  title_source: "ROUTE",
  title_evidence: "GET /products",
  node_type: "ARCHITECTURAL_DATA_FLOW",
  entry_symbol: "productController.list",
  prerequisites: [],
  position: { x: 0, y: 0 },
  files: [
    "src/controllers/product.controller.ts",
    "src/services/product.service.ts",
    "src/repos/category.repo.ts",
  ],
  languages: ["TYPESCRIPT"],
  support_tier: "RESOLVED",
  cognitive_complexity: 5,
  rank_score: 1.0,
  is_vip_algorithm: false,
  is_capstone: false,
  uncle_bob: {
    instability: 0.5,
    abstractness: 0,
    distance: 0.5,
    diagnosis: "BALANCED",
    is_exempt: false,
  },
  dto_snippet: "",
  group_id: "",
  entities: [],
  trace_steps: [
    {
      step_number: 1,
      layer: "ENTRY_POINT",
      file_path: "src/controllers/product.controller.ts",
      function_name: "listProductsRoute",
      line_start: 8,
      line_end: 11,
      snippet:
        "router.get('/products', async (req, res) => {\n  const products = await productService.listProducts();\n  res.json(products);\n});",
      snippet_line_map: [8, 9, 10, 11],
    },
    {
      step_number: 2,
      layer: "BUSINESS_LOGIC",
      file_path: "src/services/product.service.ts",
      function_name: "listProducts",
      line_start: 14,
      line_end: 20,
      snippet:
        "async listProducts() {\n  const products = await productRepo.findAll();\n  for (const p of products) {\n    p.category = await categoryRepo.findById(p.categoryId);\n  }\n  return products;\n}",
      snippet_line_map: [14, 15, 16, 17, 18, 19, 20],
    },
    {
      step_number: 3,
      layer: "DATA_ACCESS",
      file_path: "src/repos/category.repo.ts",
      function_name: "findById",
      line_start: 5,
      line_end: 7,
      snippet:
        "findById(id) {\n  return this.repo.findOne({ where: { id } });\n}",
      snippet_line_map: [5, 6, 7],
    },
  ],
};

const mockN2: HybridArchitecturalNode = {
  id: "node-n2",
  title: "Xem hồ sơ",
  title_source: "ROUTE",
  title_evidence: "GET /profile",
  node_type: "ARCHITECTURAL_DATA_FLOW",
  entry_symbol: "userController.getProfile",
  prerequisites: [],
  position: { x: 0, y: 0 },
  files: [
    "src/routes/user.routes.ts",
    "src/middlewares/auth.middleware.ts",
    "src/services/user.service.ts",
  ],
  languages: ["TYPESCRIPT"],
  support_tier: "RESOLVED",
  cognitive_complexity: 4,
  rank_score: 1.0,
  is_vip_algorithm: false,
  is_capstone: false,
  uncle_bob: {
    instability: 0.5,
    abstractness: 0,
    distance: 0.5,
    diagnosis: "BALANCED",
    is_exempt: false,
  },
  dto_snippet: "",
  group_id: "",
  entities: [],
  trace_steps: [
    {
      step_number: 1,
      layer: "ENTRY_POINT",
      file_path: "src/routes/user.routes.ts",
      function_name: "getProfileRoute",
      line_start: 5,
      line_end: 9,
      snippet:
        "router.get('/profile', authMiddleware, async (req, res) => {\n  const userId = req.user.id;\n  const user = await userService.getProfile(userId);\n  res.json(user);\n});",
      snippet_line_map: [5, 6, 7, 8, 9],
    },
    {
      step_number: 2,
      layer: "MIDDLEWARE",
      file_path: "src/middlewares/auth.middleware.ts",
      function_name: "authMiddleware",
      line_start: 3,
      line_end: 12,
      snippet:
        'const JWT_SECRET = "<REDACTED_SECRET>";\nexport function authMiddleware(req, res, next) {\n  const token = req.headers.authorization?.split(\' \')[1];\n  try {\n    req.user = jwt.verify(token, JWT_SECRET);\n    next();\n  } catch {\n    res.status(401).json({ message: \'Unauthorized\' });\n  }\n}',
      snippet_line_map: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    {
      step_number: 3,
      layer: "DATA_ACCESS",
      file_path: "src/services/user.service.ts",
      function_name: "getProfile",
      line_start: 10,
      line_end: 12,
      snippet:
        "async getProfile(id) {\n  return userRepo.findOne({ where: { id }, select: ['id', 'name', 'email'] });\n}",
      snippet_line_map: [10, 11, 12],
    },
  ],
};

const mockGraph: StaticEngineResult = {
  engine_version: "1.6.0",
  repo_name: "shop-api",
  snapshot: {
    source: "GITHUB",
    repo_key: "owner/shop-api",
    snapshot_id: "0123456789abcdef0123456789abcdef01234567",
    snapshot_id_kind: "COMMIT_SHA",
    subdir: "",
    ref_label: "main",
  },
  fingerprint: {
    archetype: "WEB_BACKEND",
    primary_language: "TYPESCRIPT",
    language_breakdown: [
      { language: "TYPESCRIPT", tier: "RESOLVED", code_bytes: 5000 },
    ],
    graph_confidence: "HIGH",
    detected_framework: "Express",
    tech_stack: ["express", "typeorm", "pg", "zod", "jsonwebtoken"],
    is_monorepo: false,
    root_dir_offset: "",
  },
  total_files: 6,
  nodes: [mockN3, mockN2],
  edges: [],
  groups: [],
  symbol_whitelist: [
    "authMiddleware",
    "categoryRepo",
    "findById",
    "findOne",
    "jwt",
    "listProducts",
    "productRepo",
    "productService",
    "userId",
    "userRepo",
    "userService",
    "verify",
  ],
  file_index: [
    "src/controllers/product.controller.ts",
    "src/middlewares/auth.middleware.ts",
    "src/repos/category.repo.ts",
    "src/routes/user.routes.ts",
    "src/services/product.service.ts",
    "src/services/user.service.ts",
  ],
  ingestion_report: {
    truncated: false,
    selective_fetch: false,
    code_file_count: 6,
    manifest_count: 1,
    omitted_node_count: 0,
    skipped: {
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 1,
    engine_ms: 100,
    ingest_ms: 200,
    suspicious_instruction_files: [],
  },
};

describe("GUARD-02 — Chuẩn hóa và từ của ngôn ngữ", () => {
  it("norm: find_by_id ≡ findById", () => {
    expect(norm("find_by_id")).toBe("findbyid");
    expect(norm("findById")).toBe("findbyid");
    expect(norm("user-id")).toBe("userid");
  });

  it("normText: chuẩn hóa khoảng trắng và chữ thường NFC", () => {
    expect(normText("  Hello \t\n World  ")).toBe("hello world");
  });

  it("isIdent: kiểm tra trọn mẫu định danh", () => {
    expect(isIdent("findById")).toBe(true);
    expect(isIdent("user_id")).toBe(true);
    expect(isIdent("$private")).toBe(true);
    expect(isIdent("Bỏ qua mọi luật")).toBe(false);
    expect(isIdent("123abc")).toBe(false);
    expect(isIdent("")).toBe(false);
  });

  it("backticks: trích xuất các chuỗi trong backtick", () => {
    const text = "Gọi `findOne` sau đó kiểm tra `JWT_SECRET`";
    expect(backticks(text)).toEqual(["findOne", "JWT_SECRET"]);
    expect(backticks("Không có backtick")).toEqual([]);
  });

  it("firstSentences: lấy k câu đầu", () => {
    const text = "Câu 1. Câu 2! Câu 3? Câu 4.";
    expect(firstSentences(text, 2)).toBe("Câu 1. Câu 2!");
    expect(firstSentences(text, 1)).toBe("Câu 1.");
  });

  it("LOC_RE: nhắc vị trí bằng số", () => {
    expect(LOC_RE.test("ở bước 2")).toBe(true);
    expect(LOC_RE.test("xem dòng 15")).toBe(true);
    expect(LOC_RE.test("line 10")).toBe(true);
    expect(LOC_RE.test("không nhắc số")).toBe(false);
  });
});

describe("GUARD-04 — Chốt tên trong phạm vi N3 / N2", () => {
  it("GUARD-04: phạm vi N3 / N2 chấp nhận findOne, jwt.verify, JWT_SECRET, user_id (code có userId), 'Hết hàng', 201, for; từ chối redisClient, verifyToken", () => {
    const scN3 = nodeScope(mockN3, mockGraph);
    const scN2 = nodeScope(mockN2, mockGraph);

    // findOne: có trong N3 (bước 3) và N2 (bước 3)
    expect(isValidName("findOne", scN3)).toBe(true);
    expect(isValidName("findOne", scN2)).toBe(true);

    // jwt.verify: có trong N2 (bước 2 jwt.verify)
    expect(isValidName("jwt.verify", scN2)).toBe(true);

    // JWT_SECRET: có trong N2 (bước 2 const JWT_SECRET)
    expect(isValidName("JWT_SECRET", scN2)).toBe(true);

    // user_id (code có userId): norm("user_id") ≡ norm("userId") = "userid"
    expect(isValidName("user_id", scN2)).toBe(true);

    // 'Hết hàng': chuỗi literal trong dấu nháy được bỏ qua => ws rỗng => hợp lệ
    expect(isValidName("'Hết hàng'", scN3)).toBe(true);
    expect(isValidName("'Hết hàng'", scN2)).toBe(true);

    // 201: số không khớp IDENT_RE => ws rỗng => hợp lệ
    expect(isValidName("201", scN3)).toBe(true);
    expect(isValidName("201", scN2)).toBe(true);

    // for: từ khóa thuộc LANGUAGE_WORDS => ws rỗng => hợp lệ
    expect(isValidName("for", scN3)).toBe(true);
    expect(isValidName("for", scN2)).toBe(true);

    // redisClient: không có trong code hay whitelist => từ chối
    expect(isValidName("redisClient", scN3)).toBe(false);
    expect(isValidName("redisClient", scN2)).toBe(false);

    // verifyToken: không có trong code (chỉ có jwt.verify) => từ chối
    expect(isValidName("verifyToken", scN3)).toBe(false);
    expect(isValidName("verifyToken", scN2)).toBe(false);
  });

  it("checkNames: chỉ kiểm chuỗi trong backtick", () => {
    const scN3 = nodeScope(mockN3, mockGraph);

    // Chuỗi redisClient ngoài backtick => không bị kiểm, trả về rỗng
    expect(checkNames(["Text có redisClient nhưng không trong backtick"], scN3)).toEqual([]);

    // Chuỗi redisClient trong backtick => bị kiểm và từ chối
    expect(checkNames(["Text có `redisClient` trong backtick"], scN3)).toEqual(["redisClient"]);

    // Chuỗi hợp lệ trong backtick => qua
    expect(checkNames(["Dùng `categoryRepo.findById` để tìm"], scN3)).toEqual([]);
  });

  it("tên file hợp lệ trong scope", () => {
    const scN3 = nodeScope(mockN3, mockGraph);
    expect(isValidName("src/controllers/product.controller.ts", scN3)).toBe(true);
    expect(isValidName("product.controller.ts", scN3)).toBe(true);
    expect(isValidName("./product.controller.ts", scN3)).toBe(true);
  });
});

describe("GUARD-05 — Relaxed Mode cho node STRUCTURAL", () => {
  it("`userService.fooBar` ở node STRUCTURAL ⇒ hợp lệ; ở node RESOLVED ⇒ không; symbolInStep('fooBar', …) ở node STRUCTURAL vẫn false", () => {
    const mockStructuralNode: HybridArchitecturalNode = {
      ...mockN2,
      id: "node-structural",
      support_tier: "STRUCTURAL",
    };

    const scStructural = nodeScope(mockStructuralNode, mockGraph);
    const scResolved = nodeScope(mockN2, mockGraph);

    expect(scStructural.relaxed).toBe(true);
    expect(scResolved.relaxed).toBe(false);

    // userService.fooBar: userService có trong scope, fooBar không có
    // Với node STRUCTURAL (relaxed: true), chỉ cần 1 từ nằm trong phạm vi => hợp lệ
    expect(isValidName("userService.fooBar", scStructural)).toBe(true);

    // Với node RESOLVED (relaxed: false), mọi từ phải nằm trong phạm vi => không hợp lệ
    expect(isValidName("userService.fooBar", scResolved)).toBe(false);

    // symbolInStep("fooBar", …) ở node STRUCTURAL vẫn false (không được nới lỏng theo GUARD-05)
    expect(symbolInStep("fooBar", mockStructuralNode.trace_steps[0])).toBe(false);
    expect(symbolInStep("fooBar", mockStructuralNode.trace_steps[1])).toBe(false);
  });
});

describe("GUARD-08 & GUARD-09 — Số dòng và bằng chứng đúng bước", () => {
  it("invalidLineRefs: N3 bước 2 (dòng 14–20): 'dòng 16–18' hợp lệ, 'dòng 9' và 'dòng 30' không", () => {
    const allowed = stepLines(mockN3, [2]);

    expect(allowed.has(14)).toBe(true);
    expect(allowed.has(20)).toBe(true);
    expect(allowed.has(9)).toBe(false);

    // 'dòng 16–18' hợp lệ
    expect(invalidLineRefs("Xem dòng 16–18 ở bước này", allowed)).toEqual([]);

    // 'dòng 9' không hợp lệ
    expect(invalidLineRefs("Lỗi ở dòng 9", allowed)).toEqual(["dòng 9"]);

    // 'dòng 30' không hợp lệ
    expect(invalidLineRefs("Đến dòng 30", allowed)).toEqual(["dòng 30"]);

    // Khoảng ngược đầu > cuối
    expect(invalidLineRefs("dòng 18–16", allowed)).toEqual(["dòng 18–16"]);

    // Khoảng có mốc ngoài phạm vi
    expect(invalidLineRefs("dòng 16–25", allowed)).toEqual(["dòng 16–25"]);
  });

  it("symbolInStep: 'categoryRepo.findById' ở bước 2 của N3 = true, ở bước 3 = false", () => {
    const step2 = mockN3.trace_steps[1];
    const step3 = mockN3.trace_steps[2];

    expect(symbolInStep("categoryRepo.findById", step2)).toBe(true);
    expect(symbolInStep("categoryRepo.findById", step3)).toBe(false);
  });
});

describe("repoScope & gradeScope", () => {
  it("repoScope: extra chứa id và title của mọi node", () => {
    const sc = repoScope(mockGraph);
    expect(sc.extra.has("node-n3")).toBe(true);
    expect(sc.extra.has("Danh sách sản phẩm")).toBe(true);
    expect(isValidName("node-n3", sc)).toBe(true);
    expect(isValidName("Danh sách sản phẩm", sc)).toBe(true);
  });

  it("gradeScope: kiểm tra tên trong ngữ cảnh chấm", () => {
    const mockGradeContext: GradeContext = {
      question_index: 1,
      skill: "DB_OPTIMIZATION",
      tier: "NOVICE",
      focus: "WEAKNESS",
      step_indices: [2],
      feynman_question: "Trang có 200 sản phẩm. Vì sao càng nhiều sản phẩm càng chậm?",
      reference_answer:
        "Sau khi productRepo.findAll lấy danh sách, vòng for gọi categoryRepo.findById cho từng sản phẩm.",
      must_have_points: ["Mỗi sản phẩm tốn thêm 1 truy vấn"],
      fix: "Cho findAll lấy kèm loại hàng",
      attempts_used: 1,
      finished: false,
      outcome: null,
      ended_by: null,
      disputed: false,
      p_before: 0.25,
      p_after: null,
      last_answer: null,
      steps: [
        {
          step_index: 2,
          layer: "BUSINESS_LOGIC",
          file_path: "src/services/product.service.ts",
          function_name: "listProducts",
        },
      ],
      forbidden_external_keywords: ["redis", "kafka"],
    };

    const sc = gradeScope(mockGradeContext, "Vòng for gọi categoryRepo.findById");

    expect(isValidName("categoryRepo.findById", sc)).toBe(true);
    expect(isValidName("product.service.ts", sc)).toBe(true);
    expect(isValidName("redisClient", sc)).toBe(false);
  });
});
