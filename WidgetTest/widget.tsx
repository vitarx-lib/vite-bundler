import { onMounted, onUnmounted } from 'vitarx'

export default function Counter(props: { children: number }) {
  onMounted(() => {
    console.log('挂载了Counter')
  })
  onUnmounted(() => {
    console.log('销毁了Counter')
  })
  return <h1>{props.children}++</h1>
}
