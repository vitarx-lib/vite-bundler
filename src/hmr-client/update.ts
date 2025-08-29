import { type ChangeCode, differenceClassWidgetChange, differenceFnWidgetChange } from './utils.js'
import {
  __WIDGET_INTRINSIC_KEYWORDS__,
  DomHelper,
  isEffect,
  LifecycleHooks,
  Widget,
  type WidgetType,
  type WidgetVNode
} from 'vitarx'
import { HmrId } from './constant.js'

/**
 * 更新组件实例的函数
 * @param node - 组件节点
 * @param module - 组件模块
 * @param change 变更代码对象，包含build和其他属性
 * @param isClass 是否为类组件的标志
 */
function updateWidget(
  node: WidgetVNode, // 新的组件实例
  module: WidgetType, // 旧的组件实例
  change: ChangeCode, // 变更代码对象，包含build和其他属性
  isClass: boolean // 是否为类组件的标志
): boolean {
  // 如果change对象有build属性且没有other属性，则调用增量更新函数
  if (change.build && !change.other) {
    updateWidgetBuild(node, module, isClass)
    return true
  } else {
    // 否则调用全量更新函数
    return updateWidgetFull(node, module)
  }
}

/**
 * 更新组件构建的函数
 * @param node
 * @param module
 * @param isClass 是否为类组件
 */
function updateWidgetBuild(node: WidgetVNode, module: WidgetType, isClass: boolean): void {
  const oldInstance = node.instance
  // 更新组件实例
  node['updateModule'](module)
  const newInstance = node.instance
  // 类组件恢复属性
  if (isClass) {
    // 恢复属性
    for (const key in oldInstance) {
      if (__WIDGET_INTRINSIC_KEYWORDS__.includes(key as any)) continue
      const oldValue = (oldInstance as any)[key]
      // 仅恢复非副作用属性
      if (!isEffect(oldValue)) (newInstance as any)[key] = oldValue
    }
  }
  // 更新视图，仅在组件是活跃状态下更新！！！
  if (node.state === 'activated') newInstance.update()
}

/**
 * 更新组件实例的完整方法
 * @param node
 * @param module
 */
function updateWidgetFull(node: WidgetVNode, module: WidgetType): boolean {
  const oldInstance = node.instance
  // 如果是非活跃状态则不更新js逻辑层与数据层的变化
  if (node.state !== 'activated') return false
  // 创建占位元素，用于在更新过程中保持DOM结构稳定
  const placeholderEl: Text = document.createTextNode('')
  // 父元素变量，用于后续DOM操作
  let parentEl: ParentNode
  // 如果旧实例使用了传送功能（teleport）
  if (oldInstance.$vnode.teleport) {
    // 占位节点插入到影子元素之前
    parentEl = DomHelper.insertBefore(placeholderEl, oldInstance.$vnode.shadowElement)
  } else {
    // 占位节点插入到旧元素之前
    parentEl = DomHelper.insertBefore(placeholderEl, oldInstance.$el)
  }
  // 卸载旧的组件实例，释放资源
  node.unmount()
  // 执行卸载前钩子
  node.triggerLifecycleHook(LifecycleHooks.beforeUnmount)
  // 递归卸载子节点
  node.child.unmount()
  // 触发销毁钩子
  node.triggerLifecycleHook(LifecycleHooks.unmounted)
  // 更新模块
  node['updateModule'](module, true)
  // 创建新实例
  const newInstance = node.instance
  // 渲染新元素
  const el = node.render()
  // 如果是传送节点
  if (node.teleport) {
    // 用影子元素替换掉占位元素，新组件实例挂载时自动将真实的元素挂载到传送节点中！
    parentEl.replaceChild(newInstance.$vnode.shadowElement, placeholderEl)
  } else {
    // 非占位节点用新元素替换占位元素
    parentEl.replaceChild(el, placeholderEl)
  }
  // 重新挂载节点，新实例正式接管DOM
  node.mount()
  return true
}

/**
 * 处理热更新
 *
 * @param vnode - 组件节点
 * @param newModule - 新的组件模块
 */
export default function handleHmrUpdate(vnode: WidgetVNode, newModule: WidgetType): boolean {
  try {
    const oldModule = vnode.type
    // 如果节点没有渲染，或节点已销毁，则跳过
    if (['notRendered', 'unloaded', 'uninstalling'].includes(vnode.state)) {
      return true
    }
    let change: ChangeCode
    const isClass = Widget.isClassWidget(vnode.type)
    if (isClass) {
      // 恢复静态属性
      for (const key of Object.keys(oldModule)) {
        if (key in newModule) {
          const descriptor = Object.getOwnPropertyDescriptor(newModule, key)
          if (descriptor && descriptor.writable) {
            Reflect.set(newModule, key, Reflect.get(oldModule, key))
          }
        }
      }
      change = differenceClassWidgetChange(newModule.toString(), oldModule.toString())
      if (!change.other) vnode[HmrId.state] = {}
    } else {
      change = differenceFnWidgetChange(newModule.toString(), oldModule.toString())
    }
    if (change.other) delete vnode[HmrId.state]
    return updateWidget(vnode, newModule, change, isClass)
  } catch (e) {
    console.error('[VitarxViteBundler]：热更新模块时捕获到异常', e)
    return true
  }
}
