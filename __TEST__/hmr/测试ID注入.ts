import { parseSync } from '@babel/core'
import generate from '@babel/generator'
import hmrOrBuildTransform from '../../src/transforms/hmr.js'

// @ts-ignore
process.env.NODE_ENV = 'development'
const ___ast = parseSync(`
import {defineAsyncWidget} from 'vitarx'
export const A = defineAsyncWidget(()=>{
  return jsx('div')
})
`)!
hmrOrBuildTransform(___ast, 'x')
// @ts-ignore
console.log(generate.default(___ast).code)
