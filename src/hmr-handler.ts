import { type ParseResult, types as t, parseSync } from '@babel/core'

/**
 * 标识符
 */
export enum HmrId {
  hmr = '__$hmr$__',
  vnode = '__$vnode$__',
  state = '__$state$__'
}

let createHmrReloadHandlerCache: t.IfStatement | null = null
let createVNodeDeclarationCache: t.VariableDeclaration | null = null

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
 * 导入客户端热更新所需的依赖
 *
 * @param ast
 */
export function importHmrClientDeps(ast: ParseResult) {
  // 如果开发环境，则添加，HMR 热更新处理所需要的依赖
  if (process.env.NODE_ENV === 'development') {
    // 插入 import * as __$hmr$__ from "@vitarx/vite-plugin-vitarx"
    const hmrImportStatement = t.importDeclaration(
      [t.importNamespaceSpecifier(t.identifier(HmrId.hmr))],
      t.stringLiteral('/src/hmr-client.ts') // npm run build 时会自动替换为@vitarx/vite-plugin-vitarx/hmr-client.js
    )
    ast.program.body.unshift(hmrImportStatement)
    const importVitarx = hasImport(ast, 'vitarx', ['getCurrentVNode'])
    if (importVitarx.length > 0) {
      const importStatement = t.importDeclaration(
        importVitarx.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))),
        t.stringLiteral('vitarx')
      )
      ast.program.body.unshift(importStatement)
    }
  }
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
    if (!varName) continue
    if (t.isCallExpression(declarator.init)) {
      const callee = declarator.init.callee
      const callName = callee.type === 'Identifier' ? callee.name : null
      if (!callName) continue
      if (callName === 'ref' || callName === 'reactive') {
        // 获取调用表达式的参数
        const args = declarator.init.arguments
        const defaultValue = args.length > 0 ? args[0] : t.nullLiteral()
        // 创建新的表达式
        declarator.init = t.logicalExpression(
          '||',
          t.callExpression(t.identifier(`${HmrId.hmr}.getState`), [
            t.identifier(HmrId.vnode),
            t.stringLiteral(varName)
          ]),
          t.parenthesizedExpression(t.callExpression(callee, [defaultValue]))
        )
        states.add(varName)
      }
    }
  }
}

/**
 * 创建热更新处理程序代码块
 *
 * @returns {t.IfStatement} - 热更新处理程序代码块
 */
function createHmrReloadHandler(): t.IfStatement {
  if (createHmrReloadHandlerCache) return createHmrReloadHandlerCache
  const code = `if (import.meta.hot) {
  import.meta.hot.accept(mod => {
    if (${HmrId.hmr}.cannotHandleUpdate(${HmrId.vnode}, mod)) {
      import.meta.hot.invalidate('组件从模块中移除，无法处理热更新。')
    } else {
      ${HmrId.hmr}.handleHmrUpdate(${HmrId.vnode}, mod, ${HmrId.state},import.meta.url)
    }
  })
}`
  const parsed = parseSync(code)
  if (!parsed || !parsed.program) {
    throw new Error('Failed to parse the code')
  }
  // 提取if节点
  return (createHmrReloadHandlerCache = parsed.program.body[0] as t.IfStatement)
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
  if (createVNodeDeclarationCache) return createVNodeDeclarationCache
  createVNodeDeclarationCache = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(HmrId.vnode),
      t.callExpression(t.identifier('getCurrentVNode'), [])
    )
  ])
  return createVNodeDeclarationCache
}

export function injectHmrCode(block: t.BlockStatement, states: Set<string>) {
  if (process.env.NODE_ENV !== 'development') return
  const injects: t.Statement[] = [createVNodeDeclaration()]
  // 动态生成状态对象 getter
  const stateProperties = Array.from(states).map(stateName => {
    return t.objectMethod(
      'get',
      t.identifier(stateName),
      [],
      t.blockStatement([t.returnStatement(t.identifier(stateName))])
    )
  })
  // 写入 const __$state$__ = { ... }
  injects.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(HmrId.state), t.objectExpression(stateProperties))
    ])
  )
  // 写入 if (import.meta.hot) { ... }
  injects.push(createHmrReloadHandler())
  block.body.unshift(...injects)
}
