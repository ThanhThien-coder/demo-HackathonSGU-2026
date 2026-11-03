import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient, signInWithGithub, signOut } from "../client";

vi.mock("@supabase/ssr", () => {
  const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
  const mockSignOut = vi.fn().mockResolvedValue({ error: null });
  const mockClient = {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  };
  return {
    createBrowserClient: vi.fn(() => mockClient),
  };
});

describe("src/lib/supabase/client.ts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("khởi tạo singleton Supabase client", () => {
    const client1 = createClient();
    const client2 = createClient();
    expect(client1).toBe(client2);
  });

  it("gọi signInWithGithub với đúng provider 'github' và redirectTo an toàn", async () => {
    const client = createClient();
    await signInWithGithub("/roadmap");

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/callback?next="),
        }),
      })
    );
  });

  it("gọi signOut để xóa phiên người dùng", async () => {
    const client = createClient();
    await signOut();
    expect(client.auth.signOut).toHaveBeenCalled();
  });
});
