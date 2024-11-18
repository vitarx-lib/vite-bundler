// noinspection JSUnusedGlobalSymbols

import {
  createFnWidget,
  createScope,
  type FnWidget,
  isClassWidget,
  type VNode,
  Widget
} from 'vitarx'
import type { ModuleNamespace } from 'vite/types/hot.js'

type VNODE = VNode & {
  __hmr_state: Record<string, any>
  instance: Widget
}
const ModuleWidget = new Map<string, Map<string, VNODE>>()

function registerWidget(url: string, name: string) {}

/**
 * 获取记录的状态
 *
 * @param vnode
 * @param name
 */
export function getState(vnode: VNODE, name: string) {
  return vnode.__hmr_state?.[name]
}

/**
 * 判断是否无法处理更新
 *
 * @param vnode
 * @param mod
 */
export function cannotHandleUpdate(vnode: VNODE, mod: ModuleNamespace | undefined) {
  if (!mod) return true
  // 获取组件名称
  const name = vnode.instance!.widgetName

  return !mod[name] && mod.default.name !== name
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
}

/**
 * 处理热更新
 *
 * @param vnode
 * @param mod
 * @param state
 */
export function handleHmrUpdate(vnode: VNODE, mod: ModuleNamespace, state: Record<string, any>) {
  // 获取组件名称
  const name = vnode.instance.widgetName
  // 旧的组件代码
  const oldCode = vnode.type.toString()
  const newModule = getModule(name, mod)
  // 更新过后的组件代码
  const newCode = newModule.toString()
  if (oldCode !== newCode) {
    console.log(`更新${name}组件`)
    vnode.__hmr_state = state
    // 更新组件代码
    vnode.type = newModule
    if (!isClassWidget(vnode.type)) {
      createScope(() => {
        createFnWidget(vnode as VNode<FnWidget>).renderer
      })
    }
  }
}
