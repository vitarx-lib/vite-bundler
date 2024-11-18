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
 * 处理热更新
 *
 * @param vnode
 * @param newModule
 */
function handleHmrUpdate(vnode: VNODE, newModule: WidgetConstructor) {
  // 缓存新的组件构造函数
  window[WidgetCache].set(vnode.type, newModule)
  // 更新虚拟节点中的组件构造函数
  vnode.type = newModule
  // TODO: 需完善对类组件更新
  // 销毁旧作用域
  vnode.instance.renderer.scope?.destroy()
  // 触发卸载钩子
  vnode.instance.onUnmounted?.()
  if (!isClassWidget(vnode.type)) {
    createScope(() => {
      createFnWidget(vnode as VNode<FnWidget>).renderer
    })
  }
}

/**
 * 模块管理器
 */
export class ModuleManager {
  modules: Map<string, Set<VNODE>> = new Map()

  /**
   * 注册节点
   *
   * @param vnode
   */
  register(vnode: VNODE) {
    const widget = vnode.type.name
    if (this.modules.has(widget)) {
      this.modules.get(widget)!.add(vnode)
    } else {
      this.modules.set(widget, new Set([vnode]))
    }
  }

  /**
   * 更新节点
   *
   * @param mod
   */
  update(mod: ModuleNamespace | undefined) {
    if (!mod) return 'module not found'
    for (const [name, nodes] of this.modules) {
      const newModule = getModule(name, mod)
      if (!newModule) return `${name}在模块中被移除，导致无法处理自身更新。`
      for (const node of nodes) {
        handleHmrUpdate(node, newModule)
      }
    }
  }
}
