import { describe, expect, it } from 'vitest'
import type { ResolvedConfig } from 'vite'
import transform from '../src/transforms'

describe('transforms/index.ts', () => {
  const mockViteConfig = {
    build: {
      sourcemap: true
    }
  } as ResolvedConfig

  it('应该转换 .tsx 文件', () => {
    const code = `
      import { defineSimpleWidget } from 'vitarx'
      const MyWidget = defineSimpleWidget(() => {
        return null
      })
      export default MyWidget
    `

    const result = transform(code, '/path/to/file.tsx', mockViteConfig)

    expect(result).toBeDefined()
    expect(result!.code).toContain('defineSimpleWidget')
  })

  it('应该转换 .jsx 文件', () => {
    const code = `
      import { defineSimpleWidget } from 'vitarx'
      
      const MyWidget = defineSimpleWidget(() => {
        return null
      })
      
      export default MyWidget
    `

    const result = transform(code, '/path/to/file.jsx', mockViteConfig)

    expect(result).toBeDefined()
    expect(result!.code).toContain('defineSimpleWidget')
  })

  it('不应转换非 JSX/TSX 文件', () => {
    const result = transform('', '/path/to/file.js', mockViteConfig)

    expect(result).toBeUndefined()
  })

  it('启用后应生成源映射', () => {
    const code = `
      import { defineSimpleWidget,jsx } from 'vitarx'
      
      const MyWidget = defineSimpleWidget(() => {
        return jsx('div',{children:'Hello World'})
      })
      
      export default MyWidget
    `

    const result = transform(code, '/path/to/file.tsx', mockViteConfig)

    expect(result).toBeDefined()
    expect(result!.map).toBeDefined()
  })

  it('应该不生成源映射', () => {
    const configWithoutSourcemap = {
      build: {
        sourcemap: 'hidden'
      }
    } as ResolvedConfig

    const result = transform('', '/path/to/file.tsx', configWithoutSourcemap)
    expect(result!.map).toBeNull()
  })

  it('应该添加()=>', () => {
    const result1 = transform(
      `
      import { jsx } from 'vitarx'
      
      const MyWidget = () => {
        return jsx('div')
      }
      
      export default MyWidget
    `,
      '/path/to/file.jsx',
      mockViteConfig
    )
    expect(result1).toBeDefined()
    expect(result1!.code).toContain("() => (jsx('div'))")
    const result2 = transform(
      `
      import { jsx } from 'vitarx'
      
      function MyWidget() {
        return jsx('div')
      }
      
      export default MyWidget
    `,
      '/path/to/file.jsx',
      mockViteConfig
    )
    expect(result2).toBeDefined()
    expect(result2!.code).toContain("() => (jsx('div'))")
  })

  it('应该不添加()=>', () => {
    const result = transform(
      `
      import { markSimpleWidget,jsx } from 'vitarx'
      
      const MyWidget = () => {
        return jsx('div')
      }
      markSimpleWidget(MyWidget)
      export default MyWidget
    `,
      '/path/to/file.jsx',
      mockViteConfig
    )

    expect(result).toBeDefined()
    expect(result!.code).not.toContain("() => (jsx('div'))")
    const result2 = transform(
      `
      import { markSimpleWidget,jsx } from 'vitarx'
      
      function MyWidget() {
        return jsx('div')
      }
      markSimpleWidget(MyWidget)
      export default MyWidget
    `,
      '/path/to/file.jsx',
      mockViteConfig
    )

    expect(result2).toBeDefined()
    expect(result2!.code).not.toContain("() => (jsx('div'))")
    const result3 = transform(
      `
      import { computed,jsx } from 'vitarx'
      const widget = computed(()=>{
        return jsx('div')
      })
    `,
      '/path/to/file.jsx',
      mockViteConfig
    )
    expect(result3).toBeDefined()
    expect(result3!.code).not.toContain("() => (jsx('div'))")
  })
})
