import styles from './test.module.css'
import {
  getCurrentScope,
  KeepAlive,
  onBeforeRemove,
  onBeforeUpdate,
  onDeactivate,
  ref
} from 'vitarx'

function Counter1() {
  const count = ref(1)
  return (
    <div>
      <div>{count.value}</div>
      <button onClick={() => count.value++}>+++</button>
    </div>
  )
}

function Counter2() {
  const count = ref(1)
  const scope = getCurrentScope()!
  scope.onPause(() => {
    console.log('暂停状态')
  })
  onBeforeUpdate(() => {
    console.log('更新了', count.value)
  })
  onBeforeRemove(function (el: HTMLDivElement, type) {
    count.value++
    console.log(scope.isPaused)
    // return new Promise((resolve)=>{
    //   setTimeout(()=>resolve(),300)
    // })
  })
  onDeactivate(() => {
    console.log('deactivate')
  })
  return (
    <div>
      <div>{count.value}</div>
      <button onClick={() => count.value++}>+++++++</button>
    </div>
  )
}

export default function KeepTest() {
  const show = ref(true)
  return (
    <div className={styles.test}>
      <h1>活力保持测试++++++++</h1>
      <button onClick={() => (show.value = !show.value)}>切换</button>
      <KeepAlive>{show.value ? Counter1 : Counter2}</KeepAlive>
    </div>
  )
}
