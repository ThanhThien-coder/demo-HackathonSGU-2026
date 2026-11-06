import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  GradingRaw,
  MeResponse,
  RunQuestion,
  RunStepRef,
  StaticEngineResult,
} from "@/contracts";
import shopApi from "@/server/engine/__fixtures__/shop-api.json";

// db.ts đọc DATABASE_URL lúc import, nên phải đặt trước mọi import động bên dưới.
const TEST_DB = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL ?? "";
  if (url) process.env.DATABASE_URL = url;
  return url;
});

const mocks = vi.hoisted(() => {
  const defaultGrading: GradingRaw = {
    core_accuracy: 0,
    simplicity: 0,
    intent: "ANSWER",
    points: [],
    misconception: "",
    follow_up_question: null,
    follow_up_type: null,
    follow_up_step_index: null,
    feedback: "",
    detected_jargons: [],
  };
  return {
    gradingRaw: defaultGrading,
    user: {
      id: "",
      email: "test@example.com",
      display_name: "Test User",
    },
  };
});

vi.mock("@google/genai", async (importOriginal) => {
  class GoogleGenAI {
    models = {
      generateContent: vi.fn(async () => ({
        text: JSON.stringify(mocks.gradingRaw),
        candidates: [{ finishReason: "STOP" }],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 0,
        },
      })),
    };
  }
  return {
    ...(await importOriginal<typeof import("@google/genai")>()),
    GoogleGenAI,
  };
});

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    authenticateRequest: vi.fn(async () => mocks.user),
  };
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "tích hợp học sai rồi đúng trên Postgres thật",
  () => {
    const userId = randomUUID();
    mocks.user.id = userId;

    const result = {
      ...shopApi,
      snapshot: { ...shopApi.snapshot, snapshot_id: randomUUID().replaceAll("-", "") },
    } as unknown as StaticEngineResult;

    let db: typeof import("@/server/db");
    let createOrResumeSession: typeof import("@/server/session").createOrResumeSession;
    let createRun: typeof import("@/server/enrich").createRun;
    let evaluateFeynman: typeof import("@/server/evaluate").evaluateFeynman;
    let GET: typeof import("@/app/api/me/route").GET;

    const question: RunQuestion = {
      question_index: 1,
      skill: "DB_OPTIMIZATION",
      tier: "NOVICE",
      focus: "FLOW",
      step_indices: [1],
      feynman_question: "Vì sao truy vấn này chậm?",
      reference_answer: "Vì truy vấn nằm trong vòng lặp.",
      must_have_points: ["vòng lặp", "số truy vấn"],
      fix: "",
      attempts_used: 0,
      finished: false,
      outcome: null,
      ended_by: null,
      disputed: false,
      p_before: null,
      p_after: null,
      last_answer: null,
    };

    const steps: RunStepRef[] = [
      { step_index: 1, layer: "ENTRY_POINT", file_path: "src/a.ts", function_name: "a" },
    ];

    const gradingWrong: GradingRaw = {
      core_accuracy: 30,
      simplicity: 80,
      intent: "ANSWER",
      points: [
        { index: 1, covered: false, quote: "" },
        { index: 2, covered: false, quote: "" },
      ],
      misconception: "Nghĩ do mạng chứ không phải do code",
      follow_up_question: "Hãy nhìn vào vòng lặp và các câu lệnh truy vấn bên trong đó xem sao?",
      follow_up_type: "CONCEPT",
      follow_up_step_index: null,
      feedback: "Bạn chưa chỉ ra được nguyên nhân chính trong mã nguồn.",
      detected_jargons: [],
    };

    const gradingRight: GradingRaw = {
      core_accuracy: 90,
      simplicity: 85,
      intent: "ANSWER",
      points: [
        { index: 1, covered: true, quote: "vòng lặp" },
        { index: 2, covered: true, quote: "số truy vấn" },
      ],
      misconception: "",
      follow_up_question: null,
      follow_up_type: null,
      follow_up_step_index: null,
      feedback: "Bạn đã giải thích rất chính xác vấn đề vòng lặp và số truy vấn.",
      detected_jargons: [],
    };

    const wrongAnswer = "Tôi nghĩ hệ thống này chậm vì mạng yếu và máy chủ quá tải";
    const rightAnswer = "Do câu truy vấn nằm trong vòng lặp nên số truy vấn tăng theo số sản phẩm";

    beforeAll(async () => {
      vi.stubEnv("GEMINI_BACKEND", "studio");
      vi.stubEnv("GEMINI_API_KEY", "test");

      const { resetGeminiClientForTest } = await import("@/server/ai/gemini");
      resetGeminiClientForTest();

      const host = new URL(TEST_DB).hostname;
      if (host !== "127.0.0.1" && host !== "localhost") {
        throw new Error("TEST_DATABASE_URL chỉ được trỏ tới Postgres trên máy");
      }

      db = await import("@/server/db");
      ({ createOrResumeSession } = await import("@/server/session"));
      ({ createRun } = await import("@/server/enrich"));
      ({ evaluateFeynman } = await import("@/server/evaluate"));
      ({ GET } = await import("@/app/api/me/route"));

      const [{ exists }] = await db.sql<{ exists: boolean }[]>`
        SELECT to_regclass('public.learning_sessions') IS NOT NULL AS exists
      `;
      if (!exists) {
        await db.sql.unsafe(`
          CREATE SCHEMA IF NOT EXISTS auth;
          CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
          CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
          DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
        const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
        const migration = path.resolve(migrationsDir, "0001_init.sql");
        await db.sql.unsafe(fs.readFileSync(migration, "utf8"));
        const otherFiles = fs
          .readdirSync(migrationsDir)
          .filter((file) => file.endsWith(".sql") && file !== "0001_init.sql")
          .sort();
        for (const file of otherFiles) {
          await db.sql.unsafe(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
        }
      }

      await db.sql`INSERT INTO auth.users (id) VALUES (${userId})`;
      await db.sql`INSERT INTO profiles (user_id) VALUES (${userId})`;
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      await db?.sql.end();
    });

    it("ca BKT: tạo phiên từ shop-api.json, lượt 1 sai chưa đổi p_mastery, lượt 2 đúng câu xong và tăng điểm kỹ năng", async () => {
      const { session } = await createOrResumeSession(userId, result);
      const nodeId = result.nodes[0].id;
      const run = await createRun(session.id, nodeId, "LEARN", [question], steps, ["redis"]);

      // Lượt 1: trả lời sai
      mocks.gradingRaw = gradingWrong;
      const evaluated1 = await evaluateFeynman(
        {
          session_id: session.id,
          run_id: run.id,
          question_index: 1,
          student_answer: wrongAnswer,
          attempt_number: 1,
        },
        userId
      );

      expect(evaluated1.is_passed).toBe(false);
      expect(evaluated1.follow_up).not.toBeNull();
      expect(evaluated1.skill_change).toBeNull();

      // Kiểm tra DB: chưa đổi p_mastery
      const skillRows1 = await db.sql<{ p_mastery: number }[]>`
        SELECT p_mastery FROM skill_states WHERE user_id = ${userId} AND skill = 'DB_OPTIMIZATION'
      `;
      expect(skillRows1.length).toBe(0);

      // Lượt 2: trả lời đúng
      mocks.gradingRaw = gradingRight;
      const evaluated2 = await evaluateFeynman(
        {
          session_id: session.id,
          run_id: run.id,
          question_index: 1,
          student_answer: rightAnswer,
          attempt_number: 2,
        },
        userId
      );

      expect(evaluated2.is_passed).toBe(true);
      expect(evaluated2.question.finished).toBe(true);
      expect(evaluated2.skill_change).not.toBeNull();
      expect(evaluated2.skill_change!.p_after).toBeGreaterThan(evaluated2.skill_change!.p_before);

      // Gọi GET /api/me: điểm kỹ năng đã tăng so với trước
      const meRes = await GET(
        new Request("http://localhost/api/me", {
          headers: { Authorization: "Bearer test" },
        })
      );
      expect(meRes.status).toBe(200);
      const meData = (await meRes.json()) as MeResponse;
      const dbSkill = meData.profile.skills.DB_OPTIMIZATION;
      expect(dbSkill).toBeDefined();
      expect(dbSkill!.p_mastery).toBe(evaluated2.skill_change!.p_after);
      expect(dbSkill!.p_mastery).toBeGreaterThan(evaluated2.skill_change!.p_before);
    });

    it("ca Idempotent: nộp lại attempt_number cũ ⇒ ERR_ATTEMPT_OUT_OF_SYNC", async () => {
      const { session } = await createOrResumeSession(userId, result);
      const nodeId = result.nodes[0].id;
      const qIdempotent: RunQuestion = {
        ...question,
        question_index: 1,
        attempts_used: 0,
        finished: false,
        outcome: null,
        ended_by: null,
        last_answer: null,
      };
      const run = await createRun(session.id, nodeId, "LEARN", [qIdempotent], steps, ["redis"]);

      mocks.gradingRaw = gradingWrong;
      await evaluateFeynman(
        {
          session_id: session.id,
          run_id: run.id,
          question_index: 1,
          student_answer: wrongAnswer,
          attempt_number: 1,
        },
        userId
      );

      // Nộp lại attempt_number 1 cũ
      await expect(
        evaluateFeynman(
          {
            session_id: session.id,
            run_id: run.id,
            question_index: 1,
            student_answer: "Một câu trả lời khác hợp lệ nhưng gửi trùng lượt cũ",
            attempt_number: 1,
          },
          userId
        )
      ).rejects.toMatchObject({ code: "ERR_ATTEMPT_OUT_OF_SYNC" });
    });

    it("ca API-05: user khác đọc phiên ⇒ ERR_SESSION_NOT_FOUND", async () => {
      const { session } = await createOrResumeSession(userId, result);
      const otherUserId = randomUUID();
      const { verifySessionOwnership, getSessionStaticResult } = await import(
        "@/server/session"
      );

      await expect(verifySessionOwnership(session.id, otherUserId)).rejects.toMatchObject({
        code: "ERR_SESSION_NOT_FOUND",
      });

      await expect(getSessionStaticResult(session.id, otherUserId)).rejects.toMatchObject({
        code: "ERR_SESSION_NOT_FOUND",
      });
    });
  }
);
