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
  // 04 Mục 16, D-70: route ingest đọc grammar .wasm và truy vấn .scm bằng fs,
  // phải kèm vào bản Vercel dự phòng và bản build standalone.
  outputFileTracingIncludes: {
    "/api/ingest": [
      "./public/grammars/*.wasm",
      "./node_modules/web-tree-sitter/*.wasm",
      "./queries/*.scm",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
