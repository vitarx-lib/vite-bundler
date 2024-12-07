import {
  type ClassWidgetConstructor,
  createFnWidget,
  createScope,
  type FnWidgetConstructor,
  isClassWidgetConstructor,
  isEffect,
  type VNode,
  Widget
} from 'vitarx'
import type { ModuleNamespace } from 'vite/types/hot.js'
import { insertBeforeExactly } from 'vitarx/dist/core/renderer/web-runtime-dom/index.js'
import { __WidgetIntrinsicProps__ } from 'vitarx/dist/core/widget/constant.js'
import { HmrId } from './constant.js'
import { type ChangeCode, differenceClassWidgetChange, differenceFnWidgetChange } from './utils.js'

declare global {
  interface Window {
    [HmrId.cache]: WeakMap<WidgetConstructor, WidgetConstructor>
  }
}

type WidgetConstructor = FnWidgetConstructor | ClassWidgetConstructor

type VNODE<T extends WidgetConstructor = WidgetConstructor> = VNode<T> & {
  __$vitarx_state$__: Record<string, any>
  instance: Widget
}

// 初始化widget缓存，配合jsxDev对引用进行更新
!window[HmrId.cache] && (window[HmrId.cache] = new WeakMap<WidgetConstructor, WidgetConstructor>())

/**
 * 获取记录的状态
 *
 * @param vnode
 * @param name
 */
export function getState(vnode: VNODE, name: string) {
  return vnode?.__$vitarx_state$__?.[name]
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
  const oldModule = vnode.type
  // 更新虚拟节点中的组件构造函数
  vnode.type = newModule
  if (['unloaded', 'uninstalling'].includes(vnode.instance.renderer.state)) return
  createScope(() => {
    if (isClassWidgetConstructor(vnode.type)) {
      const newInstance = new vnode.type(vnode.props)
      updateWidget(
        newInstance,
        vnode.instance,
        differenceClassWidgetChange(newModule.toString(), oldModule.toString())
      )
    } else {
      const change = differenceFnWidgetChange(newModule.toString(), oldModule.toString())
      // @ts-ignore 如果非只更新渲染视图，则删除保留的状态
      if (change.other) delete vnode.__$vitarx_state$__
      const newInstance = createFnWidget(vnode as VNode<FnWidgetConstructor>)
      updateWidget(newInstance, vnode.instance, change)
    }
  })
}

/**
 * 更新小部件实例
 *
 * @param newInstance
 * @param oldInstance
 * @param change
 */
function updateWidget(newInstance: Widget, oldInstance: Widget, change: ChangeCode): void {
  if (change.build && !change.other) {
    // 销毁旧作用域
    oldInstance.renderer.scope?.destroy()
    // 恢复属性
    for (const key in oldInstance) {
      if (__WidgetIntrinsicProps__.includes(key as any)) continue
      const oldValue = (oldInstance as any)[key]
      // 仅恢复非副作用属性
      if (!isEffect(oldValue)) (newInstance as any)[key] = oldValue
    }
    // 新子节点
    const newChild = newInstance.renderer.child
    // 恢复旧的子节点
    newInstance.renderer['_child'] = oldInstance.renderer.child
    // 恢复渲染器状态
    newInstance.renderer['_state'] = oldInstance.renderer.state
    // 恢复占位元素
    newInstance.renderer['_shadowElement'] = oldInstance.renderer['_shadowElement']
    // 恢复传送节点父元素
    newInstance.renderer['_teleport'] = oldInstance.renderer['_teleport']
    // 重置小部件实例
    newInstance.vnode.instance = newInstance
    // 更新引用
    newInstance.vnode.ref && (newInstance.vnode.ref.value = newInstance)
    // 更新新的子节点到旧子节点
    newInstance.renderer.update(newChild)
  } else if (change.build || change.other) {
    // 如果是非活跃状态则不更新js逻辑层与数据层的变化
    if (oldInstance.renderer.state !== 'activated') return
    // 创建占位元素
    const placeholderEl: Text = document.createTextNode('')
    // 父元素
    let parentEl: ParentNode
    // 如果旧实例使用了传送功能
    if (oldInstance.renderer.teleport) {
      // 占位节点插入到影子元素之前
      parentEl = insertBeforeExactly(placeholderEl, oldInstance.renderer.shadowElement)
    } else {
      // 占位节点插入到旧元素之前
      parentEl = insertBeforeExactly(placeholderEl, oldInstance.renderer.el!)
    }
    // 卸载旧的组件实例
    oldInstance.renderer.unmount(false)
    // 渲染新元素
    const el = newInstance.renderer.render()
    // 如果是传送节点
    if (newInstance.renderer.teleport) {
      // 用影子元素替换掉占位元素，新组件实例挂载时自动将真实的元素挂载到传送节点中！
      parentEl.replaceChild(newInstance.renderer.shadowElement, placeholderEl)
    } else {
      // 非占位节点用新元素替换占位元素
      parentEl.replaceChild(el, placeholderEl)
    }
    // 重置小部件实例
    newInstance.vnode.instance = newInstance
    // 挂载完成
    newInstance.renderer.mount()
  }
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
