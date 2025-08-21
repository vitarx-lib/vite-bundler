import { types as t } from '@babel/core'
import type { NodePath } from '@babel/traverse'
import generator, { type GeneratorOptions, type GeneratorResult } from '@babel/generator'
import type { MakeRequired } from '@vitarx/utils'

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
 * 该函数用于判断给定的函数节点路径是否为顶级函数，包括函数声明、defineSimpleWidget或markSimpleWidget调用、以及变量声明的函数
 * @param path - 函数路径
 */
export function isRootFunction(path: NodePath<FunctionNode>): boolean | 'simple' {
  // 如果是函数声明类型，则判断其父级路径是否为根声明
  if (t.isFunctionDeclaration(path.node) && path.node.id) {
    // 检查是否有变量引用了这个函数，并且该变量被markSimpleWidget调用
    const functionName = path.node.id.name
    if (functionName) {
      // 查找是否有markSimpleWidget(functionName)的调用
      const binding = path.scope.getBinding(functionName)
      if (binding) {
        // 获取所有可能的调用名称（包括别名）
        const callNames = getImportedNames(path, ['defineSimpleWidget', 'markSimpleWidget'])

        for (const referencePath of binding.referencePaths) {
          // 检查是否作为 markSimpleWidget 或 defineSimpleWidget 的参数被调用
          if (
            referencePath.parentPath?.isCallExpression() &&
            t.isIdentifier(referencePath.parentPath.node.callee)
          ) {
            const callName = referencePath.parentPath.node.callee.name
            if (callNames.includes(callName)) return 'simple'
          }
        }
      }
    }
    return isRootDeclaration(path.parentPath)
  }

  // 如果父级路径是调用表达式，并且调用表达式的被调用者是一个标识符
  if (path.parentPath.isCallExpression() && t.isIdentifier(path.parentPath.node.callee)) {
    const callName = path.parentPath.node.callee.name
    // 获取所有可能的调用名称（包括别名）
    const callNames = getImportedNames(path, ['defineSimpleWidget', 'markSimpleWidget'])

    // 如果调用名称是'defineSimpleWidget'或'markSimpleWidget'（包括别名），并且是从vitarx导入的
    if (callNames.includes(callName)) return 'simple'
  }

  // 匿名函数 或 箭头函数
  if (path.parentPath.type === 'VariableDeclarator' && path.parentPath.parentPath?.parentPath) {
    return isRootDeclaration(path.parentPath.parentPath.parentPath)
  }

  return false
}

/**
 * 获取从 vitarx 导入的函数的实际名称（包括别名）
 *
 * @param path - 函数路径
 * @param functionNames - 原始函数名称列表
 * @returns {string[]} 实际导入的名称列表（包括别名）
 */
export function getImportedNames(path: NodePath, functionNames: string[]): string[] {
  const importedNames: string[] = []

  for (const functionName of functionNames) {
    const binding = path.scope.getBinding(functionName)
    if (binding && binding.path.parentPath?.isImportDeclaration()) {
      const importDeclaration = binding.path.parentPath.node as t.ImportDeclaration
      if (
        importDeclaration.source.value === 'vitarx' ||
        importDeclaration.source.value.startsWith('@vitarx')
      ) {
        // 棜查是否是默认导入或命名空间导入
        if (binding.path.isImportDefaultSpecifier() || binding.path.isImportNamespaceSpecifier()) {
          importedNames.push(functionName)
        }
        // 检查是否是命名导入
        else if (binding.path.isImportSpecifier()) {
          // 获取本地名称（可能是别名）
          importedNames.push(binding.identifier.name)
        }
      }
    }
  }

  return importedNames
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
 * 使用 @babel/generator 生成代码
 *
 * @param ast
 * @param options
 */
export function babelGenerate(ast: t.Node, options?: GeneratorOptions): GeneratorResult {
  return (generator as any).default(ast!, options)
}
