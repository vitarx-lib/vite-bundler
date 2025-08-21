import { describe, expect, it } from 'vitest'
import { parseSync } from '@babel/core'
import hmrOrBuildTransform from '../src/transforms/hmr.js'
import { babelGenerate } from '../src/transforms/common.js'
// @ts-ignore
process.env.NODE_ENV = 'development'
const ___ast = parseSync(`
import {defineSimpleWidget} from 'vitarx'
export default defineSimpleWidget(()=>{
  return jsx('div')
})
`)!
hmrOrBuildTransform(___ast, { filename: 'test.tsx' })
const code = babelGenerate(___ast).code
describe('测试HMR注入', () => {
  it('注册组件', () => {
    expect(code).toContain('const __$VITARX_WIDGET_VNODE$__ = getCurrentVNode();')
    expect(code).toContain('__$VITARX_HMR$__.instance.register')
  })
  it('更新组件', () => {
    expect(code).toContain('__$VITARX_HMR$__.instance.update')
  })
  it('绑定ID', () => {
    expect(code).toContain('__$VITARX_HMR$__.instance.bindId')
  })
})
