import { type ParseResult, parseSync, types as t } from '@babel/core'
import { HmrId } from './constant.js'

let createVNodeDeclarationCache: t.VariableDeclaration | null = null
let createHmrHandlerCache: t.Statement[] | null = null
let createHmrRegisterHandlerCache: t.CallExpression | null = null

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
 * 创建vnode变量声明语句
 *
 * ```ts
 * const __$vnode$__ = getCurrentVNode()
 * ```
 *
 * @returns {t.VariableDeclaration} - vnode变量声明语句
 */
function createVNodeDeclaration(): t.VariableDeclaration {
  if (!createVNodeDeclarationCache) {
    createVNodeDeclarationCache = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(HmrId.vnode),
        t.callExpression(t.identifier('getCurrentVNode'), [])
      )
    ])
  }
  return createVNodeDeclarationCache
}

/**
 * 创建热更新注册处理程序
 */
function createHmrRegisterHandler() {
  if (!createHmrRegisterHandlerCache) {
    createHmrRegisterHandlerCache = t.callExpression(
      t.memberExpression(t.identifier(HmrId.manager), t.identifier('register')),
      [t.identifier(HmrId.vnode)]
    )
  }

  return createHmrRegisterHandlerCache
}

/**
 * 创建vnode缓存处理程序
 */
function createHmrHandler(): t.Statement[] {
  if (createHmrHandlerCache) return createHmrHandlerCache
  const code = `
  import.meta.hot.accept(mod => {
    const updateResult = ${HmrId.manager}.update(mod)
    typeof updateResult === 'string' && import.meta.hot.invalidate(updateResult)
  })
`
  const parsed = parseSync(code)
  // 提取if节点
  return (createHmrHandlerCache = parsed!.program.body)
}

/**
 * 在最后一条import语句之后插入代码
 *
 * @param ast
 * @param injects
 */
function insertAfterLastImport(ast: ParseResult, injects: t.Statement[]): void {
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

let managerDeclarationCache: t.VariableDeclaration | null = null

/**
 * 创建模块管理器声明语句
 *
 * @returns {t.VariableDeclaration} - 模块管理器声明语句
 */
function createManagerDeclaration(): t.VariableDeclaration {
  if (!managerDeclarationCache)
    managerDeclarationCache = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(HmrId.manager),
        t.newExpression(
          t.memberExpression(t.identifier(HmrId.hmr), t.identifier('ModuleManager')),
          []
        )
      )
    ])
  return managerDeclarationCache
}

/**
 * 导入客户端热更新所需的依赖
 *
 * @param ast
 */
export function importHmrClientDeps(ast: ParseResult) {
  // 如果开发环境，则添加，HMR 热更新处理所需要的依赖
  const injects: t.Statement[] = []

  // 插入 import * as __$hmr$__ from "@vitarx/vite-bundler/client"
  const hmrImportStatement = t.importDeclaration(
    [t.importNamespaceSpecifier(t.identifier(HmrId.hmr))],
    t.stringLiteral('@vitarx/vite-bundler/client')
  )
  injects.push(hmrImportStatement)

  // 插入 import { getCurrentVNode } from 'vitarx'
  const importVitarx = hasImport(ast, 'vitarx', ['getCurrentVNode'])
  if (importVitarx.length > 0) {
    const importStatement = t.importDeclaration(
      importVitarx.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))),
      t.stringLiteral('vitarx')
    )
    injects.push(importStatement)
  }
  ast.program.body.unshift(...injects)
  // `const __$vitarx_hmr_manager$__ = new __$vitarx_vite_hmr$__.ModuleManager()`
  insertAfterLastImport(ast, [createManagerDeclaration()])
  // 插入 vnode 缓存处理程序
  ast.program.body.push(...createHmrHandler())
}

/**
 * 处理函数代码块变量声明
 *
 * @param statement
 * @param states
 */
export function handleFnVariableDeclaration(statement: t.VariableDeclaration, states: Set<string>) {
  for (const declarator of statement.declarations) {
    const varName = declarator.id.type === 'Identifier' ? declarator.id.name : null
    // 如果没有变量名称则跳过
    if (!varName) continue

    // 如果初始化值不是函数类型，则创建还原状态表达式
    if (!t.isFunctionExpression(declarator.init) && !t.isArrowFunctionExpression(declarator.init)) {
      const left = t.callExpression(t.identifier(`${HmrId.hmr}.getState`), [
        t.identifier(HmrId.vnode),
        t.stringLiteral(varName)
      ])

      // 确保 declarator.init 不是 undefined 或 null
      const right = declarator.init
        ? t.parenthesizedExpression(declarator.init)
        : t.identifier('undefined') // 如果没有初始化值，使用 'undefined'

      // 创建新的表达式，使用 `??` 操作符
      declarator.init = t.logicalExpression('??', left, right)

      states.add(varName)
    }
  }
}

// 添加私有属性 #__$register$__
export const injectClassWidgetHmrHandler = t.classPrivateProperty(
  t.privateName(t.identifier('__$register$__')),
  t.callExpression(t.memberExpression(t.identifier(HmrId.manager), t.identifier('register')), [
    t.memberExpression(t.thisExpression(), t.identifier('vnode'))
  ])
)

/**
 * 注入函数组件状态处理程序
 *
 * @param block
 * @param states
 */
export function injectFnWidgetHmrHandler(block: t.BlockStatement, states: Set<string>) {
  if (process.env.NODE_ENV !== 'development') return
  // 动态生成状态对象 getter
  const stateProperties = Array.from(states).map(stateName => {
    return t.objectMethod(
      'get',
      t.identifier(stateName),
      [],
      t.blockStatement([t.returnStatement(t.identifier(stateName))])
    )
  })
  const stateObject = t.objectExpression(stateProperties)
  // 创建状态对象挂载语句
  const stateMount = t.expressionStatement(
    t.callExpression(
      t.memberExpression(
        t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []),
        t.identifier('then')
      ),
      [
        t.arrowFunctionExpression(
          [],
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier(HmrId.vnode), t.identifier(HmrId.state)),
                stateObject
              )
            )
          ])
        )
      ]
    )
  )
  block.body.unshift(
    createVNodeDeclaration(),
    createHmrRegisterHandler() as unknown as t.Statement,
    stateMount
  )
}
