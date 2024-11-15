import { onUnmounted } from 'vitarx'

export function Counter(props: { children: number }) {
  onUnmounted(() => {
    console.log('组件被销毁了')
  })
  return <h1>{props.children}</h1>
}
