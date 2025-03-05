import { type ChangeCode, differenceClassWidgetChange, differenceFnWidgetChange } from './utils.js'
import {
  __widgetIntrinsicPropKeywords__,
  createWidgetVNodeInstance,
  isClassWidgetConstructor,
  isEffect,
  type VNode,
  WebRuntimeDom,
  type Widget,
  type WidgetType
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
  // 新子节点
  const newChild = newInstance['renderer'].child
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
  // 更新视图，仅在组件是活跃状态下更新！！！
  if (newInstance['renderer'].state === 'activated') newInstance['renderer'].update(newChild)
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
    parentEl = WebRuntimeDom.insertBeforeExactly(
      placeholderEl,
      oldInstance['renderer'].shadowElement
    )
  } else {
    // 占位节点插入到旧元素之前
    parentEl = WebRuntimeDom.insertBeforeExactly(placeholderEl, oldInstance['renderer'].el!)
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
 * 处理热更新
 *
 * @param vnode
 * @param newModule
 */
export default function handleHmrUpdate(vnode: VNode<WidgetType>, newModule: WidgetType) {
  const oldModule = vnode.type
  // 更新虚拟节点中的组件构造函数
  vnode.type = newModule
  // 如果节点没有渲染，或节点已销毁，则跳过
  if (!vnode.instance || ['unloaded', 'uninstalling'].includes(vnode.instance['renderer'].state)) {
    return
  }
  const oldInstance = vnode.instance
  let change: ChangeCode
  const isClass = isClassWidgetConstructor(vnode.type)
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
  createWidgetVNodeInstance(vnode, newInstance => {
    updateWidget(newInstance, oldInstance, change, isClass)
  })
}
