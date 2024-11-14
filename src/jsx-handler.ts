import { type Node, parseSync, traverse, types as t } from '@babel/core'
import generator, { type GeneratorOptions, type GeneratorResult } from '@babel/generator'

// 处理结果
type HandleResult = {
  code: string
  map: any
}

/**
 * 使用 @babel/generator 生成代码
 *
 * @param ast
 * @param options
 */
function generate(ast: Node, options?: GeneratorOptions): GeneratorResult {
  return (generator as any).default(ast!, options)
}

/**
 * 判断是否是 jsx、jsxDEV 或 jsxs 函数
 *
 * @param name
 */
function isJsxCall(name: string) {
  return name === 'jsx' || name === 'jsxDEV' || name === 'jsxs'
}

/**
 * 处理函数返回值中的 jsx 代码
 *
 * @param returnPath - 返回语句的路径
 */
function handleJsxReturn(returnPath: any) {
  const returnValue = returnPath.node.argument
  if (returnValue && returnValue.type === 'CallExpression') {
    const callee = returnValue.callee
    if (callee.type === 'Identifier' && isJsxCall(callee.name)) {
      const updatedReturnAst = t.returnStatement(
        t.arrowFunctionExpression([], t.parenthesizedExpression(returnValue))
      )
      returnPath.replaceWith(updatedReturnAst)
    }
  }
}

/**
 * 处理 AST 中的函数类型
 *
 * @param path - 当前函数的路径
 */
function handleFunction(path: any) {
  if (path.parentPath.isProgram() && path.isFunction()) {
    path.traverse({
      ReturnStatement(returnPath: any) {
        handleJsxReturn(returnPath)
      }
    })
  }
}

/**
 * 处理jsx或tsx文件代码
 *
 * @param code - 经过esbuild处理过的jsx或tsx文件代码
 * @param options - babel generator 选项
 * @returns {HandleResult} - 处理后的代码
 */
export default function handleJsxOrTsxFileCode(
  code: string,
  options?: GeneratorOptions
): HandleResult {
  // 使用 Babel 解析源码为 AST
  const ast = parseSync(code)
  if (ast && ast.program) {
    traverse(ast, {
      FunctionDeclaration: handleFunction,
      FunctionExpression: handleFunction,
      ArrowFunctionExpression: handleFunction
    })
    const generateResult = generate(ast, options)
    return {
      code: generateResult.code,
      map: generateResult.map
    }
  }
  return {
    code,
    map: null
  }
}
