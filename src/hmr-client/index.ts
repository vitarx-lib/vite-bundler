import { isEffect, type WidgetType, type WidgetVNode } from 'vitarx'
import type { ModuleNamespace } from 'vite/types/hot.js'
import { HmrId } from './constant.js'
import handleHmrUpdate from './update.js'

/**
 * 模块依赖管理器
 */
export default class ModuleManager {
  /**
   * id模块映射到组件虚拟节点集合
   *
   * 模块id -> 组件虚拟节点集T extends Window & typeof globalThis，包含活跃的虚拟节点
   */
  #idMapToNode: Map<string, Set<WidgetVNode>> = new Map()

  /**
   * id映射到组件构造函数
   */
  #idMapToModule = new Map<string, WidgetType>()

  /**
   * 获取单实例
   */
  static get instance() {
    if (!window[HmrId.hmr]) {
      ;(window as any)[HmrId.hmr] = new ModuleManager()
    }
    return window[HmrId.hmr]
  }

  /**
   * 缓存
   */
  get idMapToModule() {
    return this.#idMapToModule
  }

  /**
   * 注册节点
   *
   * @param vnode - 节点
   * @param [module] - 节点对应的模块，不传默认为`vnode.type`
   */
  register(vnode: WidgetVNode, module?: WidgetType) {
    if (!vnode) return
    const modId = this.getModuleId(module ?? vnode.type)
    if (this.#idMapToNode.has(modId)) {
      this.#idMapToNode.get(modId)!.add(vnode)
    } else {
      this.#idMapToNode.set(modId, new Set([vnode]))
    }
  }

  /**
   * 更新节点
   *
   * 此方法提供给es模块内调用
   *
   * @param mod
   */
  update(mod: ModuleNamespace) {
    if (!mod) return
    for (const modKey in mod) {
      // 新模块
      const newModule = mod[modKey]
      // 模块id
      const moduleId = this.getModuleId(newModule)
      // 模块ID不存在，跳过
      if (!moduleId) continue
      // 模块活跃的虚拟节点集合
      const nodes = this.#idMapToNode.get(moduleId)
      // 模块不存在，跳过
      if (!nodes) continue
      for (const node of nodes) {
        // 更新模块
        this.updateModule(newModule)
        // 更新节点视图
        const updateResult = handleHmrUpdate(node, newModule)
        if (!updateResult) return '节点状态处于非活跃状态，无法完成热更新'
      }
    }
  }

  /**
   * 获取模块id
   *
   * @param mod
   */
  getModuleId(mod: WidgetType): string {
    return Reflect.get(mod, HmrId.hmrId)
  }

  /**
   * 置换新模块
   *
   * 此方法提供给`jsxDev`函数调用，保持每次创建组件实例都是最新的模块！
   * @param mod
   */
  replaceNewModule(mod: WidgetType): WidgetType {
    const id = this.getModuleId(mod)
    return id ? (this.idMapToModule.get(id) ?? mod) : mod
  }

  /**
   * 函数组件恢复状态
   *
   * @param {WidgetVNode} vnode - 函数组件虚拟节点
   * @param {string} name - 组件状态名
   */
  getState(vnode: WidgetVNode, name: string) {
    const state = vnode?.[HmrId.state]?.[name]
    // 如果是副作用，则丢弃。
    if (state && isEffect(state)) return undefined
    return state
  }

  /**
   * 给组件绑定唯一id
   *
   * @param widget
   * @param id
   */
  bindId(widget: any, id: string) {
    if (typeof widget === 'function') {
      Object.defineProperty(widget, HmrId.hmrId, { value: id })
    }
  }

  /**
   * 更新模块
   *
   * @param newMod
   * @private
   */
  private updateModule(newMod: WidgetType) {
    const id = this.getModuleId(newMod)
    if (id) this.idMapToModule.set(id, newMod)
  }
}
