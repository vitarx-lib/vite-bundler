import { type ChangeCode, differenceClassWidgetChange, differenceFnWidgetChange } from './utils.js'
import {
  __WIDGET_INTRINSIC_KEYWORDS__,
  DomHelper,
  isEffect,
  Widget,
  type WidgetType,
  type WidgetVNode
} from 'vitarx'
import { HmrId } from './constant.js'

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
  oldInstance.$scope.dispose()
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
  // 新子节点
  const newChild = newInstance.$vnode.child
  newInstance.$vnode.recover(oldInstance.$vnode)
  // 更新视图，仅在组件是活跃状态下更新！！！
  if (newInstance.$vnode.state === 'activated') newInstance.$vnode.updateChild(newChild)
}

// 全量更新
function updateWidgetFull(newInstance: Widget, oldInstance: Widget): void {
  // 如果是非活跃状态则不更新js逻辑层与数据层的变化
  if (oldInstance.$vnode.state !== 'activated') return
  // 创建占位元素
  const placeholderEl: Text = document.createTextNode('')
  // 父元素
  let parentEl: ParentNode
  // 如果旧实例使用了传送功能
  if (oldInstance.$vnode.teleport) {
    // 占位节点插入到影子元素之前
    parentEl = DomHelper.insertBefore(placeholderEl, oldInstance.$vnode.shadowElement)
  } else {
    // 占位节点插入到旧元素之前
    parentEl = DomHelper.insertBefore(placeholderEl, oldInstance.$el)
  }
  // 卸载旧的组件实例
  oldInstance.$vnode.unmount()
  // 渲染新元素
  const el = newInstance.$vnode.render()
  // 如果是传送节点
  if (newInstance.$vnode.teleport) {
    // 用影子元素替换掉占位元素，新组件实例挂载时自动将真实的元素挂载到传送节点中！
    parentEl.replaceChild(newInstance.$vnode.shadowElement, placeholderEl)
  } else {
    // 非占位节点用新元素替换占位元素
    parentEl.replaceChild(el, placeholderEl)
  }
  // 挂载完成
  newInstance.$vnode.mount()
}

/**
 * 处理热更新
 *
 * @param vnode - 组件节点
 * @param newModule - 新的组件模块
 */
export default function handleHmrUpdate(vnode: WidgetVNode, newModule: WidgetType) {
  try {
    const oldModule = vnode.type
    // 更新虚拟节点中的组件构造函数
    vnode['type'] = newModule
    // 如果节点没有渲染，或节点已销毁，则跳过
    if (['notRendered', 'unloaded', 'uninstalling'].includes(vnode.state)) {
      return
    }
    const oldInstance = vnode.instance
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
    updateWidget(vnode.instance, oldInstance, change, isClass)
  } catch (e) {
    console.error('[VitarxViteBundler]：热更新模块时捕获到异常', e)
  }
}
