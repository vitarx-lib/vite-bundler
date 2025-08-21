import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 设置测试运行的环境为Node.js
    // 这意味着测试将在Node.js环境中执行，而不是浏览器环境
    environment: 'node',

    // 指定需要包含的测试文件的匹配模式
    // 这里会匹配所有__tests__目录下的.test或.spec结尾的各种JavaScript/TypeScript文件
    include: ['__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // 设置单个测试用例的超时时间为10秒
    // 如果测试执行时间超过这个值，测试将被标记为失败
    testTimeout: 10000
  }
})
