import { createApp, type Element, onUpdated, ref, Widget } from 'vitarx'

function Test(props: { children: number; onClick: () => void }) {
  return <div onClick={props.onClick}>{props.children}</div>
}
function App() {
  const data = ref({ count: { c: 1 } })
  const onClick = () => {
    data.value.count.c++
  }
  onUpdated(() => {
    console.log('组件更新')
  })
  return (
    <Test onClick={onClick} key={'test'}>
      {data.value.count.c}
    </Test>
  )
}
createApp('#root').render(App)
class TestApp extends Widget {
  build(): Element {
    return (
      <div>
        <div>123</div>
        <div>456</div>
      </div>
    )
  }
}
new TestApp({})
