import { parseSync, traverse, types as t } from '@babel/core'
import generator, { type GeneratorOptions, type GeneratorResult } from '@babel/generator'
import { NodePath } from '@babel/traverse'
import {
  handleFnVariableDeclaration,
  importHmrClientDeps,
  injectClassWidgetHmrHandler,
  injectFnWidgetHmrHandler
} from './hmr/hmr-handler.js'

// 函数节点
type FunctionNode = t.FunctionExpression | t.ArrowFunctionExpression | t.FunctionDeclaration
// 函数路径
type FunctionPath = NodePath<FunctionNode>
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
function generate(ast: t.Node, options?: GeneratorOptions): GeneratorResult {
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
 * 判断函数名称是否符合 PascalCase 命名规范
 *
 * @param name - 函数名称
 * @returns {boolean} - 是否符合 PascalCase 命名规范
 */
function isPascalCase(name: string): boolean {
  const regex = /^[A-Z][A-Za-z0-9]*$/
  return regex.test(name)
}

/**
 * 判断是否为根path
 *
 * 除了 Program 节点以外，如果是export default 或 export named 则视为根path
 *
 * @param path - 任意路径
 */
function isRootPath(path: NodePath<t.Node>) {
  return path.isProgram() || path.isExportDefaultDeclaration() || path.isExportNamedDeclaration()
}

/**
 * 判断是否是顶级函数
 *
 * @param path - 函数路径
 */
function isRootFunction(path: FunctionPath): boolean {
  if (path.type === 'FunctionDeclaration') {
    return isRootPath(path.parentPath)
  }
  // 匿名函数 或 箭头函数
  if (path.parentPath.type === 'VariableDeclarator' && path.parentPath.parentPath?.parentPath) {
    return isRootPath(path.parentPath.parentPath?.parentPath)
  }
  return false
}

/**
 * 获取函数名称
 *
 * 匿名和箭头函数 获取其父级变量声明名称，如果没有则返回null
 *
 * @param path - 函数路径
 */
function getFunctionName(path: FunctionPath): string | null {
  if (path.type === 'FunctionDeclaration') {
    if ('id' in path.node && path.node.id?.type === 'Identifier') {
      return path.node.id.name
    }
  } else if (path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier') {
    return path.parent.id.name
  }
  return null
}

/**
 * 判断是否为函数组件
 *
 * 函数组件名称必须为 PascalCase 命名规范
 *
 * 函数组件必须为顶级函 包括 export default 和 export named
 *
 * @param path - 函数路径
 */
function isRootFunctionWidget(path: FunctionPath) {
  const name = getFunctionName(path)
  if (!name || !isPascalCase(name)) return false
  if (path.node.async) return false
  return isRootFunction(path)
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
    if (callee.type === 'Identifier' && isJsxCall(callee.name)) {
      // 4. 创建更新后的 ReturnStatement，包装成箭头函数，并返回
      return t.returnStatement(
        t.arrowFunctionExpression([], t.parenthesizedExpression(returnValue))
      )
    }
  }
  return returnNode
}


/**
 * 处理 AST 中的函数类型
 *
 * @param path - 当前函数的路径
 */
function handleFunction(path: FunctionPath) {
  // 1. 确保函数是根节点
  if (isRootFunctionWidget(path)) {
    // 2. 获取函数的 body
    const block = path.node.body as t.BlockStatement
    // 3. 确保 body 是 BlockStatement 类型
    if (block.type === 'BlockStatement') {
      const states: Set<string> = new Set()
      // 4. 遍历 body 处理语句
      for (let i = 0; i < block.body.length; i++) {
        const statement = block.body[i]
        // 5. 处理返回语句
        if (t.isReturnStatement(statement)) {
          // 处理返回值（可以是 JSX 或其他）
          const newStatement = handleJsxReturn(statement)
          // 判断是否需要替换
          if (newStatement !== statement) {
            // 替换语句，直接修改 body 数组中的元素
            block.body[i] = newStatement
          }
          continue
        }
        // 6. 开发模式，处理变量声明
        if (process.env.NODE_ENV === 'development' && t.isVariableDeclaration(statement)) {
          handleFnVariableDeclaration(statement, states)
        }
      }
      // 7. 开发模式，注入状态处理程序
      injectFnWidgetHmrHandler(block, states)
    }
  }
}

/**
 * 获取类名称，如果不存在则返回null
 *
 * @param path
 */
function getClassName(path: NodePath<t.ClassDeclaration>): null | string {
  if (!path.node.id) return null
  return path.node.id.name
}

function handleClass(path: NodePath<t.ClassDeclaration>) {
  const name = getClassName(path)
  // 判断是否为顶级类，且命名规范符合PascalCase
  if (!name || !isPascalCase(name) || !isRootPath(path.parentPath)) return
  // 添加私有属性 #__$register$__ 注册类组件
  path.node.body.body.unshift(injectClassWidgetHmrHandler)
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
    const handler: Record<string, Function> = {
      FunctionDeclaration: handleFunction,
      FunctionExpression: handleFunction,
      ArrowFunctionExpression: handleFunction
    }
    // 开发模式，植入 hmr 相关代码
    if (process.env.NODE_ENV === 'development') {
      importHmrClientDeps(ast)
      handler.ClassDeclaration = handleClass
    }
    traverse(ast, handler)
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
