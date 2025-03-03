import { type ParseResult, types as t } from '@babel/core'
import type { NodePath } from '@babel/traverse'
import generator, { type GeneratorOptions, type GeneratorResult } from '@babel/generator'

export type Option = MakeRequired<GeneratorOptions, 'filename'>
// 函数节点
type FunctionNode = t.FunctionExpression | t.ArrowFunctionExpression | t.FunctionDeclaration

/**
 * 判断是否为根path
 *
 * 除了 Program 节点以外，如果是export default 或 export named 则视为根path
 *
 * @param path - 任意路径
 */
export function isRootDeclaration(path: NodePath) {
  return path.isProgram() || path.isExportDefaultDeclaration() || path.isExportNamedDeclaration()
}

/**
 * 判断是否是顶级函数
 *
 * @param path - 函数路径
 */
export function isRootFunction(path: NodePath<FunctionNode>): boolean {
  if (path.type === 'FunctionDeclaration') {
    return isRootDeclaration(path.parentPath)
  }
  if (path.parentPath.isCallExpression() && t.isIdentifier(path.parentPath.node.callee)) {
    const callName = path.parentPath.node.callee
    if (callName.name === 'defineAsyncWidget') {
      // 检查 defineAsyncWidget 是否从 vitarx 包中导入
      const binding = path.scope.getBinding('defineAsyncWidget')
      if (binding && binding.path.parentPath?.isImportDeclaration()) {
        const importDeclaration = binding.path.parentPath.node as t.ImportDeclaration
        if (importDeclaration.source.value === 'vitarx') {
          return true
        }
      }
    }
  }
  // 匿名函数 或 箭头函数
  if (path.parentPath.type === 'VariableDeclarator' && path.parentPath.parentPath?.parentPath) {
    return isRootDeclaration(path.parentPath.parentPath?.parentPath)
  }
  return false
}

/**
 * 检查是否已经存在指定的 import 语句
 *
 * @param ast - AST 树
 * @param moduleName - 模块名称
 * @param importNames - 导入的标识符名称数组
 * @returns {string[]} - 未导入的标识符数组
 */
export function hasImport(ast: t.File, moduleName: string, importNames: string[]): string[] {
  const notImported: string[] = []

  // 获取已导入的标识符名称集合
  const importedSet = new Set<string>()

  for (const node of ast.program.body) {
    if (t.isImportDeclaration(node) && node.source.value === moduleName) {
      for (const specifier of node.specifiers) {
        if (t.isImportSpecifier(specifier) && 'name' in specifier.imported) {
          importedSet.add(specifier.imported.name)
        }
      }
    }
  }
  // 检查每个 importName 是否已导入
  for (const importName of importNames) {
    if (!importedSet.has(importName)) {
      notImported.push(importName)
    }
  }

  return notImported
}

/**
 * 在最后一条import语句之后插入代码
 *
 * @param ast
 * @param injects
 */
export function insertAfterLastImport(ast: ParseResult, injects: t.Statement[]): void {
  let lastImportIndex = -1

  // 找到最后一个 import 语句的位置
  for (let i = 0; i < ast.program.body.length; i++) {
    if (ast.program.body[i].type === 'ImportDeclaration') {
      lastImportIndex = i
    } else {
      break
    }
  }
  // 如果没有 import 语句，则直接插入到 body 的开头
  if (lastImportIndex === -1) {
    ast.program.body.unshift(...injects)
  } else {
    // 在最后一个 import 语句后面插入代码
    ast.program.body.splice(lastImportIndex + 1, 0, ...injects)
  }
}

/**
 * 使用 @babel/generator 生成代码
 *
 * @param ast
 * @param options
 */
export function babelGenerate(ast: t.Node, options?: GeneratorOptions): GeneratorResult {
  return (generator as any).default(ast!, options)
}
