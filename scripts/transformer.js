import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const projectRoot = dirname(dirname(__filename)) // 获取项目根目录
export function replaceHmrClientModulePath() {
  try {
    const distPath = join(projectRoot, 'dist', 'hmr', 'hmr-handler.js')
    const content = readFileSync(distPath, 'utf-8')

    // 正确匹配 t.stringLiteral('/src/hmr/hmr-client.ts') 的字符串形式
    const updatedContent = content.replace(
      /t\.stringLiteral\('\/src\/hmr\/hmr-client\.ts'\)/g,
      "t.stringLiteral('vite-plugin-vitarx/dist/hmr-client.js')"
    )

    writeFileSync(distPath, updatedContent, 'utf-8')
    console.log('HMR client module path replaced successfully.')
  } catch (error) {
    console.error('Error replacing HMR client module path:', error)
  }
}
