import { defineAsyncWidget, onCreated, onError, onUnmounted, sleep, withAsyncContext } from 'vitarx'

export const AsyncLoadData = defineAsyncWidget(async function () {
  onError(() => {
    return <div>加载失败</div>
  })
  const data = await withAsyncContext(async () => {
    await sleep(1000)
    return 100
  })
  onCreated(() => {
    console.log('onCreated')
  })
  onUnmounted(() => {
    console.log('卸载完成+')
  })
  return <div>异步数据加载完成++++</div>
})
