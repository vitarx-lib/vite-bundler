import { onUpdated, ref } from 'vitarx'
import { Counter } from './widget.js'
import styles from './WidgetTest/test.module.css'
export function App() {
  const count = ref(0)

  const increment = () => {
    count.value++
  }

  onUpdated(() => {
    console.log('组件更新了')
  })

  return (
    <div class={styles.test}>
      {count.value % 2 === 0 ? (
        <div>
          <Counter>{count.value}</Counter>
        </div>
      ) : (
        <h1>{count.value}</h1>
      )}
      <button onClick={increment}>点击++</button>
    </div>
  )
}
