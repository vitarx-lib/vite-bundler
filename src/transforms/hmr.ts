import { type ParseResult, parseSync, traverse, types as t } from '@babel/core'
import { HmrId } from '../hmr-client/constant.js'
import { hasImport, isRootFunction, type Option } from './common.js'
import type { NodePath } from '@babel/traverse'
import crypto from 'crypto'
// 函数节点
type FunctionNode = t.FunctionExpression | t.ArrowFunctionExpression | t.FunctionDeclaration

/**
 * 注入静态语句
 *
 * @class StaticUtils
 */
class StaticUtils {
  static cache = new Map<string, any>()
  static jsxBuildMethods = ['jsx', 'jsxs', 'jsxDEV']

  /**
   * 热更新处理器语句
   */
  static get hmrHandler(): t.Statement[] {
    if (!this.cache.get('hmrHandler')) {
      const code = `
  import.meta.hot.accept(mod => {
    if(!mod) return
    const updateResult = ${HmrId.hmr}.instance.update(mod)
    typeof updateResult === 'string' && import.meta.hot.invalidate(updateResult)
  })
`
      const parsed = parseSync(code)
      this.cache.set('hmrHandler', parsed!.program.body)
    }
    return this.cache.get('hmrHandler')
  }

  /**
   * 类组件热更新注册语句
   */
  static get classWidgetHmrRegister(): t.ClassProperty {
    if (!this.cache.get('classWidgetHmrRegister')) {
      const register = t.classProperty(
        t.identifier('__$register$__'),
        t.callExpression(
          t.memberExpression(
            t.memberExpression(t.identifier(HmrId.hmr), t.identifier('instance')),
            t.identifier('register')
          ),
          [t.memberExpression(t.thisExpression(), t.identifier('vnode'))]
        )
      )
      this.cache.set('classWidgetHmrRegister', register)
    }
    return this.cache.get('classWidgetHmrRegister')
  }

  /**
   * 注入热更新客户端依赖
   *
   * @param ast
   */
  static injectHmrClientDeps(ast: ParseResult) {
    // 如果开发环境，则添加，HMR 热更新处理所需要的依赖
    const injects: t.Statement[] = []

    // 插入 import __$VITARX_HMR$__ from "@vitarx/vite-bundler/client"
    const hmrImportStatement = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier(HmrId.hmr))],
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
    // 插入 import { getCurrentVNode } from 'vitarx'
    ast.program.body.unshift(...injects)
    // 注入hmr处理程序
    ast.program.body.push(...this.hmrHandler)
  }

  /**
   * 注入热更新id定义语句
   *
   * @param path
   * @param exportName
   * @param fileName
   */
  static injectHmrIdDefine(path: NodePath, exportName: string, fileName: string) {
    const id = this.uniqueId(exportName, fileName)
    const bindIdCall = t.expressionStatement(
      t.callExpression(
        t.memberExpression(
          t.memberExpression(t.identifier(HmrId.hmr), t.identifier('instance')),
          t.identifier('bindId')
        ),
        [t.identifier(exportName), t.stringLiteral(id)]
      )
    )
    path.insertAfter(bindIdCall)
  }

  /**
   * 生成唯一id
   *
   * @param name
   * @param filePath
   */
  static uniqueId(name: string, filePath: string) {
    const originalId = `${filePath}_${name}`
    const hash = crypto.createHash('md5')
    hash.update(originalId)
    return hash.digest('hex')
  }

  /**
   * 判断是否是 jsx、jsxDEV 或 jsxs 函数
   *
   * @param name
   */
  static isJsxCall(name: string) {
    return this.jsxBuildMethods.includes(name)
  }

  /**
   * VNode节点声明语句
   *
   * @constructor
   */
  static get VNodeDeclaration(): t.VariableDeclaration {
    if (!this.cache.has('VNodeDeclaration')) {
      const createVNodeDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(HmrId.vnode),
          t.callExpression(t.identifier('getCurrentVNode'), [])
        )
      ])
      this.cache.set('VNodeDeclaration', createVNodeDeclaration)
    }
    return this.cache.get('VNodeDeclaration')
  }

  /**
   * 注册处理语句
   */
  static get hmrRegisterExpr() {
    if (!this.cache.has('hmrRegister')) {
      const hmrRegisterHandler = t.callExpression(
        t.memberExpression(
          t.memberExpression(t.identifier(HmrId.hmr), t.identifier('instance')),
          t.identifier('register')
        ),
        [t.identifier(HmrId.vnode)]
      )
      this.cache.set('hmrRegister', hmrRegisterHandler)
    }

    return this.cache.get('hmrRegister')
  }

  /**
   * 注入函数组件状态
   *
   * @param block - 函数组件的函数体
   * @param states - 状态名称集合
   */
  static injectFnWidgetHmrState(block: t.BlockStatement, states: Set<string>) {
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
    // 状态对象
    const stateObject = t.objectExpression(stateProperties)
    // 挂载状态的语句 仅在 vitarx.getCurrentVNode() 返回值不为空时才执行
    const mount = t.callExpression(
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
    block.body.unshift(
      this.VNodeDeclaration,
      this.hmrRegisterExpr,
      t.expressionStatement(t.logicalExpression('&&', t.identifier(HmrId.vnode), mount))
    )
  }

  /**
   * 创建简单热更新注册语句
   *
   * @param moduleName
   */
  static createSimpleHmrRegisterExpr(moduleName: string) {
    if (moduleName) {
      return t.callExpression(
        t.memberExpression(
          t.memberExpression(t.identifier(HmrId.hmr), t.identifier('instance')),
          t.identifier('register')
        ),
        [t.identifier(HmrId.vnode), t.identifier(moduleName)]
      )
    } else {
      return this.hmrRegisterExpr
    }
  }
}

/**
 * 处理命名导出
 *
 * @param path
 */
function handleExportNamedDeclaration(this: Option, path: NodePath<t.ExportNamedDeclaration>) {
  const { declaration } = path.node
  if (t.isVariableDeclaration(declaration)) {
    // 处理 export const App = () => {}
    declaration.declarations.forEach(decl => {
      if (t.isIdentifier(decl.id)) {
        StaticUtils.injectHmrIdDefine(path, decl.id.name, this.filename)
      }
    })
  } else if (t.isFunctionDeclaration(declaration) || t.isClassDeclaration(declaration)) {
    // 处理 export function fn() {} 和 export class A {}
    if (declaration.id) {
      StaticUtils.injectHmrIdDefine(path, declaration.id.name, this.filename)
    }
  }
}

/**
 * 处理默认导出
 *
 * @param path
 */
function handleExportDefaultDeclaration(this: Option, path: NodePath<t.ExportDefaultDeclaration>) {
  const { declaration } = path.node
  if (t.isIdentifier(declaration)) {
    // 处理 export default foo
    StaticUtils.injectHmrIdDefine(path, declaration.name, this.filename)
  } else {
    // 处理 export default function() {} / export default class {} / export default () => {}
    const uniqueVar = path.scope.generateUidIdentifier('defaultExport')
    // 将 ClassDeclaration 或 FunctionDeclaration 转换为相应的表达式
    let expr: t.Expression | null = null
    switch (declaration.type) {
      case 'ArrowFunctionExpression':
        expr = t.arrowFunctionExpression(declaration.params, declaration.body, declaration.async)
        break
      case 'FunctionDeclaration':
        expr = t.functionExpression(
          declaration.id,
          declaration.params,
          declaration.body,
          declaration.generator,
          declaration.async
        )
        break
      case 'ClassDeclaration':
        expr = t.classExpression(
          declaration.id,
          declaration.superClass,
          declaration.body,
          declaration.decorators
        )
        break
      case 'CallExpression':
        expr = t.callExpression(declaration.callee, declaration.arguments)
        break
    }
    if (expr) {
      path.replaceWithMultiple([
        t.variableDeclaration('const', [t.variableDeclarator(uniqueVar, expr)]),
        t.exportDefaultDeclaration(uniqueVar)
      ])
    }
  }
}

/**
 * 处理函数代码块变量声明
 *
 * @param statement
 * @param states
 */
function handleFnVariableDeclaration(statement: t.VariableDeclaration, states: Set<string>) {
  for (const declarator of statement.declarations) {
    const varName = declarator.id.type === 'Identifier' ? declarator.id.name : null
    // 如果没有变量名称则跳过
    if (!varName) continue

    // 如果初始化值不是函数类型，则创建还原状态表达式
    if (!t.isFunctionExpression(declarator.init) && !t.isArrowFunctionExpression(declarator.init)) {
      const left = t.callExpression(
        t.memberExpression(
          t.memberExpression(t.identifier(HmrId.hmr), t.identifier('instance')),
          t.identifier('getState')
        ),
        [t.identifier(HmrId.vnode), t.stringLiteral(varName)]
      )

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

/**
 * 处理 return 语句中的jsx|jsxDEV|jsxs方法调用
 *
 * @param returnNode - 返回语句的节点
 * @returns {t.ReturnStatement} - 处理后的返回语句
 */
function handleJsxReturn(returnNode: t.ReturnStatement): t.ReturnStatement {
  // 1. 获取返回值
  const returnValue = returnNode.argument
  // 2. 判断存在返回值，其是调用类型的返回值
  if (returnValue && returnValue.type === 'CallExpression') {
    // 3. 判断调用表达式的 callee 是否为 jsx 函数
    const callee = returnValue.callee
    if (callee.type === 'Identifier' && StaticUtils.isJsxCall(callee.name)) {
      // 4. 创建更新后的 ReturnStatement，包装成箭头函数，并返回
      return t.returnStatement(
        t.arrowFunctionExpression([], t.parenthesizedExpression(returnValue))
      )
    }
  }
  return returnNode
}

/**
 * 处理组件函数
 *
 * @param path
 */
function handleFunctionDeclaration(path: NodePath<FunctionNode>) {
  const isRoot = isRootFunction(path)
  // 1. 确保函数是根节点
  if (isRoot) {
    const isDev = process.env.NODE_ENV === 'development'

    // 2. 确保 函数体是块级语句
    if (!t.isBlockStatement(path.node.body)) {
      path.node.body = t.blockStatement([t.returnStatement(path.node.body)])
    }
    const block = path.node.body
    const states: Set<string> = new Set()
    if (isRoot !== 'simple') {
      // 3. 遍历 body 处理语句
      for (let i = 0; i < block.body.length; i++) {
        const statement = block.body[i]
        if (t.isReturnStatement(statement)) {
          // 4. 处理返回值（可以是 JSX 或其他）
          const newStatement = handleJsxReturn(statement)
          // 判断是否需要替换
          if (newStatement !== statement) {
            // 替换语句，直接修改 body 数组中的元素
            block.body[i] = newStatement
          }
        } else if (t.isVariableDeclaration(statement) && isDev) {
          // 5. 开发模式，处理变量声明，挂载状态
          handleFnVariableDeclaration(statement, states)
        }
      }
    }
    if (isDev) {
      if (isRoot === 'simple') {
        // 此时的函数声明应该是 const xxx = simple(() => {})
        // @ts-ignore
        const moduleName = path.parentPath?.parentPath?.node?.id?.name
        const hmrRegister = StaticUtils.createSimpleHmrRegisterExpr(moduleName)
        block.body.unshift(StaticUtils.VNodeDeclaration, hmrRegister)
      } else {
        StaticUtils.injectFnWidgetHmrState(block, states)
      }
    }
  }
}

/**
 * 给类组件添加注册程序
 *
 * @param path
 */
function handleClassExpression(path: NodePath<t.ClassExpression>): void {
  // 检查类中是否定义了 build 方法
  const hasBuildMethod = path.node.body.body.some(method => {
    return (
      t.isClassMethod(method) && method.key.type === 'Identifier' && method.key.name === 'build'
    )
  })
  // 如果类中定义了 build 方法，则插入注册程序
  if (hasBuildMethod) {
    path.node.body.body.unshift(StaticUtils.classWidgetHmrRegister)
  }
}

/**
 * hmr转换
 *
 * 注入热更新客户端依赖，并注入热更新处理程序
 *
 * @param ast
 * @param options
 */
export default function hmrOrBuildTransform(ast: ParseResult, options: Option): void {
  const handler: Record<string, Function> = {
    // 处理函数声明
    FunctionDeclaration: handleFunctionDeclaration,
    // 处理函数表达式
    FunctionExpression: handleFunctionDeclaration,
    // 处理箭头函数表达式
    ArrowFunctionExpression: handleFunctionDeclaration
  }

  if (process.env.NODE_ENV === 'development') {
    handler.ExportNamedDeclaration = handleExportNamedDeclaration.bind(options)
    handler.ExportDefaultDeclaration = handleExportDefaultDeclaration.bind(options)
    handler.ClassExpression = handleClassExpression
  }
  // 遍历 AST 并处理
  traverse(ast, handler)
  if (process.env.NODE_ENV === 'development') {
    // 注入 HMR 依赖
    StaticUtils.injectHmrClientDeps(ast)
  }
}
