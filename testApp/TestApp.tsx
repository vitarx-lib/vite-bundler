import TestClassApp from './ExportDefaultClassWidget.js'
import { ExportClassWidget } from './ExportClassWidget.js'
import { FunctionWidget } from './FunctionWidget.js'
import { FnWidgetExport } from './FnWidgetExport.js'

export default function TestApp() {
  return (
    <div>
      <h1>测试</h1>
      <TestClassApp></TestClassApp>
      <ExportClassWidget></ExportClassWidget>
      <FunctionWidget></FunctionWidget>
      <FnWidgetExport></FnWidgetExport>
    </div>
  )
}
