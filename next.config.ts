import type { NextConfig } from "next";

// 04 Mục 17 ý 5: 4 header bảo mật, không đặt CSP.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Ghim gốc dự án để Next không lấy nhầm package-lock.json ở thư mục cha.
  outputFileTracingRoot: __dirname,
  // 04 Mục 16: bản Vercel dự phòng cần kèm grammar .wasm cho route ingest.
  outputFileTracingIncludes: {
    "/api/ingest": ["./public/grammars/*.wasm", "./node_modules/web-tree-sitter/*.wasm"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
