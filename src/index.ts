import { defineConfig, mergeConfig, Plugin, type ResolvedConfig } from 'vite'
import * as path from 'node:path'
import transform from './transforms/index.js'

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
              '@vitarx/vite-bundler/client': path.resolve(__dirname, 'hmr-client/index.js')
            }
          }
        })
      )
    },
    configResolved(config: ResolvedConfig) {
      vite_config = config
    },
    transform(code, id) {
      return transform(code, id, vite_config)
    }
  }
}
