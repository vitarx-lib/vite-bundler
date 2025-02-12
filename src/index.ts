import { defineConfig, mergeConfig, Plugin, type ResolvedConfig } from 'vite'
import handleJsxOrTsxFileCode from './jsx-handler.js'
import * as path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
/**
 * ## vite-plugin-vitarx
 *
 * 用于支持HMR热更新，优化函数式组件构建。
 */
export default function vitarx(): Plugin {
  let vite_config: ResolvedConfig = {} as ResolvedConfig
  return {
    name: 'vite-plugin-vitarx',
    config(config) {
      return mergeConfig(
        config,
        defineConfig({
          esbuild: {
            jsx: 'automatic',
            jsxImportSource: 'vitarx'
          },
          resolve: {
            alias: {
              '@vitarx/vite-bundler/client': path.resolve(__dirname, 'hmr/hmr-client.js')
            }
          }
        })
      )
    },
    configResolved(config: ResolvedConfig) {
      vite_config = config
    },
    transform(code, id) {
      // 仅处理 .jsx 或 .tsx 文件
      if (id.endsWith('.jsx') || id.endsWith('.tsx')) {
        return handleJsxOrTsxFileCode(code, {
          sourceMaps: vite_config.build.sourcemap !== 'hidden',
          sourceFileName: id
        })
      }
    }
  }
}
