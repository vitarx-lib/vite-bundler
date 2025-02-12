# VitePluginVitarx

`@vitarx/vite-bundler` 是一个 Vite 插件，用于构建 Vitarx 应用。
___________________________________________________________

## 教程

1. 安装：
   ```bash
   npm install @vitarx/vite-bundler --save-dev
   ```
2. 使用
   ```javascript
   // vite.config.js
   import { defineConfig } from 'vite'
   import vitarx from '@vitarx/vite-bundler'

   export default defineConfig({
     plugins: [vitarx()]
   })
   ```
