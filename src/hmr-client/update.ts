import { differenceFnWidgetChange } from './utils.js'
import {
  DomHelper,
  isContainerVNode,
  isWidgetVNode,
  type VNode,
  Widget,
  type WidgetType,
  type WidgetVNode
} from 'vitarx'
import { HmrId } from './constant.js'

/**
 * 更新组件构建的函数
 * @param node
 * @param module
 */
function updateWidgetBuild(node: WidgetVNode, module: WidgetType): void {
  // 更新组件实例
  node['updateModule'](module)
  const newInstance = node.instance
  // 更新视图，仅在组件是活跃状态下更新！！！
  if (node.state === 'activated') newInstance.update()
}

/**
 * 更新组件实例
 *
 * @param node
 * @param module
 */
function updateWidgetInstance(node: WidgetVNode, module: WidgetType) {
  const oldInstance = node.instance
  // 创建占位元素，用于在更新过程中保持DOM结构稳定
  const placeholderEl: Text = document.createTextNode('')
  // 如果旧实例使用了传送功能（teleport）
  if (oldInstance.$vnode.teleport) {
    // 占位节点插入到影子元素之前
    DomHelper.insertBefore(placeholderEl, oldInstance.$vnode.shadowElement)
  } else {
    // 占位节点插入到旧元素之前
    DomHelper.insertBefore(placeholderEl, oldInstance.$el)
  }
  // 递归卸载子节点
  node.unmount()
  // 递归重置子模块
  updateNodeModules(node.child)
  // 更新模块
  node['updateModule'](module, true)
  // 重新挂载节点，新实例正式接管DOM
  node.mount(placeholderEl, 'replace')
}

/**
 * 更新节点的模块
 * @param child - 虚拟节点对象，需要被更新模块的节点
 */
function updateNodeModules(child: VNode) {
  // 判断是否是组件类型的虚拟节点
  if (isWidgetVNode(child)) {
    // 获取新的模块
    const newModule = (window as any)[HmrId.hmr]?.replaceNewModule(child.type) || child.type
    // 如果是组件节点，则更新其模块
    child['updateModule'](newModule, true)
    // 递归处理子节点
    updateNodeModules(child.child)
  } else if (isContainerVNode(child)) {
    // 如果是容器类型的虚拟节点，则递归处理其子节点
    // 遍历所有子节点并调用 updateNodeModules 函数
    child.children.forEach(childNode => updateNodeModules(childNode))
  }
}

/**
 * 处理热更新
 *
 * @param vnode - 组件节点
 * @param newModule - 新的组件模块
 */
export default function handleHmrUpdate(vnode: WidgetVNode, newModule: WidgetType): boolean {
  try {
    if (vnode.state !== 'activated') return false
    const oldModule = vnode.type
    const isClass = Widget.isClassWidget(vnode.type)
    if (isClass) {
      updateWidgetInstance(vnode, newModule)
      return true
    }
    const change = differenceFnWidgetChange(newModule.toString(), oldModule.toString())
    if (change.other) {
      delete vnode[HmrId.state]
      updateWidgetInstance(vnode, newModule)
    } else {
      updateWidgetBuild(vnode, newModule)
    }
    return true
  } catch (e) {
    console.error('[VitarxViteBundler]：热更新模块时捕获到异常', e)
    return true
  }
}
