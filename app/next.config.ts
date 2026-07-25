import type { NextConfig } from "next";

// Origins allowed to embed CaptionFlow pages in an iframe (audience-facing
// routes like /live/{slug} are intentionally embeddable on client sites).
const FRAME_ANCESTORS = [
  "'self'",
  "https://vibecoding44.github.io", // TSOPC church website (GitHub Pages)
].join(" ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` },
        ],
      },
    ];
  },
};

export default nextConfig;
