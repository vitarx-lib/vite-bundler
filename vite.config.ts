import { defineConfig } from 'vite'
import vitarx from './src/index.js'
// https://vitejs.dev/config/ vite配置开发调试使用
export default defineConfig({
  plugins: [vitarx()],
  root: 'testApp',
  server: {
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'testDist',
    sourcemap: false, // 启用源映射
    minify: false // 可以禁用压缩以便查看编译后的代码
  }
})
