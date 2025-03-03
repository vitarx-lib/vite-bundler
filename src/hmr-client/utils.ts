import { parse } from 'acorn'

export interface ChangeCode {
  build: boolean
  other: boolean
}

interface SeparationResult {
  logicCode: string
  renderCode: string
}

// 提取类代码中的 `build` 方法
function extractBuildMethod(classCode: string): string {
  const buildMethodRegex = /build\s*\(\)\s*{([\s\S]*?)^}/gm
  const match = buildMethodRegex.exec(classCode)
  return match ? match[1].trim() : ''
}

// 提取类代码中除 `build` 方法之外的其他部分
function extractOtherCode(classCode: string, buildMethod: string): string {
  // 移除 `build` 方法后的其他部分
  return classCode.replace(buildMethod, '').trim()
}

/**
 * 判断两个类组件的差异
 *
 * @param newCode
 * @param oldCode
 * @returns {ChangeCode}
 */
export function differenceClassWidgetChange(newCode: string, oldCode: string): ChangeCode {
  const change: ChangeCode = {
    build: false,
    other: false
  }
  // 提取新旧类的 `build` 方法
  const newBuildMethod = extractBuildMethod(newCode)
  const oldBuildMethod = extractBuildMethod(oldCode)

  // 判断构建方法差异
  if (newBuildMethod !== oldBuildMethod) {
    change.build = true
  }

  // 提取除 `build` 方法外的其他代码部分
  const newCodeWithoutBuild = extractOtherCode(newCode, newBuildMethod)
  const oldCodeWithoutBuild = extractOtherCode(oldCode, oldBuildMethod)

  // 判断逻辑代码差异
  if (newCodeWithoutBuild !== oldCodeWithoutBuild) {
    change.other = true
  }
  return change
}

/**
 * 分离逻辑代码和渲染代码
 *
 * @param functionCode 完整函数代码
 * @returns 包含逻辑代码和渲染代码的对象
 */
function separateLogicAndRender(functionCode: string): SeparationResult {
  const jsxNodes: string[] = []

  // 去除注释
  const noCommentsCode = functionCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')

  // 解析代码为 AST
  const ast = parse(noCommentsCode, {
    ecmaVersion: 'latest',
    sourceType: 'module'
  })

  // 遍历 AST，提取 jsxDEV 调用
  const extractJSX = (node: any) => {
    if (node.type === 'CallExpression' && node.callee.name === 'jsxDEV') {
      const start = node.start
      const end = node.end
      jsxNodes.push(noCommentsCode.slice(start, end)) // 提取 jsxDEV 的源码
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
  let logicCode = noCommentsCode
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
  const { renderCode: newRenderCode, logicCode: newLogicCode } = separateLogicAndRender(
    `(${newCode})`
  )
  const { renderCode: oldRenderCode, logicCode: oldLogicCode } = separateLogicAndRender(
    `(${oldCode})`
  )
  return {
    build: newRenderCode !== oldRenderCode,
    other: newLogicCode !== oldLogicCode
  }
}
