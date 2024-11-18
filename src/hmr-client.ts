// noinspection JSUnusedGlobalSymbols

import {
  type ClassWidget,
  createFnWidget,
  createScope,
  type FnWidget,
  isClassWidget,
  type VNode,
  Widget
} from 'vitarx'
import type { ModuleNamespace } from 'vite/types/hot.js'

const WidgetCache = '__$vitarx_widget_hmr_map$__'
declare global {
  interface Window {
    [WidgetCache]: WeakMap<WidgetConstructor, WidgetConstructor>
  }
}
type WidgetConstructor = FnWidget | ClassWidget
type VNODE = VNode<WidgetConstructor> & {
  __$vitarx_state$__: Record<string, any>
  instance: Widget
  __$restore$__?: boolean
}
// 初始化widget缓存，配合jsxDev对引用进行更新
!window[WidgetCache] &&
(window[WidgetCache] = new WeakMap<WidgetConstructor, WidgetConstructor>())
/**
 * 获取记录的状态
 *
 * @param vnode
 * @param name
 */
export function getState(vnode: VNODE, name: string) {
  return vnode.__$vitarx_state$__?.[name]
}

/**
 * 获取模块
 *
 * @param name
 * @param mod
 */
function getModule(name: string, mod: ModuleNamespace) {
  if (name in mod) return mod[name]
  if (mod.default?.name === name) return mod.default
  return undefined
}

/**
 * 提取代码块中的return语句
 *
 * @param functionCode
 */
function extractTopLevelReturnStatements(functionCode: string) {
  // Remove comments from the code
  const noCommentsCode = functionCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  // Match top-level return statements
  const regex = /(?<![\w$])return\s+[^;]+;/g
  let match
  const returns = []
  while ((match = regex.exec(noCommentsCode)) !== null) {
    returns.push(match[0])
  }
  return returns.join('\n')
}
/**
 * 处理热更新
 *
 * @param vnode
 * @param newModule
 */
function handleHmrUpdate(vnode: VNODE, newModule: WidgetConstructor) {
  // 缓存新的组件构造函数
  window[WidgetCache].set(vnode.type, newModule)
  // 销毁旧作用域
  vnode.instance.renderer.scope?.destroy()
  const oldType = vnode.type
  // 更新虚拟节点中的组件构造函数
  vnode.type = newModule
  // 触发卸载钩子
  vnode.instance.onUnmounted?.()
  createScope(() => {
    if (isClassWidget(vnode.type)) {
      new vnode.type(vnode.props).renderer
    } else {
      const oldReturn = extractTopLevelReturnStatements(oldType.toString())
      const newReturn = extractTopLevelReturnStatements(newModule.toString())
      // return语句完全一致，则视为更新了逻辑代码，清除缓存的状态
      if (oldReturn === newReturn) {
        // @ts-ignore
        delete vnode.__$vitarx_state$__
        const newInstance = createFnWidget(vnode as VNode<FnWidget>)
        newInstance.onCreated?.()
        newInstance.renderer
        newInstance.onMounted?.()
      } else {
        createFnWidget(vnode as VNode<FnWidget>).renderer
      }
    }
  })
}

/**
 * 模块依赖管理器
 */
export class ModuleManager {
  deps: Map<string, Set<VNODE>> = new Map()

  /**
   * 注册节点
   *
   * @param vnode
   */
  register(vnode: VNODE) {
    const widget = vnode.type.name
    if (this.deps.has(widget)) {
      this.deps.get(widget)!.add(vnode)
    } else {
      this.deps.set(widget, new Set([vnode]))
    }
  }

  /**
   * 更新节点
   *
   * @param mod
   */
  update(mod: ModuleNamespace | undefined) {
    if (!mod) return 'module not found'
    for (const [name, nodes] of this.deps) {
      const newModule = getModule(name, mod)
      if (!newModule) return `${name}未从模块中导出，无法处理更新。`
      for (const node of nodes) {
        handleHmrUpdate(node, newModule)
      }
    }
  }
}
