import { defineConfig, mergeConfig, Plugin, type ResolvedConfig } from 'vite'
import * as path from 'node:path'
import transform from './transforms/index.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

/**
 * vitarx bundler
 *
 * 此插件主要用于转换函数式组件中的视图代码，以及处理 HMR 热更新逻辑。
 *
 * @param _options - 暂无可选配置。
 * @returns - 返回一个 Vite 插件对象。
 */
export default function vitarxBundler(_options?: {}): Plugin {
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
