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

// 判断两个类的差异是否仅存在于 `build` 方法
export function isDifferenceOnlyInBuild(newCode: string, oldCode: string): boolean {
  // 提取新旧类的 `build` 方法
  const newBuildMethod = extractBuildMethod(newCode)
  const oldBuildMethod = extractBuildMethod(oldCode)

  // 如果 `build` 方法不同，则进一步比较其他部分
  if (newBuildMethod !== oldBuildMethod) {
    // 提取除 `build` 方法外的其他代码部分
    const newCodeWithoutBuild = extractOtherCode(newCode, newBuildMethod)
    const oldCodeWithoutBuild = extractOtherCode(oldCode, oldBuildMethod)

    // 如果移除 `build` 方法后的其他部分相同，则差异仅在 `build` 方法
    return newCodeWithoutBuild === oldCodeWithoutBuild
  }

  // 如果 `build` 方法相同，则两者差异仅在于 `build` 方法
  return true
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
 * 判断两个函数的差异是否只在于 return 语句
 *
 * @param newCode 新函数代码
 * @param oldCode 旧函数代码
 * @returns 如果差异仅在于 `Render` 语句，则返回 true，否则返回 false
 */
export function isDifferenceOnlyInRender(newCode: string, oldCode: string): boolean {
  // 提取新旧函数的顶级 return 语句
  const { renderCode: newRenderCode, logicCode: newLogicCode } = separateLogicAndRender(newCode)
  const { renderCode: oldRenderCode, logicCode: oldLogicCode } = separateLogicAndRender(oldCode)
  // 如果函数的渲染代码不相同，则判断逻辑代码是否相同
  if (newRenderCode !== oldRenderCode) {
    // 如果逻辑代码相同则返回true，不相同则返回false，整体都更新，不保留状态
    return newLogicCode === oldLogicCode
  }
  return true
}
