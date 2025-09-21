import { type Element, Widget } from 'vitarx'

export default class TestClassApp extends Widget {
  override build(): Element | null {
    return <span>TestApp</span>
  }
}
