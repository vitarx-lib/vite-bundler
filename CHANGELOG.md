## [3.1.2](https://gitee.com/vitarx/vite-bundler/compare/v3.1.1...v3.1.2) (2025-09-21)


### Bug Fixes

* **hmr-client:** 修复更新js逻辑层时提示子节点已经挂载无法重新挂载问题 ([7aa1075](https://gitee.com/vitarx/vite-bundler/commits/7aa107538a54f9da909d26eae3a6115e97e5e193))
* **transforms:** 更新hmr.ts中vnode标识符为$vnode ([216eb4a](https://gitee.com/vitarx/vite-bundler/commits/216eb4a3344a2aceb5982c2237fcff4e6c6bc43b))



# [3.1.0](https://gitee.com/vitarx/vite-bundler/compare/v3.0.0...v3.1.0) (2025-09-20)


### Features

* **hmr:** 添加移除特定导入的逻辑 ([fed26ea](https://gitee.com/vitarx/vite-bundler/commits/fed26eadb4c8e41acbe61fe58e50091b53a8736d))



# [3.0.0](https://gitee.com/vitarx/vite-bundler/compare/v1.0.3...v3.0.0) (2025-09-06)


### Bug Fixes

* **babelGenerate:** 兼容 swc 生成器 ([9a73340](https://gitee.com/vitarx/vite-bundler/commits/9a733404398de9427e21f9506df0c73cddb4b59d))
* **hmr-client:** 修复热更新导致的组件不更新问题 ([3f8f7de](https://gitee.com/vitarx/vite-bundler/commits/3f8f7de6f2de0077b185fee677240a12bdd41e3f))
* **hmr-client:** 修复热更新视图刷新逻辑 ([bb9c5d3](https://gitee.com/vitarx/vite-bundler/commits/bb9c5d3253eb7b4d237edfb392510d02420bb8ba))


### Features

* 添加 TestApp 组件 ([63fe82e](https://gitee.com/vitarx/vite-bundler/commits/63fe82e765489f60f3b654a61de8125a1cc75614))



## [1.0.3](https://gitee.com/vitarx/vite-bundler/compare/v1.0.1...v1.0.3) (2025-03-22)



## [1.0.1](https://gitee.com/vitarx/vite-bundler/compare/v1.0.0...v1.0.1) (2025-03-10)


### Bug Fixes

* **hmr-client:** 修复正则替换代码，导致语法错误BUG ([bb195c1](https://gitee.com/vitarx/vite-bundler/commits/bb195c16531cdedacaef91d35ec0b844d43e08a3))



# [1.0.0](https://gitee.com/vitarx/vite-bundler/compare/340a7b65dcc0939121d1db4e8cb849e796df78f3...v1.0.0) (2025-03-06)


### Bug Fixes

* **hmr:** 优化模块热更新逻辑 ([358fcd6](https://gitee.com/vitarx/vite-bundler/commits/358fcd6d669225f16156deb6d1860028fc24fa5e))
* **hmr:** 优化状态恢复逻辑，避免副作用 ([97b4a0e](https://gitee.com/vitarx/vite-bundler/commits/97b4a0e94b40a8ce52aaa71065b9a9643fbb3381))
* **hmr:** 更新 HMR处理逻辑 ([116d979](https://gitee.com/vitarx/vite-bundler/commits/116d979b46624400da68bc2cf212248dc156fdff))
* **scripts:** 更新 hmr-client 文件路径 ([04755ae](https://gitee.com/vitarx/vite-bundler/commits/04755ae7b1d0f6a42c8762cffd689d52dd2b8173))
* **scripts:** 更新 hmr-client 文件路径 ([8436700](https://gitee.com/vitarx/vite-bundler/commits/843670071fc4fde406b364ba69ec8bdd841cef00))
* update ([1a7255e](https://gitee.com/vitarx/vite-bundler/commits/1a7255e1f26574513afe4201bda7e2689e7fcff3))


### Features

* **hmr:** 支持类组件的热更新 ([a1d65d8](https://gitee.com/vitarx/vite-bundler/commits/a1d65d8ff7b194a00ad98ace165146b3627229fb))
* **hmr:** 添加代码比较工具函数 ([e69b4b5](https://gitee.com/vitarx/vite-bundler/commits/e69b4b5e72ede5690f674e2b8e32767247909453))
* **transforms:** 新增通用的 AST 节点操作函数 ([98fff5d](https://gitee.com/vitarx/vite-bundler/commits/98fff5d77a7b5ed60f49e841d8cce8771e1f1342))
* 添加 HMR 客户端的路径解析 ([e7822f0](https://gitee.com/vitarx/vite-bundler/commits/e7822f091fdafb6eba6e95d43a14177827c4ddb3))
* 添加 JSX 处理器 ([340a7b6](https://gitee.com/vitarx/vite-bundler/commits/340a7b65dcc0939121d1db4e8cb849e796df78f3))
* 添加 Vite 插件实现 JSX 和 TSX 文件处理 ([ac8624d](https://gitee.com/vitarx/vite-bundler/commits/ac8624d826f67ab71e8ce17a52b47a58e9870527))
* 添加 vite-plugin-vitarx 支持 HMR 热更新 ([e4b41d1](https://gitee.com/vitarx/vite-bundler/commits/e4b41d1d2945512522f77db59583012c6455ae0e))



