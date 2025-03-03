import { AppRenderer, createApp } from 'vitarx'
import App from './__TEST__/app.js'

createApp('#root').render(App)
console.log(AppRenderer.version)
