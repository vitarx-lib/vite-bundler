import { type Element, ref, Widget } from 'vitarx'

export default class Counter extends Widget<{ children: number }> {
  count = ref(21)

  add() {
    this.count.value++
  }

  build(): Element {
    return (
      <div>
        <h1>
          {this.props.children}---{this.count.value}
        </h1>
        <button onClick={this.add.bind(this)}>增加计数++++</button>
      </div>
    )
  }

  protected override onMounted() {
    console.log('计数器挂载完成')
  }

  protected override onBeforeUnmount(): void | boolean {
    // console.log('卸载了')
  }
}
