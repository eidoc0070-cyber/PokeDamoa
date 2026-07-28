import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  server: {
    watch: {
      // data-source 폴더(스프라이트 원본 등 62,000+ 파일)를 watch 대상에서 제외.
      // 이 폴더는 빌드 스크립트의 입력 소스일 뿐, 실시간 HMR이 필요 없습니다.
      ignored: [
        "**/data-source/**",
        "**/node_modules/**",
        "**/.git/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
