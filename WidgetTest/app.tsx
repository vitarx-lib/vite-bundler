import { ref } from 'vitarx'
import styles from './test.module.css'
import Counter from './widget.js'

console.log(import.meta.url)
export default function App() {
  const count = ref(0)
  const increment = () => {
    count.value++
  }
  return (
    <div class={styles.test}>
      <Counter>{count.value}</Counter>
      <button onClick={increment}>点击+++</button>
    </div>
  )
}

