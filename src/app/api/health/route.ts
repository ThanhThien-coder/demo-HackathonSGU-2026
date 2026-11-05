// 03 Mục 6.8 — healthcheck: không đăng nhập, không DB, không AI, không log body.
export const dynamic = "force-dynamic";
export const GET = () => new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
