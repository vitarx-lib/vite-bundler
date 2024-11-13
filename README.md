# VitePluginVitarx

___________________________________________________

VitePluginVitarx 是一个 Vite 插件，用于生成文档。

## 教程

1. 安装：
   ```bash
   npm install @visdoc/vite-plugin-visdoc --save-dev
   ```
2. 使用
   ```javascript
   // vite.config.js
   import { defineConfig } from 'vite'
   import { createVisDoc } from 'vite-plugin-visdoc'
   import { resolve } from 'path'

   export default defineConfig({
     plugins: [createVisDoc()]
   })
   ```
