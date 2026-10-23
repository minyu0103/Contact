import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 게임 화면은 전부 로그인 상태에 따라 달라지는 동적 화면이므로 캐시 컴포넌트는 끈다.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
