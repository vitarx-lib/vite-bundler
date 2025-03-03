import { parseSync } from '@babel/core'
import hmrOrBuildTransform from '../../src/transforms/hmr.js'
import { babelGenerate } from '../../src/transforms/common.js'

// @ts-ignore
process.env.NODE_ENV = 'development'
const ___ast = parseSync(`
import {simple} from 'vitarx'
export default simple(()=>{
  return jsx('div')
})
`)!
hmrOrBuildTransform(___ast, 'x')
console.warn('\n--------------------------------\n')
console.log(babelGenerate(___ast).code)
console.warn('\n--------------------------------\n')
