import { build, ref, Suspense } from 'vitarx'
import styles from './test.module.css'
import { AsyncLoadData } from './test3.js'
import Test from './test2.js'

export default function () {
  const count = ref(0)
  const showCounter = ref(true)
  const increment = () => {
    count.value++
  }
  const changeShowCounter = () => {
    showCounter.value = !showCounter.value
  }
  return build(() => {
    return (
      <div id="test" class={styles.test}>
        <Suspense fallback={<div>加载等待中++</div>}>
          <AsyncLoadData></AsyncLoadData>
        </Suspense>
        <h1 id="h11">{count.value}</h1>
        <Test count={count.value}></Test>
        {showCounter.value && <button onClick={increment}>APP计数器</button>}
        <button onClick={changeShowCounter}>显示计数器+++++</button>
      </div>
    )
  })
}
