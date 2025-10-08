import { parse } from 'acorn'

export interface ChangeCode {
  build: boolean
  other: boolean
}

interface SeparationResult {
  logicCode: string
  renderCode: string
}

/**
 * 分离逻辑代码和渲染代码
 *
 * @param functionCode 完整函数代码
 * @returns 包含逻辑代码和渲染代码的对象
 */
function separateLogicAndRender(functionCode: string): SeparationResult {
  const jsxNodes: string[] = []
  // 添加括号，兼容匿名函数解析
  functionCode = `(${functionCode})`
  // 解析代码为 AST
  const ast = parse(functionCode, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowReturnOutsideFunction: true, // 允许在函数外使用 return
    allowAwaitOutsideFunction: true, // 允许在函数外使用 await
    allowImportExportEverywhere: true, // 允许在任何地方使用 import/export
    allowHashBang: true, // 允许 Shebang
    allowReserved: true // 允许使用保留字作为标识符
  })

  // 遍历 AST，提取 jsxDEV 调用
  const extractJSX = (node: any) => {
    if (node.type === 'CallExpression' && node.callee.name === 'jsxDEV') {
      const start = node.start
      const end = node.end
      jsxNodes.push(functionCode.slice(start, end)) // 提取 jsxDEV 的源码
    }
    // 递归处理子节点
    Object.values(node).forEach(child => {
      if (Array.isArray(child)) {
        child.forEach(extractJSX)
      } else if (typeof child === 'object' && child !== null) {
        extractJSX(child)
      }
    })
  }

  extractJSX(ast)

  // 去除逻辑代码中的 jsxDEV
  let logicCode = functionCode
  jsxNodes.forEach(jsx => {
    logicCode = logicCode.replace(jsx, '') // 替换掉所有的 jsxDEV 调用
  })

  return {
    logicCode: logicCode.trim(),
    renderCode: jsxNodes.join()
  }
}

/**
 * 判断两个函数组件的差异
 *
 * @param newCode 新函数代码
 * @param oldCode 旧函数代码
 * @returns {ChangeCode}
 */
export function differenceFnWidgetChange(newCode: string, oldCode: string): ChangeCode {
  // 提取新旧函数的顶级 return 语句
  const { renderCode: newRenderCode, logicCode: newLogicCode } = separateLogicAndRender(newCode)
  const { renderCode: oldRenderCode, logicCode: oldLogicCode } = separateLogicAndRender(oldCode)
  return {
    build: newRenderCode !== oldRenderCode,
    other: newLogicCode !== oldLogicCode
  }
}
