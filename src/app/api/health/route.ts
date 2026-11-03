// 03 Mục 6.8: không đăng nhập, không gọi DB/AI, trả 200 text/plain "ok".
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
