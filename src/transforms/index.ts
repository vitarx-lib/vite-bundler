import { parseSync } from '@babel/core'
import { type GeneratorOptions } from '@babel/generator'
import type { ResolvedConfig } from 'vite'
import hmrOrBuildTransform from './hmr.js'
import { babelGenerate, type Option } from './common.js'
// 处理结果
type HandleResult = {
  code: string
  map: any
}

/**
 * 处理jsx或tsx文件代码
 *
 * @param code - 经过esbuild处理过的jsx或tsx文件代码
 * @param options - babel generator 选项
 * @returns {HandleResult} - 处理后的代码
 */
export function handleJsxOrTsxFileCode(code: string, options: Option): HandleResult | undefined {
  // 使用 Babel 解析源码为 AST
  const ast = parseSync(code)
  if (ast && ast.program) {
    hmrOrBuildTransform(ast, options)
    const generateResult = babelGenerate(ast, options)
    return {
      code: generateResult.code,
      map: generateResult.map
    }
  }
  return undefined
}

export default function transform(code: string, id: string, viteConfig: ResolvedConfig) {
  const buildOption: MakeRequired<GeneratorOptions, 'filename'> = {
    sourceMaps: viteConfig.build.sourcemap !== 'hidden',
    sourceFileName: id,
    filename: id
  }
  if (id.endsWith('.tsx') || id.endsWith('.jsx')) {
    return handleJsxOrTsxFileCode(code, buildOption)
  }
}
