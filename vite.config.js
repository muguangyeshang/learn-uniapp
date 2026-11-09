import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    proxy: {
      // H5 端与 Vue 课同一个问题：浏览器跨源请求会被面板的
      // 跨站防护拒绝。开发期用 Vite 代理；微信小程序端不受
      // CORS 限制（但要求 https 或在开发者工具里关闭域名校验）。
      '/api': {
        target: 'http://127.0.0.1:8799',
        changeOrigin: true,
      },
    },
  },
})
