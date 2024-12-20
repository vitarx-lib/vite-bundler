// noinspection JSUnusedGlobalSymbols

import {
  createWidgetVNodeInstance,
  isClassWidgetConstructor,
  isEffect,
  type Scope,
  type VNode,
  Widget,
  type WidgetType
} from 'vitarx'
import type { ModuleNamespace } from 'vite/types/hot.js'
import { insertBeforeExactly } from 'vitarx/dist/core/renderer/web-runtime-dom/index.js'
import { __widgetIntrinsicPropKeywords__ } from 'vitarx/dist/core/widget/constant.js'
import { HmrId } from './constant.js'
import { type ChangeCode, differenceClassWidgetChange, differenceFnWidgetChange } from './utils.js'

declare global {
  interface Window {
    [HmrId.cache]: WeakMap<WidgetType, WidgetType>
  }
}

type VNODE<T extends WidgetType = WidgetType> = VNode<T> & {
  __$hmr_state$__?: Record<string, any>
  instance: Widget
  scope: Scope
}

// 初始化widget缓存，配合jsxDev对引用进行更新
!window[HmrId.cache] && (window[HmrId.cache] = new WeakMap<WidgetType, WidgetType>())

/**
 * 获取记录的状态
 *
 * @param vnode
 * @param name
 */
export function getState(vnode: VNODE, name: string) {
  const state = vnode?.[HmrId.state]?.[name]
  // 如果是副作用，则丢弃。
  if (state && isEffect(state)) return undefined
  return state
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
function handleHmrUpdate(vnode: VNODE, newModule: WidgetType) {
  const oldModule = vnode.type
  // 更新虚拟节点中的组件构造函数
  vnode.type = newModule
  if (['unloaded', 'uninstalling'].includes(vnode.instance['renderer'].state)) return
  const oldInstance = vnode.instance
  let change: ChangeCode
  const isClass = isClassWidgetConstructor(vnode.type)
  if (isClass) {
    change = differenceClassWidgetChange(newModule.toString(), oldModule.toString())
    if (!change.other) vnode[HmrId.state] = {}
  } else {
    change = differenceFnWidgetChange(newModule.toString(), oldModule.toString())
  }
  if (change.other) delete vnode[HmrId.state]
  createWidgetVNodeInstance(vnode, newInstance => {
    updateWidget(newInstance, oldInstance, change, isClass)
  })
}

/**
 * 更新小部件实例
 *
 * @param newInstance
 * @param oldInstance
 * @param change
 * @param isClass
 */
function updateWidget(
  newInstance: Widget,
  oldInstance: Widget,
  change: ChangeCode,
  isClass: boolean
): void {
  if (change.build && !change.other) {
    updateWidgetBuild(newInstance, oldInstance, isClass)
  } else {
    updateWidgetFull(newInstance, oldInstance)
  }
}

// 更新build部分
function updateWidgetBuild(newInstance: Widget, oldInstance: Widget, isClass: boolean): void {
  // 销毁旧作用域
  oldInstance['renderer'].scope.destroy()
  // 类组件恢复属性
  if (isClass) {
    // 恢复属性
    for (const key in oldInstance) {
      if (__widgetIntrinsicPropKeywords__.includes(key as any)) continue
      const oldValue = (oldInstance as any)[key]
      // 仅恢复非副作用属性
      if (!isEffect(oldValue)) (newInstance as any)[key] = oldValue
    }
  }
  // 恢复旧的子节点
  newInstance['renderer']['_child'] = oldInstance['renderer'].child
  // 恢复渲染器状态
  newInstance['renderer']['_state'] = oldInstance['renderer'].state
  // 恢复占位元素
  newInstance['renderer']['_shadowElement'] = oldInstance['renderer']['_shadowElement']
  // 恢复传送节点父元素
  newInstance['renderer']['_teleport'] = oldInstance['renderer']['_teleport']
  // 更新引用
  newInstance['vnode'].ref && (newInstance['vnode'].ref.value = newInstance)
  if (!isClass) newInstance['renderer'].update()
}

// 全量更新
function updateWidgetFull(newInstance: Widget, oldInstance: Widget): void {
  // 如果是非活跃状态则不更新js逻辑层与数据层的变化
  if (oldInstance['renderer'].state !== 'activated') return
  // 创建占位元素
  const placeholderEl: Text = document.createTextNode('')
  // 父元素
  let parentEl: ParentNode
  // 如果旧实例使用了传送功能
  if (oldInstance['renderer'].teleport) {
    // 占位节点插入到影子元素之前
    parentEl = insertBeforeExactly(placeholderEl, oldInstance['renderer'].shadowElement)
  } else {
    // 占位节点插入到旧元素之前
    parentEl = insertBeforeExactly(placeholderEl, oldInstance['renderer'].el!)
  }
  // 卸载旧的组件实例
  oldInstance['renderer'].unmount(true)
  // 渲染新元素
  const el = newInstance['renderer'].render()
  // 如果是传送节点
  if (newInstance['renderer'].teleport) {
    // 用影子元素替换掉占位元素，新组件实例挂载时自动将真实的元素挂载到传送节点中！
    parentEl.replaceChild(newInstance['renderer'].shadowElement, placeholderEl)
  } else {
    // 非占位节点用新元素替换占位元素
    parentEl.replaceChild(el, placeholderEl)
  }
  // 挂载完成
  newInstance['renderer'].mount()
}

/**
 * 模块依赖管理器
 */
export class ModuleManager {
  active: Map<string, Set<VNODE>> = new Map()

  /**
   * 注册节点
   *
   * @param vnode
   */
  register(vnode: VNODE) {
    const widget = vnode.type.name
    if (this.active.has(widget)) {
      this.active.get(widget)!.add(vnode)
    } else {
      this.active.set(widget, new Set([vnode]))
    }
  }

  /**
   * 更新节点
   *
   * @param mod
   */
  update(mod: ModuleNamespace | undefined) {
    if (!mod) return 'module not found'
    for (const [name, nodes] of this.active) {
      const newModule = getModule(name, mod)
      if (!newModule) continue
      for (const node of nodes) {
        // 缓存新的组件构造函数
        window[HmrId.cache].set(node.type, newModule)
        handleHmrUpdate(node, newModule)
      }
    }
  }
}
