export interface ChangeCode {
  build: boolean
  other: boolean
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
function separateLogicAndRender(functionCode: string): { logicCode: string; renderCode: string[] } {
  const noCommentsCode = functionCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') // 去除注释

  // 匹配嵌套 jsxDEV 调用，支持多层嵌套
  const jsxRegex = /jsxDEV\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/g

  const renderCode: string[] = []
  let logicCode = noCommentsCode

  let match
  while ((match = jsxRegex.exec(noCommentsCode)) !== null) {
    renderCode.push(match[0]) // 保存完整的 jsxDEV 调用块
    logicCode = logicCode.replace(match[0], '') // 从逻辑代码中移除
  }

  return {
    logicCode: logicCode.trim(),
    renderCode
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
