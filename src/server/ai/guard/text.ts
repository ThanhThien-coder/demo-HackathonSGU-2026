// 21 Mục 2 — công cụ chung của cổng gác: chuẩn hóa, chốt tên (GUARD-04), từ cấm (GUARD-06/07), số dòng (GUARD-08), bằng chứng (GUARD-09).
import type { ExecutionTraceStep, GradeContext, HybridArchitecturalNode, ProjectFingerprint, StaticEngineResult } from "@/contracts";
import { BAD_WORDS } from "@/lib/moderation";

export const norm = (s: string) => s.normalize("NFC").replace(/[_\-]/g, "").toLowerCase();
export const normText = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim();
export const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;
export const identWords = (text: string) => new Set((text.match(IDENT_RE) ?? []).map(norm));
export const backticks = (text: string) => [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
export const firstSentences = (s: string, k: number) => s.split(/(?<=[.!?…])\s+/u).filter(Boolean).slice(0, k).join(" ");
export const nodeCodeText = (node: HybridArchitecturalNode) =>
  [...node.trace_steps.map((s) => `${s.function_name}\n${s.snippet}`), node.dto_snippet].join("\n");
export const LOC_RE = /(?:bước|buoc|dòng|dong|step|line)\s*\d+/iu;

export const LANGUAGE_WORDS = new Set((
  "break case catch class const continue debugger default delete do else enum export extends false finally for function if " +
  "import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of " +
  "static get set as from type interface implements private protected public readonly abstract declare namespace keyof " +
  "never unknown any undefined number string boolean object symbol bigint " +
  "and or not is elif except lambda pass raise def global nonlocal none self cls print len range " +
  "final throws package byte short int long float double char synchronized volatile " +
  "func go defer chan map struct select fallthrough nil goto late required dynamic factory library part mixin on " +
  "console json math promise array date error require module exports process window document"
).split(" "));

// ---------- chốt tên ----------
export interface NameScope { files: readonly string[]; words: Set<string>; extra: Set<string>; relaxed: boolean }

export function nodeScope(node: HybridArchitecturalNode, graph: StaticEngineResult): NameScope {
  return {
    files: graph.file_index,
    words: identWords([...graph.symbol_whitelist, ...graph.file_index, nodeCodeText(node)].join("\n")),
    extra: new Set(), relaxed: node.support_tier === "STRUCTURAL",
  };
}

export function repoScope(graph: StaticEngineResult): NameScope {
  return {
    files: graph.file_index,
    words: identWords([...graph.symbol_whitelist, ...graph.file_index, ...graph.nodes.map(nodeCodeText)].join("\n")),
    extra: new Set(graph.nodes.flatMap((n) => [n.id, n.title])),
    relaxed: graph.nodes.some((n) => n.support_tier === "STRUCTURAL"),
  };
}

export function gradeScope(t: GradeContext, answer: string): NameScope {
  const text = [...t.steps.flatMap((s) => [s.function_name, s.file_path]), t.feynman_question, t.reference_answer, answer].join("\n");
  return { files: t.steps.map((s) => s.file_path), words: identWords(text), extra: new Set(), relaxed: false };
}

export function isValidName(s: string, sc: NameScope): boolean {
  const t = s.trim().replace(/^\.\//, "");
  if (sc.files.some((f) => f === t || f.endsWith("/" + t)) || sc.extra.has(t)) return true;
  const ws = (t.replace(/(['"])(?:\\.|(?!\1).)*\1/g, " ").match(IDENT_RE) ?? []).filter((w) => !LANGUAGE_WORDS.has(w.toLowerCase()));
  if (ws.length === 0) return true;
  const inScope = (w: string) => sc.words.has(norm(w));
  return sc.relaxed ? ws.some(inScope) : ws.every(inScope);
}

export const checkNames = (texts: string[], sc: NameScope): string[] => texts.flatMap(backticks).filter((b) => !isValidName(b, sc));

// ---------- từ cấm ----------
const FORBIDDEN_TABLE: Array<{ scan: string[]; packages: string[] }> = [
  { scan: ["redis"], packages: ["redis", "ioredis", "@redis/*", "aioredis", "bull", "bullmq", "connect-redis", "*spring-boot-starter-data-redis*", "*jedis*", "github.com/redis/go-redis*", "github.com/go-redis/redis*"] },
  { scan: ["mongodb", "mongo", "mongoose"], packages: ["mongodb", "mongoose", "@nestjs/mongoose", "pymongo", "motor", "mongoengine", "*spring-boot-starter-data-mongodb*", "go.mongodb.org/mongo-driver*"] },
  { scan: ["aws", "dynamodb"], packages: ["aws-sdk", "@aws-sdk/*", "aws-cdk-lib", "boto3", "botocore", "*software.amazon.awssdk*", "github.com/aws/aws-sdk-go*"] },
  { scan: ["kafka"], packages: ["kafkajs", "node-rdkafka", "kafka-python", "confluent-kafka", "aiokafka", "*spring-kafka*", "*kafka-clients*", "github.com/segmentio/kafka-go*"] },
  { scan: ["rabbitmq", "amqp"], packages: ["amqplib", "amqp-connection-manager", "pika", "aio-pika", "*spring-boot-starter-amqp*", "github.com/rabbitmq/amqp091-go*"] },
  { scan: ["graphql", "apollo"], packages: ["graphql", "@apollo/*", "apollo-server*", "graphql-yoga", "type-graphql", "@nestjs/graphql", "graphene", "strawberry-graphql", "github.com/99designs/gqlgen*"] },
  { scan: ["grpc"], packages: ["grpc", "@grpc/*", "grpcio", "*io.grpc*", "google.golang.org/grpc*"] },
  { scan: ["elasticsearch", "opensearch"], packages: ["elasticsearch", "@elastic/elasticsearch", "elasticsearch-dsl", "@opensearch-project/opensearch", "opensearch-py", "github.com/elastic/go-elasticsearch*"] },
  { scan: ["docker", "dockerfile", "docker compose"], packages: ["docker", "dockerode", "testcontainers", "@testcontainers/*"] },
  { scan: ["kubernetes", "k8s", "kubectl"], packages: ["kubernetes", "@kubernetes/client-node", "k8s.io/client-go*"] },
  { scan: ["microservice", "microservices", "vi dịch vụ"], packages: ["@nestjs/microservices", "moleculer", "seneca", "github.com/micro/*", "*spring-cloud-*"] },
  { scan: ["serverless", "aws lambda", "cloud functions"], packages: ["serverless", "serverless-http", "@serverless/*", "aws-lambda", "@types/aws-lambda", "zappa", "chalice", "firebase-functions", "@google-cloud/functions-framework"] },
];

const globRe = (p: string) => new RegExp(`^${p.toLowerCase().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
const wordRe = (k: string) => new RegExp(`(?<![\\p{L}\\p{N}_])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`, "iu");

/** Từ quét của các công nghệ còn bị cấm (GUARD-06), cộng BAD_WORDS (GUARD-07). */
export function forbiddenKeywords(fp: ProjectFingerprint, codeText: string): string[] {
  const out: string[] = [];
  for (const row of FORBIDDEN_TABLE) {
    const inStack = fp.tech_stack.some((t) => row.packages.some((p) => globRe(p).test(t.toLowerCase())));
    const inCode = row.scan.some((k) => wordRe(k).test(codeText));
    if (!inStack && !inCode) out.push(...row.scan);
  }
  return [...out, ...BAD_WORDS];
}

export const findForbidden = (texts: string[], keywords: string[]): string[] => keywords.filter((k) => texts.some((t) => wordRe(k).test(t)));

// ---------- số dòng ----------
const LINE_RE = /\b(?:dòng|dong|line|lines)\s+(\d+)(?:\s*(?:[–—-]|đến|den|to)\s*(\d+))?/giu;
export const stepLines = (node: HybridArchitecturalNode, idx: number[]) =>
  new Set(idx.flatMap((i) => node.trace_steps[i - 1]?.snippet_line_map.filter((n) => n > 0) ?? []));
export function invalidLineRefs(text: string, allowed: Set<number>): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(LINE_RE)) {
    const a = Number(m[1]); const b = m[2] !== undefined ? Number(m[2]) : null;
    if (!allowed.has(a) || (b !== null && (b < a || !allowed.has(b)))) bad.push(m[0]);
  }
  return bad;
}
export const stripLineRefs = (s: string) => s.replace(LINE_RE, "");

// ---------- bằng chứng ----------
export function symbolInStep(symbol: string, step: ExecutionTraceStep): boolean {
  const ws = (symbol.match(IDENT_RE) ?? []).filter((w) => !LANGUAGE_WORDS.has(w.toLowerCase()));
  const code = identWords(`${step.function_name}\n${step.snippet}`);
  return ws.length > 0 && ws.every((w) => code.has(norm(w)));
}
