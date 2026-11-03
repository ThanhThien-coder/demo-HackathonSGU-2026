/**
 * src/server/ai/guard/__tests__/forbidden.test.ts
 *
 * Kiểm thử bắt buộc cho GUARD-06, GUARD-07 (spec 21 Mục Test bắt buộc)
 * và ca D28 (spec 50 Mục 3.4).
 */

import { describe, it, expect } from "vitest";
import type { ProjectFingerprint } from "@/contracts";
import {
  forbiddenKeywords,
  findForbidden,
  wordRe,
  FORBIDDEN_TECHNOLOGIES,
} from "../forbidden";

// Fixture ProjectFingerprint cho shop-api (spec 50 Mục 1)
const shopApiFingerprint: ProjectFingerprint = {
  archetype: "WEB_BACKEND",
  primary_language: "TYPESCRIPT",
  language_breakdown: [
    { language: "TYPESCRIPT", tier: "RESOLVED", code_bytes: 50000 },
  ],
  graph_confidence: "HIGH",
  detected_framework: "Express",
  tech_stack: ["express", "typeorm", "pg", "zod", "jsonwebtoken"],
  is_monorepo: false,
  root_dir_offset: "",
};

describe("GUARD-06: Bảng công nghệ cấm", () => {
  it("GUARD-06: Stack shop-api cấm đủ 12 công nghệ khi codeText rỗng", () => {
    const keywords = forbiddenKeywords(shopApiFingerprint, "");

    // Cả 12 công nghệ đều bị cấm
    expect(FORBIDDEN_TECHNOLOGIES.length).toBe(12);

    // Mọi từ quét của 12 công nghệ đều có mặt
    expect(keywords).toContain("redis");
    expect(keywords).toContain("mongodb");
    expect(keywords).toContain("mongo");
    expect(keywords).toContain("mongoose");
    expect(keywords).toContain("aws");
    expect(keywords).toContain("dynamodb");
    expect(keywords).toContain("kafka");
    expect(keywords).toContain("rabbitmq");
    expect(keywords).toContain("amqp");
    expect(keywords).toContain("graphql");
    expect(keywords).toContain("apollo");
    expect(keywords).toContain("grpc");
    expect(keywords).toContain("elasticsearch");
    expect(keywords).toContain("opensearch");
    expect(keywords).toContain("docker");
    expect(keywords).toContain("dockerfile");
    expect(keywords).toContain("docker compose");
    expect(keywords).toContain("kubernetes");
    expect(keywords).toContain("k8s");
    expect(keywords).toContain("kubectl");
    expect(keywords).toContain("microservice");
    expect(keywords).toContain("microservices");
    expect(keywords).toContain("vi dịch vụ");
    expect(keywords).toContain("serverless");
    expect(keywords).toContain("aws lambda");
    expect(keywords).toContain("cloud functions");
  });

  it("GUARD-06: Thêm ioredis => redis hết cấm", () => {
    const fp: ProjectFingerprint = {
      ...shopApiFingerprint,
      tech_stack: [...shopApiFingerprint.tech_stack, "ioredis"],
    };
    const keywords = forbiddenKeywords(fp, "");
    expect(keywords).not.toContain("redis");
    // Các công nghệ khác vẫn cấm
    expect(keywords).toContain("mongodb");
    expect(keywords).toContain("aws");
  });

  it("GUARD-06: Thêm @aws-sdk/client-s3 => aws hết cấm", () => {
    const fp: ProjectFingerprint = {
      ...shopApiFingerprint,
      tech_stack: [...shopApiFingerprint.tech_stack, "@aws-sdk/client-s3"],
    };
    const keywords = forbiddenKeywords(fp, "");
    expect(keywords).not.toContain("aws");
    expect(keywords).not.toContain("dynamodb");
    // Các công nghệ khác vẫn cấm
    expect(keywords).toContain("redis");
  });

  it("GUARD-06: Thêm mongoose => mongodb hết cấm", () => {
    const fp: ProjectFingerprint = {
      ...shopApiFingerprint,
      tech_stack: [...shopApiFingerprint.tech_stack, "mongoose"],
    };
    const keywords = forbiddenKeywords(fp, "");
    expect(keywords).not.toContain("mongodb");
    expect(keywords).not.toContain("mongo");
    expect(keywords).not.toContain("mongoose");
    // Các công nghệ khác vẫn cấm
    expect(keywords).toContain("redis");
  });

  it("GUARD-06: Code bước có chú thích 'dùng redis' => redis hết cấm cho node đó", () => {
    const code = `
      // Bước này dùng redis để lưu session cache
      async function getSession(id: string) {
        return client.get(id);
      }
    `;
    const keywords = forbiddenKeywords(shopApiFingerprint, code);
    expect(keywords).not.toContain("redis");
    // Các công nghệ khác vẫn cấm
    expect(keywords).toContain("mongodb");
    expect(keywords).toContain("aws");
  });
});

describe("GUARD-07: Quét từ cấm", () => {
  it("GUARD-07: 'drawShapes draws' không khớp aws", () => {
    expect(wordRe("aws").test("drawShapes draws")).toBe(false);
    expect(findForbidden(["drawShapes draws"], ["aws"])).toEqual([]);
  });

  it("GUARD-07: 'dùng AWS S3' khớp aws", () => {
    expect(wordRe("aws").test("dùng AWS S3")).toBe(true);
    expect(findForbidden(["dùng AWS S3"], ["aws"])).toEqual(["aws"]);
  });

  it("GUARD-07: 'redisClient' không khớp redis", () => {
    expect(wordRe("redis").test("const redisClient = createClient();")).toBe(
      false
    );
    expect(
      findForbidden(["const redisClient = createClient();"], ["redis"])
    ).toEqual([]);
  });

  it("GUARD-07: 'Redis' khớp redis", () => {
    expect(wordRe("redis").test("Sử dụng Redis để cache dữ liệu")).toBe(true);
    expect(
      findForbidden(["Sử dụng Redis để cache dữ liệu"], ["redis"])
    ).toEqual(["redis"]);
  });

  it("GUARD-07: 'kiến trúc vi dịch vụ' khớp vi dịch vụ", () => {
    expect(
      wordRe("vi dịch vụ").test("Dự án xây dựng theo kiến trúc vi dịch vụ")
    ).toBe(true);
    expect(
      findForbidden(
        ["Dự án xây dựng theo kiến trúc vi dịch vụ"],
        ["vi dịch vụ"]
      )
    ).toEqual(["vi dịch vụ"]);
  });

  it("GUARD-07: 'vi  dịch vụ' (2 dấu cách) và từ cấm bị xuống dòng đều phải khớp", () => {
    expect(wordRe("vi dịch vụ").test("kiến trúc vi  dịch vụ")).toBe(true);
    expect(wordRe("vi dịch vụ").test("kiến trúc vi\ndịch vụ")).toBe(true);
    expect(wordRe("vi dịch vụ").test("kiến trúc vi\n  dịch vụ")).toBe(true);
    expect(
      findForbidden(
        ["kiến trúc vi  dịch vụ", "kiến trúc vi\ndịch vụ"],
        ["vi dịch vụ"]
      )
    ).toEqual(["vi dịch vụ"]);
  });

  it("GUARD-07: findForbidden luôn tự động cộng thêm BAD_WORDS", () => {
    // Không truyền BAD_WORDS vào danh sách keywords, findForbidden vẫn phải bắt
    const textWithBadWord = ["Chức năng này viết tệ như chó đẻ vậy"];
    const detected = findForbidden(textWithBadWord, ["redis", "aws"]);
    expect(detected).toContain("chó đẻ");
  });
});

describe("D28: Chữ AI chứa từ trong BAD_WORDS bị bắt như từ cấm", () => {
  it("D28 - chữ AI trong analyze-node chứa từ trong BAD_WORDS bị bắt như từ cấm", () => {
    const mockAiAnalyzeTexts = [
      "Kiến trúc phân tầng nhưng triển khai như cái lồn",
      "Route nhận request rồi chuyển sang service xử lý",
    ];
    const techKeywords = forbiddenKeywords(shopApiFingerprint, "");
    const detected = findForbidden(mockAiAnalyzeTexts, techKeywords);

    expect(detected).toContain("cái lồn");
    expect(detected.length).toBeGreaterThan(0);
  });

  it("D28 - chữ AI trong analyze-overview chứa từ trong BAD_WORDS bị bắt như từ cấm", () => {
    const mockOverviewTexts = [
      "Hệ thống bán hàng gồm 3 tầng",
      "Cách tổ chức mã nguồn rất khốn nạn gây khó khăn khi bảo trì",
    ];
    const detected = findForbidden(mockOverviewTexts, []);

    expect(detected).toContain("khốn nạn");
  });

  it("D28 - chữ AI trong enrich-node (câu hỏi/đáp án/fix) chứa từ trong BAD_WORDS bị bắt như từ cấm", () => {
    const mockQuestionTexts = [
      "Tại sao hàm checkout lại bị crash?",
      "Vì vòng lặp gọi đụ má không có kiểm tra điều kiện",
      "Cần thêm transaction để bảo vệ dữ liệu",
    ];
    const detected = findForbidden(mockQuestionTexts, ["redis"]);

    expect(detected).toContain("đụ má");
  });

  it("D28 - chữ AI trong follow-up (chấm bài) chứa từ trong BAD_WORDS bị bắt như từ cấm", () => {
    const mockGradingFeedback = [
      "Bạn giải thích ngu như súc sinh, cần đọc lại tài liệu",
    ];
    const detected = findForbidden(mockGradingFeedback, []);

    expect(detected).toContain("súc sinh");
  });

  it("D28 - BAD_WORDS không bị gỡ cấm theo GUARD-06 kể cả khi xuất hiện trong code", () => {
    // Kể cả khi code của node có chứa từ xấu, AI vẫn KHÔNG được phép dùng từ xấu
    const codeWithBadWord = "// code comment chứa từ chó đẻ";
    const keywords = forbiddenKeywords(shopApiFingerprint, codeWithBadWord);
    // BAD_WORDS vẫn luôn bị bắt bởi findForbidden
    const aiTexts = ["Nhận xét này chứa từ chó đẻ"];
    const detected = findForbidden(aiTexts, keywords);

    expect(detected).toContain("chó đẻ");
  });
});
