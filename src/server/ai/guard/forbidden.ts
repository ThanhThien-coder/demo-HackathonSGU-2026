/**
 * src/server/ai/guard/forbidden.ts
 *
 * Bảng công nghệ cấm (GUARD-06) và quét từ cấm (GUARD-07) theo spec 21 Mục 2.
 */

import type { ProjectFingerprint } from "@/contracts";
import { BAD_WORDS, wordRe } from "@/lib/moderation";

export { wordRe };

export interface ForbiddenTechDefinition {
  name: string;
  scanKeywords: readonly string[];
  patterns: readonly string[];
}

/**
 * Bảng 12 công nghệ cấm theo GUARD-06 spec 21 Mục 2.
 */
export const FORBIDDEN_TECHNOLOGIES: readonly ForbiddenTechDefinition[] = [
  {
    name: "redis",
    scanKeywords: ["redis"],
    patterns: [
      "redis",
      "ioredis",
      "@redis/*",
      "aioredis",
      "bull",
      "bullmq",
      "connect-redis",
      "*spring-boot-starter-data-redis*",
      "*jedis*",
      "github.com/redis/go-redis*",
      "github.com/go-redis/redis*",
    ],
  },
  {
    name: "mongodb",
    scanKeywords: ["mongodb", "mongo", "mongoose"],
    patterns: [
      "mongodb",
      "mongoose",
      "@nestjs/mongoose",
      "pymongo",
      "motor",
      "mongoengine",
      "*spring-boot-starter-data-mongodb*",
      "go.mongodb.org/mongo-driver*",
    ],
  },
  {
    name: "aws",
    scanKeywords: ["aws", "dynamodb"],
    patterns: [
      "aws-sdk",
      "@aws-sdk/*",
      "aws-cdk-lib",
      "boto3",
      "botocore",
      "*software.amazon.awssdk*",
      "github.com/aws/aws-sdk-go*",
    ],
  },
  {
    name: "kafka",
    scanKeywords: ["kafka"],
    patterns: [
      "kafkajs",
      "node-rdkafka",
      "kafka-python",
      "confluent-kafka",
      "aiokafka",
      "*spring-kafka*",
      "*kafka-clients*",
      "github.com/segmentio/kafka-go*",
    ],
  },
  {
    name: "rabbitmq",
    scanKeywords: ["rabbitmq", "amqp"],
    patterns: [
      "amqplib",
      "amqp-connection-manager",
      "pika",
      "aio-pika",
      "*spring-boot-starter-amqp*",
      "github.com/rabbitmq/amqp091-go*",
    ],
  },
  {
    name: "graphql",
    scanKeywords: ["graphql", "apollo"],
    patterns: [
      "graphql",
      "@apollo/*",
      "apollo-server*",
      "graphql-yoga",
      "type-graphql",
      "@nestjs/graphql",
      "graphene",
      "strawberry-graphql",
      "github.com/99designs/gqlgen*",
    ],
  },
  {
    name: "grpc",
    scanKeywords: ["grpc"],
    patterns: [
      "grpc",
      "@grpc/*",
      "grpcio",
      "*io.grpc*",
      "google.golang.org/grpc*",
    ],
  },
  {
    name: "elasticsearch",
    scanKeywords: ["elasticsearch", "opensearch"],
    patterns: [
      "elasticsearch",
      "@elastic/elasticsearch",
      "elasticsearch-dsl",
      "@opensearch-project/opensearch",
      "opensearch-py",
      "github.com/elastic/go-elasticsearch*",
    ],
  },
  {
    name: "docker",
    scanKeywords: ["docker", "dockerfile", "docker compose"],
    patterns: [
      "docker",
      "dockerode",
      "testcontainers",
      "@testcontainers/*",
    ],
  },
  {
    name: "kubernetes",
    scanKeywords: ["kubernetes", "k8s", "kubectl"],
    patterns: [
      "kubernetes",
      "@kubernetes/client-node",
      "k8s.io/client-go*",
    ],
  },
  {
    name: "microservices",
    scanKeywords: ["microservice", "microservices", "vi dịch vụ"],
    patterns: [
      "@nestjs/microservices",
      "moleculer",
      "seneca",
      "github.com/micro/*",
      "*spring-cloud-*",
    ],
  },
  {
    name: "serverless",
    scanKeywords: ["serverless", "aws lambda", "cloud functions"],
    patterns: [
      "serverless",
      "serverless-http",
      "@serverless/*",
      "aws-lambda",
      "@types/aws-lambda",
      "zappa",
      "chalice",
      "firebase-functions",
      "@google-cloud/functions-framework",
    ],
  },
];

/**
 * Chuyển đổi glob pattern sang RegExp (* = chuỗi bất kỳ, so chữ thường, khớp cả chuỗi).
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/**
 * Kiểm tra một công nghệ có được phép (hết bị cấm) hay không:
 * (a) Một mục fingerprint.tech_stack khớp một mẫu gói (glob: *, so chữ thường, khớp cả chuỗi)
 * (b) HOẶC một từ quét của nó xuất hiện (nguyên từ, GUARD-07) trong code đang xét.
 */
function isTechAllowed(
  tech: ForbiddenTechDefinition,
  techStack: readonly string[],
  codeText: string
): boolean {
  // (a) Khớp mẫu gói trong tech_stack
  const matchesPackage = techStack.some((pkg) =>
    tech.patterns.some((pattern) => globToRegex(pattern).test(pkg))
  );
  if (matchesPackage) return true;

  // (b) Xuất hiện từ quét trong codeText
  if (codeText) {
    const normCode = codeText.normalize("NFC");
    const appearsInCode = tech.scanKeywords.some((keyword) =>
      wordRe(keyword).test(normCode)
    );
    if (appearsInCode) return true;
  }

  return false;
}

/**
 * Lấy danh sách từ quét của các công nghệ còn cấm, theo đúng thứ tự bảng (GUARD-06).
 */
export function forbiddenKeywords(
  fp: ProjectFingerprint,
  codeText: string
): string[] {
  const techStack = fp.tech_stack ?? [];
  const result: string[] = [];

  for (const tech of FORBIDDEN_TECHNOLOGIES) {
    if (!isTechAllowed(tech, techStack, codeText)) {
      result.push(...tech.scanKeywords);
    }
  }

  return result;
}

/**
 * Quét từ cấm trong các chuỗi văn bản (GUARD-07).
 * Danh sách từ cấm luôn cộng thêm BAD_WORDS từ moderation.ts (D-65).
 * BAD_WORDS không bị gỡ cấm theo GUARD-06.
 * Bỏ giá trị mặc định của keywords theo yêu cầu (Cần làm lại ý 2).
 */
export const findForbidden = (
  texts: string[],
  keywords: string[]
): string[] => {
  const allKeywords = [...new Set([...keywords, ...BAD_WORDS])];
  return allKeywords.filter((k) =>
    texts.some((t) => t && wordRe(k).test(t.normalize("NFC")))
  );
};
