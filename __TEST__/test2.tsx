import { type Element, Widget } from 'vitarx'

export default class Test extends Widget<{ count: number }> {
  protected override onMounted() {
    console.log('test挂载完成')
  }

  protected override onUnmounted() {
    console.log('test卸载')
  }

  protected build(): Element {
    return <div>{this.props.count}</div>
  }
}
